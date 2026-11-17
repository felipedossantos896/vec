package store

import (
	"context"
	"errors"

	"vec/backend/internal/turso"
)

// ---------------------------------------------------------------------------
// Estrutura da área: setores e células (life groups)
// ---------------------------------------------------------------------------
// Os cadastros e os acessos guardam o NOME do setor e da célula. Por isso renomear
// ou mudar uma célula de setor atualiza tudo numa transação só.

type Setor struct {
	ID   int64
	Nome string
}

type Celula struct {
	ID      int64
	Nome    string
	SetorID int64
	Setor   string
	Ativa   bool
}

var ErrNomeExiste = errors.New("já existe com esse nome")
var ErrNaoEncontrado = errors.New("não encontrado")

// Estrutura devolve os setores e todas as células, inclusive as inativas, na ordem de cadastro.
func (s *Store) Estrutura(ctx context.Context) ([]Setor, []Celula, error) {
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: `SELECT id, nome FROM setores ORDER BY ordem, nome`},
		turso.Stmt{SQL: `SELECT c.id, c.nome, COALESCE(c.setor_id, 0), COALESCE(s.nome, ''), c.ativa
		                 FROM celulas c LEFT JOIN setores s ON s.id = c.setor_id ORDER BY c.ordem, c.nome`},
	)
	if err != nil {
		return nil, nil, err
	}
	setores := make([]Setor, 0, len(res[0].Rows))
	for _, r := range res[0].Rows {
		setores = append(setores, Setor{ID: turso.Int(r, 0), Nome: turso.Str(r, 1)})
	}
	celulas := make([]Celula, 0, len(res[1].Rows))
	for _, r := range res[1].Rows {
		celulas = append(celulas, Celula{ID: turso.Int(r, 0), Nome: turso.Str(r, 1), SetorID: turso.Int(r, 2), Setor: turso.Str(r, 3), Ativa: turso.Int(r, 4) == 1})
	}
	return setores, celulas, nil
}

// SalvarSetor cria (id = 0) ou renomeia um setor, levando o nome novo aos cadastros e acessos.
func (s *Store) SalvarSetor(ctx context.Context, id int64, nome string) error {
	if id == 0 {
		_, err := s.DB.Do(ctx, turso.Stmt{
			SQL:  `INSERT INTO setores (nome, ordem) VALUES (?, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM setores))`,
			Args: []any{nome},
		})
		return traduzir(err)
	}
	antigo := `(SELECT nome FROM setores WHERE id = ?)`
	res, err := s.DB.Tx(ctx,
		turso.Stmt{SQL: `UPDATE respostas SET setor = ? WHERE setor = ` + antigo, Args: []any{nome, id}},
		turso.Stmt{SQL: `UPDATE usuario_escopos SET nome = ? WHERE tipo = 'SETOR' AND nome = ` + antigo, Args: []any{nome, id}},
		turso.Stmt{SQL: `UPDATE setores SET nome = ? WHERE id = ?`, Args: []any{nome, id}},
	)
	if err != nil {
		return traduzir(err)
	}
	if res[2].Affected == 0 {
		return ErrNaoEncontrado
	}
	return nil
}

// SalvarCelula cria (id = 0) ou altera uma célula. Ao renomear ou mudar de setor, os
// cadastros dela passam a usar o nome e o setor novos, e os acessos, o nome novo.
func (s *Store) SalvarCelula(ctx context.Context, c Celula) error {
	if c.ID == 0 {
		res, err := s.DB.Do(ctx, turso.Stmt{
			SQL: `INSERT INTO celulas (nome, setor_id, ativa, ordem)
			      SELECT ?, id, ?, (SELECT COALESCE(MAX(ordem), 0) + 1 FROM celulas) FROM setores WHERE id = ?`,
			Args: []any{c.Nome, c.Ativa, c.SetorID},
		})
		if err != nil {
			return traduzir(err)
		}
		if res[0].Affected == 0 {
			return ErrNaoEncontrado // o setor escolhido não existe
		}
		return nil
	}
	antigo := `(SELECT nome FROM celulas WHERE id = ?)`
	res, err := s.DB.Tx(ctx,
		turso.Stmt{
			SQL:  `UPDATE respostas SET celula = ?, setor = (SELECT nome FROM setores WHERE id = ?) WHERE celula = ` + antigo + ` AND EXISTS (SELECT 1 FROM setores WHERE id = ?)`,
			Args: []any{c.Nome, c.SetorID, c.ID, c.SetorID},
		},
		turso.Stmt{SQL: `UPDATE usuario_escopos SET nome = ? WHERE tipo = 'CELULA' AND nome = ` + antigo, Args: []any{c.Nome, c.ID}},
		turso.Stmt{
			SQL:  `UPDATE celulas SET nome = ?, setor_id = ?, ativa = ? WHERE id = ? AND EXISTS (SELECT 1 FROM setores WHERE id = ?)`,
			Args: []any{c.Nome, c.SetorID, c.Ativa, c.ID, c.SetorID},
		},
	)
	if err != nil {
		return traduzir(err)
	}
	if res[2].Affected == 0 {
		return ErrNaoEncontrado
	}
	return nil
}

func traduzir(err error) error {
	if err != nil && turso.IsConstraint(err) {
		return ErrNomeExiste
	}
	return err
}
