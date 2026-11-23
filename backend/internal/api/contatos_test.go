package api

import (
	"context"
	"strings"
	"testing"
	"time"
)

func TestContatoValido(t *testing.T) {
	agora := time.Date(2026, 11, 22, 15, 0, 0, 0, time.UTC) // 12h em Fortaleza
	casos := []struct {
		tipo, quando, lembrar, erro string
	}{
		{"ligacao", "2026-11-22", "2026-12-22", ""},
		{"", "", "", ""},
		{"visita", "2025-11-21", "", ""},
		{"email", "", "", "dados_invalidos"},
		{"ligacao", "2026-11-23", "", "data_invalida"}, // futuro
		{"ligacao", "2025-11-01", "", "data_invalida"}, // mais de um ano
		{"ligacao", "", "2026-11-22", "data_invalida"}, // lembrete precisa ser depois de hoje
		{"ligacao", "", "2028-01-01", "data_invalida"}, // mais de um ano
		{"ligacao", "22/11/2026", "", "data_invalida"},
	}
	for _, c := range casos {
		tipo, _, _, erro := contatoValido(c.tipo, c.quando, c.lembrar, agora)
		if erro != c.erro {
			t.Errorf("%+v: erro %q", c, erro)
		}
		if erro == "" && c.tipo == "" && tipo != "nota" {
			t.Errorf("sem tipo deveria virar nota: %q", tipo)
		}
	}
}

func TestAnotacaoSalvarContatoSemTexto(t *testing.T) {
	s, db, token := painelServer(t, 1)
	// Relógio dos testes: 14/11/2026.
	rep := s.anotacaoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Tipo: "ligacao", ContatoEm: "2026-11-13", LembrarEm: "2026-12-13"})
	if rep.body["ok"] != true {
		t.Fatalf("contato sem texto deveria ser aceito: %#v", rep.body)
	}
	var ins string
	var args []any
	for _, st := range db.escritas {
		if strings.HasPrefix(st.SQL, "INSERT INTO anotacoes") {
			ins, args = st.SQL, st.Args
		}
	}
	if !strings.Contains(ins, "tipo, contato_em, lembrar_em") || args[4] != "ligacao" || args[5] != "2026-11-13" || args[6] != "2026-12-13" {
		t.Fatalf("INSERT do contato: %s %#v", ins, args)
	}
	if rep := s.anotacaoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Tipo: "nota"}); rep.body["erro"] != "texto_vazio" {
		t.Fatalf("anotação simples sem texto: %#v", rep.body)
	}
	if rep := s.anotacaoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Tipo: "telegrama", Texto: "oi"}); rep.body["erro"] != "dados_invalidos" {
		t.Fatalf("tipo inválido: %#v", rep.body)
	}
	if rep := s.anotacaoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Tipo: "visita", LembrarEm: "2026-11-01"}); rep.body["erro"] != "data_invalida" {
		t.Fatalf("lembrete no passado: %#v", rep.body)
	}
}
