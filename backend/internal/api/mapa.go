package api

import (
	"context"
	"math"
	"sort"

	"vec/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Mapa de membros (Spec 003)
// ---------------------------------------------------------------------------
// A coordenada de cada pessoa nunca sai do servidor. As pessoas são agrupadas
// numa grade de ~300 m e o navegador recebe só o centro da célula da grade, com
// a lista de cadastros do grupo (os nomes ele já tem, pelo escopo da lista).
// Posições só pela cidade não entram no mapa (empilhariam todos no centro da
// cidade): vão para a lista de não localizados, com o motivo.

// passoGrade em graus: ~330 m de latitude; na longitude, ~300–330 m no Brasil.
const passoGrade = 0.003

type grupoMapa struct {
	Lat        float64 `json:"lat"`
	Lng        float64 `json:"lng"`
	Linhas     []int64 `json:"linhas"`
	PeloBairro int     `json:"peloBairro"` // quantos foram localizados só pelo bairro
}

// centroGrade devolve o centro da célula da grade que contém a coordenada.
func centroGrade(v float64) float64 {
	return (math.Floor(v/passoGrade) + 0.5) * passoGrade
}

type celulaGrade struct{ lat, lng int64 }

// agruparMapa separa as pessoas com endereço entre grupos no mapa, localizadas só
// pela cidade ou não localizadas, e pendentes de geocodificação.
func agruparMapa(pontos []store.PontoMapa) (grupos []grupoMapa, soCidade, naoLocalizados, pendentes []int64) {
	por := map[celulaGrade]*grupoMapa{}
	for _, p := range pontos {
		switch {
		case p.Pendente:
			pendentes = append(pendentes, p.Linha)
		case p.Lat == nil || p.Lng == nil || p.Precisao == store.GeoNaoEncontrado:
			naoLocalizados = append(naoLocalizados, p.Linha)
		case p.Precisao == store.GeoCidade:
			soCidade = append(soCidade, p.Linha)
		default:
			k := celulaGrade{int64(math.Floor(*p.Lat / passoGrade)), int64(math.Floor(*p.Lng / passoGrade))}
			g := por[k]
			if g == nil {
				g = &grupoMapa{Lat: centroGrade(*p.Lat), Lng: centroGrade(*p.Lng)}
				por[k] = g
			}
			g.Linhas = append(g.Linhas, p.Linha)
			if p.Precisao == store.GeoBairro {
				g.PeloBairro++
			}
		}
	}
	for _, g := range por {
		sort.Slice(g.Linhas, func(i, j int) bool { return g.Linhas[i] < g.Linhas[j] })
		g.Lat, g.Lng = arred(g.Lat), arred(g.Lng)
		grupos = append(grupos, *g)
	}
	// Ordem estável (maiores primeiro) para a lista equivalente ao mapa.
	sort.Slice(grupos, func(i, j int) bool {
		if len(grupos[i].Linhas) != len(grupos[j].Linhas) {
			return len(grupos[i].Linhas) > len(grupos[j].Linhas)
		}
		return grupos[i].Linhas[0] < grupos[j].Linhas[0]
	})
	return grupos, soCidade, naoLocalizados, pendentes
}

// arred corta para 4 casas (~11 m): o centro da grade não precisa de mais.
func arred(v float64) float64 { return math.Round(v*1e4) / 1e4 }

func nonNilIDs(v []int64) []int64 {
	if v == nil {
		return []int64{}
	}
	return v
}

func (s *Server) mapa(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("mapa", err)
	}
	if code != "" {
		return failReply(code)
	}
	pontos, err := s.Store.PontosMapa(ctx, a.scope)
	if err != nil {
		return s.internal("mapa", err)
	}
	grupos, soCidade, naoLocalizados, pendentes := agruparMapa(pontos)
	if grupos == nil {
		grupos = []grupoMapa{}
	}
	return okReply(map[string]any{
		"grupos":         grupos,
		"soCidade":       nonNilIDs(soCidade),
		"naoLocalizados": nonNilIDs(naoLocalizados),
		"pendentes":      nonNilIDs(pendentes),
		"passoMetros":    330,
	})
}
