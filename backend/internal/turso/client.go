// Package turso é um cliente mínimo para o Turso (libSQL) usando o protocolo
// Hrana sobre HTTP com JSON. Usa apenas a biblioteca padrão do Go, então o
// projeto não tem dependências externas.
//
// Referência do protocolo:
// https://github.com/tursodatabase/libsql/blob/main/docs/HRANA_3_SPEC.md
package turso

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Stmt é uma instrução SQL com parâmetros posicionais (?).
// Tipos aceitos em Args: nil, string, int, int64, bool, float64 e []byte.
type Stmt struct {
	SQL  string
	Args []any
}

// Result é o resultado de uma instrução.
// Valores das linhas: nil, int64, float64, string ou []byte.
type Result struct {
	Cols         []string
	Rows         [][]any
	Affected     int64
	LastInsertID int64
}

// Error é um erro devolvido pelo próprio banco (ex.: violação de UNIQUE).
type Error struct {
	Message string
	Code    string
}

func (e *Error) Error() string { return e.Message }

// IsConstraint informa se o erro é uma violação de restrição (UNIQUE, CHECK...).
func IsConstraint(err error) bool {
	var e *Error
	if !errors.As(err, &e) {
		return false
	}
	return strings.Contains(strings.ToUpper(e.Message+" "+e.Code), "CONSTRAINT")
}

// DB é a interface usada pelo restante do projeto. Facilita trocar o banco
// em testes.
type DB interface {
	// Do executa as instruções em sequência, em uma única ida ao servidor.
	// NÃO é atômico: serve para leituras ou escritas independentes.
	Do(ctx context.Context, stmts ...Stmt) ([]*Result, error)
	// Tx executa as instruções dentro de uma transação (tudo ou nada),
	// em uma única ida ao servidor.
	Tx(ctx context.Context, stmts ...Stmt) ([]*Result, error)
}

// Client fala com um banco Turso pela API HTTP.
type Client struct {
	endpoint string
	token    string
	http     *http.Client
}

// New cria um cliente. rawURL pode começar com libsql:// ou https://.
func New(rawURL, token string) (*Client, error) {
	u := strings.TrimSpace(rawURL)
	if u == "" {
		return nil, errors.New("TURSO_DATABASE_URL está vazio")
	}
	u = strings.Replace(u, "libsql://", "https://", 1)
	if !strings.HasPrefix(u, "https://") {
		return nil, fmt.Errorf("URL do banco inválida (%q): deve começar com libsql:// ou https://", rawURL)
	}
	return &Client{
		endpoint: strings.TrimRight(u, "/") + "/v2/pipeline",
		token:    strings.TrimSpace(token),
		http: &http.Client{
			Timeout: 20 * time.Second,
			CheckRedirect: func(req *http.Request, _ []*http.Request) error {
				if req.URL.Scheme != "https" {
					return errors.New("turso: redirecionamento para URL sem TLS bloqueado")
				}
				return nil
			},
		},
	}, nil
}

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

func (c *Client) Do(ctx context.Context, stmts ...Stmt) ([]*Result, error) {
	if len(stmts) == 0 {
		return nil, nil
	}
	reqs := make([]any, 0, len(stmts)+1)
	for _, s := range stmts {
		js, err := encodeStmt(s)
		if err != nil {
			return nil, err
		}
		reqs = append(reqs, map[string]any{"type": "execute", "stmt": js})
	}
	reqs = append(reqs, map[string]any{"type": "close"})

	resp, err := c.send(ctx, reqs, readOnly(stmts))
	if err != nil {
		return nil, err
	}
	out := make([]*Result, 0, len(stmts))
	for i := range stmts {
		if i >= len(resp.Results) {
			return nil, errors.New("turso: resposta incompleta do servidor")
		}
		r := resp.Results[i]
		if r.Type == "error" || r.Error != nil {
			return nil, asError(r.Error)
		}
		if r.Response == nil || r.Response.Result == nil {
			return nil, errors.New("turso: resposta sem resultado")
		}
		res, err := decodeResult(r.Response.Result)
		if err != nil {
			return nil, err
		}
		out = append(out, res)
	}
	return out, nil
}

func (c *Client) Tx(ctx context.Context, stmts ...Stmt) ([]*Result, error) {
	if len(stmts) == 0 {
		return nil, nil
	}
	// Passo 0: BEGIN. Passos 1..n: instruções, cada uma só roda se a anterior
	// deu certo. Passo n+1: COMMIT (só se tudo deu certo).
	// Passo n+2: ROLLBACK (só se o COMMIT não aconteceu).
	steps := make([]any, 0, len(stmts)+3)
	steps = append(steps, map[string]any{"stmt": map[string]any{"sql": "BEGIN IMMEDIATE"}})
	for i, s := range stmts {
		js, err := encodeStmt(s)
		if err != nil {
			return nil, err
		}
		steps = append(steps, map[string]any{
			"condition": map[string]any{"type": "ok", "step": i},
			"stmt":      js,
		})
	}
	commit := len(stmts) + 1
	steps = append(steps,
		map[string]any{
			"condition": map[string]any{"type": "ok", "step": commit - 1},
			"stmt":      map[string]any{"sql": "COMMIT"},
		},
		map[string]any{
			"condition": map[string]any{"type": "not", "cond": map[string]any{"type": "ok", "step": commit}},
			"stmt":      map[string]any{"sql": "ROLLBACK"},
		},
	)

	reqs := []any{
		map[string]any{"type": "batch", "batch": map[string]any{"steps": steps}},
		map[string]any{"type": "close"},
	}
	resp, err := c.send(ctx, reqs, false)
	if err != nil {
		return nil, err
	}
	if len(resp.Results) == 0 {
		return nil, errors.New("turso: resposta vazia do servidor")
	}
	first := resp.Results[0]
	if first.Type == "error" || first.Error != nil {
		return nil, asError(first.Error)
	}
	if first.Response == nil || first.Response.Result == nil {
		return nil, errors.New("turso: resposta de transação sem resultado")
	}
	var br batchResult
	if err := json.Unmarshal(first.Response.Result, &br); err != nil {
		return nil, fmt.Errorf("turso: resposta de transação ilegível: %w", err)
	}
	// Qualquer erro entre BEGIN e COMMIT significa que nada foi gravado.
	for i := 0; i <= commit && i < len(br.StepErrors); i++ {
		if br.StepErrors[i] != nil {
			return nil, asError(br.StepErrors[i])
		}
	}
	out := make([]*Result, 0, len(stmts))
	for i := range stmts {
		idx := i + 1
		if idx >= len(br.StepResults) || br.StepResults[idx] == nil {
			return nil, errors.New("turso: transação não executou todos os passos")
		}
		res, err := decodeResult(br.StepResults[idx])
		if err != nil {
			return nil, err
		}
		out = append(out, res)
	}
	return out, nil
}
