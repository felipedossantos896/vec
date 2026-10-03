// Package api implementa o endpoint /api, com o mesmo protocolo JSON que o
// Google Apps Script usava. Assim o formulário e o painel quase não mudam.
package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"vec/internal/auth"
	"vec/internal/store"
	"vec/internal/turso"
)

const (
	maxTentativas  = 5
	bloqueioDur    = 15 * time.Minute
	senhaMinima    = 6
	sessaoDuracao  = 6 * time.Hour
	limiteCorpoAPI = 64 << 10
)

// Server atende as chamadas de /api.
type Server struct {
	Store  *store.Store
	Secret []byte
	TTL    time.Duration
	Now    func() time.Time
	Log    *slog.Logger

	dummyHash string
	cache     listasCache
}

// New cria o servidor. Calcula um hash fictício para igualar o tempo de resposta
// quando o usuário não existe (evita descobrir usuários pelo tempo do login).
func New(st *store.Store, secret []byte, log *slog.Logger) (*Server, error) {
	if len(secret) < 32 {
		return nil, errors.New("SESSION_SECRET precisa ter pelo menos 32 caracteres")
	}
	if log == nil {
		log = slog.New(slog.NewTextHandler(io.Discard, nil))
	}
	dummy, err := auth.HashPassword("senha-ficticia-para-igualar-o-tempo")
	if err != nil {
		return nil, err
	}
	return &Server{Store: st, Secret: secret, TTL: sessaoDuracao, Now: time.Now, Log: log, dummyHash: dummy}, nil
}

// Handler devolve as rotas /api e /healthz.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api", s.handleAPI)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		_, _ = io.WriteString(w, "ok")
	})
	return mux
}

// ---------------------------------------------------------------------------
// Respostas e medição de tempo
// ---------------------------------------------------------------------------

type reply struct {
	status int
	body   map[string]any
}

func okReply(m map[string]any) reply {
	if m == nil {
		m = map[string]any{}
	}
	m["ok"] = true
	return reply{http.StatusOK, m}
}

// Erros de negócio voltam com HTTP 200 e {ok:false, erro:"codigo"},
// como o Apps Script fazia.
func failReply(code string) reply {
	return reply{http.StatusOK, map[string]any{"ok": false, "erro": code}}
}

func (s *Server) internal(acao string, err error) reply {
	s.Log.Error("erro interno", "acao", acao, "erro", err.Error())
	return reply{http.StatusInternalServerError, map[string]any{"ok": false, "erro": "interno"}}
}

type timingKey struct{}

type timing struct {
	mu    sync.Mutex
	db    time.Duration
	calls int
}

func (t *timing) add(d time.Duration) {
	t.mu.Lock()
	t.db += d
	t.calls++
	t.mu.Unlock()
}

type timedDB struct{ inner turso.DB }

// WrapDB mede o tempo gasto no banco em cada requisição (cabeçalho Server-Timing).
func WrapDB(db turso.DB) turso.DB { return timedDB{db} }

func (t timedDB) Do(ctx context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	start := time.Now()
	res, err := t.inner.Do(ctx, stmts...)
	if tm, ok := ctx.Value(timingKey{}).(*timing); ok {
		tm.add(time.Since(start))
	}
	return res, err
}

func (t timedDB) Tx(ctx context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	start := time.Now()
	res, err := t.inner.Tx(ctx, stmts...)
	if tm, ok := ctx.Value(timingKey{}).(*timing); ok {
		tm.add(time.Since(start))
	}
	return res, err
}

func ms(d time.Duration) float64 { return float64(d.Microseconds()) / 1000 }

func (s *Server) respond(w http.ResponseWriter, acao string, tm *timing, start time.Time, r reply) {
	total := time.Since(start)
	tm.mu.Lock()
	db, calls := tm.db, tm.calls
	tm.mu.Unlock()

	h := w.Header()
	h.Set("Content-Type", "application/json; charset=utf-8")
	h.Set("Server-Timing", fmt.Sprintf(`db;dur=%.1f;desc="%d consultas", total;dur=%.1f`, ms(db), calls, ms(total)))
	w.WriteHeader(r.status)
	_ = json.NewEncoder(w).Encode(r.body)

	s.Log.Info("api", "acao", acao, "status", r.status, "total_ms", ms(total), "db_ms", ms(db), "consultas", calls)
}

// ---------------------------------------------------------------------------
// Roteamento
// ---------------------------------------------------------------------------

type adminReq struct {
	Token    string   `json:"token"`
	Usuario  string   `json:"usuario"`
	Senha    string   `json:"senha"`
	Novo     bool     `json:"novo"`
	Nome     string   `json:"nome"`
	Perfil   string   `json:"perfil"`
	Setores  []string `json:"setores"`
	Celulas  []string `json:"celulas"`
	Ativo    *bool    `json:"ativo"`
	Gerencia bool     `json:"gerencia"`
}

func (s *Server) handleAPI(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	tm := &timing{}
	ctx := context.WithValue(r.Context(), timingKey{}, tm)

	h := w.Header()
	h.Set("Cache-Control", "no-store")
	h.Set("X-Content-Type-Options", "nosniff")

	switch r.Method {
	case http.MethodGet:
		s.respond(w, "status", tm, start, reply{http.StatusOK, map[string]any{"status": "online", "servico": "Área VEC"}})
		return
	case http.MethodPost:
	default:
		h.Set("Allow", "GET, POST")
		s.respond(w, "metodo", tm, start, reply{http.StatusMethodNotAllowed, map[string]any{"ok": false, "erro": "metodo"}})
		return
	}

	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, limiteCorpoAPI))
	if err != nil {
		s.respond(w, "corpo", tm, start, reply{http.StatusRequestEntityTooLarge, map[string]any{"ok": false, "erro": "requisicao_invalida"}})
		return
	}
	var head struct {
		Acao string `json:"acao"`
	}
	if err := json.Unmarshal(body, &head); err != nil {
		s.respond(w, "json", tm, start, reply{http.StatusBadRequest, map[string]any{"ok": false, "erro": "requisicao_invalida"}})
		return
	}

	acao := head.Acao
	var rep reply
	if acao == "" {
		acao = "formulario" // o formulário público não manda "acao"
		rep = s.formulario(ctx, body)
	} else {
		var req adminReq
		if err := json.Unmarshal(body, &req); err != nil {
			s.respond(w, acao, tm, start, reply{http.StatusBadRequest, map[string]any{"ok": false, "erro": "requisicao_invalida"}})
			return
		}
		switch acao {
		case "login":
			rep = s.login(ctx, req)
		case "logout":
			rep = okReply(nil) // sessões são assinadas e expiram sozinhas
		case "listar":
			rep = s.listar(ctx, req)
		case "usuarios_listar":
			rep = s.usuariosListar(ctx, req)
		case "usuario_salvar":
			rep = s.usuarioSalvar(ctx, req)
		default:
			rep = failReply("acao_desconhecida")
		}
	}
	s.respond(w, acao, tm, start, rep)
}

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
	usuario := normUser(req.Usuario)
	if !validUser(usuario) || req.Senha == "" || len(req.Senha) > 256 {
		return failReply("credenciais")
	}
	now := s.Now()

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
		if err := s.Store.RegisterFailure(ctx, usuario, maxTentativas, now.Add(bloqueioDur)); err != nil {
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

	usuario := normUser(req.Usuario)
	nome := cleanLine(req.Nome, 80)
	perfil := strings.ToUpper(strings.TrimSpace(req.Perfil))
	ativo := req.Ativo == nil || *req.Ativo
	setores := cleanList(req.Setores)
	celulas := cleanList(req.Celulas)

	switch {
	case !validUser(usuario):
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
