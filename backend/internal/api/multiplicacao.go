package api

import (
	"context"

	"vec/backend/internal/anfitriao"
)

// ---------------------------------------------------------------------------
// Planejar a multiplicação de uma célula (Spec 005)
// ---------------------------------------------------------------------------
// Só simulação: nada é gravado e ninguém muda de célula. Sem `grupos`, devolve a
// proposta automática; com `grupos`, recalcula a divisão ajustada pelo líder, que
// precisa ter exatamente os membros da célula no escopo. A resposta tem só
// números de cadastro, contagens e distâncias arredondadas.

func (s *Server) multiplicacao(ctx context.Context, req adminReq) reply {
	d, falha := s.lerCelula(ctx, req, "multiplicacao")
	if falha != nil {
		return *falha
	}
	var div anfitriao.Divisao
	ajustada := req.Grupos != nil
	if ajustada {
		var ok bool
		if div, ok = divisaoAjustada(req.Grupos, d.membros); !ok {
			return failReply("dados_invalidos")
		}
	} else {
		div = anfitriao.Dividir(d.membros)
	}
	porLinha := make(map[int64]anfitriao.Membro, len(d.membros))
	for _, m := range d.membros {
		porLinha[m.Linha] = m
	}
	semPos := make(map[int64]bool, len(div.SemPosicao))
	for _, l := range div.SemPosicao {
		semPos[l] = true
	}
	grupos := make([]map[string]any, 2)
	var primeiras [2]int64
	for g, linhas := range div.Grupos {
		ms := make([]anfitriao.Membro, len(linhas))
		sem := []int64{}
		for i, l := range linhas {
			ms[i] = porLinha[l]
			if semPos[l] {
				sem = append(sem, l)
			}
		}
		r := anfitriao.Ranking(d.casas, ms)
		if len(r.Casas) > 0 {
			primeiras[g] = r.Casas[0].Linha
		}
		grupos[g] = map[string]any{
			"linhas": append([]int64{}, linhas...), "semPosicao": sem, "membros": r.Membros, "casas": casasOut(r.Casas),
		}
	}
	return okReply(map[string]any{
		"celula": d.celula, "automatica": div.Automatica, "ajustada": ajustada, "grupos": grupos,
		"mesmaPrimeira": primeiras[0] != 0 && primeiras[0] == primeiras[1],
		"minimo":        anfitriao.MinimoParaDividir, "foraDoRanking": d.foraDoRanking(),
	})
}

// divisaoAjustada confere que os dois grupos enviados têm, juntos, exatamente os
// membros da célula no escopo, sem repetição nem estranhos.
func divisaoAjustada(enviados [][]int64, membros []anfitriao.Membro) (anfitriao.Divisao, bool) {
	if len(enviados) != 2 {
		return anfitriao.Divisao{}, false
	}
	daCelula := make(map[int64]bool, len(membros))
	var semPosicao []int64
	for _, m := range membros {
		daCelula[m.Linha] = true
		if m.Lat == nil || m.Lng == nil {
			semPosicao = append(semPosicao, m.Linha)
		}
	}
	visto := make(map[int64]bool, len(membros))
	var div anfitriao.Divisao
	for g, linhas := range enviados {
		div.Grupos[g] = []int64{}
		for _, l := range linhas {
			if !daCelula[l] || visto[l] {
				return anfitriao.Divisao{}, false
			}
			visto[l] = true
			div.Grupos[g] = append(div.Grupos[g], l)
		}
	}
	if len(visto) != len(membros) {
		return anfitriao.Divisao{}, false
	}
	div.SemPosicao = semPosicao
	return div, true
}
