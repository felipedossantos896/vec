package api

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"vec/backend/internal/auth"
	"vec/backend/internal/turso"
)

// painelDB responde como o banco para um usuário de célula e para as listas.
type painelDB struct {
	hash     string
	afetadas int64
	escritas []turso.Stmt
}

func (d *painelDB) Do(_ context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	out := make([]*turso.Result, len(stmts))
	for i, st := range stmts {
		out[i] = &turso.Result{}
		switch {
		case strings.Contains(st.SQL, "FROM usuarios WHERE"):
			out[i].Rows = [][]any{{"lider", "Líder", d.hash, "CELULA", int64(1), int64(0), "2026-01-01T00:00:00Z", ""}}
		case strings.Contains(st.SQL, "FROM usuario_escopos"):
			out[i].Rows = [][]any{{"lider", "CELULA", "Hope"}}
		case strings.Contains(st.SQL, "FROM setores"):
			out[i].Rows = [][]any{{"Fogo no Altar"}, {"Tabernáculo de Deus"}}
		case strings.Contains(st.SQL, "FROM celulas"):
			out[i].Rows = [][]any{{"Hope", "Fogo no Altar"}, {"Betânia", "Tabernáculo de Deus"}}
		case strings.HasPrefix(st.SQL, "UPDATE respostas"):
			d.escritas = append(d.escritas, st)
			out[i].Affected = d.afetadas
		}
	}
	return out, nil
}

func (d *painelDB) Tx(ctx context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	return d.Do(ctx, stmts...)
}

func painelServer(t *testing.T, afetadas int64) (*Server, *painelDB, string) {
	t.Helper()
	hash, err := auth.HashPassword("senha-de-teste")
	if err != nil {
		t.Fatal(err)
	}
	db := &painelDB{hash: hash, afetadas: afetadas}
	s := testAPIServer(db)
	s.Secret = []byte(strings.Repeat("s", 32))
	s.TTL = sessaoDuracao
	return s, db, auth.NewToken(s.Secret, "lider", auth.Fingerprint(hash), s.TTL, s.Now())
}

func dados(t *testing.T, m map[string]string) map[string]json.RawMessage {
	t.Helper()
	out := map[string]json.RawMessage{}
	for k, v := range m {
		b, _ := json.Marshal(v)
		out[k] = b
	}
	return out
}

func TestRegistroSalvarLimitaAoEscopoEDerivaSetor(t *testing.T) {
	s, db, token := painelServer(t, 1)
	rep := s.registroSalvar(context.Background(), adminReq{Token: token, Linha: 7, Dados: dados(t, map[string]string{
		"nome": "Ana Silva", "nascimento": "1990-01-02", "celula": "betânia", "setor": "Fogo no Altar", "batismo": "S",
	})})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	v := rep.body["dados"].(map[string]string)
	if v["celula"] != "Betânia" || v["setor"] != "Tabernáculo de Deus" {
		t.Errorf("célula/setor = %q/%q, queria o setor da célula", v["celula"], v["setor"])
	}
	if len(db.escritas) != 1 {
		t.Fatalf("escritas = %d", len(db.escritas))
	}
	st := db.escritas[0]
	if !strings.Contains(st.SQL, "WHERE id = ? AND excluido_em IS NULL AND (celula IN (?))") {
		t.Errorf("edição sem limite de escopo: %s", st.SQL)
	}
	if n := len(st.Args); st.Args[n-1] != "Hope" || st.Args[n-2] != int64(7) || st.Args[n-3] != "lider" {
		t.Errorf("parâmetros finais inesperados: %#v", st.Args[n-4:])
	}
}

func TestRegistroSalvarForaDoEscopo(t *testing.T) {
	s, _, token := painelServer(t, 0)
	rep := s.registroSalvar(context.Background(), adminReq{Token: token, Linha: 7, Dados: dados(t, map[string]string{"nome": "Ana Silva"})})
	if rep.body["erro"] != "nao_encontrado" {
		t.Fatalf("erro = %v, queria nao_encontrado", rep.body["erro"])
	}
}

func TestRegistroSalvarValidaAntesDeGravar(t *testing.T) {
	s, db, token := painelServer(t, 1)
	casos := map[string]map[string]string{
		"nome_invalido":       {"nome": "A"},
		"nascimento_invalido": {"nome": "Ana Silva", "nascimento": "2999-01-01"},
		"dados_invalidos":     {"nome": "Ana Silva", "batismo": "talvez"},
	}
	for erro, m := range casos {
		rep := s.registroSalvar(context.Background(), adminReq{Token: token, Linha: 7, Dados: dados(t, m)})
		if rep.body["erro"] != erro {
			t.Errorf("erro = %v, queria %s", rep.body["erro"], erro)
		}
	}
	if len(db.escritas) != 0 {
		t.Fatalf("gravou dados inválidos: %#v", db.escritas)
	}
}

func TestRegistroExigeSessao(t *testing.T) {
	s, db, _ := painelServer(t, 1)
	for _, rep := range []reply{
		s.registroSalvar(context.Background(), adminReq{Token: "falso", Linha: 7, Dados: dados(t, map[string]string{"nome": "Ana Silva"})}),
		s.registroExcluir(context.Background(), adminReq{Token: "falso", Linha: 7}),
	} {
		if rep.body["erro"] != "sessao" {
			t.Errorf("erro = %v, queria sessao", rep.body["erro"])
		}
	}
	if len(db.escritas) != 0 {
		t.Fatalf("gravou sem sessão: %#v", db.escritas)
	}
}

func TestRegistroExcluirMarcaSemApagar(t *testing.T) {
	s, db, token := painelServer(t, 1)
	rep := s.registroExcluir(context.Background(), adminReq{Token: token, Linha: 7})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	st := db.escritas[0]
	if !strings.HasPrefix(st.SQL, "UPDATE respostas SET excluido_em = ?, excluido_por = ? WHERE id = ? AND excluido_em IS NULL AND (celula IN (?))") {
		t.Errorf("exclusão inesperada: %s", st.SQL)
	}
}
