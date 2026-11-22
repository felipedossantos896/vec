package api

import (
	"context"
	"strings"

	"vec/backend/internal/anfitriao"
)

// ---------------------------------------------------------------------------
// Ranking de anfitriões (Spec 004)
// ---------------------------------------------------------------------------
// Só casas e membros do escopo de quem pede (o store põe o escopo no SQL). A
// resposta tem só distâncias arredondadas a 0,1 km: nenhuma coordenada nem
// endereço. Os nomes o painel já tem pela lista do escopo.

func (s *Server) anfitrioesRanking(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("anfitrioes_ranking", err)
	}
	if code != "" {
		return failReply(code)
	}
	celula := strings.TrimSpace(req.Celula)
	if celula == "" || len([]rune(celula)) > 80 {
		return failReply("dados_invalidos")
	}
	membros, visivel, err := s.Store.MembrosCelula(ctx, a.scope, celula)
	if err != nil {
		return s.internal("anfitrioes_ranking", err)
	}
	if !visivel {
		return failReply("nao_encontrado")
	}
	cands, interessados, err := s.Store.CandidatosAnfitriao(ctx, a.scope)
	if err != nil {
		return s.internal("anfitrioes_ranking", err)
	}
	var casas []anfitriao.Casa
	semPosicao := 0
	for _, c := range cands {
		if c.Lat == nil || c.Lng == nil {
			semPosicao++
			continue
		}
		casas = append(casas, anfitriao.Casa{Linha: c.Linha, Nome: c.Nome, Capacidade: c.Capacidade,
			Dias: c.Dias, Lat: *c.Lat, Lng: *c.Lng, PeloBairro: c.PeloBairro})
	}
	ms := make([]anfitriao.Membro, len(membros))
	for i, m := range membros {
		ms[i] = anfitriao.Membro{Linha: m.Linha, Lat: m.Lat, Lng: m.Lng}
	}
	r := anfitriao.Ranking(casas, ms)
	out := make([]map[string]any, len(r.Casas))
	for i, c := range r.Casas {
		dias := c.Dias
		if dias == nil {
			dias = []string{}
		}
		out[i] = map[string]any{
			"linha": c.Linha, "mediaKm": c.MediaKm, "maxKm": c.MaxKm, "considerados": c.Considerados,
			"comporta": c.Comporta, "capacidade": c.Capacidade, "dias": dias, "peloBairro": c.PeloBairro,
		}
	}
	return okReply(map[string]any{
		"celula": celula, "membros": r.Membros, "semPosicao": r.SemPosicao, "casas": out,
		"foraDoRanking": map[string]any{
			"interessadosSemConfirmacao": interessados, "confirmadosSemPosicao": semPosicao,
		},
	})
}
