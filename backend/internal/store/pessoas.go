package store

import (
	"context"

	"vec/backend/internal/turso"
)

// ---------------------------------------------------------------------------
// Pessoas: o mínimo dos cadastros para o discipulado
// ---------------------------------------------------------------------------

// Pessoa é o mínimo de um cadastro para escolher um discipulador ou ligar um login.
type Pessoa struct {
	ID     int64
	Nome   string
	Celula string
}

// ListPessoas devolve nome e célula de todos os cadastros da área, em ordem alfabética.
func (s *Store) ListPessoas(ctx context.Context) ([]Pessoa, error) {
	res, err := s.DB.Do(ctx, turso.Stmt{SQL: `SELECT id, nome, celula FROM respostas WHERE excluido_em IS NULL ORDER BY nome COLLATE NOCASE`})
	if err != nil {
		return nil, err
	}
	out := make([]Pessoa, 0, len(res[0].Rows))
	for _, row := range res[0].Rows {
		out = append(out, Pessoa{ID: turso.Int(row, 0), Nome: turso.Str(row, 1), Celula: turso.Str(row, 2)})
	}
	return out, nil
}

// NomeDaPessoa devolve o nome de um cadastro ativo; ok=false se não existe ou foi excluído.
func (s *Store) NomeDaPessoa(ctx context.Context, id int64) (nome string, ok bool, err error) {
	res, err := s.DB.Do(ctx, turso.Stmt{SQL: `SELECT nome FROM respostas WHERE id = ? AND excluido_em IS NULL`, Args: []any{id}})
	if err != nil || len(res[0].Rows) == 0 {
		return "", false, err
	}
	return turso.Str(res[0].Rows[0], 0), true, nil
}
