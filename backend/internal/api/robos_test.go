package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// Dados fictícios; IPs de documentação (RFC 5737).
const formularioValido = `{"consentimento":"S","nome":"Ana Silva","nascimento":"2000-01-02"}`

func comCampos(t *testing.T, base string, extra map[string]any) []byte {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal([]byte(base), &m); err != nil {
		t.Fatal(err)
	}
	for k, v := range extra {
		m[k] = v
	}
	b, _ := json.Marshal(m)
	return b
}

func TestMarcaFormulario(t *testing.T) {
	s := testAPIServer(nil)
	s.Secret = []byte(strings.Repeat("k", 32))
	agora := s.Now()
	emitida := s.marcaFormulario(agora.Add(-10 * time.Second))
	casos := map[string]struct {
		marca string
		erro  string
	}{
		"válida":           {emitida, ""},
		"no limite de 3 s": {s.marcaFormulario(agora.Add(-3 * time.Second)), ""},
		"rápida (1 s)":     {s.marcaFormulario(agora.Add(-time.Second)), "envio_rapido"},
		"velha (25 h)":     {s.marcaFormulario(agora.Add(-25 * time.Hour)), "envio_expirado"},
		"no futuro":        {s.marcaFormulario(agora.Add(time.Hour)), "envio_expirado"},
		"ausente":          {"", "envio_expirado"},
		"sem assinatura":   {strings.Split(emitida, ".")[0], "envio_expirado"},
		"horário trocado":  {fmt.Sprint(agora.Add(-time.Hour).Unix()) + "." + strings.Split(emitida, ".")[1], "envio_expirado"},
		"lixo":             {"abc.def", "envio_expirado"},
	}
	for nome, c := range casos {
		if got := s.conferirMarca(c.marca, agora); got != c.erro {
			t.Errorf("%s: %q, queria %q", nome, got, c.erro)
		}
	}
	// Outra chave do servidor não aceita a marca.
	outro := testAPIServer(nil)
	outro.Secret = []byte(strings.Repeat("z", 32))
	if outro.conferirMarca(emitida, agora) != "envio_expirado" {
		t.Error("marca de outra chave aceita")
	}
	// A marca não é o token de sessão: a chave é derivada com rótulo próprio.
	if string(s.chaveMarca()) == string(s.Secret) {
		t.Error("a marca deveria usar uma chave derivada")
	}
}

func TestFormularioArmadilhaRecusaSemGravar(t *testing.T) {
	db := &apiTestDB{}
	s := testAPIServer(db)
	var log bytes.Buffer
	s.Log = slog.New(slog.NewTextHandler(&log, nil))
	rep := enviarFormulario(s, comCampos(t, formularioValido, map[string]any{"_site": "http://spam.example"}))
	if rep.body["erro"] != "envio_recusado" || len(db.doCalls)+len(db.txCalls) != 0 {
		t.Fatalf("armadilha: %#v, chamadas %d/%d", rep.body, len(db.doCalls), len(db.txCalls))
	}
	if strings.Contains(log.String(), "Ana") || strings.Contains(log.String(), "203.0.113.7") || !strings.Contains(log.String(), "203.0.x.x") {
		t.Fatalf("log com dado do envio ou IP completo: %s", log.String())
	}
	// Armadilha vazia não atrapalha o envio normal.
	if rep := enviarFormulario(s, comCampos(t, formularioValido, map[string]any{"_site": ""})); rep.body["ok"] != true {
		t.Fatalf("envio normal: %#v", rep.body)
	}
}

func TestFormularioSemMarcaOuRapidoNaoGrava(t *testing.T) {
	db := &apiTestDB{}
	s := testAPIServer(db)
	if rep := s.formulario(context.Background(), []byte(formularioValido), "203.0.113.7"); rep.body["erro"] != "envio_expirado" {
		t.Fatalf("sem marca: %#v", rep.body)
	}
	rapida := comCampos(t, formularioValido, map[string]any{"_marca": s.marcaFormulario(s.Now().Add(-time.Second))})
	if rep := s.formulario(context.Background(), rapida, "203.0.113.7"); rep.body["erro"] != "envio_rapido" {
		t.Fatalf("rápido: %#v", rep.body)
	}
	if len(db.doCalls)+len(db.txCalls) != 0 {
		t.Fatal("recusa não pode consultar nem gravar")
	}
}

func TestLimiteEnviosPorIP(t *testing.T) {
	var l limiteEnvios
	t0 := time.Date(2026, 11, 22, 10, 0, 0, 0, time.UTC)
	for i := 0; i < enviosPorIP; i++ {
		if !l.permitir("198.51.100.1", fmt.Sprintf("id%02d", i), t0.Add(time.Duration(i)*time.Second)) {
			t.Fatalf("envio %d barrado antes do limite", i+1)
		}
	}
	if l.permitir("198.51.100.1", "id-novo", t0.Add(2*time.Minute)) {
		t.Fatal("61º envio na janela deveria ser barrado")
	}
	if !l.permitir("198.51.100.1", "id05", t0.Add(3*time.Minute)) {
		t.Fatal("reenvio do mesmo cadastro não deveria contar de novo")
	}
	if !l.permitir("198.51.100.2", "id-x", t0.Add(3*time.Minute)) {
		t.Fatal("outro IP deveria passar")
	}
	if !l.permitir("198.51.100.1", "id-depois", t0.Add(janelaEnvios+time.Second)) {
		t.Fatal("nova janela deveria liberar")
	}
	// Sem _requestId, cada envio conta.
	var sem limiteEnvios
	for i := 0; i < enviosPorIP; i++ {
		sem.permitir("198.51.100.3", "", t0)
	}
	if sem.permitir("198.51.100.3", "", t0) {
		t.Fatal("sem id, o 61º deveria ser barrado")
	}
}

func TestLimiteEnviosLimpaJanelasVencidas(t *testing.T) {
	var l limiteEnvios
	t0 := time.Date(2026, 11, 22, 10, 0, 0, 0, time.UTC)
	for i := 0; i <= limpezaEnvios; i++ {
		l.permitir(fmt.Sprintf("10.0.%d.%d", i/250, i%250), "", t0)
	}
	l.permitir("10.9.9.9", "", t0.Add(janelaEnvios+time.Second))
	if len(l.ips) != 1 {
		t.Fatalf("janelas vencidas não foram limpas: %d", len(l.ips))
	}
}

func TestFormularioMuitosEnviosPeloHandler(t *testing.T) {
	db := &apiTestDB{}
	s := testAPIServer(db)
	s.Secret = []byte(strings.Repeat("k", 32))
	h := s.Handler()
	enviar := func(ip string, corpo []byte) *httptest.ResponseRecorder {
		r := httptest.NewRequest(http.MethodPost, "/api", bytes.NewReader(corpo))
		r.Header.Set("Content-Type", "application/json")
		r.Header.Set("Fly-Client-IP", ip)
		w := httptest.NewRecorder()
		h.ServeHTTP(w, r)
		return w
	}
	// A página pede a marca (ação pública, sem login).
	w := enviar("192.0.2.10", []byte(`{"acao":"formulario_marca"}`))
	var m struct {
		Ok    bool   `json:"ok"`
		Marca string `json:"marca"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &m); err != nil || !m.Ok || !strings.Contains(m.Marca, ".") {
		t.Fatalf("marca: %s", w.Body.String())
	}
	// Uma marca de 10 s atrás, para passar do tempo mínimo.
	marca := s.marcaFormulario(s.Now().Add(-10 * time.Second))
	for i := 0; i < enviosPorIP; i++ {
		corpo := comCampos(t, formularioValido, map[string]any{"_marca": marca, "_requestId": fmt.Sprintf("%032x", i+1)})
		if w := enviar("192.0.2.10", corpo); w.Code != http.StatusOK {
			t.Fatalf("envio %d: %d %s", i+1, w.Code, w.Body.String())
		}
	}
	corpo := comCampos(t, formularioValido, map[string]any{"_marca": marca, "_requestId": fmt.Sprintf("%032x", 999)})
	if w := enviar("192.0.2.10", corpo); w.Code != http.StatusTooManyRequests || !strings.Contains(w.Body.String(), "muitos_envios") {
		t.Fatalf("61º: %d %s", w.Code, w.Body.String())
	}
	if w := enviar("192.0.2.11", corpo); w.Code != http.StatusOK || !strings.Contains(w.Body.String(), `"ok":true`) {
		t.Fatalf("outro IP: %d %s", w.Code, w.Body.String())
	}
}

func TestIPClienteEParcial(t *testing.T) {
	r := httptest.NewRequest(http.MethodPost, "/api", nil)
	r.RemoteAddr = "192.0.2.50:1234"
	if ipCliente(r) != "192.0.2.50" {
		t.Fatalf("RemoteAddr: %s", ipCliente(r))
	}
	r.Header.Set("Fly-Client-IP", "198.51.100.7")
	if ipCliente(r) != "198.51.100.7" {
		t.Fatal("Fly-Client-IP ignorado")
	}
	r.Header.Set("Fly-Client-IP", "não é ip")
	if ipCliente(r) != "192.0.2.50" {
		t.Fatal("Fly-Client-IP inválido deveria cair no RemoteAddr")
	}
	if ipParcial("198.51.100.7") != "198.51.x.x" || ipParcial("2001:db8:1:2::1") != "2001:db8:…" || ipParcial("x") != "?" {
		t.Fatalf("parcial: %s %s", ipParcial("198.51.100.7"), ipParcial("2001:db8:1:2::1"))
	}
}
