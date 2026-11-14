package api

import (
	"context"
	"time"

	"vec/backend/internal/auth"
	"vec/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Autenticação
// ---------------------------------------------------------------------------

type session struct {
	user  *store.User
	scope store.Scope
}

// authenticate confere o token e relê o usuário no banco a cada chamada:
// desativar alguém ou trocar a senha vale na hora.
// Retorna (sessão, "", nil) ou (nil, "sessao"|"sem_escopo", nil) ou (nil, "", err).
func (s *Server) authenticate(ctx context.Context, token string) (*session, string, error) {
	usuario, fp, err := auth.ParseToken(s.Secret, token, s.Now())
	if err != nil {
		return nil, "sessao", nil
	}
	u, err := s.Store.GetUser(ctx, usuario)
	if err != nil {
		return nil, "", err
	}
	if u == nil || !u.Ativo || auth.Fingerprint(u.SenhaHash) != fp {
		return nil, "sessao", nil
	}
	sc, valido := u.Escopo()
	if !valido {
		return nil, "sem_escopo", nil
	}
	return &session{user: u, scope: sc}, "", nil
}

func (s *Server) login(ctx context.Context, req adminReq) reply {
	usuario := NormUser(req.Usuario)
	if !ValidUser(usuario) || req.Senha == "" || len(req.Senha) > 256 {
		return failReply("credenciais")
	}
	now := s.Now()
	if !s.loginRate.allow(now) {
		return failReply("login_limitado")
	}

	u, bloqueio, err := s.Store.LoginState(ctx, usuario)
	if err != nil {
		return s.internal("login", err)
	}
	if bloqueio != "" {
		if ate, e := time.Parse(time.RFC3339, bloqueio); e == nil && now.Before(ate) {
			return failReply("bloqueado")
		}
	}

	ok := false
	if u != nil && u.Ativo {
		ok = auth.VerifyPassword(req.Senha, u.SenhaHash)
	} else {
		auth.VerifyPassword(req.Senha, s.dummyHash) // gasta o mesmo tempo
	}
	if !ok {
		chaveFalha := usuario
		if u == nil {
			// Nomes inexistentes compartilham uma linha para não crescerem sem limite.
			chaveFalha = ""
		}
		if err := s.Store.RegisterFailure(ctx, chaveFalha, maxTentativas, now.Add(bloqueioDur)); err != nil {
			s.Log.Error("registrando falha de login", "erro", err.Error())
		}
		return failReply("credenciais")
	}
	if _, valido := u.Escopo(); !valido {
		return failReply("sem_escopo")
	}
	if err := s.Store.LoginOK(ctx, usuario, now); err != nil {
		s.Log.Error("registrando acesso", "erro", err.Error()) // não impede o login
	}
	return okReply(map[string]any{
		"token":    auth.NewToken(s.Secret, u.Usuario, auth.Fingerprint(u.SenhaHash), s.TTL, now),
		"usuario":  u.Usuario,
		"nome":     nomeOuUsuario(u),
		"gerencia": u.Gerencia,
		"expiraEm": int(s.TTL.Seconds()),
	})
}
