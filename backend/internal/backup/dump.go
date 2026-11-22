// Package backup gera um dump SQL restaurável do banco (Spec 006). Lê com qualquer
// turso.DB (o workflow usa um token só de leitura) e escreve o mesmo formato do
// `.dump` do SQLite: o resultado carrega com `sqlite3 novo.db < dump.sql` ou com
// `turso db create --from-dump`. Nunca imprime dados: só escreve no io.Writer.
package backup

import (
	"context"
	"encoding/hex"
	"fmt"
	"io"
	"math"
	"strconv"
	"strings"

	"vec/backend/internal/turso"
)

// Pagina é quantas linhas são lidas por consulta (fotos em BLOB pesam).
const Pagina = 200

type objeto struct{ tipo, nome, sql string }

// interna diz se a tabela é do SQLite ou do Turso e não deve ir para o dump.
func interna(nome string) bool {
	n := strings.ToLower(nome)
	return strings.HasPrefix(n, "sqlite_") || strings.HasPrefix(n, "libsql_") || strings.HasPrefix(n, "_litestream") || strings.HasPrefix(n, "_cf_")
}

// Dump escreve o esquema, os dados e os índices e devolve a contagem de linhas de
// cada tabela (o manifesto que a verificação compara depois da carga).
func Dump(ctx context.Context, db turso.DB, w io.Writer) (map[string]int, error) {
	res, err := db.Do(ctx, turso.Stmt{SQL: `SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY rowid`})
	if err != nil {
		return nil, fmt.Errorf("lendo o esquema: %w", err)
	}
	var tabelas, depois []objeto
	sequencia := false
	for _, r := range res[0].Rows {
		o := objeto{turso.Str(r, 0), turso.Str(r, 1), turso.Str(r, 2)}
		switch {
		case o.tipo == "table" && strings.EqualFold(o.nome, "sqlite_sequence"):
			sequencia = true
		case interna(o.nome):
		case o.tipo == "table":
			tabelas = append(tabelas, o)
		case o.tipo == "index" || o.tipo == "trigger" || o.tipo == "view":
			depois = append(depois, o)
		}
	}
	if len(tabelas) == 0 {
		return nil, fmt.Errorf("nenhuma tabela encontrada")
	}
	contagens := make(map[string]int, len(tabelas))
	if _, err := io.WriteString(w, "PRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n"); err != nil {
		return nil, err
	}
	for _, t := range tabelas {
		if _, err := fmt.Fprintf(w, "%s;\n", t.sql); err != nil {
			return nil, err
		}
		n, err := dumpTabela(ctx, db, t.nome, w)
		if err != nil {
			return nil, err
		}
		contagens[t.nome] = n
	}
	if sequencia {
		if _, err := dumpSequencia(ctx, db, w); err != nil {
			return nil, err
		}
	}
	for _, o := range depois {
		if _, err := fmt.Fprintf(w, "%s;\n", o.sql); err != nil {
			return nil, err
		}
	}
	if _, err := io.WriteString(w, "COMMIT;\n"); err != nil {
		return nil, err
	}
	return contagens, nil
}

func dumpTabela(ctx context.Context, db turso.DB, nome string, w io.Writer) (int, error) {
	total := 0
	for {
		res, err := db.Do(ctx, turso.Stmt{
			SQL:  `SELECT * FROM ` + Ident(nome) + ` ORDER BY rowid LIMIT ? OFFSET ?`,
			Args: []any{int64(Pagina), int64(total)},
		})
		if err != nil {
			return 0, fmt.Errorf("lendo a tabela %s: %w", nome, err)
		}
		for _, r := range res[0].Rows {
			vals := make([]string, len(r))
			for i, v := range r {
				if vals[i], err = Literal(v); err != nil {
					return 0, fmt.Errorf("tabela %s: %w", nome, err)
				}
			}
			if _, err := fmt.Fprintf(w, "INSERT INTO %s VALUES(%s);\n", Ident(nome), strings.Join(vals, ",")); err != nil {
				return 0, err
			}
		}
		total += len(res[0].Rows)
		if len(res[0].Rows) < Pagina {
			return total, nil
		}
	}
}

func dumpSequencia(ctx context.Context, db turso.DB, w io.Writer) (int, error) {
	res, err := db.Do(ctx, turso.Stmt{SQL: `SELECT name, seq FROM sqlite_sequence`})
	if err != nil {
		return 0, fmt.Errorf("lendo sqlite_sequence: %w", err)
	}
	if len(res[0].Rows) == 0 {
		return 0, nil
	}
	if _, err := io.WriteString(w, "DELETE FROM sqlite_sequence;\n"); err != nil {
		return 0, err
	}
	for _, r := range res[0].Rows {
		seq, err := Literal(r[1])
		if err != nil {
			return 0, err
		}
		if _, err := fmt.Fprintf(w, "INSERT INTO sqlite_sequence VALUES(%s,%s);\n", texto(turso.Str(r, 0)), seq); err != nil {
			return 0, err
		}
	}
	return len(res[0].Rows), nil
}

// Ident cita um nome de tabela como o SQLite faz.
func Ident(nome string) string {
	return `"` + strings.ReplaceAll(nome, `"`, `""`) + `"`
}

func texto(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

// Literal converte um valor lido do Turso num literal SQL que volta igual.
func Literal(v any) (string, error) {
	switch x := v.(type) {
	case nil:
		return "NULL", nil
	case int64:
		return strconv.FormatInt(x, 10), nil
	case float64:
		if math.IsNaN(x) || math.IsInf(x, 0) {
			return "", fmt.Errorf("número não representável")
		}
		s := strconv.FormatFloat(x, 'g', -1, 64)
		if !strings.ContainsAny(s, ".eE") {
			s += ".0" // continua REAL ao voltar
		}
		return s, nil
	case string:
		return texto(x), nil
	case []byte:
		return "X'" + hex.EncodeToString(x) + "'", nil
	}
	return "", fmt.Errorf("tipo de valor inesperado %T", v)
}
