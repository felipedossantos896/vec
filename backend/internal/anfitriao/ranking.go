// Package anfitriao calcula o ranking de casas para receber uma célula (Spec 004,
// ADR-0006). É puro: recebe coordenadas já lidas do banco e devolve só distâncias.
// A distância é em linha reta (Haversine), uma aproximação, nunca tempo de trajeto.
package anfitriao

import (
	"math"
	"sort"
)

// Casa é um anfitrião confirmado com posição de rua ou bairro.
type Casa struct {
	Linha      int64
	Nome       string // só para desempate; não sai na resposta
	Capacidade int
	Dias       []string
	Lat, Lng   float64
	PeloBairro bool
}

// Membro é um membro da célula; sem posição quando Lat/Lng são nil.
type Membro struct {
	Linha    int64
	Lat, Lng *float64
}

// Posicao é uma casa no ranking, com a explicação do lugar dela.
type Posicao struct {
	Casa
	MediaKm      float64 // arredondada a 0,1 km
	MaxKm        float64 // arredondada a 0,1 km
	Considerados int     // membros com posição que entraram no cálculo
	Comporta     bool    // capacidade >= número de membros da célula
}

// Resultado é o ranking de uma célula.
type Resultado struct {
	Membros    int // membros da célula no escopo
	SemPosicao int // membros fora do cálculo por não terem posição
	Casas      []Posicao
}

const raioTerraKm = 6371.0

// DistanciaKm é a distância em linha reta (Haversine) entre dois pontos.
func DistanciaKm(lat1, lng1, lat2, lng2 float64) float64 {
	rad := math.Pi / 180
	dLat := (lat2 - lat1) * rad
	dLng := (lng2 - lng1) * rad
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*rad)*math.Cos(lat2*rad)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * raioTerraKm * math.Asin(math.Min(1, math.Sqrt(a)))
}

func arred(km float64) float64 { return math.Round(km*10) / 10 }

// Ranking ordena as casas pela distância média até os membros com posição, depois
// pela maior distância individual, depois pelo nome. Casas que não comportam a
// célula ficam no fim, marcadas. O anfitrião que é membro da célula entra com
// distância 0. Sem nenhum membro com posição não há o que comparar: Casas vazia.
// A ordem usa os valores já arredondados, para bater com o que a tela explica.
func Ranking(casas []Casa, membros []Membro) Resultado {
	res := Resultado{Membros: len(membros)}
	var comPosicao []Membro
	for _, m := range membros {
		if m.Lat == nil || m.Lng == nil {
			res.SemPosicao++
			continue
		}
		comPosicao = append(comPosicao, m)
	}
	if len(comPosicao) == 0 {
		res.Casas = []Posicao{}
		return res
	}
	res.Casas = make([]Posicao, 0, len(casas))
	for _, c := range casas {
		var soma, max float64
		for _, m := range comPosicao {
			d := 0.0
			if m.Linha != c.Linha {
				d = DistanciaKm(c.Lat, c.Lng, *m.Lat, *m.Lng)
			}
			soma += d
			max = math.Max(max, d)
		}
		res.Casas = append(res.Casas, Posicao{
			Casa: c, MediaKm: arred(soma / float64(len(comPosicao))), MaxKm: arred(max),
			Considerados: len(comPosicao), Comporta: c.Capacidade >= len(membros),
		})
	}
	sort.SliceStable(res.Casas, func(i, j int) bool {
		a, b := res.Casas[i], res.Casas[j]
		switch {
		case a.Comporta != b.Comporta:
			return a.Comporta
		case a.MediaKm != b.MediaKm:
			return a.MediaKm < b.MediaKm
		case a.MaxKm != b.MaxKm:
			return a.MaxKm < b.MaxKm
		case a.Nome != b.Nome:
			return a.Nome < b.Nome
		}
		return a.Linha < b.Linha
	})
	return res
}
