package api

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

// Coordenadas fictícias (Spec 004); 0,009° de latitude ≈ 1 km.
func rankingServer(t *testing.T) (*Server, *painelDB, string) {
	s, db, token := painelServer(t, 1)
	db.membros = [][]any{
		{int64(1), -3.70000, -38.50000},
		{int64(2), -3.70000, -38.50000},
		{int64(3), nil, nil}, // sem posição
	}
	db.casas = [][]any{
		{int64(10), "Casa Longe", int64(8), "sex", -3.71800, -38.50000, int64(0)},     // ~2,0 km
		{int64(11), "Casa Perto", int64(8), "ter,qui", -3.70720, -38.50000, int64(1)}, // ~0,8 km, pelo bairro
		{int64(12), "Casa Pequena", int64(2), "sab", -3.70000, -38.50000, int64(0)},   // 0 km, mas não comporta 3
		{int64(13), "Sem Posição", int64(8), "seg", nil, nil, nil},
	}
	db.interessados = 4
	return s, db, token
}

func TestRankingOrdenaExplicaEContaQuemFicouDeFora(t *testing.T) {
	s, _, token := rankingServer(t)
	rep := s.anfitrioesRanking(context.Background(), adminReq{Token: token, Celula: " Hope "})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	casas := rep.body["casas"].([]map[string]any)
	var ordem []int64
	for _, c := range casas {
		ordem = append(ordem, c["linha"].(int64))
	}
	if len(ordem) != 3 || ordem[0] != 11 || ordem[1] != 10 || ordem[2] != 12 {
		t.Fatalf("ordem = %v", ordem)
	}
	perto := casas[0]
	if perto["mediaKm"] != 0.8 || perto["maxKm"] != 0.8 || perto["considerados"] != 2 || perto["comporta"] != true ||
		perto["peloBairro"] != true || perto["capacidade"] != 8 || strings.Join(perto["dias"].([]string), ",") != "ter,qui" {
		t.Fatalf("explicação = %#v", perto)
	}
	if casas[2]["comporta"] != false {
		t.Fatalf("capacidade 2 não comporta 3 membros: %#v", casas[2])
	}
	fora := rep.body["foraDoRanking"].(map[string]any)
	if rep.body["membros"] != 3 || rep.body["semPosicao"] != 1 || fora["interessadosSemConfirmacao"] != 4 || fora["confirmadosSemPosicao"] != 1 {
		t.Fatalf("contagens = %#v", rep.body)
	}
}

func TestRankingNaoDevolveCoordenadaNemNome(t *testing.T) {
	s, _, token := rankingServer(t)
	rep := s.anfitrioesRanking(context.Background(), adminReq{Token: token, Celula: "Hope"})
	b, _ := json.Marshal(rep.body)
	for _, vazou := range []string{"-3.7", "-38.5", `"lat"`, `"lng"`, "Casa Perto", "cep", "logradouro", "numero", "complemento"} {
		if strings.Contains(string(b), vazou) {
			t.Errorf("resposta contém %q: %s", vazou, b)
		}
	}
}

func TestRankingUsaEscopoECelulaForaDoEscopoEhNaoEncontrado(t *testing.T) {
	s, db, token := rankingServer(t)
	s.anfitrioesRanking(context.Background(), adminReq{Token: token, Celula: "Hope"})
	if len(db.leituras) != 3 {
		t.Fatalf("leituras = %d", len(db.leituras))
	}
	for _, st := range db.leituras {
		if !strings.Contains(st.SQL, "excluido_em IS NULL AND (celula IN (?))") || st.Args[len(st.Args)-1] != "Hope" {
			t.Fatalf("leitura sem escopo: %s %#v", st.SQL, st.Args)
		}
	}
	if db.leituras[0].Args[0] != "Hope" {
		t.Fatalf("célula pedida não foi para o SQL: %#v", db.leituras[0].Args)
	}
	// Cenário 5: no banco, outra célula com escopo CELULA não devolve membros.
	db.membros, db.leituras = nil, nil
	rep := s.anfitrioesRanking(context.Background(), adminReq{Token: token, Celula: "Betânia"})
	if rep.body["erro"] != "nao_encontrado" || len(db.leituras) != 1 {
		t.Fatalf("fora do escopo: %#v (leituras %d)", rep.body, len(db.leituras))
	}
	if _, vazou := rep.body["casas"]; vazou {
		t.Fatal("devolveu casas para célula fora do escopo")
	}
}

func TestRankingValidaCelulaESessao(t *testing.T) {
	s, _, token := rankingServer(t)
	for _, c := range []string{"", "   ", strings.Repeat("a", 81)} {
		if rep := s.anfitrioesRanking(context.Background(), adminReq{Token: token, Celula: c}); rep.body["erro"] != "dados_invalidos" {
			t.Errorf("célula %q: %#v", c, rep.body)
		}
	}
	if rep := s.anfitrioesRanking(context.Background(), adminReq{Token: "invalido", Celula: "Hope"}); rep.body["ok"] == true {
		t.Fatal("sem sessão deveria falhar")
	}
}

func TestRankingSemMembrosComPosicao(t *testing.T) {
	s, db, token := rankingServer(t)
	db.membros = [][]any{{int64(3), nil, nil}}
	rep := s.anfitrioesRanking(context.Background(), adminReq{Token: token, Celula: "Hope"})
	b, _ := json.Marshal(rep.body["casas"])
	if rep.body["ok"] != true || string(b) != "[]" || rep.body["semPosicao"] != 1 {
		t.Fatalf("sem posição: %#v", rep.body)
	}
}
