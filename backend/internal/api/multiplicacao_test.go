package api

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
)

// Célula fictícia: região Norte (1–3), região Sul (4–6, ~5 km ao sul) e 7 sem posição.
func multiplicacaoServer(t *testing.T) (*Server, *painelDB, string) {
	s, db, token := painelServer(t, 1)
	db.membros = [][]any{
		{int64(1), -10.000, -30.0}, {int64(2), -10.001, -30.0}, {int64(3), -10.002, -30.0},
		{int64(4), -10.045, -30.0}, {int64(5), -10.046, -30.0}, {int64(6), -10.047, -30.0},
		{int64(7), nil, nil},
	}
	db.casas = [][]any{
		{int64(2), "Casa Norte", int64(8), "ter", -10.001, -30.0, int64(0)},
		{int64(5), "Casa Sul", int64(3), "qui", -10.046, -30.0, int64(0)},
	}
	return s, db, token
}

type grupoResp struct {
	Linhas     []int64          `json:"linhas"`
	SemPosicao []int64          `json:"semPosicao"`
	Membros    int              `json:"membros"`
	Casas      []map[string]any `json:"casas"`
}

type multResp struct {
	Ok            bool        `json:"ok"`
	Erro          string      `json:"erro"`
	Automatica    bool        `json:"automatica"`
	Ajustada      bool        `json:"ajustada"`
	MesmaPrimeira bool        `json:"mesmaPrimeira"`
	Grupos        []grupoResp `json:"grupos"`
}

func chamarMult(t *testing.T, s *Server, req adminReq) (multResp, string) {
	t.Helper()
	b, _ := json.Marshal(s.multiplicacao(context.Background(), req).body)
	var r multResp
	if err := json.Unmarshal(b, &r); err != nil {
		t.Fatal(err)
	}
	return r, string(b)
}

func TestMultiplicacaoPropoeGruposEAnfitrioes(t *testing.T) {
	s, db, token := multiplicacaoServer(t)
	r, _ := chamarMult(t, s, adminReq{Token: token, Celula: "Hope"})
	if !r.Ok || !r.Automatica || r.Ajustada || len(r.Grupos) != 2 {
		t.Fatalf("resposta = %#v", r)
	}
	g1, g2 := fmt.Sprint(r.Grupos[0].Linhas), fmt.Sprint(r.Grupos[1].Linhas)
	if g1 != "[1 2 3 7]" || g2 != "[4 5 6]" {
		t.Fatalf("grupos = %s %s", g1, g2)
	}
	if fmt.Sprint(r.Grupos[0].SemPosicao) != "[7]" || len(r.Grupos[1].SemPosicao) != 0 {
		t.Fatalf("sem posição = %v / %v", r.Grupos[0].SemPosicao, r.Grupos[1].SemPosicao)
	}
	if r.Grupos[0].Casas[0]["linha"] != float64(2) || r.Grupos[1].Casas[0]["linha"] != float64(5) || r.MesmaPrimeira {
		t.Fatalf("primeiras casas: %v / %v", r.Grupos[0].Casas[0], r.Grupos[1].Casas[0])
	}
	if r.Grupos[0].Membros != 4 || r.Grupos[1].Casas[0]["comporta"] != true || r.Grupos[1].Casas[0]["considerados"] != float64(3) {
		t.Fatalf("explicação por grupo: %#v", r.Grupos)
	}
	if len(db.escritas) != 0 || len(db.tx) != 0 {
		t.Fatalf("simulação não pode gravar: %#v %#v", db.escritas, db.tx)
	}
}

func TestMultiplicacaoAjusteRecalcula(t *testing.T) {
	s, db, token := multiplicacaoServer(t)
	// O líder leva 1, 2 e 7 para o grupo do Sul: o grupo 2 fica com 6 e a Casa Sul
	// (capacidade 3) deixa de comportar.
	r, _ := chamarMult(t, s, adminReq{Token: token, Celula: "Hope", Grupos: [][]int64{{3}, {4, 5, 6, 1, 2, 7}}})
	if !r.Ok || !r.Ajustada || fmt.Sprint(r.Grupos[1].Linhas) != "[4 5 6 1 2 7]" || r.Grupos[1].Membros != 6 {
		t.Fatalf("ajuste = %#v", r)
	}
	ult := r.Grupos[1].Casas[len(r.Grupos[1].Casas)-1]
	if ult["linha"] != float64(5) || ult["comporta"] != false {
		t.Fatalf("Casa Sul deveria não comportar e ir para o fim: %#v", r.Grupos[1].Casas)
	}
	if fmt.Sprint(r.Grupos[1].SemPosicao) != "[7]" {
		t.Fatalf("sem posição no grupo ajustado: %v", r.Grupos[1].SemPosicao)
	}
	// Grupo 1 só com o membro 3: a casa mais perto é a Norte, e as duas comportam 1.
	if r.Grupos[0].Casas[0]["linha"] != float64(2) {
		t.Fatalf("grupo 1: %#v", r.Grupos[0].Casas)
	}
	if len(db.escritas) != 0 || len(db.tx) != 0 {
		t.Fatal("ajuste não pode gravar")
	}
}

func TestMultiplicacaoRecusaGruposInvalidos(t *testing.T) {
	s, _, token := multiplicacaoServer(t)
	casos := map[string][][]int64{
		"pessoa de fora da célula": {{1, 2, 3, 99}, {4, 5, 6, 7}},
		"repetida":                 {{1, 2, 3, 7}, {3, 4, 5, 6}},
		"faltando":                 {{1, 2, 3}, {4, 5, 6}},
		"três grupos":              {{1, 2}, {3, 4}, {5, 6, 7}},
		"um grupo":                 {{1, 2, 3, 4, 5, 6, 7}},
	}
	for nome, g := range casos {
		if r, _ := chamarMult(t, s, adminReq{Token: token, Celula: "Hope", Grupos: g}); r.Erro != "dados_invalidos" {
			t.Errorf("%s: %#v", nome, r)
		}
	}
	// Um grupo vazio é válido (o líder pode juntar todos para comparar).
	if r, _ := chamarMult(t, s, adminReq{Token: token, Celula: "Hope", Grupos: [][]int64{{}, {1, 2, 3, 4, 5, 6, 7}}}); !r.Ok || len(r.Grupos[0].Linhas) != 0 {
		t.Errorf("grupo vazio: %#v", r)
	}
}

func TestMultiplicacaoComPoucosNaoPropoe(t *testing.T) {
	s, db, token := multiplicacaoServer(t)
	db.membros = db.membros[:3]
	r, _ := chamarMult(t, s, adminReq{Token: token, Celula: "Hope"})
	if !r.Ok || r.Automatica || fmt.Sprint(r.Grupos[0].Linhas) != "[1 2 3]" || len(r.Grupos[1].Linhas) != 0 {
		t.Fatalf("com 3 membros: %#v", r)
	}
}

func TestMultiplicacaoMesmaPrimeiraCasa(t *testing.T) {
	s, db, token := multiplicacaoServer(t)
	db.casas = db.casas[:1]
	if r, _ := chamarMult(t, s, adminReq{Token: token, Celula: "Hope"}); !r.MesmaPrimeira {
		t.Fatalf("uma casa só deve ser a primeira dos dois grupos: %#v", r)
	}
}

func TestMultiplicacaoEscopoESemDadosDeTerceiros(t *testing.T) {
	s, db, token := multiplicacaoServer(t)
	_, texto := chamarMult(t, s, adminReq{Token: token, Celula: "Hope"})
	for _, vazou := range []string{"-10.0", "-30", `"lat"`, `"lng"`, "Casa Norte", "Casa Sul", "cep", "logradouro"} {
		if strings.Contains(texto, vazou) {
			t.Errorf("resposta contém %q: %s", vazou, texto)
		}
	}
	for _, st := range db.leituras {
		if !strings.Contains(st.SQL, "excluido_em IS NULL AND (celula IN (?))") {
			t.Fatalf("leitura sem escopo: %s", st.SQL)
		}
	}
	db.membros = nil
	for _, req := range []adminReq{
		{Token: token, Celula: "Betânia"},
		{Token: token, Celula: "Betânia", Grupos: [][]int64{{1}, {2}}},
	} {
		if r, texto := chamarMult(t, s, req); r.Erro != "nao_encontrado" || strings.Contains(texto, "grupos") {
			t.Errorf("fora do escopo: %s", texto)
		}
	}
	if r, _ := chamarMult(t, s, adminReq{Token: "invalido", Celula: "Hope"}); r.Ok {
		t.Error("sem sessão deveria falhar")
	}
	if r, _ := chamarMult(t, s, adminReq{Token: token, Celula: " "}); r.Erro != "dados_invalidos" {
		t.Error("célula vazia")
	}
}
