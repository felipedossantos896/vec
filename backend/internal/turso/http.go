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
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
)

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
