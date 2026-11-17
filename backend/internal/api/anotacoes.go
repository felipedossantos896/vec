package api

import (
	"context"

	"vec/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Anotações de acompanhamento
// ---------------------------------------------------------------------------
// Quem enxerga a pessoa lê e escreve anotações sobre ela; cada um apaga só as suas.

const maxAnotacao = 2000

func (s *Server) anotacoes(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("anotacoes", err)
	}
	if code != "" {
		return failReply(code)
	}
	return s.listaAnotacoes(ctx, a, req.Linha)
}

func (s *Server) anotacaoSalvar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("anotacao_salvar", err)
	}
	if code != "" {
		return failReply(code)
	}
	texto := cleanText(req.Texto, maxAnotacao)
	if texto == "" || req.Linha <= 0 {
		return failReply("texto_vazio")
	}
	ok, err := s.Store.AddAnotacao(ctx, a.scope, req.Linha, store.Anotacao{Autor: a.user.Usuario, AutorNome: nomeOuUsuario(a.user), Texto: texto}, s.Now())
	if err != nil {
		return s.internal("anotacao_salvar", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	return s.listaAnotacoes(ctx, a, req.Linha)
}

func (s *Server) anotacaoExcluir(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("anotacao_excluir", err)
	}
	if code != "" {
		return failReply(code)
	}
	ok, err := s.Store.DeleteAnotacao(ctx, a.scope, req.ID, a.user.Usuario)
	if err != nil {
		return s.internal("anotacao_excluir", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	return s.listaAnotacoes(ctx, a, req.Linha)
}

func (s *Server) listaAnotacoes(ctx context.Context, a *session, linha int64) reply {
	as, ok, err := s.Store.ListAnotacoes(ctx, a.scope, linha)
	if err != nil {
		return s.internal("anotacoes", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	out := make([]map[string]any, 0, len(as))
	for _, n := range as {
		out = append(out, map[string]any{"id": n.ID, "autor": n.Autor, "autorNome": n.AutorNome, "em": fmtLocal(n.CriadoEm), "texto": n.Texto, "minha": n.Autor == a.user.Usuario})
	}
	return okReply(map[string]any{"anotacoes": out})
}
