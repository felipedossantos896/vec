// Package store concentra todo o SQL do projeto.
package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"vec/backend/internal/turso"
)

type Store struct {
	DB turso.DB
}

// ---------------------------------------------------------------------------
// Usuários
// ---------------------------------------------------------------------------

type User struct {
	Usuario   string
	Nome      string
	SenhaHash string
	Perfil    string // AREA, SETOR ou CELULA
	Ativo     bool
	Gerencia  bool
	Setores   []string
	Celulas   []string
	CriadoEm  string // ISO UTC
	Acesso    string // ISO UTC ("" se nunca acessou)
}

// Scope é o que um usuário pode enxergar.
type Scope struct {
	Todos   bool
	Setores []string
	Celulas []string
}

// Escopo devolve o que o usuário enxerga e se a configuração é válida:
// AREA vê tudo; SETOR/CELULA precisam de ao menos um item marcado.
func (u *User) Escopo() (Scope, bool) {
	if u.Perfil == "AREA" {
		return Scope{Todos: true}, true
	}
	sc := Scope{Setores: u.Setores, Celulas: u.Celulas}
	return sc, len(sc.Setores)+len(sc.Celulas) > 0
}

const userCols = `usuario, nome, senha_hash, perfil, ativo, gerencia, criado_em, COALESCE(ultimo_acesso, '')`

func userFromRow(r []any) User {
	return User{
		Usuario:   turso.Str(r, 0),
		Nome:      turso.Str(r, 1),
		SenhaHash: turso.Str(r, 2),
		Perfil:    turso.Str(r, 3),
		Ativo:     turso.Int(r, 4) == 1,
		Gerencia:  turso.Int(r, 5) == 1,
		CriadoEm:  turso.Str(r, 6),
		Acesso:    turso.Str(r, 7),
	}
}

func attachScopes(users map[string]*User, rows [][]any) {
	for _, r := range rows {
		u := users[turso.Str(r, 0)]
		if u == nil {
			continue
		}
		switch turso.Str(r, 1) {
		case "SETOR":
			u.Setores = append(u.Setores, turso.Str(r, 2))
		case "CELULA":
			u.Celulas = append(u.Celulas, turso.Str(r, 2))
		}
	}
}

// GetUser busca um usuário (e seus escopos) em uma única ida ao banco.
// Devolve (nil, nil) se não existir.
func (s *Store) GetUser(ctx context.Context, usuario string) (*User, error) {
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: `SELECT ` + userCols + ` FROM usuarios WHERE usuario = ?`, Args: []any{usuario}},
		turso.Stmt{SQL: `SELECT usuario, tipo, nome FROM usuario_escopos WHERE usuario = ? ORDER BY nome`, Args: []any{usuario}},
	)
	if err != nil {
		return nil, err
	}
	if len(res[0].Rows) == 0 {
		return nil, nil
	}
	u := userFromRow(res[0].Rows[0])
	attachScopes(map[string]*User{u.Usuario: &u}, res[1].Rows)
	return &u, nil
}

func (s *Store) ListUsers(ctx context.Context) ([]User, error) {
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: `SELECT ` + userCols + ` FROM usuarios ORDER BY nome COLLATE NOCASE`},
		turso.Stmt{SQL: `SELECT usuario, tipo, nome FROM usuario_escopos ORDER BY nome`},
	)
	if err != nil {
		return nil, err
	}
	byName := map[string]*User{}
	out := make([]User, 0, len(res[0].Rows))
	for _, r := range res[0].Rows {
		out = append(out, userFromRow(r))
	}
	for i := range out {
		byName[out[i].Usuario] = &out[i]
	}
	attachScopes(byName, res[1].Rows)
	return out, nil
}

var ErrUserExists = errors.New("usuário já existe")
var ErrUserNotFound = errors.New("usuário não encontrado")

// SaveUser cria (create=true) ou atualiza um usuário e substitui seus escopos,
// tudo em uma transação. Se newHash for vazio na atualização, a senha é mantida.
func (s *Store) SaveUser(ctx context.Context, u User, newHash string, create bool, now time.Time) error {
	var stmts []turso.Stmt
	if create {
		stmts = append(stmts, turso.Stmt{
			SQL: `INSERT INTO usuarios (usuario, nome, senha_hash, perfil, ativo, gerencia, criado_em)
			      VALUES (?, ?, ?, ?, ?, ?, ?)`,
			Args: []any{u.Usuario, u.Nome, newHash, u.Perfil, u.Ativo, u.Gerencia, iso(now)},
		})
	} else {
		sql := `UPDATE usuarios SET nome = ?, perfil = ?, ativo = ?, gerencia = ?`
		args := []any{u.Nome, u.Perfil, u.Ativo, u.Gerencia}
		if newHash != "" {
			sql += `, senha_hash = ?`
			args = append(args, newHash)
		}
		sql += ` WHERE usuario = ?`
		args = append(args, u.Usuario)
		stmts = append(stmts, turso.Stmt{SQL: sql, Args: args})
	}
	stmts = append(stmts, turso.Stmt{SQL: `DELETE FROM usuario_escopos WHERE usuario = ?`, Args: []any{u.Usuario}})
	for _, n := range u.Setores {
		stmts = append(stmts, turso.Stmt{
			SQL:  `INSERT OR IGNORE INTO usuario_escopos (usuario, tipo, nome) VALUES (?, 'SETOR', ?)`,
			Args: []any{u.Usuario, n},
		})
	}
	for _, n := range u.Celulas {
		stmts = append(stmts, turso.Stmt{
			SQL:  `INSERT OR IGNORE INTO usuario_escopos (usuario, tipo, nome) VALUES (?, 'CELULA', ?)`,
			Args: []any{u.Usuario, n},
		})
	}
	res, err := s.DB.Tx(ctx, stmts...)
	if err != nil {
		if create && turso.IsConstraint(err) && strings.Contains(err.Error(), "usuarios.usuario") {
			return ErrUserExists
		}
		return err
	}
	if !create && res[0].Affected == 0 {
		return ErrUserNotFound
	}
	return nil
}

// ---------------------------------------------------------------------------
// Login: bloqueio por tentativas
// ---------------------------------------------------------------------------

// LoginState devolve o usuário (nil se não existir) e até quando o login está
// bloqueado ("" se não está), em uma única ida ao banco.
func (s *Store) LoginState(ctx context.Context, usuario string) (*User, string, error) {
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: `SELECT ` + userCols + ` FROM usuarios WHERE usuario = ?`, Args: []any{usuario}},
		turso.Stmt{SQL: `SELECT usuario, tipo, nome FROM usuario_escopos WHERE usuario = ?`, Args: []any{usuario}},
		turso.Stmt{SQL: `SELECT COALESCE(bloqueado_ate, '') FROM login_falhas WHERE usuario = ?`, Args: []any{usuario}},
	)
	if err != nil {
		return nil, "", err
	}
	bloqueio := ""
	if len(res[2].Rows) > 0 {
		bloqueio = turso.Str(res[2].Rows[0], 0)
	}
	if len(res[0].Rows) == 0 {
		return nil, bloqueio, nil
	}
	u := userFromRow(res[0].Rows[0])
	attachScopes(map[string]*User{u.Usuario: &u}, res[1].Rows)
	return &u, bloqueio, nil
}

// RegisterFailure soma uma falha; ao atingir max, bloqueia até `ate` e zera o contador.
func (s *Store) RegisterFailure(ctx context.Context, usuario string, max int, ate time.Time) error {
	_, err := s.DB.Tx(ctx,
		turso.Stmt{
			SQL: `INSERT INTO login_falhas (usuario, falhas, bloqueado_ate) VALUES (?, 1, NULL)
			      ON CONFLICT(usuario) DO UPDATE SET falhas = falhas + 1`,
			Args: []any{usuario},
		},
		turso.Stmt{
			SQL:  `UPDATE login_falhas SET falhas = 0, bloqueado_ate = ? WHERE usuario = ? AND falhas >= ?`,
			Args: []any{iso(ate), usuario, max},
		},
	)
	return err
}

// LoginOK limpa as falhas e registra o último acesso.
func (s *Store) LoginOK(ctx context.Context, usuario string, now time.Time) error {
	_, err := s.DB.Do(ctx,
		turso.Stmt{SQL: `DELETE FROM login_falhas WHERE usuario = ?`, Args: []any{usuario}},
		turso.Stmt{SQL: `UPDATE usuarios SET ultimo_acesso = ? WHERE usuario = ?`, Args: []any{iso(now), usuario}},
	)
	return err
}

// ---------------------------------------------------------------------------
// Listas (setores e células)
// ---------------------------------------------------------------------------

func (s *Store) Listas(ctx context.Context) (setores, celulas []string, err error) {
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: `SELECT nome FROM setores ORDER BY ordem, nome`},
		turso.Stmt{SQL: `SELECT nome FROM celulas ORDER BY ordem, nome`},
	)
	if err != nil {
		return nil, nil, err
	}
	for _, r := range res[0].Rows {
		setores = append(setores, turso.Str(r, 0))
	}
	for _, r := range res[1].Rows {
		celulas = append(celulas, turso.Str(r, 0))
	}
	return setores, celulas, nil
}
