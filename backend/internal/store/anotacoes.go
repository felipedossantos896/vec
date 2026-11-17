package store

import (
	"context"
	"time"

	"vec/backend/internal/turso"
)

// ---------------------------------------------------------------------------
// Anotações de acompanhamento
// ---------------------------------------------------------------------------
// Quem enxerga a pessoa pode ler e escrever anotações sobre ela; cada um apaga só as suas.

type Anotacao struct {
	ID        int64
	Autor     string // usuário do painel
	AutorNome string
	CriadoEm  string // ISO UTC
	Texto     string
}

// ListAnotacoes devolve as anotações de um cadastro, da mais nova para a mais antiga.
// ok=false se o cadastro não existe ou está fora do escopo.
func (s *Store) ListAnotacoes(ctx context.Context, sc Scope, respostaID int64) ([]Anotacao, bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return nil, false, nil
	}
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: `SELECT 1 FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond, Args: append([]any{respostaID}, args...)},
		turso.Stmt{SQL: `SELECT id, autor, autor_nome, criado_em, texto FROM anotacoes WHERE resposta_id = ? ORDER BY criado_em DESC, id DESC`, Args: []any{respostaID}},
	)
	if err != nil || len(res[0].Rows) == 0 {
		return nil, false, err
	}
	out := make([]Anotacao, 0, len(res[1].Rows))
	for _, r := range res[1].Rows {
		out = append(out, Anotacao{ID: turso.Int(r, 0), Autor: turso.Str(r, 1), AutorNome: turso.Str(r, 2), CriadoEm: turso.Str(r, 3), Texto: turso.Str(r, 4)})
	}
	return out, true, nil
}

// AddAnotacao grava uma anotação se o cadastro estiver dentro do escopo.
func (s *Store) AddAnotacao(ctx context.Context, sc Scope, respostaID int64, a Anotacao, now time.Time) (bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return false, nil
	}
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL: `INSERT INTO anotacoes (resposta_id, autor, autor_nome, criado_em, texto)
		      SELECT id, ?, ?, ?, ? FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond,
		Args: append([]any{a.Autor, a.AutorNome, iso(now), a.Texto, respostaID}, args...),
	})
	if err != nil {
		return false, err
	}
	return res[0].Affected > 0, nil
}

// DeleteAnotacao apaga uma anotação do próprio autor, sobre alguém dentro do escopo.
func (s *Store) DeleteAnotacao(ctx context.Context, sc Scope, id int64, autor string) (bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return false, nil
	}
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL:  `DELETE FROM anotacoes WHERE id = ? AND autor = ? AND resposta_id IN (SELECT id FROM respostas WHERE excluido_em IS NULL AND ` + cond + `)`,
		Args: append([]any{id, autor}, args...),
	})
	if err != nil {
		return false, err
	}
	return res[0].Affected > 0, nil
}
