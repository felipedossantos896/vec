package anfitriao

import (
	"math"
	"testing"
)

// Coordenadas fictícias. 0,009° de latitude ≈ 1,0 km.
func p(v float64) *float64 { return &v }

func membro(id int64, lat, lng float64) Membro { return Membro{Linha: id, Lat: p(lat), Lng: p(lng)} }

func ordem(r Resultado) []int64 {
	var out []int64
	for _, c := range r.Casas {
		out = append(out, c.Linha)
	}
	return out
}

func igual(a, b []int64) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestDistanciaKmValoresConhecidos(t *testing.T) {
	casos := []struct {
		nome                   string
		lat1, lng1, lat2, lng2 float64
		km                     float64
	}{
		{"mesmo ponto", -3.7, -38.5, -3.7, -38.5, 0},
		{"1° de latitude", 0, 0, 1, 0, 111.19},
		{"1° de longitude no equador", 0, 0, 0, 1, 111.19},
		{"equador ao polo (πR/2)", 0, 0, 90, 0, math.Pi / 2 * raioTerraKm},
		{"antípodas (πR)", 0, 0, 0, 180, math.Pi * raioTerraKm},
	}
	for _, c := range casos {
		if d := DistanciaKm(c.lat1, c.lng1, c.lat2, c.lng2); math.Abs(d-c.km) > 0.5 {
			t.Errorf("%s: %.2f km, queria ~%.2f", c.nome, d, c.km)
		}
	}
}

func TestRankingOrdenaPelaMediaEExplica(t *testing.T) {
	// Cenário 1: médias ~1,2 / 0,8 / 2,0 km → ordem 0,8, 1,2, 2,0.
	membros := []Membro{membro(1, 0, 0), membro(2, 0, 0)}
	casas := []Casa{
		{Linha: 10, Nome: "A", Capacidade: 10, Lat: 1.2 / 111.19, Lng: 0},
		{Linha: 11, Nome: "B", Capacidade: 10, Lat: 0.8 / 111.19, Lng: 0},
		{Linha: 12, Nome: "C", Capacidade: 10, Lat: 2.0 / 111.19, Lng: 0, PeloBairro: true},
	}
	r := Ranking(casas, membros)
	if !igual(ordem(r), []int64{11, 10, 12}) {
		t.Fatalf("ordem = %v", ordem(r))
	}
	b := r.Casas[0]
	if b.MediaKm != 0.8 || b.MaxKm != 0.8 || b.Considerados != 2 || !b.Comporta {
		t.Fatalf("explicação = %#v", b)
	}
	if !r.Casas[2].PeloBairro || r.Membros != 2 || r.SemPosicao != 0 {
		t.Fatalf("resultado = %#v", r)
	}
}

func TestRankingDesempataPelaMaiorDistanciaEPeloNome(t *testing.T) {
	// Cenário 2: mesma média (1,0 km); a de menor distância máxima vem antes.
	km := 1 / 111.19
	membros := []Membro{membro(1, 0, 0), membro(2, 2*km, 0)}
	casas := []Casa{
		{Linha: 10, Nome: "Zeca", Capacidade: 5, Lat: 0, Lng: 0}, // 0 e 2 → média 1, máx 2
		{Linha: 11, Nome: "Bia", Capacidade: 5, Lat: km, Lng: 0}, // 1 e 1 → média 1, máx 1
		{Linha: 12, Nome: "Ana", Capacidade: 5, Lat: km, Lng: 0}, // igual à Bia: desempata pelo nome
	}
	r := Ranking(casas, membros)
	if !igual(ordem(r), []int64{12, 11, 10}) {
		t.Fatalf("ordem = %v (%#v)", ordem(r), r.Casas)
	}
	if r.Casas[2].MediaKm != r.Casas[0].MediaKm || r.Casas[2].MaxKm <= r.Casas[0].MaxKm {
		t.Fatalf("explicação do desempate = %#v", r.Casas)
	}
}

func TestRankingCasaQueNaoComportaVaiParaOFim(t *testing.T) {
	// Cenário 3: capacidade 6 e 10 membros → marcada e no fim, mesmo sendo a mais perto.
	var membros []Membro
	for i := int64(1); i <= 10; i++ {
		membros = append(membros, membro(i, 0, 0))
	}
	casas := []Casa{
		{Linha: 20, Nome: "Perto", Capacidade: 6, Lat: 0, Lng: 0},
		{Linha: 21, Nome: "Longe", Capacidade: 10, Lat: 0.05, Lng: 0},
	}
	r := Ranking(casas, membros)
	if !igual(ordem(r), []int64{21, 20}) || r.Casas[1].Comporta || !r.Casas[0].Comporta {
		t.Fatalf("ranking = %#v", r.Casas)
	}
}

func TestRankingMembrosSemPosicaoFicamForaDoCalculo(t *testing.T) {
	membros := []Membro{membro(1, 0, 0), {Linha: 2}, {Linha: 3}}
	casas := []Casa{{Linha: 10, Capacidade: 3, Lat: 0.009, Lng: 0}}
	r := Ranking(casas, membros)
	if r.Membros != 3 || r.SemPosicao != 2 || r.Casas[0].Considerados != 1 || r.Casas[0].MediaKm != 1.0 {
		t.Fatalf("resultado = %#v", r)
	}
	// A capacidade compara com todos os membros, não só os com posição.
	r = Ranking([]Casa{{Linha: 10, Capacidade: 2, Lat: 0, Lng: 0}}, membros)
	if r.Casas[0].Comporta {
		t.Fatal("capacidade 2 não comporta 3 membros")
	}
}

func TestRankingAnfitriaoMembroEntraComDistanciaZero(t *testing.T) {
	// O anfitrião (linha 1) é membro; mesmo se a posição dele diferir na base,
	// a distância dele para a própria casa é 0.
	membros := []Membro{membro(1, 0.5, 0.5), membro(2, 0.009, 0)}
	r := Ranking([]Casa{{Linha: 1, Capacidade: 5, Lat: 0, Lng: 0}}, membros)
	if r.Casas[0].MediaKm != 0.5 || r.Casas[0].MaxKm != 1.0 {
		t.Fatalf("anfitrião membro deve contar 0: %#v", r.Casas[0])
	}
}

func TestRankingVazio(t *testing.T) {
	if r := Ranking(nil, []Membro{membro(1, 0, 0)}); len(r.Casas) != 0 || r.Casas == nil {
		t.Fatalf("sem casas: %#v", r)
	}
	r := Ranking([]Casa{{Linha: 10, Capacidade: 5}}, []Membro{{Linha: 1}})
	if len(r.Casas) != 0 || r.SemPosicao != 1 || r.Membros != 1 {
		t.Fatalf("sem membros com posição não há ranking: %#v", r)
	}
}
