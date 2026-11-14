package api

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	"vec/backend/internal/store"
	"vec/backend/internal/turso"
)

type apiTestDB struct {
	doCalls [][]turso.Stmt
	txCalls [][]turso.Stmt
}

func (d *apiTestDB) Do(_ context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	d.doCalls = append(d.doCalls, append([]turso.Stmt(nil), stmts...))
	results := make([]*turso.Result, len(stmts))
	for i := range results {
		results[i] = &turso.Result{}
	}
	return results, nil
}

func (d *apiTestDB) Tx(_ context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	d.txCalls = append(d.txCalls, append([]turso.Stmt(nil), stmts...))
	results := make([]*turso.Result, len(stmts))
	for i := range results {
		results[i] = &turso.Result{}
	}
	return results, nil
}

func testAPIServer(db turso.DB) *Server {
	return &Server{
		Store: &store.Store{DB: db},
		Now:   func() time.Time { return time.Date(2026, 11, 14, 12, 0, 0, 0, time.UTC) },
		Log:   slog.New(slog.NewTextHandler(io.Discard, nil)),
	}
}

func TestFormularioRejectsFutureLocalDate(t *testing.T) {
	s := testAPIServer(nil)
	rep := s.formulario(context.Background(), []byte(`{"nome":"Ana Silva","nascimento":"2026-11-15"}`))
	if rep.body["erro"] != "nascimento_invalido" {
		t.Fatalf("erro = %v, queria nascimento_invalido", rep.body["erro"])
	}
}

func TestFormularioBirthDateUsesFortalezaDayBoundary(t *testing.T) {
	tests := []struct {
		name string
		now  time.Time
		date string
		ok   bool
	}{
		{
			name: "antes da meia-noite local",
			now:  time.Date(2026, 11, 15, 2, 59, 59, 0, time.UTC),
			date: "2026-11-15",
		},
		{
			name: "depois da meia-noite local",
			now:  time.Date(2026, 11, 15, 3, 0, 0, 0, time.UTC),
			date: "2026-11-15",
			ok:   true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db := &apiTestDB{}
			s := testAPIServer(db)
			s.Now = func() time.Time { return tt.now }
			body := `{"nome":"Ana Silva","nascimento":"` + tt.date + `"}`
			rep := s.formulario(context.Background(), []byte(body))
			if (rep.body["ok"] == true) != tt.ok {
				t.Fatalf("resposta = %#v, ok = %v", rep.body, tt.ok)
			}
		})
	}
}

func TestFormularioAcceptsTodayAndPassesRequestID(t *testing.T) {
	db := &apiTestDB{}
	s := testAPIServer(db)
	const id = "0123456789abcdef0123456789abcdef"
	body := `{"_requestId":"` + id + `","nome":"Ana Silva","nascimento":"2026-11-14"}`

	rep := s.formulario(context.Background(), []byte(body))
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if len(db.doCalls) != 2 || len(db.doCalls[1]) != 1 {
		t.Fatalf("chamadas ao banco: %#v", db.doCalls)
	}
	stmt := db.doCalls[1][0]
	if !strings.Contains(stmt.SQL, "ON CONFLICT(request_id) DO NOTHING") || stmt.Args[0] != id {
		t.Errorf("gravação não usa id de reenvio: %#v", stmt)
	}
}

func TestFormularioGeneratesIDForOlderClients(t *testing.T) {
	db := &apiTestDB{}
	s := testAPIServer(db)
	rep := s.formulario(context.Background(), []byte(`{"nome":"Ana Silva","nascimento":"2026-11-14"}`))
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if len(db.doCalls) != 2 || len(db.doCalls[1]) != 1 {
		t.Fatalf("chamadas ao banco: %#v", db.doCalls)
	}
	if id := db.doCalls[1][0].Args[0].(string); !validRequestID(id) {
		t.Errorf("id gerado inválido: %q", id)
	}
}

func TestFormularioRejectsInvalidRequestID(t *testing.T) {
	s := testAPIServer(nil)
	body, _ := json.Marshal(map[string]string{
		"_requestId": "nao-e-um-id",
		"nome":       "Ana Silva",
		"nascimento": "2026-11-14",
	})
	rep := s.formulario(context.Background(), body)
	if rep.body["erro"] != "dados_invalidos" {
		t.Fatalf("erro = %v, queria dados_invalidos", rep.body["erro"])
	}
}
