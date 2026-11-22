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

// dadosCelula é o que o ranking e a multiplicação leem do banco para uma célula.
type dadosCelula struct {
	celula                     string
	membros                    []anfitriao.Membro
	casas                      []anfitriao.Casa
	interessadosSemConfirmacao int
	confirmadosSemPosicao      int
}

// lerCelula autentica, valida a célula e lê membros e casas do escopo. Devolve
// uma resposta pronta (erro) quando não dá para seguir.
func (s *Server) lerCelula(ctx context.Context, req adminReq, acao string) (*dadosCelula, *reply) {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		r := s.internal(acao, err)
		return nil, &r
	}
	if code != "" {
		r := failReply(code)
		return nil, &r
	}
	celula := strings.TrimSpace(req.Celula)
	if celula == "" || len([]rune(celula)) > 80 {
		r := failReply("dados_invalidos")
		return nil, &r
	}
	membros, visivel, err := s.Store.MembrosCelula(ctx, a.scope, celula)
	if err != nil {
		r := s.internal(acao, err)
		return nil, &r
	}
	if !visivel {
		r := failReply("nao_encontrado")
		return nil, &r
	}
	cands, interessados, err := s.Store.CandidatosAnfitriao(ctx, a.scope)
	if err != nil {
		r := s.internal(acao, err)
		return nil, &r
	}
	d := &dadosCelula{celula: celula, interessadosSemConfirmacao: interessados}
	for _, c := range cands {
		if c.Lat == nil || c.Lng == nil {
			d.confirmadosSemPosicao++
			continue
		}
		d.casas = append(d.casas, anfitriao.Casa{Linha: c.Linha, Nome: c.Nome, Capacidade: c.Capacidade,
			Dias: c.Dias, Lat: *c.Lat, Lng: *c.Lng, PeloBairro: c.PeloBairro})
	}
	d.membros = make([]anfitriao.Membro, len(membros))
	for i, m := range membros {
		d.membros[i] = anfitriao.Membro{Linha: m.Linha, Lat: m.Lat, Lng: m.Lng}
	}
	return d, nil
}

func (d *dadosCelula) foraDoRanking() map[string]any {
	return map[string]any{
		"interessadosSemConfirmacao": d.interessadosSemConfirmacao, "confirmadosSemPosicao": d.confirmadosSemPosicao,
	}
}

// casasOut é o formato de cada casa na resposta: sem coordenada nem nome.
func casasOut(cs []anfitriao.Posicao) []map[string]any {
	out := make([]map[string]any, len(cs))
	for i, c := range cs {
		dias := c.Dias
		if dias == nil {
			dias = []string{}
		}
		out[i] = map[string]any{
			"linha": c.Linha, "mediaKm": c.MediaKm, "maxKm": c.MaxKm, "considerados": c.Considerados,
			"comporta": c.Comporta, "capacidade": c.Capacidade, "dias": dias, "peloBairro": c.PeloBairro,
		}
	}
	return out
}

func (s *Server) anfitrioesRanking(ctx context.Context, req adminReq) reply {
	d, falha := s.lerCelula(ctx, req, "anfitrioes_ranking")
	if falha != nil {
		return *falha
	}
	r := anfitriao.Ranking(d.casas, d.membros)
	return okReply(map[string]any{
		"celula": d.celula, "membros": r.Membros, "semPosicao": r.SemPosicao, "casas": casasOut(r.Casas),
		"foraDoRanking": d.foraDoRanking(),
	})
}
