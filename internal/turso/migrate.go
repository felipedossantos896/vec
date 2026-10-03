package turso

import (
	"context"
	"errors"
	"fmt"
	"io/fs"
	"sort"
	"strings"
	"time"
)

// Migrate aplica, em ordem alfabética, os arquivos .sql de dir que ainda não
// foram aplicados. Cada arquivo roda dentro de uma transação junto com o
// registro em schema_migrations: ou entra tudo, ou nada.
//
// Devolve os nomes dos arquivos aplicados nesta execução.
func Migrate(ctx context.Context, db DB, files fs.FS, dir string) ([]string, error) {
	if _, err := db.Do(ctx, Stmt{SQL: `CREATE TABLE IF NOT EXISTS schema_migrations (
		versao TEXT PRIMARY KEY,
		aplicada_em TEXT NOT NULL
	)`}); err != nil {
		return nil, fmt.Errorf("criando schema_migrations: %w", err)
	}

	aplicadas, err := versoesAplicadas(ctx, db)
	if err != nil {
		return nil, err
	}

	entries, err := fs.ReadDir(files, dir)
	if err != nil {
		return nil, fmt.Errorf("lendo %s: %w", dir, err)
	}
	var nomes []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			nomes = append(nomes, e.Name())
		}
	}
	sort.Strings(nomes)

	var feitas []string
	for _, nome := range nomes {
		if aplicadas[nome] {
			continue
		}
		caminho := nome
		if dir != "" && dir != "." {
			caminho = dir + "/" + nome
		}
		raw, err := fs.ReadFile(files, caminho)
		if err != nil {
			return feitas, err
		}
		stmts, err := SplitStatements(string(raw))
		if err != nil {
			return feitas, fmt.Errorf("%s: %w", nome, err)
		}
		if len(stmts) == 0 {
			continue
		}
		lote := make([]Stmt, 0, len(stmts)+1)
		for _, s := range stmts {
			lote = append(lote, Stmt{SQL: s})
		}
		lote = append(lote, Stmt{
			SQL:  `INSERT INTO schema_migrations (versao, aplicada_em) VALUES (?, ?)`,
			Args: []any{nome, time.Now().UTC().Format(time.RFC3339)},
		})
		if _, err := db.Tx(ctx, lote...); err != nil {
			// Outra instância pode ter aplicado a mesma migration agora há pouco.
			if depois, e2 := versoesAplicadas(ctx, db); e2 == nil && depois[nome] {
				continue
			}
			return feitas, fmt.Errorf("aplicando %s: %w", nome, err)
		}
		feitas = append(feitas, nome)
	}
	return feitas, nil
}

func versoesAplicadas(ctx context.Context, db DB) (map[string]bool, error) {
	res, err := db.Do(ctx, Stmt{SQL: `SELECT versao FROM schema_migrations`})
	if err != nil {
		return nil, fmt.Errorf("lendo schema_migrations: %w", err)
	}
	out := map[string]bool{}
	for _, row := range res[0].Rows {
		out[Str(row, 0)] = true
	}
	return out, nil
}

// SplitStatements separa um script SQL em instruções, ignorando comentários
// (-- e /* */) e respeitando textos entre aspas. Não suporta CREATE TRIGGER,
// porque o corpo de um trigger contém ponto e vírgula.
func SplitStatements(script string) ([]string, error) {
	var out []string
	var cur strings.Builder
	rs := []rune(script)
	flush := func() {
		s := strings.TrimSpace(cur.String())
		cur.Reset()
		if s != "" {
			out = append(out, s)
		}
	}
	for i := 0; i < len(rs); i++ {
		c := rs[i]
		switch {
		case c == '\'' || c == '"' || c == '`':
			cur.WriteRune(c)
			for i++; i < len(rs); i++ {
				cur.WriteRune(rs[i])
				if rs[i] == c {
					if i+1 < len(rs) && rs[i+1] == c { // aspa duplicada = escape
						i++
						cur.WriteRune(rs[i])
						continue
					}
					break
				}
			}
		case c == '-' && i+1 < len(rs) && rs[i+1] == '-':
			for i < len(rs) && rs[i] != '\n' {
				i++
			}
			cur.WriteRune('\n')
		case c == '/' && i+1 < len(rs) && rs[i+1] == '*':
			i += 2
			for i+1 < len(rs) && !(rs[i] == '*' && rs[i+1] == '/') {
				i++
			}
			i++
			cur.WriteRune(' ')
		case c == ';':
			flush()
		default:
			cur.WriteRune(c)
		}
	}
	flush()
	for _, s := range out {
		if strings.Contains(strings.ToUpper(s), "CREATE TRIGGER") {
			return nil, errors.New("CREATE TRIGGER não é suportado pelo executor de migrations")
		}
	}
	return out, nil
}
