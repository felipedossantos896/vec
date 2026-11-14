// Package turso é um cliente mínimo para o Turso (libSQL) usando o protocolo
// Hrana sobre HTTP com JSON. Usa apenas a biblioteca padrão do Go, então o
// projeto não tem dependências externas.
//
// Referência do protocolo:
// https://github.com/tursodatabase/libsql/blob/main/docs/HRANA_3_SPEC.md
package turso

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
)

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
