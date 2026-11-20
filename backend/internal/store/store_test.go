package store

import (
	"context"
	"strings"
	"testing"

	"vec/backend/internal/turso"
)

type recordingDB struct {
	doCalls   [][]turso.Stmt
	txCalls   [][]turso.Stmt
	txResult  []*turso.Result
	doResults [][]*turso.Result // respostas de Do, em ordem; vazio = resultados em branco
}

func (d *recordingDB) Do(_ context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	d.doCalls = append(d.doCalls, append([]turso.Stmt(nil), stmts...))
	if len(d.doResults) > 0 {
		next := d.doResults[0]
		d.doResults = d.doResults[1:]
		return next, nil
	}
	results := make([]*turso.Result, len(stmts))
	for i := range results {
		results[i] = &turso.Result{}
	}
	return results, nil
}

func (d *recordingDB) Tx(_ context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	d.txCalls = append(d.txCalls, append([]turso.Stmt(nil), stmts...))
	if d.txResult != nil {
		return d.txResult, nil
	}
	results := make([]*turso.Result, len(stmts))
	for i := range results {
		results[i] = &turso.Result{}
	}
	return results, nil
}

func TestInsertRespostaUsesRequestIDForIdempotency(t *testing.T) {
	db := &recordingDB{}
	st := &Store{DB: db}
	err := st.InsertResposta(context.Background(), Resposta{
		RequestID: "0123456789abcdef0123456789abcdef",
		CriadoEm:  "2026-11-14T12:00:00Z",
		V:         map[string]string{"nome": "Ana Silva"},
	})
	if err != nil {
		t.Fatal(err)
	}
	stmt := db.txCalls[0][0]
	if !strings.Contains(stmt.SQL, "ON CONFLICT(request_id) DO NOTHING") {
		t.Fatalf("SQL sem idempotência: %s", stmt.SQL)
	}
	if stmt.Args[0] != "0123456789abcdef0123456789abcdef" {
		t.Errorf("primeiro parâmetro = %v", stmt.Args[0])
	}
}

func TestImportarRespostasBackfillsLegacyAndUsesImportKey(t *testing.T) {
	db := &recordingDB{txResult: []*turso.Result{{}, {Affected: 1}}}
	st := &Store{DB: db}
	r := Resposta{
		CriadoEm:  "2026-11-14T12:00:00Z",
		ImportKey: "hash:0",
		V:         map[string]string{"nome": "Ana Silva", "nascimento": "1990-01-02"},
	}

	novas, err := st.ImportarRespostas(context.Background(), []Resposta{r})
	if err != nil {
		t.Fatal(err)
	}
	if novas != 1 {
		t.Fatalf("novas = %d, queria 1", novas)
	}
	stmts := db.txCalls[0]
	if len(stmts) != 2 {
		t.Fatalf("esperava backfill e insert, recebeu %d instruções", len(stmts))
	}
	if !strings.Contains(stmts[0].SQL, "UPDATE respostas SET import_key = ?") ||
		!strings.Contains(stmts[0].SQL, "NOT EXISTS (SELECT 1 FROM respostas WHERE import_key = ?)") {
		t.Errorf("backfill legado inesperado: %s", stmts[0].SQL)
	}
	if stmts[0].Args[0] != r.ImportKey || stmts[0].Args[len(stmts[0].Args)-1] != r.ImportKey {
		t.Errorf("chave de backfill ausente: %#v", stmts[0].Args)
	}
	if !strings.Contains(stmts[1].SQL, "ON CONFLICT(import_key) DO NOTHING") || stmts[1].Args[0] != r.ImportKey {
		t.Errorf("insert sem chave estável: %#v", stmts[1])
	}
}

func TestImportarRespostasRequiresImportKeyBeforeWriting(t *testing.T) {
	db := &recordingDB{}
	st := &Store{DB: db}
	_, err := st.ImportarRespostas(context.Background(), []Resposta{{CriadoEm: "2026-11-14T12:00:00Z"}})
	if err == nil {
		t.Fatal("importação sem chave deveria falhar")
	}
	if len(db.txCalls) != 0 {
		t.Fatalf("houve gravação apesar da chave ausente: %#v", db.txCalls)
	}
}

func TestEscopoSQL(t *testing.T) {
	tests := []struct {
		name  string
		scope Scope
		cond  string
		args  []any
		ok    bool
	}{
		{"area", Scope{Todos: true}, "1 = 1", nil, true},
		{"setor", Scope{Setores: []string{"Norte", "Sul"}}, "(setor IN (?, ?))", []any{"Norte", "Sul"}, true},
		{"celula", Scope{Celulas: []string{"Hope"}}, "(celula IN (?))", []any{"Hope"}, true},
		{"discipulador", Scope{Discipulador: 42}, "(discipulador_id = ?)", []any{int64(42)}, true},
		{"combinado", Scope{Setores: []string{"Norte"}, Celulas: []string{"Hope"}, Discipulador: 42}, "(setor IN (?) OR celula IN (?) OR discipulador_id = ?)", []any{"Norte", "Hope", int64(42)}, true},
		{"vazio", Scope{}, "()", nil, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cond, args, ok := escopoSQL(tt.scope)
			if cond != tt.cond || ok != tt.ok {
				t.Errorf("escopoSQL() = %q, %v; queria %q, %v", cond, ok, tt.cond, tt.ok)
			}
			if len(args) != len(tt.args) {
				t.Fatalf("argumentos = %#v, queria %#v", args, tt.args)
			}
			for i := range tt.args {
				if args[i] != tt.args[i] {
					t.Errorf("argumentos = %#v, queria %#v", args, tt.args)
				}
			}
		})
	}
}

func TestListRespostasUsesScopeInBothQueries(t *testing.T) {
	db := &recordingDB{}
	scope := Scope{Setores: []string{"Norte"}, Celulas: []string{"Hope"}}
	_, err := (&Store{DB: db}).ListRespostas(context.Background(), scope)
	if err != nil {
		t.Fatal(err)
	}
	if len(db.doCalls) != 1 || len(db.doCalls[0]) != 2 {
		t.Fatalf("consultas = %#v", db.doCalls)
	}
	cond, args, _ := escopoSQL(scope)
	for _, stmt := range db.doCalls[0] {
		if !strings.Contains(stmt.SQL, "WHERE excluido_em IS NULL AND "+cond) {
			t.Errorf("SQL sem escopo exato %q: %s", cond, stmt.SQL)
		}
		if len(stmt.Args) != len(args) || stmt.Args[0] != args[0] || stmt.Args[1] != args[1] {
			t.Errorf("argumentos = %#v, queria %#v", stmt.Args, args)
		}
	}
}

func TestListRespostasWithEmptyScopeDoesNotQuery(t *testing.T) {
	db := &recordingDB{}
	respostas, err := (&Store{DB: db}).ListRespostas(context.Background(), Scope{})
	if err != nil {
		t.Fatal(err)
	}
	if respostas != nil || len(db.doCalls) != 0 {
		t.Fatalf("escopo vazio retornou %#v e executou %#v", respostas, db.doCalls)
	}
}
