package store

import (
	"context"
	"time"

	"vec/backend/internal/turso"
)

// ---------------------------------------------------------------------------
// Endereço da pessoa (Spec 002)
// ---------------------------------------------------------------------------
// Dado pessoal de finalidade específica: só é lido e gravado dentro do escopo de
// quem pede, com o escopo na própria instrução SQL, como foto e anotações. A
// validação dos campos e do consentimento fica na API.

type Endereco struct {
	CEP         string
	Logradouro  string
	Numero      string
	Complemento string
	Bairro      string
	Cidade      string
	UF          string

	// Preenchidos pelo store a partir de quem salva; ignorados na entrada.
	ConsentimentoEm  string
	ConsentimentoPor string
	AtualizadoEm     string
	AtualizadoPor    string
}

const enderecoCols = `cep, logradouro, numero, complemento, bairro, cidade, uf,
	consentimento_em, consentimento_por, atualizado_em, atualizado_por`

// Endereco devolve o endereço de um cadastro do escopo. visivel=false quando o
// cadastro não existe, foi excluído ou está fora do escopo; tem=false quando ele
// é visível mas ainda não tem endereço.
func (s *Store) Endereco(ctx context.Context, sc Scope, respostaID int64) (e Endereco, tem, visivel bool, err error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return Endereco{}, false, false, nil
	}
	alvo := append([]any{respostaID}, args...)
	dono := `SELECT id FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: dono, Args: alvo},
		turso.Stmt{SQL: `SELECT ` + enderecoCols + ` FROM enderecos WHERE resposta_id IN (` + dono + `)`, Args: alvo},
	)
	if err != nil || len(res[0].Rows) == 0 {
		return Endereco{}, false, false, err
	}
	if len(res[1].Rows) == 0 {
		return Endereco{}, false, true, nil
	}
	r := res[1].Rows[0]
	return Endereco{
		CEP: turso.Str(r, 0), Logradouro: turso.Str(r, 1), Numero: turso.Str(r, 2),
		Complemento: turso.Str(r, 3), Bairro: turso.Str(r, 4), Cidade: turso.Str(r, 5), UF: turso.Str(r, 6),
		ConsentimentoEm: turso.Str(r, 7), ConsentimentoPor: turso.Str(r, 8),
		AtualizadoEm: turso.Str(r, 9), AtualizadoPor: turso.Str(r, 10),
	}, true, true, nil
}

// SalvarEndereco grava ou troca o endereço de um cadastro do escopo, registrando o
// consentimento informado agora por quem salva. Devolve false se o cadastro não
// existe, foi excluído ou está fora do escopo.
func (s *Store) SalvarEndereco(ctx context.Context, sc Scope, respostaID int64, e Endereco, por string, now time.Time) (bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return false, nil
	}
	quando := iso(now)
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL: `INSERT INTO enderecos (resposta_id, ` + enderecoCols + `)
		      SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond + `
		      ON CONFLICT(resposta_id) DO UPDATE SET cep = excluded.cep, logradouro = excluded.logradouro,
		      numero = excluded.numero, complemento = excluded.complemento, bairro = excluded.bairro,
		      cidade = excluded.cidade, uf = excluded.uf,
		      consentimento_em = excluded.consentimento_em, consentimento_por = excluded.consentimento_por,
		      atualizado_em = excluded.atualizado_em, atualizado_por = excluded.atualizado_por`,
		Args: append([]any{e.CEP, e.Logradouro, e.Numero, e.Complemento, e.Bairro, e.Cidade, e.UF,
			quando, por, quando, por, respostaID}, args...),
	})
	if err != nil {
		return false, err
	}
	return res[0].Affected > 0, nil
}

// ExcluirEndereco apaga de fato o endereço de um cadastro do escopo. Devolve false
// se o cadastro não existe, foi excluído ou está fora do escopo (ter ou não
// endereço não importa).
func (s *Store) ExcluirEndereco(ctx context.Context, sc Scope, respostaID int64) (bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return false, nil
	}
	alvo := append([]any{respostaID}, args...)
	dono := `SELECT id FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: dono, Args: alvo},
		turso.Stmt{SQL: `DELETE FROM enderecos WHERE resposta_id IN (` + dono + `)`, Args: alvo},
	)
	if err != nil {
		return false, err
	}
	return len(res[0].Rows) > 0, nil
}
