package api

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
)

func TestTextoLogFicaNumaLinhaECurto(t *testing.T) {
	if got := textoLog("  a\nb\tc\r\n", 10); got != "a b c" {
		t.Fatalf("textoLog = %q", got)
	}
	if got := textoLog(strings.Repeat("é", 12), 10); got != strings.Repeat("é", 10)+"…" {
		t.Fatalf("corte = %q", got)
	}
}

func TestErroClienteExigeSessaoENaoRegistraSemEla(t *testing.T) {
	var buf bytes.Buffer
	s := testAPIServer(nil)
	s.Secret = []byte("segredo-de-teste")
	s.Log = slog.New(slog.NewTextHandler(&buf, nil))
	rep := s.erroCliente(context.Background(), adminReq{Token: "invalido", Tipo: "TypeError", Texto: "x"})
	if rep.body["erro"] != "sessao" {
		t.Fatalf("erro = %v, queria sessao", rep.body["erro"])
	}
	if strings.Contains(buf.String(), "erro no painel") {
		t.Fatal("registrou erro sem sessão válida")
	}
}
