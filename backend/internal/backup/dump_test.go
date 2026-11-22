package backup

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"vec/backend/internal/turso"
)

// bancoFalso responde ao esquema e às páginas de cada tabela. Dados fictícios.
type bancoFalso struct {
	esquema [][]any
	tabelas map[string][][]any
	seq     [][]any
	paginas int
}

func (b *bancoFalso) Do(_ context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	st := stmts[0]
	switch {
	case strings.HasPrefix(st.SQL, "SELECT type, name, sql FROM sqlite_master"):
		return []*turso.Result{{Rows: b.esquema}}, nil
	case strings.HasPrefix(st.SQL, "SELECT name, seq FROM sqlite_sequence"):
		return []*turso.Result{{Rows: b.seq}}, nil
	case strings.HasPrefix(st.SQL, "SELECT * FROM "):
		b.paginas++
		nome := strings.Trim(strings.Fields(st.SQL)[3], `"`)
		lim, off := int(st.Args[0].(int64)), int(st.Args[1].(int64))
		rows := b.tabelas[nome]
		if off > len(rows) {
			off = len(rows)
		}
		fim := off + lim
		if fim > len(rows) {
			fim = len(rows)
		}
		return []*turso.Result{{Rows: rows[off:fim]}}, nil
	}
	return []*turso.Result{{}}, nil
}

func (b *bancoFalso) Tx(ctx context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	return b.Do(ctx, stmts...)
}

func exemplo() *bancoFalso {
	return &bancoFalso{
		esquema: [][]any{
			{"table", "pessoas", `CREATE TABLE pessoas (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, lat REAL, foto BLOB)`},
			{"table", "sqlite_sequence", `CREATE TABLE sqlite_sequence(name,seq)`},
			{"index", "idx_pessoas_nome", `CREATE INDEX idx_pessoas_nome ON pessoas(nome)`},
			{"table", "libsql_wasm_func_table", `CREATE TABLE libsql_wasm_func_table (name text)`},
			{"table", "schema_migrations", `CREATE TABLE schema_migrations (versao TEXT PRIMARY KEY, aplicada_em TEXT NOT NULL)`},
		},
		tabelas: map[string][][]any{
			"pessoas": {
				{int64(1), "Ana d'Ávila", -3.75, []byte{0x89, 0x50, 0x00, 0xff}},
				{int64(2), "Bia \"B\"\nlinha 2", nil, nil},
				{int64(3), "Caio", float64(2), []byte{}},
			},
			"schema_migrations": {{"0001_inicial.sql", "2026-11-14T00:00:00Z"}},
		},
		seq: [][]any{{"pessoas", int64(3)}},
	}
}

func TestLiteral(t *testing.T) {
	casos := map[string]any{
		"NULL": nil, "42": int64(42), "-7": int64(-7), "-3.75": -3.75, "2.0": float64(2), "1e+21": 1e21,
		"'Ana d''Ávila'": "Ana d'Ávila", "X'8950'": []byte{0x89, 0x50}, "X''": []byte{},
	}
	for want, v := range casos {
		if got, err := Literal(v); err != nil || got != want {
			t.Errorf("Literal(%#v) = %q, %v; queria %q", v, got, err, want)
		}
	}
	if _, err := Literal(struct{}{}); err == nil {
		t.Error("tipo desconhecido deveria falhar")
	}
}

func TestDumpOrdemContagensEInternas(t *testing.T) {
	var out bytes.Buffer
	c, err := Dump(context.Background(), exemplo(), &out)
	if err != nil {
		t.Fatal(err)
	}
	if c["pessoas"] != 3 || c["schema_migrations"] != 1 || len(c) != 2 {
		t.Fatalf("contagens = %v", c)
	}
	s := out.String()
	if strings.Contains(s, "libsql_wasm") || strings.Contains(s, "CREATE TABLE sqlite_sequence") {
		t.Fatalf("tabela interna no dump:\n%s", s)
	}
	ordem := []string{"PRAGMA foreign_keys=OFF;", "BEGIN TRANSACTION;", "CREATE TABLE pessoas", `INSERT INTO "pessoas"`,
		"CREATE TABLE schema_migrations", "DELETE FROM sqlite_sequence;", "INSERT INTO sqlite_sequence VALUES('pessoas',3);",
		"CREATE INDEX idx_pessoas_nome", "COMMIT;"}
	pos := -1
	for _, trecho := range ordem {
		i := strings.Index(s, trecho)
		if i <= pos {
			t.Fatalf("%q fora de ordem:\n%s", trecho, s)
		}
		pos = i
	}
}

func TestDumpPagina(t *testing.T) {
	b := exemplo()
	var muitas [][]any
	for i := 0; i < Pagina*2+5; i++ {
		muitas = append(muitas, []any{int64(i + 1), "x", nil, nil})
	}
	b.tabelas["pessoas"] = muitas
	c, err := Dump(context.Background(), b, &bytes.Buffer{})
	if err != nil || c["pessoas"] != Pagina*2+5 {
		t.Fatalf("contagem paginada = %v, %v", c, err)
	}
	if b.paginas != 3+1 { // 3 páginas de pessoas + 1 de schema_migrations
		t.Fatalf("páginas lidas = %d", b.paginas)
	}
}

func TestDumpSemTabelasFalha(t *testing.T) {
	if _, err := Dump(context.Background(), &bancoFalso{}, &bytes.Buffer{}); err == nil {
		t.Fatal("esquema vazio deveria falhar")
	}
}

// Carrega o dump num SQLite de verdade e confere que os valores voltam iguais.
func TestDumpCarregaNoSQLite(t *testing.T) {
	bin, err := exec.LookPath("sqlite3")
	if err != nil {
		t.Skip("sqlite3 não disponível")
	}
	var out bytes.Buffer
	if _, err := Dump(context.Background(), exemplo(), &out); err != nil {
		t.Fatal(err)
	}
	arq := filepath.Join(t.TempDir(), "r.db")
	carga := exec.Command(bin, arq)
	carga.Stdin = &out
	if msg, err := carga.CombinedOutput(); err != nil {
		t.Fatalf("dump não carregou: %v\n%s", err, msg)
	}
	consulta := func(q string) string {
		b, err := exec.Command(bin, arq, q).CombinedOutput()
		if err != nil {
			t.Fatalf("%s: %v %s", q, err, b)
		}
		return strings.TrimSpace(string(b))
	}
	if got := consulta(`SELECT group_concat(quote(id)||','||quote(nome)||','||quote(lat)||','||quote(foto)||','||typeof(lat), ' | ') FROM pessoas ORDER BY id`); got !=
		"1,'Ana d''Ávila',-3.75,X'895000FF',real | 2,'Bia \"B\"\nlinha 2',NULL,NULL,null | 3,'Caio',2.0,X'',real" {
		t.Fatalf("valores restaurados:\n%s", got)
	}
	if got := consulta(`PRAGMA integrity_check`); got != "ok" {
		t.Fatalf("integrity_check = %s", got)
	}
	if got := consulta(`SELECT seq FROM sqlite_sequence WHERE name = 'pessoas'`); got != "3" {
		t.Fatalf("sequência = %s", got)
	}
	if got := consulta(`SELECT count(*) FROM sqlite_master WHERE name = 'idx_pessoas_nome'`); got != "1" {
		t.Fatal("índice não restaurado")
	}
	_ = os.Remove(arq)
}
