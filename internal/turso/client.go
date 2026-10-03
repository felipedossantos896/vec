// Package turso é um cliente mínimo para o Turso (libSQL) usando o protocolo
// Hrana sobre HTTP com JSON. Usa apenas a biblioteca padrão do Go, então o
// projeto não tem dependências externas.
//
// Referência do protocolo:
// https://github.com/tursodatabase/libsql/blob/main/docs/HRANA_3_SPEC.md
package turso

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
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
	if !strings.HasPrefix(u, "https://") && !strings.HasPrefix(u, "http://") {
		return nil, fmt.Errorf("URL do banco inválida (%q): deve começar com libsql:// ou https://", rawURL)
	}
	return &Client{
		endpoint: strings.TrimRight(u, "/") + "/v2/pipeline",
		token:    strings.TrimSpace(token),
		http:     &http.Client{Timeout: 20 * time.Second},
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

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

type streamResult struct {
	Type     string `json:"type"`
	Response *struct {
		Type   string          `json:"type"`
		Result json.RawMessage `json:"result"`
	} `json:"response"`
	Error *hError `json:"error"`
}

type pipelineResp struct {
	Results []streamResult `json:"results"`
}

type hError struct {
	Message string `json:"message"`
	Code    string `json:"code"`
}

func asError(e *hError) error {
	if e == nil {
		return errors.New("turso: erro desconhecido")
	}
	return &Error{Message: e.Message, Code: e.Code}
}

// send faz a chamada HTTP. Para leituras, tenta de novo uma vez se a conexão
// for derrubada (comum depois de um período parado).
func (c *Client) send(ctx context.Context, requests []any, retry bool) (*pipelineResp, error) {
	body, err := json.Marshal(map[string]any{"baton": nil, "requests": requests})
	if err != nil {
		return nil, err
	}
	attempts := 1
	if retry {
		attempts = 2
	}
	var lastErr error
	for i := 0; i < attempts; i++ {
		resp, err := c.post(ctx, body)
		if err == nil {
			return resp, nil
		}
		lastErr = err
		var de *Error
		if errors.As(err, &de) || ctx.Err() != nil || !isTransient(err) {
			break
		}
	}
	return nil, lastErr
}

type transientError struct{ err error }

func (t *transientError) Error() string { return t.err.Error() }
func (t *transientError) Unwrap() error { return t.err }

func isTransient(err error) bool {
	var t *transientError
	return errors.As(err, &t)
}

func (c *Client) post(ctx context.Context, body []byte) (*pipelineResp, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	res, err := c.http.Do(req)
	if err != nil {
		return nil, &transientError{fmt.Errorf("turso: falha de rede: %w", err)}
	}
	defer res.Body.Close()
	data, err := io.ReadAll(io.LimitReader(res.Body, 32<<20))
	if err != nil {
		return nil, &transientError{fmt.Errorf("turso: falha ao ler resposta: %w", err)}
	}
	if res.StatusCode != http.StatusOK {
		msg := strings.TrimSpace(string(data))
		var he hError
		if json.Unmarshal(data, &he) == nil && he.Message != "" {
			msg = he.Message
		}
		if len(msg) > 300 {
			msg = msg[:300]
		}
		switch {
		case res.StatusCode == http.StatusUnauthorized || res.StatusCode == http.StatusForbidden:
			return nil, fmt.Errorf("turso: acesso negado (HTTP %d): confira TURSO_AUTH_TOKEN e TURSO_DATABASE_URL (%s)", res.StatusCode, msg)
		case res.StatusCode >= 500:
			return nil, &transientError{fmt.Errorf("turso: erro do servidor (HTTP %d): %s", res.StatusCode, msg)}
		default:
			return nil, fmt.Errorf("turso: HTTP %d: %s", res.StatusCode, msg)
		}
	}
	var pr pipelineResp
	if err := json.Unmarshal(data, &pr); err != nil {
		return nil, fmt.Errorf("turso: resposta ilegível: %w", err)
	}
	return &pr, nil
}

// ---------------------------------------------------------------------------
// Codificação / decodificação de valores
// ---------------------------------------------------------------------------

func readOnly(stmts []Stmt) bool {
	for _, s := range stmts {
		head := strings.ToUpper(strings.TrimSpace(s.SQL))
		if !strings.HasPrefix(head, "SELECT") {
			return false
		}
	}
	return true
}

func encodeStmt(s Stmt) (map[string]any, error) {
	out := map[string]any{"sql": s.SQL}
	if len(s.Args) > 0 {
		args := make([]any, 0, len(s.Args))
		for _, a := range s.Args {
			v, err := encodeArg(a)
			if err != nil {
				return nil, err
			}
			args = append(args, v)
		}
		out["args"] = args
	}
	return out, nil
}

func encodeArg(a any) (map[string]any, error) {
	switch v := a.(type) {
	case nil:
		return map[string]any{"type": "null"}, nil
	case string:
		return map[string]any{"type": "text", "value": v}, nil
	case int:
		return map[string]any{"type": "integer", "value": strconv.FormatInt(int64(v), 10)}, nil
	case int64:
		return map[string]any{"type": "integer", "value": strconv.FormatInt(v, 10)}, nil
	case bool:
		if v {
			return map[string]any{"type": "integer", "value": "1"}, nil
		}
		return map[string]any{"type": "integer", "value": "0"}, nil
	case float64:
		return map[string]any{"type": "float", "value": v}, nil
	case []byte:
		return map[string]any{"type": "blob", "base64": base64.StdEncoding.EncodeToString(v)}, nil
	default:
		return nil, fmt.Errorf("turso: tipo de parâmetro não suportado: %T", a)
	}
}

type hCell struct {
	Type   string          `json:"type"`
	Value  json.RawMessage `json:"value"`
	Base64 string          `json:"base64"`
}

type stmtResult struct {
	Cols []struct {
		Name *string `json:"name"`
	} `json:"cols"`
	Rows             [][]hCell `json:"rows"`
	AffectedRowCount int64     `json:"affected_row_count"`
	LastInsertRowid  *string   `json:"last_insert_rowid"`
}

type batchResult struct {
	StepResults []json.RawMessage `json:"step_results"`
	StepErrors  []*hError         `json:"step_errors"`
}

func decodeResult(raw json.RawMessage) (*Result, error) {
	var sr stmtResult
	if err := json.Unmarshal(raw, &sr); err != nil {
		return nil, fmt.Errorf("turso: resultado ilegível: %w", err)
	}
	res := &Result{Affected: sr.AffectedRowCount}
	for _, c := range sr.Cols {
		if c.Name != nil {
			res.Cols = append(res.Cols, *c.Name)
		} else {
			res.Cols = append(res.Cols, "")
		}
	}
	if sr.LastInsertRowid != nil {
		if id, err := strconv.ParseInt(*sr.LastInsertRowid, 10, 64); err == nil {
			res.LastInsertID = id
		}
	}
	for _, row := range sr.Rows {
		vals := make([]any, len(row))
		for i, cell := range row {
			v, err := decodeCell(cell)
			if err != nil {
				return nil, err
			}
			vals[i] = v
		}
		res.Rows = append(res.Rows, vals)
	}
	return res, nil
}

func decodeCell(c hCell) (any, error) {
	switch c.Type {
	case "null", "":
		return nil, nil
	case "integer":
		s := rawString(c.Value)
		n, err := strconv.ParseInt(s, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("turso: inteiro inválido %q", s)
		}
		return n, nil
	case "float":
		s := rawString(c.Value)
		f, err := strconv.ParseFloat(s, 64)
		if err != nil {
			return nil, fmt.Errorf("turso: número inválido %q", s)
		}
		return f, nil
	case "text":
		var s string
		if err := json.Unmarshal(c.Value, &s); err != nil {
			return nil, fmt.Errorf("turso: texto inválido: %w", err)
		}
		return s, nil
	case "blob":
		b, err := base64.StdEncoding.DecodeString(c.Base64)
		if err != nil {
			// o servidor pode omitir o padding
			b, err = base64.RawStdEncoding.DecodeString(c.Base64)
			if err != nil {
				return nil, fmt.Errorf("turso: blob inválido: %w", err)
			}
		}
		return b, nil
	default:
		return nil, fmt.Errorf("turso: tipo de valor desconhecido %q", c.Type)
	}
}

// rawString aceita tanto "123" (string JSON) quanto 123 (número JSON).
func rawString(raw json.RawMessage) string {
	var s string
	if err := json.Unmarshal(raw, &s); err == nil {
		return s
	}
	return strings.TrimSpace(string(raw))
}

// ---------------------------------------------------------------------------
// Helpers de leitura de linhas
// ---------------------------------------------------------------------------

// Str lê a coluna i da linha como string ("" se NULL).
func Str(row []any, i int) string {
	if i < 0 || i >= len(row) || row[i] == nil {
		return ""
	}
	switch v := row[i].(type) {
	case string:
		return v
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case []byte:
		return string(v)
	}
	return fmt.Sprint(row[i])
}

// Int lê a coluna i da linha como int64 (0 se NULL).
func Int(row []any, i int) int64 {
	if i < 0 || i >= len(row) || row[i] == nil {
		return 0
	}
	switch v := row[i].(type) {
	case int64:
		return v
	case float64:
		return int64(v)
	case string:
		n, _ := strconv.ParseInt(v, 10, 64)
		return n
	}
	return 0
}
