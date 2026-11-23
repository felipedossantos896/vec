package api

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestIndicadoresGravaRetratoDoMesELeNoEscopo(t *testing.T) {
	s, db, token := painelServer(t, 1)
	db.retratos = [][]any{{"2026-11", "celula", "Hope", "pessoas", int64(12)}}
	rep := s.indicadoresTendencia(context.Background(), adminReq{Token: token})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	// Primeiro acesso do mês (no fuso da igreja): grava o retrato antes de ler
	if len(db.escritas) != 1 || db.escritas[0].Args[0] != "2026-11" || db.escritas[0].Args[1] != "2026-11-14" {
		t.Fatalf("retrato do mês: %#v", db.escritas)
	}
	ultima := db.leituras[len(db.leituras)-1]
	if ultima.Args[0] != "2025-12" || !strings.Contains(ultima.SQL, "escopo_tipo = 'celula'") {
		t.Fatalf("leitura dos últimos 12 meses no escopo: %s %#v", ultima.SQL, ultima.Args)
	}
	hope := false
	for _, a := range ultima.Args {
		hope = hope || a == "Hope"
	}
	if !hope {
		t.Fatalf("escopo da célula fora dos argumentos: %#v", ultima.Args)
	}
	b, _ := json.Marshal(rep.body)
	if string(b) != `{"ok":true,"retratos":[{"mes":"2026-11","tipo":"celula","nome":"Hope","indicador":"pessoas","valor":12}]}` {
		t.Fatalf("corpo = %s", b)
	}
}

func TestIndicadoresNaoRegravaRetratoDoMes(t *testing.T) {
	s, db, token := painelServer(t, 1)
	db.temRetrato = true
	if rep := s.indicadoresTendencia(context.Background(), adminReq{Token: token}); rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if len(db.escritas) != 0 {
		t.Fatalf("retrato regravado: %#v", db.escritas)
	}
}

func TestIndicadoresSemRetratoParaQuemSoDiscipula(t *testing.T) {
	s, db, token := painelServer(t, 1)
	db.escopos, db.cadastro = nil, 5
	rep := s.indicadoresTendencia(context.Background(), adminReq{Token: token})
	if rep.body["ok"] != true || len(db.escritas) != 0 || len(db.leituras) != 0 {
		t.Fatalf("discipulador: %#v escritas %d leituras %d", rep.body, len(db.escritas), len(db.leituras))
	}
}

func TestIndicadoresPedemSessao(t *testing.T) {
	s, _, _ := painelServer(t, 1)
	if rep := s.indicadoresTendencia(context.Background(), adminReq{Token: "x"}); rep.body["erro"] != "sessao" {
		t.Fatalf("sem sessão: %#v", rep.body)
	}
}
