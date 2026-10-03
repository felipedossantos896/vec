package turso

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// servidor falso que guarda o corpo recebido e devolve uma resposta pronta
func fake(t *testing.T, status int, resposta string, recebido *map[string]any) *Client {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v2/pipeline" {
			t.Errorf("caminho inesperado: %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer segredo" {
			t.Errorf("Authorization inesperado: %q", got)
		}
		b, _ := io.ReadAll(r.Body)
		if recebido != nil {
			_ = json.Unmarshal(b, recebido)
		}
		w.WriteHeader(status)
		_, _ = io.WriteString(w, resposta)
	}))
	t.Cleanup(srv.Close)
	c, err := New(srv.URL, "segredo")
	if err != nil {
		t.Fatal(err)
	}
	return c
}

func TestNewConverteLibsql(t *testing.T) {
	c, err := New("libsql://meu-banco.turso.io/", "t")
	if err != nil {
		t.Fatal(err)
	}
	if c.endpoint != "https://meu-banco.turso.io/v2/pipeline" {
		t.Errorf("endpoint: %s", c.endpoint)
	}
	if _, err := New("", "t"); err == nil {
		t.Error("URL vazia deveria falhar")
	}
	if _, err := New("ftp://x", "t"); err == nil {
		t.Error("esquema inválido deveria falhar")
	}
}

func TestDoLeValoresEEnviaParametros(t *testing.T) {
	var corpo map[string]any
	c := fake(t, 200, `{"baton":null,"results":[
	  {"type":"ok","response":{"type":"execute","result":{
	    "cols":[{"name":"id"},{"name":"nome"},{"name":"nota"},{"name":"vazio"},{"name":"bin"}],
	    "rows":[[{"type":"integer","value":"42"},{"type":"text","value":"Maria"},{"type":"float","value":1.5},{"type":"null"},{"type":"blob","base64":"AQI="}]],
	    "affected_row_count":0,"last_insert_rowid":null}}},
	  {"type":"ok","response":{"type":"close"}}]}`, &corpo)

	res, err := c.Do(context.Background(), Stmt{SQL: "SELECT ?, ?, ?, ?, ?", Args: []any{"a", 7, true, nil, 2.5}})
	if err != nil {
		t.Fatal(err)
	}
	r := res[0]
	if len(r.Rows) != 1 || Int(r.Rows[0], 0) != 42 || Str(r.Rows[0], 1) != "Maria" || r.Rows[0][2].(float64) != 1.5 || r.Rows[0][3] != nil {
		t.Errorf("linhas inesperadas: %#v", r.Rows)
	}
	if b := r.Rows[0][4].([]byte); len(b) != 2 || b[0] != 1 || b[1] != 2 {
		t.Errorf("blob inesperado: %v", b)
	}
	if strings.Join(r.Cols, ",") != "id,nome,nota,vazio,bin" {
		t.Errorf("colunas: %v", r.Cols)
	}

	// o que foi enviado
	reqs := corpo["requests"].([]any)
	if len(reqs) != 2 || reqs[1].(map[string]any)["type"] != "close" {
		t.Fatalf("pipeline inesperado: %v", reqs)
	}
	args := reqs[0].(map[string]any)["stmt"].(map[string]any)["args"].([]any)
	wantTypes := []string{"text", "integer", "integer", "null", "float"}
	for i, a := range args {
		m := a.(map[string]any)
		if m["type"] != wantTypes[i] {
			t.Errorf("arg %d: tipo %v, queria %s", i, m["type"], wantTypes[i])
		}
	}
	if args[1].(map[string]any)["value"] != "7" || args[2].(map[string]any)["value"] != "1" {
		t.Errorf("inteiros devem ir como texto: %v", args)
	}
}

func TestDoErroDoBanco(t *testing.T) {
	c := fake(t, 200, `{"results":[{"type":"error","error":{"message":"UNIQUE constraint failed: a.b","code":"SQLITE_CONSTRAINT"}},{"type":"ok","response":{"type":"close"}}]}`, nil)
	_, err := c.Do(context.Background(), Stmt{SQL: "INSERT ..."})
	if err == nil || !IsConstraint(err) {
		t.Errorf("esperava erro de restrição, veio %v", err)
	}
}

func TestHTTPNaoAutorizado(t *testing.T) {
	c := fake(t, 401, `{"message":"Unauthorized"}`, nil)
	_, err := c.Do(context.Background(), Stmt{SQL: "SELECT 1"})
	if err == nil || !strings.Contains(err.Error(), "acesso negado") {
		t.Errorf("mensagem inesperada: %v", err)
	}
}

func TestTxMontaCondicoesELeResultados(t *testing.T) {
	var corpo map[string]any
	c := fake(t, 200, `{"results":[{"type":"ok","response":{"type":"batch","result":{
	  "step_results":[{"cols":[],"rows":[],"affected_row_count":0},{"cols":[],"rows":[],"affected_row_count":1,"last_insert_rowid":"5"},{"cols":[],"rows":[],"affected_row_count":0},null],
	  "step_errors":[null,null,null,null]}}},{"type":"ok","response":{"type":"close"}}]}`, &corpo)

	res, err := c.Tx(context.Background(), Stmt{SQL: "INSERT INTO a VALUES (1)"})
	if err != nil {
		t.Fatal(err)
	}
	if len(res) != 1 || res[0].Affected != 1 || res[0].LastInsertID != 5 {
		t.Errorf("resultado: %#v", res[0])
	}
	steps := corpo["requests"].([]any)[0].(map[string]any)["batch"].(map[string]any)["steps"].([]any)
	if len(steps) != 4 { // BEGIN, instrução, COMMIT, ROLLBACK
		t.Fatalf("esperava 4 passos, veio %d", len(steps))
	}
	sql := func(i int) string { return steps[i].(map[string]any)["stmt"].(map[string]any)["sql"].(string) }
	if sql(0) != "BEGIN IMMEDIATE" || sql(2) != "COMMIT" || sql(3) != "ROLLBACK" {
		t.Errorf("passos: %s | %s | %s | %s", sql(0), sql(1), sql(2), sql(3))
	}
	cond := steps[3].(map[string]any)["condition"].(map[string]any)
	if cond["type"] != "not" || cond["cond"].(map[string]any)["step"] != float64(2) {
		t.Errorf("ROLLBACK deve rodar só se o COMMIT não aconteceu: %v", cond)
	}
}

func TestTxFalhaNoMeio(t *testing.T) {
	c := fake(t, 200, `{"results":[{"type":"ok","response":{"type":"batch","result":{
	  "step_results":[{"cols":[],"rows":[],"affected_row_count":0},null,null,{"cols":[],"rows":[],"affected_row_count":0}],
	  "step_errors":[null,{"message":"CHECK constraint failed: perfil","code":"SQLITE_CONSTRAINT"},null,null]}}},{"type":"ok","response":{"type":"close"}}]}`, nil)
	_, err := c.Tx(context.Background(), Stmt{SQL: "INSERT ..."})
	if err == nil || !strings.Contains(err.Error(), "CHECK") {
		t.Errorf("a transação deveria falhar com o erro do passo: %v", err)
	}
}
