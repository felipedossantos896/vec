package api

import (
	"context"
	"errors"
	"strings"

	"vec/backend/internal/auth"
	"vec/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Painel
// ---------------------------------------------------------------------------

func (s *Server) listar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("listar", err)
	}
	if code != "" {
		return failReply(code)
	}
	rs, err := s.Store.ListRespostas(ctx, a.scope)
	if err != nil {
		return s.internal("listar", err)
	}
	registros := make([]map[string]any, 0, len(rs))
	for _, r := range rs {
		m := make(map[string]any, len(r.V)+2)
		for k, v := range r.V {
			m[k] = v
		}
		m["linha"] = r.ID
		m["dataHora"] = fmtLocal(r.CriadoEm)
		registros = append(registros, m)
	}
	return okReply(map[string]any{
		"nome":     nomeOuUsuario(a.user),
		"gerencia": a.user.Gerencia,
		"escopo": map[string]any{
			"todos":   a.scope.Todos,
			"perfil":  a.user.Perfil,
			"setores": nonNil(a.scope.Setores),
			"celulas": nonNil(a.scope.Celulas),
		},
		"registros": registros,
	})
}

func (s *Server) usuariosListar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("usuarios_listar", err)
	}
	if code != "" {
		return failReply(code)
	}
	if !a.user.Gerencia {
		return failReply("sem_permissao")
	}
	users, err := s.Store.ListUsers(ctx)
	if err != nil {
		return s.internal("usuarios_listar", err)
	}
	out := make([]map[string]any, 0, len(users))
	for _, u := range users {
		out = append(out, map[string]any{
			"usuario":  u.Usuario,
			"nome":     u.Nome,
			"ativo":    u.Ativo,
			"perfil":   u.Perfil,
			"setores":  nonNil(u.Setores),
			"celulas":  nonNil(u.Celulas),
			"gerencia": u.Gerencia,
			"temSenha": u.SenhaHash != "",
			"criado":   fmtLocal(u.CriadoEm),
			"acesso":   fmtLocal(u.Acesso),
		})
	}
	return okReply(map[string]any{"usuarios": out})
}

func (s *Server) usuarioSalvar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("usuario_salvar", err)
	}
	if code != "" {
		return failReply(code)
	}
	if !a.user.Gerencia {
		return failReply("sem_permissao")
	}

	usuario := NormUser(req.Usuario)
	nome := cleanLine(req.Nome, 80)
	perfil := strings.ToUpper(strings.TrimSpace(req.Perfil))
	ativo := req.Ativo == nil || *req.Ativo
	setores := cleanList(req.Setores)
	celulas := cleanList(req.Celulas)

	switch {
	case !ValidUser(usuario):
		return failReply("usuario_invalido")
	case nome == "":
		return failReply("nome_obrigatorio")
	case perfil != "AREA" && perfil != "SETOR" && perfil != "CELULA":
		return failReply("perfil_invalido")
	case (req.Novo || req.Senha != "") && len([]rune(req.Senha)) < senhaMinima:
		return failReply("senha_curta")
	case len(req.Senha) > 256:
		return failReply("senha_longa")
	}
	switch perfil {
	case "AREA":
		setores, celulas = nil, nil
	case "CELULA":
		setores = nil
		if len(celulas) == 0 {
			return failReply("escopo_obrigatorio")
		}
	case "SETOR":
		if len(setores) == 0 {
			return failReply("escopo_obrigatorio")
		}
	}

	eu := usuario == a.user.Usuario
	if eu && (!ativo || !req.Gerencia) {
		return failReply("auto_bloqueio")
	}

	hash := ""
	if req.Senha != "" {
		if hash, err = auth.HashPassword(req.Senha); err != nil {
			return s.internal("usuario_salvar", err)
		}
	}
	err = s.Store.SaveUser(ctx, store.User{
		Usuario: usuario, Nome: nome, Perfil: perfil, Ativo: ativo, Gerencia: req.Gerencia,
		Setores: setores, Celulas: celulas,
	}, hash, req.Novo, s.Now())
	switch {
	case errors.Is(err, store.ErrUserExists):
		return failReply("usuario_existe")
	case errors.Is(err, store.ErrUserNotFound):
		return failReply("nao_encontrado")
	case err != nil:
		return s.internal("usuario_salvar", err)
	}

	resp := map[string]any{}
	if eu && hash != "" {
		// A senha mudou, então o token antigo deixou de valer: devolve um novo.
		resp["token"] = auth.NewToken(s.Secret, usuario, auth.Fingerprint(hash), s.TTL, s.Now())
		resp["expiraEm"] = int(s.TTL.Seconds())
	}
	return okReply(resp)
}
