package store

import (
	"context"
	"strings"
	"testing"

	"vec/backend/internal/turso"
)

type recordingDB struct {
	doCalls  [][]turso.Stmt
	txCalls  [][]turso.Stmt
	txResult []*turso.Result
}

func (d *recordingDB) Do(_ context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	d.doCalls = append(d.doCalls, append([]turso.Stmt(nil), stmts...))
	return make([]*turso.Result, len(stmts)), nil
}

func (d *recordingDB) Tx(_ context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	d.txCalls = append(d.txCalls, append([]turso.Stmt(nil), stmts...))
	if d.txResult != nil {
		return d.txResult, nil
	}
	return make([]*turso.Result, len(stmts)), nil
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
	stmt := db.doCalls[0][0]
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
