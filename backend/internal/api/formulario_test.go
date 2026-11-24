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
	rep := enviarFormulario(s, []byte(`{"consentimento":"S","nome":"Ana Silva","nascimento":"2026-11-15"}`))
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
			body := `{"consentimento":"S","nome":"Ana Silva","nascimento":"` + tt.date + `"}`
			rep := enviarFormulario(s, []byte(body))
			if (rep.body["ok"] == true) != tt.ok {
				t.Fatalf("resposta = %#v, ok = %v", rep.body, tt.ok)
			}
		})
	}
}

func TestFormularioBatismoRequerCafeENovaCriatura(t *testing.T) {
	for _, campos := range []string{
		`"cafePastor":"S","novaCriatura":"N"`,
		`"cafePastor":"N","novaCriatura":"S"`,
	} {
		db := &apiTestDB{}
		s := testAPIServer(db)
		rep := enviarFormulario(s, []byte(`{"_requestId":"0123456789abcdef0123456789abcdef","consentimento":"S","nome":"Ana Silva","nascimento":"1990-01-01","batismo":"S",`+campos+`}`))
		if rep.body["erro"] != "batismo_requisitos" || len(db.txCalls) != 0 {
			t.Fatalf("resposta = %#v, transações = %d", rep.body, len(db.txCalls))
		}
	}
}

func TestFormularioAcceptsTodayAndPassesRequestID(t *testing.T) {
	db := &apiTestDB{}
	s := testAPIServer(db)
	const id = "0123456789abcdef0123456789abcdef"
	body := `{"_requestId":"` + id + `","consentimento":"S","nome":"Ana Silva","nascimento":"2026-11-14"}`

	rep := enviarFormulario(s, []byte(body))
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if len(db.txCalls) != 1 {
		t.Fatalf("chamadas ao banco: %#v", db.doCalls)
	}
	stmt := db.txCalls[0][0]
	if !strings.Contains(stmt.SQL, "ON CONFLICT(request_id) DO NOTHING") || stmt.Args[0] != id {
		t.Errorf("gravação não usa id de reenvio: %#v", stmt)
	}
}

func TestFormularioGeneratesIDForOlderClients(t *testing.T) {
	db := &apiTestDB{}
	s := testAPIServer(db)
	rep := enviarFormulario(s, []byte(`{"consentimento":"S","nome":"Ana Silva","nascimento":"2026-11-14"}`))
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if len(db.txCalls) != 1 {
		t.Fatalf("chamadas ao banco: %#v", db.doCalls)
	}
	if id := db.txCalls[0][0].Args[0].(string); !validRequestID(id) {
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
	rep := enviarFormulario(s, body)
	if rep.body["erro"] != "dados_invalidos" {
		t.Fatalf("erro = %v, queria dados_invalidos", rep.body["erro"])
	}
}

func TestTelefoneBR(t *testing.T) {
	casos := map[string]string{"": "", "(85) 99876-5432": "85998765432", "+55 85 3212-3456": "8532123456", "085998765432": "-", "1234": "-"}
	for entrada, quer := range casos {
		got, ok := telefoneBR(entrada)
		if quer == "-" {
			if ok {
				t.Errorf("%q aceito como %q, devia recusar", entrada, got)
			}
		} else if !ok || got != quer {
			t.Errorf("%q = %q (%v), queria %q", entrada, got, ok, quer)
		}
	}
}

func TestFormularioExigeConsentimento(t *testing.T) {
	db := &apiTestDB{}
	s := testAPIServer(db)
	rep := enviarFormulario(s, []byte(`{"nome":"Ana Silva","nascimento":"2026-11-14"}`))
	if rep.body["erro"] != "consentimento" {
		t.Fatalf("erro = %v, queria consentimento", rep.body["erro"])
	}
	if len(db.txCalls)+len(db.doCalls) != 0 {
		t.Fatalf("consultou o banco sem consentimento: %#v %#v", db.doCalls, db.txCalls)
	}
}

// enviarFormulario simula a página: inclui uma marca emitida 10 s antes e um IP
// fictício (documentação, RFC 5737), como um envio normal depois da Spec 007.
func enviarFormulario(s *Server, body []byte) reply {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return s.formulario(context.Background(), body, "203.0.113.7")
	}
	marca, _ := json.Marshal(s.marcaFormulario(s.Now().Add(-10 * time.Second)))
	raw["_marca"] = marca
	b, _ := json.Marshal(raw)
	return s.formulario(context.Background(), b, "203.0.113.7")
}
