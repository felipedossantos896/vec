package main

import (
	"strings"
	"testing"
)

func TestLerCSVDaPlanilha(t *testing.T) {
	csv := "\ufeffData/Hora,Nome Completo,Data de Nascimento,Recebeu Jesus,Batismo,Setor,Célula,Sugestão\n" +
		"29/09/2026 18:13:52,Maria da Silva,1990-05-10,S,Sim,Fogo no Altar,Hope,\"Mais louvor, por favor\"\n" +
		"30/09/2026 09:00:00,'=Ruim,10/05/1985,N,não,,,\n" +
		"data ruim,Fulano,2000-01-01,S,S,,,\n" +
		",,,,,,,\n"
	rs, avisos, err := ler(strings.NewReader(csv))
	if err != nil {
		t.Fatal(err)
	}
	if len(rs) != 2 {
		t.Fatalf("esperava 2 respostas, veio %d", len(rs))
	}
	a := rs[0]
	if a.CriadoEm != "2026-09-29T21:13:52Z" { // 18:13 em UTC-3
		t.Errorf("criado_em = %s", a.CriadoEm)
	}
	if a.V["nome"] != "Maria da Silva" || a.V["nascimento"] != "1990-05-10" || a.V["recebeuJesus"] != "S" ||
		a.V["batismo"] != "S" || a.V["celula"] != "Hope" || a.V["sugestao"] != "Mais louvor, por favor" {
		t.Errorf("campos: %#v", a.V)
	}
	b := rs[1]
	if b.V["nome"] != "=Ruim" || b.V["nascimento"] != "1985-05-10" || b.V["batismo"] != "N" {
		t.Errorf("segunda linha: %#v", b.V)
	}
	if len(avisos) != 1 || !strings.Contains(avisos[0], "data/hora inválida") {
		t.Errorf("avisos: %v", avisos)
	}
}

func TestLerCSVPontoEVirgula(t *testing.T) {
	csv := "Data/Hora;Nome Completo;Data de Nascimento;Setor\n01/10/2026 10:00:00;Ana;01/02/2000;Fogo no Altar\n"
	rs, _, err := ler(strings.NewReader(csv))
	if err != nil || len(rs) != 1 || rs[0].V["setor"] != "Fogo no Altar" || rs[0].V["nascimento"] != "2000-02-01" {
		t.Errorf("rs=%v err=%v", rs, err)
	}
}

func TestLerCSVSemCabecalhoObrigatorio(t *testing.T) {
	if _, _, err := ler(strings.NewReader("a,b\n1,2\n")); err == nil {
		t.Error("deveria reclamar da falta das colunas")
	}
}
