package store

import (
	"context"
	"time"

	"vec/backend/internal/turso"
)

// ---------------------------------------------------------------------------
// Retrato mensal (Spec 009)
// ---------------------------------------------------------------------------
// Contagens agregadas por mês e por escopo, para as tendências dos Indicadores. As regras
// são as mesmas do painel: jornada completa = as seis etapas; com discipulador = nome do
// discipulador preenchido; precisa de cuidado = nunca teve contato, ou o lembrete do último
// contato já venceu, ou (sem lembrete) o último contato tem mais de 60 dias.

type Retrato struct {
	Mes        string
	EscopoTipo string
	EscopoNome string
	Indicador  string
	Valor      int64
}

// DiasSemContato é a mesma janela de regrasContato.DIAS_SEM_CONTATO no painel.
const DiasSemContato = 60

// SQLRetrato grava o retrato do mês ?1. ?2 = hoje (AAAA-MM-DD, no fuso da igreja), ?3 = o
// instante de 60 dias atrás (RFC 3339) e ?4 = quando foi gravado. INSERT OR IGNORE: o
// primeiro retrato do mês vale; quem chegar depois não muda nada.
const SQLRetrato = `WITH base AS (
  SELECT r.setor, r.celula,
    (r.cafe_pastor = 'S' AND r.estacao_dna = 'S' AND r.acomp_inicial = 'S' AND r.nova_criatura = 'S' AND r.batismo = 'S' AND r.batismo_espirito = 'S') AS completa,
    (TRIM(r.discipulador) <> '') AS com_disc,
    (SELECT MAX(` + QuandoContato + `) FROM anotacoes a WHERE a.resposta_id = r.id) AS ultimo,
    COALESCE((SELECT a.lembrar_em FROM anotacoes a WHERE a.resposta_id = r.id ORDER BY ` + QuandoContato + ` DESC, a.id DESC LIMIT 1), '') AS lembrete
  FROM respostas r WHERE r.excluido_em IS NULL
), b AS (
  SELECT setor, celula, completa, com_disc,
    CASE WHEN ultimo IS NULL THEN 1 WHEN lembrete <> '' THEN lembrete <= ?2 ELSE ultimo < ?3 END AS cuidado
  FROM base
), niveis AS (
  SELECT 'area' AS tipo, '' AS nome, completa, com_disc, cuidado FROM b
  UNION ALL SELECT 'setor', setor, completa, com_disc, cuidado FROM b WHERE setor <> ''
  UNION ALL SELECT 'celula', celula, completa, com_disc, cuidado FROM b WHERE celula <> ''
)
INSERT OR IGNORE INTO retrato_mensal (mes, escopo_tipo, escopo_nome, indicador, valor, criado_em)
SELECT ?1, tipo, nome, 'pessoas', COUNT(*), ?4 FROM niveis GROUP BY tipo, nome
UNION ALL SELECT ?1, tipo, nome, 'jornada_completa', SUM(completa), ?4 FROM niveis GROUP BY tipo, nome
UNION ALL SELECT ?1, tipo, nome, 'com_discipulador', SUM(com_disc), ?4 FROM niveis GROUP BY tipo, nome
UNION ALL SELECT ?1, tipo, nome, 'precisam_cuidado', SUM(cuidado), ?4 FROM niveis GROUP BY tipo, nome`

// GarantirRetrato grava o retrato do mês de hoje, se ainda não existe. hoje e mes vêm no
// fuso da igreja (quem chama converte).
func (s *Store) GarantirRetrato(ctx context.Context, mes, hoje string, now time.Time) error {
	res, err := s.DB.Do(ctx, turso.Stmt{SQL: `SELECT 1 FROM retrato_mensal WHERE mes = ? AND escopo_tipo = 'area' LIMIT 1`, Args: []any{mes}})
	if err != nil {
		return err
	}
	if len(res[0].Rows) > 0 {
		return nil
	}
	_, err = s.DB.Do(ctx, turso.Stmt{SQL: SQLRetrato, Args: []any{mes, hoje, iso(now.Add(-DiasSemContato * 24 * time.Hour)), iso(now)}})
	return err
}

// ListRetratos devolve os retratos a partir do mês desde (inclusive) que o escopo enxerga:
// a área toda vê tudo; quem lidera setores vê os setores e as células deles; quem lidera
// células vê as células. Quem só discipula não vê retrato (não tem Indicadores).
func (s *Store) ListRetratos(ctx context.Context, sc Scope, desde string) ([]Retrato, error) {
	cond := `1 = 1`
	args := []any{desde}
	if !sc.Todos {
		if len(sc.Setores) == 0 && len(sc.Celulas) == 0 {
			return []Retrato{}, nil
		}
		cond = `(escopo_tipo = 'setor' AND escopo_nome IN (` + marks(len(sc.Setores)+1) + `))
		  OR (escopo_tipo = 'celula' AND (escopo_nome IN (` + marks(len(sc.Celulas)+1) + `)
		      OR escopo_nome IN (SELECT c.nome FROM celulas c JOIN setores st ON st.id = c.setor_id WHERE st.nome IN (` + marks(len(sc.Setores)+1) + `))))`
		// Um "" a mais em cada lista evita IN () vazio e não casa com nenhum escopo.
		for _, lista := range [][]string{sc.Setores, sc.Celulas, sc.Setores} {
			args = append(args, "")
			for _, n := range lista {
				args = append(args, n)
			}
		}
	}
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL:  `SELECT mes, escopo_tipo, escopo_nome, indicador, valor FROM retrato_mensal WHERE mes >= ? AND (` + cond + `) ORDER BY mes, escopo_tipo, escopo_nome, indicador`,
		Args: args,
	})
	if err != nil {
		return nil, err
	}
	out := make([]Retrato, 0, len(res[0].Rows))
	for _, row := range res[0].Rows {
		out = append(out, Retrato{Mes: turso.Str(row, 0), EscopoTipo: turso.Str(row, 1), EscopoNome: turso.Str(row, 2), Indicador: turso.Str(row, 3), Valor: turso.Int(row, 4)})
	}
	return out, nil
}
