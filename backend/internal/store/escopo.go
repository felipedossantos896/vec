package store

import (
	"strings"
	"time"
)

// escopoSQL devolve a condição que limita as respostas ao escopo.
// ok=false quando o escopo é vazio: sem escopo = sem dados (nunca "tudo").
func escopoSQL(sc Scope) (cond string, args []any, ok bool) {
	if sc.Todos {
		return `1 = 1`, nil, true
	}
	var conds []string
	if len(sc.Setores) > 0 {
		conds = append(conds, `setor IN (`+marks(len(sc.Setores))+`)`)
		for _, n := range sc.Setores {
			args = append(args, n)
		}
	}
	if len(sc.Celulas) > 0 {
		conds = append(conds, `celula IN (`+marks(len(sc.Celulas))+`)`)
		for _, n := range sc.Celulas {
			args = append(args, n)
		}
	}
	if sc.Discipulador != 0 {
		conds = append(conds, `discipulador_id = ?`)
		args = append(args, sc.Discipulador)
	}
	return `(` + strings.Join(conds, ` OR `) + `)`, args, len(conds) > 0
}

func marks(n int) string {
	return strings.TrimSuffix(strings.Repeat("?, ", n), ", ")
}

func iso(t time.Time) string { return t.UTC().Format(time.RFC3339) }

// idOuNuloTexto grava NULL quando o texto está vazio.
func idOuNuloTexto(s string) any {
	if s == "" {
		return nil
	}
	return s
}
