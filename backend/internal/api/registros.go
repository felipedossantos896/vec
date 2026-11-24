package api

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"vec/backend/internal/store"
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
	// Líder de área ou setor continua sem célula na edição (Spec 013)
	if papel, err := s.Store.PapelDe(ctx, req.Linha); err != nil {
		return s.internal("registro_salvar", err)
	} else if papel == "lider_setor" || papel == "lider_area" {
		v["celula"] = ""
		if papel == "lider_area" {
			v["setor"] = ""
		}
	}
	// O discipulador escolhido precisa ser outro cadastro da área; o nome dele passa a
	// valer no lugar do que a pessoa digitou no formulário.
	var discipulador int64
	if bruto, tem := req.Dados["discipuladorId"]; tem {
		if err := json.Unmarshal(bruto, &discipulador); err != nil || discipulador < 0 || discipulador == req.Linha {
			return failReply("discipulador_invalido")
		}
	}
	if discipulador != 0 {
		nome, existe, err := s.Store.NomeDaPessoa(ctx, discipulador)
		if err != nil {
			return s.internal("registro_salvar", err)
		}
		if !existe {
			return failReply("discipulador_invalido")
		}
		v["discipulador"] = nome
	}
	ok, err := s.Store.UpdateResposta(ctx, a.scope, req.Linha, v, discipulador, a.user.Usuario, now)
	if errors.Is(err, store.ErrBatismoRequisitos) {
		return failReply(erroBatismo(v))
	}
	if err != nil {
		return s.internal("registro_salvar", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	s.Log.Info("cadastro editado", "linha", req.Linha, "por", a.user.Usuario)
	return okReply(map[string]any{"dados": v, "discipuladorId": discipulador, "editadoEm": fmtLocal(now.UTC().Format(time.RFC3339)), "editadoPor": a.user.Usuario})
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
