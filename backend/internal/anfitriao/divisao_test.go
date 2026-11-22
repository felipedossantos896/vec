package anfitriao

import (
	"fmt"
	"math/rand"
	"testing"
)

// Coordenadas fictícias: duas regiões a ~5 km uma da outra.
func duasRegioes() []Membro {
	var ms []Membro
	for i := int64(0); i < 5; i++ {
		ms = append(ms, membro(10+i, -10.000+float64(i)*0.001, -30.000))
		ms = append(ms, membro(20+i, -10.045+float64(i)*0.001, -30.000))
	}
	return ms
}

func grupos(d Divisao) string { return fmt.Sprint(d.Grupos[0], d.Grupos[1]) }

func TestDividirSeparaDuasRegioes(t *testing.T) {
	d := Dividir(duasRegioes())
	if !d.Automatica || len(d.Grupos[0]) != 5 || len(d.Grupos[1]) != 5 {
		t.Fatalf("divisão = %v", grupos(d))
	}
	regiao := func(l int64) int64 { return l / 10 }
	for _, g := range d.Grupos {
		for _, l := range g {
			if regiao(l) != regiao(g[0]) {
				t.Fatalf("grupo mistura regiões: %v", grupos(d))
			}
		}
	}
}

func TestDividirEhDeterministica(t *testing.T) {
	base := grupos(Dividir(duasRegioes()))
	r := rand.New(rand.NewSource(1))
	for i := 0; i < 20; i++ {
		ms := duasRegioes()
		r.Shuffle(len(ms), func(a, b int) { ms[a], ms[b] = ms[b], ms[a] })
		if g := grupos(Dividir(ms)); g != base {
			t.Fatalf("ordem de entrada mudou a proposta: %s != %s", g, base)
		}
	}
}

func TestDividirEquilibraImpar(t *testing.T) {
	ms := duasRegioes()[:7]
	d := Dividir(ms)
	if n0, n1 := len(d.Grupos[0]), len(d.Grupos[1]); n0+n1 != 7 || n0-n1 > 1 || n1-n0 > 1 {
		t.Fatalf("desequilibrado: %v", grupos(d))
	}
}

func TestDividirSemPosicaoNoGrupoMenor(t *testing.T) {
	ms := append(duasRegioes()[:7], Membro{Linha: 99}, Membro{Linha: 98}, Membro{Linha: 97})
	d := Dividir(ms)
	if fmt.Sprint(d.SemPosicao) != "[97 98 99]" {
		t.Fatalf("sem posição = %v", d.SemPosicao)
	}
	// 7 com posição: grupos de 3 e 4. Um a um no menor (o 1 em empate):
	// 97 → grupo 1 (4 e 4), 98 → grupo 1 pelo empate (5 e 4), 99 → grupo 2 (5 e 5).
	if n0, n1 := len(d.Grupos[0]), len(d.Grupos[1]); n0 != 5 || n1 != 5 {
		t.Fatalf("tamanhos = %d e %d (%v)", n0, n1, grupos(d))
	}
	todos := map[int64]bool{}
	for _, g := range d.Grupos {
		for _, l := range g {
			if todos[l] {
				t.Fatalf("repetido: %d", l)
			}
			todos[l] = true
		}
	}
	if len(todos) != 10 {
		t.Fatalf("faltou gente: %v", grupos(d))
	}
}

func TestDividirComPoucosNaoPropoe(t *testing.T) {
	ms := append(duasRegioes()[:3], Membro{Linha: 99})
	d := Dividir(ms)
	if d.Automatica || len(d.Grupos[0]) != 4 || len(d.Grupos[1]) != 0 || d.Grupos[1] == nil {
		t.Fatalf("com 3 com posição não há proposta: %v", grupos(d))
	}
}

func TestDividirTodosNoMesmoPonto(t *testing.T) {
	var ms []Membro
	for i := int64(1); i <= 6; i++ {
		ms = append(ms, membro(i, -10, -30))
	}
	d := Dividir(ms)
	if grupos(d) != "[1 2 3] [4 5 6]" {
		t.Fatalf("mesmo ponto: divide pela ordem dos cadastros, veio %v", grupos(d))
	}
}
