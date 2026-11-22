package anfitriao

import (
	"math"
	"sort"
)

// MinimoParaDividir é o número de membros com posição a partir do qual há
// proposta automática (2 por grupo). Abaixo disso o líder monta os grupos à mão.
const MinimoParaDividir = 4

// Divisao é a proposta de multiplicação de uma célula em dois grupos (Spec 005).
// Grupos[0] é o "Grupo 1". SemPosicao lista quem foi posto num grupo sem ter
// posição, para a tela marcar "confira o grupo".
type Divisao struct {
	Grupos     [2][]int64
	SemPosicao []int64
	Automatica bool
}

// Dividir propõe dois grupos equilibrados (diferença máxima de 1 entre os membros
// com posição): acha o par de membros mais distante, projeta todos na reta entre
// eles e corta na mediana. Membros sem posição entram, um a um, no grupo menor
// (o 1, em empate). É determinística: a ordem de entrada não muda o resultado.
// Com menos de MinimoParaDividir membros com posição, todos ficam no grupo 1.
func Dividir(membros []Membro) Divisao {
	var com []Membro
	var sem []int64
	for _, m := range membros {
		if m.Lat == nil || m.Lng == nil {
			sem = append(sem, m.Linha)
		} else {
			com = append(com, m)
		}
	}
	sort.Slice(com, func(i, j int) bool { return com[i].Linha < com[j].Linha })
	sort.Slice(sem, func(i, j int) bool { return sem[i] < sem[j] })
	d := Divisao{SemPosicao: append([]int64{}, sem...)}
	if len(com) < MinimoParaDividir {
		for _, m := range com {
			d.Grupos[0] = append(d.Grupos[0], m.Linha)
		}
		d.Grupos[0] = append(d.Grupos[0], sem...)
		d.Grupos[1] = []int64{}
		ordenar(&d)
		return d
	}
	d.Automatica = true

	// Par mais distante; em empate, o primeiro na ordem dos cadastros.
	a, b, maior := 0, 1, -1.0
	for i := range com {
		for j := i + 1; j < len(com); j++ {
			if km := DistanciaKm(*com[i].Lat, *com[i].Lng, *com[j].Lat, *com[j].Lng); km > maior {
				a, b, maior = i, j, km
			}
		}
	}
	// Projeção num plano local centrado em a (suficiente na escala de uma cidade).
	escala := math.Cos(*com[a].Lat * math.Pi / 180)
	plano := func(m Membro) (float64, float64) {
		return (*m.Lng - *com[a].Lng) * escala, *m.Lat - *com[a].Lat
	}
	dx, dy := plano(com[b])
	type proj struct {
		linha int64
		t     float64
	}
	ps := make([]proj, len(com))
	for i, m := range com {
		x, y := plano(m)
		ps[i] = proj{m.Linha, x*dx + y*dy}
	}
	sort.SliceStable(ps, func(i, j int) bool {
		if ps[i].t != ps[j].t {
			return ps[i].t < ps[j].t
		}
		return ps[i].linha < ps[j].linha
	})
	meio := len(ps) / 2
	for i, p := range ps {
		g := 0
		if i >= meio {
			g = 1
		}
		d.Grupos[g] = append(d.Grupos[g], p.linha)
	}
	for _, l := range sem {
		g := 0
		if len(d.Grupos[1]) < len(d.Grupos[0]) {
			g = 1
		}
		d.Grupos[g] = append(d.Grupos[g], l)
	}
	ordenar(&d)
	return d
}

func ordenar(d *Divisao) {
	for g := range d.Grupos {
		sort.Slice(d.Grupos[g], func(i, j int) bool { return d.Grupos[g][i] < d.Grupos[g][j] })
	}
}
