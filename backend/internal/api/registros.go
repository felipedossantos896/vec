package api

import (
	"context"
	"time"
)

// ---------------------------------------------------------------------------
// Edição de cadastros pelo painel
// ---------------------------------------------------------------------------
// Cada líder edita e exclui apenas o que enxerga: o escopo entra na própria
// instrução SQL, então um cadastro de fora nunca é alterado.

func (s *Server) registroSalvar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("registro_salvar", err)
	}
	if code != "" {
		return failReply(code)
	}
	if req.Linha <= 0 || req.Dados == nil {
		return failReply("dados_invalidos")
	}
	now := s.Now()
	// Cadastros importados da planilha antiga podem não ter data de nascimento.
	v, code, err := s.validar(ctx, req.Dados, now, false)
	if err != nil {
		return s.internal("registro_salvar", err)
	}
	if code != "" {
		return failReply(code)
	}
	ok, err := s.Store.UpdateResposta(ctx, a.scope, req.Linha, v, a.user.Usuario, now)
	if err != nil {
		return s.internal("registro_salvar", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	s.Log.Info("cadastro editado", "linha", req.Linha, "por", a.user.Usuario)
	return okReply(map[string]any{"dados": v, "editadoEm": fmtLocal(now.UTC().Format(time.RFC3339)), "editadoPor": a.user.Usuario})
}

func (s *Server) registroExcluir(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("registro_excluir", err)
	}
	if code != "" {
		return failReply(code)
	}
	if req.Linha <= 0 {
		return failReply("dados_invalidos")
	}
	ok, err := s.Store.DeleteResposta(ctx, a.scope, req.Linha, a.user.Usuario, s.Now())
	if err != nil {
		return s.internal("registro_excluir", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	s.Log.Info("cadastro excluído", "linha", req.Linha, "por", a.user.Usuario)
	return okReply(nil)
}
