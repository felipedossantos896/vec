package store

import (
	"time"

	"vec/backend/internal/turso"
)

// ---------------------------------------------------------------------------
// Histórico da jornada: quando cada etapa foi marcada como concluída
// ---------------------------------------------------------------------------
// jornada_eventos tem uma linha por pessoa e etapa. INSERT OR IGNORE mantém a data
// original enquanto a etapa continua concluída; desmarcar apaga a linha.

// Jornada são as seis etapas, na ordem do formulário.
var Jornada = []string{"cafePastor", "estacaoDNA", "acompInicial", "novaCriatura", "batismo", "batismoEspirito"}

func colunaDe(chave string) string {
	for _, c := range Campos {
		if c.Chave == chave {
			return c.Coluna
		}
	}
	panic("campo desconhecido: " + chave)
}

// jornadaDoEnvio registra, na data do envio, as etapas marcadas num formulário.
func jornadaDoEnvio(requestID string) []turso.Stmt {
	out := make([]turso.Stmt, 0, len(Jornada))
	for _, k := range Jornada {
		out = append(out, turso.Stmt{
			SQL:  `INSERT OR IGNORE INTO jornada_eventos (resposta_id, etapa, em, origem) SELECT id, ?, criado_em, 'formulario' FROM respostas WHERE request_id = ? AND ` + colunaDe(k) + ` = 'S'`,
			Args: []any{k, requestID},
		})
	}
	return out
}

// jornadaFaltante registra as etapas de cadastros que ainda não têm data (importações).
func jornadaFaltante() []turso.Stmt {
	out := make([]turso.Stmt, 0, len(Jornada))
	for _, k := range Jornada {
		out = append(out, turso.Stmt{
			SQL:  `INSERT OR IGNORE INTO jornada_eventos (resposta_id, etapa, em, origem) SELECT id, ?, criado_em, 'formulario' FROM respostas WHERE ` + colunaDe(k) + ` = 'S'`,
			Args: []any{k},
		})
	}
	return out
}

// jornadaDaEdicao acompanha uma edição pelo painel: etapa marcada ganha a data de agora
// (se ainda não tinha), etapa desmarcada perde a data. Só vale se a edição foi gravada,
// o que se confere pela marca de atualização que a própria edição deixou.
func jornadaDaEdicao(id int64, v map[string]string, por string, now time.Time) []turso.Stmt {
	gravou := `EXISTS (SELECT 1 FROM respostas WHERE id = ? AND atualizado_em = ? AND atualizado_por = ?)`
	quando := iso(now)
	args := []any{id, quando, por}
	if BatismoSemRequisitos(v) {
		// Um salvamento anterior no mesmo segundo não deve autorizar eventos de uma edição recusada.
		gravou = `EXISTS (SELECT 1 FROM respostas WHERE id = ? AND atualizado_em = ? AND atualizado_por = ? AND batismo = 'S' AND cafe_pastor = ? AND nova_criatura = ?)`
		args = append(args, v["cafePastor"], v["novaCriatura"])
	}
	out := make([]turso.Stmt, 0, len(Jornada))
	for _, k := range Jornada {
		if v[k] == "S" {
			out = append(out, turso.Stmt{
				SQL:  `INSERT OR IGNORE INTO jornada_eventos (resposta_id, etapa, em, origem, por) SELECT ?, ?, ?, 'painel', ? WHERE ` + gravou,
				Args: append([]any{id, k, quando, por}, args...),
			})
		} else {
			out = append(out, turso.Stmt{
				SQL:  `DELETE FROM jornada_eventos WHERE resposta_id = ? AND etapa = ? AND ` + gravou,
				Args: append([]any{id, k}, args...),
			})
		}
	}
	return out
}
