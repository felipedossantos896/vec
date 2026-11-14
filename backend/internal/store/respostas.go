package store

import (
	"context"
	"errors"
	"strings"
	"time"

	"vec/backend/internal/turso"
)

// ---------------------------------------------------------------------------
// Respostas do formulário
// ---------------------------------------------------------------------------

// Campo liga o nome usado pelo formulário/painel (JSON) à coluna do banco.
type Campo struct {
	Chave  string
	Coluna string
	SN     bool // aceita apenas S, N ou vazio
}

// Campos na mesma ordem da planilha original.
var Campos = []Campo{
	{"nome", "nome", false},
	{"nascimento", "nascimento", false},
	{"recebeuJesus", "recebeu_jesus", true},
	{"cafePastor", "cafe_pastor", true},
	{"estacaoDNA", "estacao_dna", true},
	{"acompInicial", "acomp_inicial", true},
	{"novaCriatura", "nova_criatura", true},
	{"batismo", "batismo", true},
	{"batismoEspirito", "batismo_espirito", true},
	{"setor", "setor", false},
	{"celula", "celula", false},
	{"frequentaCultos", "frequenta_cultos", true},
	{"serveMinisterio", "serve_ministerio", true},
	{"ministerioNome", "ministerio_nome", false},
	{"expresso01", "expresso01", true},
	{"expresso02", "expresso02", true},
	{"tlc", "tlc", true},
	{"encontroDeus", "encontro_deus", true},
	{"tadel", "tadel", true},
	{"discipulador", "discipulador", false},
	{"interesseDiscipulado", "interesse_discipulado", true},
	{"interesseCuidar", "interesse_cuidar", true},
	{"interesseLider", "interesse_lider", true},
	{"interesseAnfitrao", "interesse_anfitriao", true},
	{"sugestao", "sugestao", false},
}

type Resposta struct {
	ID        int64
	CriadoEm  string            // ISO UTC
	RequestID string            // chave de reenvio do formulário público
	ImportKey string            // chave estável de importação
	V         map[string]string // chave do Campo -> valor
}

func colunas() string {
	cs := make([]string, len(Campos))
	for i, c := range Campos {
		cs[i] = c.Coluna
	}
	return strings.Join(cs, ", ")
}

// InsertResposta grava uma resposta. Reenvios com o mesmo RequestID são ignorados.
func (s *Store) InsertResposta(ctx context.Context, r Resposta) error {
	if r.RequestID == "" {
		return errors.New("id de envio vazio")
	}
	marks := strings.TrimSuffix(strings.Repeat("?, ", len(Campos)+2), ", ")
	args := make([]any, 0, len(Campos)+2)
	args = append(args, r.RequestID)
	args = append(args, r.CriadoEm)
	for _, c := range Campos {
		args = append(args, r.V[c.Chave])
	}
	_, err := s.DB.Do(ctx, turso.Stmt{
		SQL:  `INSERT INTO respostas (request_id, criado_em, ` + colunas() + `) VALUES (` + marks + `) ON CONFLICT(request_id) DO NOTHING`,
		Args: args,
	})
	return err
}

// ImportarRespostas grava várias respostas em lotes, ignorando chaves já importadas.
// Também associa chaves às linhas antigas idênticas antes de inserir, preservando
// a segurança de reimportar CSVs existentes após a migration de idempotência.
// Devolve quantas linhas novas entraram.
func (s *Store) ImportarRespostas(ctx context.Context, rs []Resposta) (int, error) {
	const lote = 20
	if len(rs) == 0 {
		return 0, nil
	}
	for _, r := range rs {
		if r.ImportKey == "" {
			return 0, errors.New("chave de importação vazia")
		}
	}
	marks := strings.TrimSuffix(strings.Repeat("?, ", len(Campos)+2), ", ")
	novas := 0
	for i := 0; i < len(rs); i += lote {
		fim := i + lote
		if fim > len(rs) {
			fim = len(rs)
		}
		var stmts []turso.Stmt
		for _, r := range rs[i:fim] {
			where := `import_key IS NULL AND criado_em = ?`
			legacyArgs := make([]any, 0, len(Campos)+3)
			for _, c := range Campos {
				where += ` AND ` + c.Coluna + ` = ?`
				legacyArgs = append(legacyArgs, r.V[c.Chave])
			}
			legacyArgs = append([]any{r.ImportKey, r.CriadoEm}, legacyArgs...)
			where += ` AND NOT EXISTS (SELECT 1 FROM respostas WHERE import_key = ?)`
			legacyArgs = append(legacyArgs, r.ImportKey)
			stmts = append(stmts, turso.Stmt{
				SQL:  `UPDATE respostas SET import_key = ? WHERE ` + where,
				Args: legacyArgs,
			})

			args := make([]any, 0, len(Campos)+2)
			args = append(args, r.ImportKey, r.CriadoEm)
			for _, c := range Campos {
				args = append(args, r.V[c.Chave])
			}
			stmts = append(stmts, turso.Stmt{
				SQL:  `INSERT INTO respostas (import_key, criado_em, ` + colunas() + `) VALUES (` + marks + `) ON CONFLICT(import_key) DO NOTHING`,
				Args: args,
			})
		}
		res, err := s.DB.Tx(ctx, stmts...)
		if err != nil {
			return novas, err
		}
		if len(res) != len(stmts) {
			return novas, errors.New("resultado de importação incompleto")
		}
		for _, result := range res {
			if result == nil {
				return novas, errors.New("resultado de importação vazio")
			}
		}
		for j := 1; j < len(res); j += 2 {
			novas += int(res[j].Affected)
		}
	}
	return novas, nil
}

// ListRespostas devolve as respostas dentro do escopo, da mais nova para a mais antiga.
func (s *Store) ListRespostas(ctx context.Context, sc Scope) ([]Resposta, error) {
	var conds []string
	var args []any
	if !sc.Todos {
		if len(sc.Setores) > 0 {
			conds = append(conds, `setor IN (`+marks(len(sc.Setores))+`)`)
			for _, n := range sc.Setores {
				args = append(args, n)
			}
		}
		if len(sc.Celulas) > 0 {
			conds = append(conds, `celula IN (`+marks(len(sc.Celulas))+`)`)
			for _, n := range sc.Celulas {
				args = append(args, n)
			}
		}
		if len(conds) == 0 {
			return nil, nil // sem escopo = sem dados (nunca "tudo")
		}
	}
	where := ""
	if len(conds) > 0 {
		where = ` WHERE ` + strings.Join(conds, ` OR `)
	}
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL:  `SELECT id, criado_em, ` + colunas() + ` FROM respostas` + where + ` ORDER BY id DESC`,
		Args: args,
	})
	if err != nil {
		return nil, err
	}
	out := make([]Resposta, 0, len(res[0].Rows))
	for _, row := range res[0].Rows {
		r := Resposta{ID: turso.Int(row, 0), CriadoEm: turso.Str(row, 1), V: make(map[string]string, len(Campos))}
		for i, c := range Campos {
			r.V[c.Chave] = turso.Str(row, i+2)
		}
		out = append(out, r)
	}
	return out, nil
}

func marks(n int) string {
	return strings.TrimSuffix(strings.Repeat("?, ", n), ", ")
}

func iso(t time.Time) string { return t.UTC().Format(time.RFC3339) }
