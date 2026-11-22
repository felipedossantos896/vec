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
	"sync"
	"time"

	"vec/backend/internal/auth"
	"vec/backend/internal/store"
	"vec/backend/internal/turso"
)

const (
	maxTentativas  = 5
	bloqueioDur    = 15 * time.Minute
	senhaMinima    = 6
	sessaoDuracao  = 6 * time.Hour
	limiteCorpoAPI = 64 << 10
	maxLoginMinuto = 10
)

// Server atende as chamadas de /api.
type Server struct {
	Store  *store.Store
	Secret []byte
	TTL    time.Duration
	Now    func() time.Time
	Log    *slog.Logger

	// Geo transforma endereço em coordenada em segundo plano (Spec 003). nil =
	// desligado (GEOCODER=off ou testes).
	Geo Geocodificador

	dummyHash string
	cache     listasCache
	loginRate loginRate
	envios    limiteEnvios   // envios do formulário público por IP (Spec 007)
	geoWG     sync.WaitGroup // tarefas de geocodificação em andamento (testes esperam)
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
	mux.HandleFunc("/api/foto", s.handleFoto)
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

type loginRate struct {
	mu         sync.Mutex
	inicio     time.Time
	tentativas int
}

// shortcut: limite local a este processo; use limite compartilhado no ingresso antes de escalar horizontalmente.
func (l *loginRate) allow(now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.inicio.IsZero() || now.Before(l.inicio) || now.Sub(l.inicio) >= time.Minute {
		l.inicio = now
		l.tentativas = 0
	}
	if l.tentativas >= maxLoginMinuto {
		return false
	}
	l.tentativas++
	return true
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
	Cadastro int64    `json:"cadastro"`
	// Setores e células
	Tipo    string `json:"tipo"`
	ID      int64  `json:"id"`
	SetorID int64  `json:"setorId"`
	Texto   string `json:"texto"` // anotação de acompanhamento // cadastro da própria pessoa, ligado ao login
	// Edição de cadastro: número do cadastro e os campos do formulário
	Linha  int64                      `json:"linha"`
	Imagem string                     `json:"imagem"` // foto de perfil em base64
	Dados  map[string]json.RawMessage `json:"dados"`
	// Endereço da pessoa (Spec 002): consentimento marcado agora por quem salva
	Endereco      *enderecoIn `json:"endereco"`
	Consentimento bool        `json:"consentimento"`
	// Anfitrião (Spec 004): confirmação marcada agora por quem salva
	Anfitriao   *anfitriaoIn `json:"anfitriao"`
	Confirmacao bool         `json:"confirmacao"`
	// Ranking de anfitriões (Spec 004): célula escolhida pelo líder
	Celula string `json:"celula"`
	// Identidade da célula (Spec 009)
	Cor         string `json:"cor"`
	DiaSemana   string `json:"diaSemana"`
	Horario     string `json:"horario"`
	AnfitriaoID int64  `json:"anfitriaoId"`
	// Multiplicação (Spec 005): divisão ajustada pelo líder, dois grupos de cadastros
	Grupos [][]int64 `json:"grupos"`
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
		rep = s.formulario(ctx, body, ipCliente(r))
	} else {
		var req adminReq
		if err := json.Unmarshal(body, &req); err != nil {
			s.respond(w, acao, tm, start, reply{http.StatusBadRequest, map[string]any{"ok": false, "erro": "requisicao_invalida"}})
			return
		}
		switch acao {
		case "formulario_marca":
			// Público: a página pede ao abrir (Spec 007). Só horário e assinatura.
			rep = okReply(map[string]any{"marca": s.marcaFormulario(s.Now())})
		case "login":
			rep = s.login(ctx, req)
		case "logout":
			rep = okReply(nil) // sessões são assinadas e expiram sozinhas
		case "listar":
			rep = s.listar(ctx, req)
		case "estrutura":
			rep = s.estruturaPublica(ctx) // pública: o formulário monta a lista de células com ela
		case "estrutura_salvar":
			rep = s.estruturaSalvar(ctx, req)
		case "anotacoes":
			rep = s.anotacoes(ctx, req)
		case "anotacao_salvar":
			rep = s.anotacaoSalvar(ctx, req)
		case "anotacao_excluir":
			rep = s.anotacaoExcluir(ctx, req)
		case "registro_salvar":
			rep = s.registroSalvar(ctx, req)
		case "registro_excluir":
			rep = s.registroExcluir(ctx, req)
		case "foto_salvar":
			rep = s.fotoSalvar(ctx, req)
		case "foto_excluir":
			rep = s.fotoExcluir(ctx, req)
		case "endereco_ler":
			rep = s.enderecoLer(ctx, req)
		case "endereco_salvar":
			rep = s.enderecoSalvar(ctx, req)
		case "endereco_excluir":
			rep = s.enderecoExcluir(ctx, req)
		case "anfitriao_ler":
			rep = s.anfitriaoLer(ctx, req)
		case "anfitriao_salvar":
			rep = s.anfitriaoSalvar(ctx, req)
		case "anfitriao_excluir":
			rep = s.anfitriaoExcluir(ctx, req)
		case "multiplicacao":
			rep = s.multiplicacao(ctx, req)
		case "anfitrioes_ranking":
			rep = s.anfitrioesRanking(ctx, req)
		case "mapa":
			rep = s.mapa(ctx, req)
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
