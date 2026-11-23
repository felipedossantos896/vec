package api

import (
	"context"
	"time"
)

// indicadoresTendencia devolve o retrato mensal agregado dos últimos 12 meses no escopo de
// quem pede (Spec 009). No primeiro acesso do mês, grava o retrato do mês antes de ler.
// Só contagens: nenhum nome, id ou endereço sai daqui.
func (s *Server) indicadoresTendencia(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("indicadores_tendencia", err)
	}
	if code != "" {
		return failReply(code)
	}
	type item struct {
		Mes        string `json:"mes"`
		EscopoTipo string `json:"tipo"`
		EscopoNome string `json:"nome"`
		Indicador  string `json:"indicador"`
		Valor      int64  `json:"valor"`
	}
	out := []item{}
	if a.user.SoDiscipulador() {
		return okReply(map[string]any{"retratos": out})
	}
	now := s.Now()
	br := now.In(fusoBR)
	if err := s.Store.GarantirRetrato(ctx, br.Format("2006-01"), br.Format("2006-01-02"), now); err != nil {
		// Sem o retrato deste mês a tela só perde a tendência; a leitura segue.
		s.Log.Warn("retrato mensal não gravado", "erro", err.Error())
	}
	desde := time.Date(br.Year(), br.Month(), 1, 12, 0, 0, 0, fusoBR).AddDate(0, -11, 0).Format("2006-01")
	rs, err := s.Store.ListRetratos(ctx, a.scope, desde)
	if err != nil {
		return s.internal("indicadores_tendencia", err)
	}
	for _, r := range rs {
		out = append(out, item{r.Mes, r.EscopoTipo, r.EscopoNome, r.Indicador, r.Valor})
	}
	return okReply(map[string]any{"retratos": out})
}
