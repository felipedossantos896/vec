package store

import (
	"context"
	"time"

	"vec/backend/internal/turso"
)

// ---------------------------------------------------------------------------
// Fotos de perfil
// ---------------------------------------------------------------------------
// Quem pode editar a pessoa pode trocar e remover a foto dela: o escopo entra na
// própria instrução SQL, como na edição do cadastro.

type Foto struct {
	Imagem []byte
	Tipo   string // image/jpeg, image/png ou image/webp
	Em     string // ISO UTC da última troca
}

// Foto devolve a foto de um cadastro que não foi excluído.
func (s *Store) Foto(ctx context.Context, respostaID int64) (Foto, bool, error) {
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL:  `SELECT f.imagem, f.tipo, f.atualizado_em FROM fotos f JOIN respostas r ON r.id = f.resposta_id WHERE f.resposta_id = ? AND r.excluido_em IS NULL`,
		Args: []any{respostaID},
	})
	if err != nil || len(res[0].Rows) == 0 {
		return Foto{}, false, err
	}
	row := res[0].Rows[0]
	img, _ := row[0].([]byte)
	return Foto{Imagem: img, Tipo: turso.Str(row, 1), Em: turso.Str(row, 2)}, true, nil
}

// SalvarFoto grava ou troca a foto de um cadastro dentro do escopo. Devolve false se
// o cadastro não existe, foi excluído ou está fora do escopo.
func (s *Store) SalvarFoto(ctx context.Context, sc Scope, respostaID int64, f Foto, por string, now time.Time) (bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return false, nil
	}
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL: `INSERT INTO fotos (resposta_id, imagem, tipo, atualizado_em, atualizado_por)
		      SELECT id, ?, ?, ?, ? FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond + `
		      ON CONFLICT(resposta_id) DO UPDATE SET imagem = excluded.imagem, tipo = excluded.tipo,
		      atualizado_em = excluded.atualizado_em, atualizado_por = excluded.atualizado_por`,
		Args: append([]any{f.Imagem, f.Tipo, iso(now), por, respostaID}, args...),
	})
	if err != nil {
		return false, err
	}
	return res[0].Affected > 0, nil
}

// ExcluirFoto remove a foto de um cadastro dentro do escopo. Devolve false se o
// cadastro não existe, foi excluído ou está fora do escopo (ter ou não foto não importa).
func (s *Store) ExcluirFoto(ctx context.Context, sc Scope, respostaID int64) (bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return false, nil
	}
	alvo := append([]any{respostaID}, args...)
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: `SELECT 1 FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond, Args: alvo},
		turso.Stmt{SQL: `DELETE FROM fotos WHERE resposta_id IN (SELECT id FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond + `)`, Args: alvo},
	)
	if err != nil {
		return false, err
	}
	return len(res[0].Rows) > 0, nil
}
