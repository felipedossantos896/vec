package api

import (
	"context"

	"vec/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Confirmação de anfitrião (Spec 004)
// ---------------------------------------------------------------------------
// Só pelo painel, só dentro do escopo (o store põe o escopo no SQL) e só com a
// confirmação marcada agora por quem salva. A observação nunca vai para o log.

// anfitriaoIn é a confirmação enviada pelo painel em anfitriao_salvar.
type anfitriaoIn struct {
	Capacidade int      `json:"capacidade"`
	Dias       []string `json:"dias"`
	Observacao string   `json:"observacao"`
}

const (
	minCapacidade = 2
	maxCapacidade = 50
	maxObservacao = 200
)

// diasSemana na ordem em que são gravados e mostrados.
var diasSemana = []string{"seg", "ter", "qua", "qui", "sex", "sab", "dom"}

// validarAnfitriao normaliza a confirmação e devolve o código de erro ("" = válido).
// Os dias saem sem repetição e na ordem da semana; a observação acima do limite é
// recusada, não cortada.
func validarAnfitriao(in anfitriaoIn) (store.Anfitriao, string) {
	if in.Capacidade < minCapacidade || in.Capacidade > maxCapacidade {
		return store.Anfitriao{}, "capacidade_invalida"
	}
	marcados := map[string]bool{}
	for _, d := range in.Dias {
		if !contem(diasSemana, d) {
			return store.Anfitriao{}, "dias_invalidos"
		}
		marcados[d] = true
	}
	var dias []string
	for _, d := range diasSemana {
		if marcados[d] {
			dias = append(dias, d)
		}
	}
	if len(dias) == 0 {
		return store.Anfitriao{}, "dias_invalidos"
	}
	obs := cleanLine(in.Observacao, maxObservacao+1)
	if len([]rune(obs)) > maxObservacao {
		return store.Anfitriao{}, "dados_invalidos"
	}
	return store.Anfitriao{Capacidade: in.Capacidade, Dias: dias, Observacao: obs}, ""
}

func contem(lista []string, v string) bool {
	for _, x := range lista {
		if x == v {
			return true
		}
	}
	return false
}

func anfitriaoOut(a store.Anfitriao) map[string]any {
	dias := a.Dias
	if dias == nil {
		dias = []string{}
	}
	return map[string]any{
		"capacidade": a.Capacidade, "dias": dias, "observacao": a.Observacao,
		"confirmadoEm": fmtLocal(a.ConfirmadoEm), "confirmadoPor": a.ConfirmadoPor,
	}
}

func (s *Server) anfitriaoLer(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("anfitriao_ler", err)
	}
	if code != "" {
		return failReply(code)
	}
	if req.Linha <= 0 {
		return failReply("dados_invalidos")
	}
	conf, tem, visivel, err := s.Store.Anfitriao(ctx, a.scope, req.Linha)
	if err != nil {
		return s.internal("anfitriao_ler", err)
	}
	if !visivel {
		return failReply("nao_encontrado")
	}
	if !tem {
		return okReply(map[string]any{"anfitriao": nil})
	}
	return okReply(map[string]any{"anfitriao": anfitriaoOut(conf)})
}

func (s *Server) anfitriaoSalvar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("anfitriao_salvar", err)
	}
	if code != "" {
		return failReply(code)
	}
	if req.Linha <= 0 || req.Anfitriao == nil {
		return failReply("dados_invalidos")
	}
	if !req.Confirmacao {
		return failReply("confirmacao_anfitriao")
	}
	conf, erro := validarAnfitriao(*req.Anfitriao)
	if erro != "" {
		return failReply(erro)
	}
	ok, err := s.Store.SalvarAnfitriao(ctx, a.scope, req.Linha, conf, a.user.Usuario, s.Now())
	if err != nil {
		return s.internal("anfitriao_salvar", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	s.Log.Info("anfitrião confirmado", "linha", req.Linha, "por", a.user.Usuario)
	return s.anfitriaoLer(ctx, req)
}

func (s *Server) anfitriaoExcluir(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("anfitriao_excluir", err)
	}
	if code != "" {
		return failReply(code)
	}
	if req.Linha <= 0 {
		return failReply("dados_invalidos")
	}
	ok, err := s.Store.ExcluirAnfitriao(ctx, a.scope, req.Linha)
	if err != nil {
		return s.internal("anfitriao_excluir", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	s.Log.Info("confirmação de anfitrião removida", "linha", req.Linha, "por", a.user.Usuario)
	return okReply(nil)
}
