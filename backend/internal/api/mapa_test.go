package api

import (
	"context"
	"encoding/json"
	"math"
	"strings"
	"testing"

	"vec/backend/internal/store"
)

func f(v float64) *float64 { return &v }

func TestAgruparMapaNaGradeSemCoordenadaExata(t *testing.T) {
	pontos := []store.PontoMapa{
		{Linha: 2, Lat: f(-3.731234), Lng: f(-38.521234), Precisao: store.GeoRua},
		{Linha: 1, Lat: f(-3.731987), Lng: f(-38.522001), Precisao: store.GeoBairro}, // mesma célula
		{Linha: 3, Lat: f(-3.701111), Lng: f(-38.501111), Precisao: store.GeoRua},    // outra célula
		{Linha: 4, Lat: f(-3.72), Lng: f(-38.5), Precisao: store.GeoCidade},
		{Linha: 5, Precisao: store.GeoNaoEncontrado},
		{Linha: 6, Pendente: true},
	}
	grupos, soCidade, nao, pend := agruparMapa(pontos)
	if len(grupos) != 2 || len(grupos[0].Linhas) != 2 || grupos[0].Linhas[0] != 1 || grupos[0].PeloBairro != 1 {
		t.Fatalf("grupos = %#v", grupos)
	}
	if len(soCidade) != 1 || soCidade[0] != 4 || len(nao) != 1 || nao[0] != 5 || len(pend) != 1 || pend[0] != 6 {
		t.Fatalf("classificação: cidade %v, não localizados %v, pendentes %v", soCidade, nao, pend)
	}
	for _, g := range grupos {
		for _, p := range pontos[:3] {
			if g.Lat == *p.Lat || g.Lng == *p.Lng {
				t.Fatalf("centro do grupo igual a uma coordenada real: %#v", g)
			}
		}
	}
	// O centro fica a no máximo meio passo (+ arredondamento) de cada membro.
	for _, p := range pontos[:2] {
		if math.Abs(grupos[0].Lat-*p.Lat) > passoGrade/2+1e-4 || math.Abs(grupos[0].Lng-*p.Lng) > passoGrade/2+1e-4 {
			t.Fatalf("membro fora da célula: %v,%v vs %v,%v", *p.Lat, *p.Lng, grupos[0].Lat, grupos[0].Lng)
		}
	}
}

func TestAcaoMapaUsaEscopoENaoDevolveCoordenadaExata(t *testing.T) {
	s, db, token := painelServer(t, 1)
	db.pontos = [][]any{
		{int64(7), -3.731234, -38.521234, "rua", int64(0)},
		{int64(8), nil, nil, nil, int64(1)},
	}
	rep := s.mapa(context.Background(), adminReq{Token: token})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if len(db.leituras) != 1 || !strings.Contains(db.leituras[0].SQL, "excluido_em IS NULL AND papel = 'membro' AND (celula IN (?))") || db.leituras[0].Args[0] != "Hope" {
		t.Fatalf("mapa sem escopo: %#v", db.leituras)
	}
	b, _ := json.Marshal(rep.body)
	corpo := string(b)
	for _, exato := range []string{"3.731234", "38.521234", "3.7312", "38.5212"} {
		if strings.Contains(corpo, exato) {
			t.Errorf("resposta contém coordenada exata (%s): %s", exato, corpo)
		}
	}
	for _, chave := range []string{"numero", "complemento", "logradouro", "cep"} {
		if strings.Contains(corpo, `"`+chave+`"`) {
			t.Errorf("resposta contém %q: %s", chave, corpo)
		}
	}
	if !strings.Contains(corpo, `"pendentes":[8]`) || !strings.Contains(corpo, `"linhas":[7]`) {
		t.Errorf("conteúdo inesperado: %s", corpo)
	}
}

func TestAcaoMapaVaziaDevolveListasVazias(t *testing.T) {
	s, _, token := painelServer(t, 1)
	b, _ := json.Marshal(s.mapa(context.Background(), adminReq{Token: token}).body)
	for _, k := range []string{`"grupos":[]`, `"soCidade":[]`, `"naoLocalizados":[]`, `"pendentes":[]`} {
		if !strings.Contains(string(b), k) {
			t.Errorf("faltou %s em %s", k, b)
		}
	}
}
