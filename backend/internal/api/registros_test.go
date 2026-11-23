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
	hash         string
	perfil       string // perfil do usuário ("" = CELULA)
	tx           []turso.Stmt
	cadastro     int64 // cadastro ligado ao login (0 = nenhum)
	escopos      [][]any
	afetadas     int64
	escritas     []turso.Stmt
	foto         []byte       // foto guardada do cadastro 7 (nil = nenhuma)
	endereco     []any        // endereço guardado do cadastro 7 (nil = nenhum)
	pontos       [][]any      // situação de geocodificação devolvida ao mapa
	leituras     []turso.Stmt // consultas do mapa, para conferir o escopo
	anfitriao    []any        // confirmação de anfitrião do cadastro 7 (nil = nenhuma)
	membros      [][]any      // membros da célula (id, lat, lng) para o ranking
	casas        [][]any      // candidatos a anfitrião (id, nome, capacidade, dias, lat, lng, peloBairro)
	interessados int64        // interessados sem confirmação
	celulasExtra bool         // estrutura com setores e uma célula com identidade (Spec 009)
}

func (d *painelDB) Do(_ context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	out := make([]*turso.Result, len(stmts))
	for i, st := range stmts {
		out[i] = &turso.Result{}
		switch {
		case strings.Contains(st.SQL, "FROM usuarios WHERE"):
			perfil := d.perfil
			if perfil == "" {
				perfil = "CELULA"
			}
			out[i].Rows = [][]any{{"lider", "Líder", d.hash, perfil, int64(1), int64(0), "2026-01-01T00:00:00Z", "", d.cadastro}}
		case strings.Contains(st.SQL, "FROM usuario_escopos"):
			out[i].Rows = d.escopos
		case strings.HasPrefix(st.SQL, "SELECT nome FROM setores"):
			out[i].Rows = [][]any{{"Fogo no Altar"}, {"Tabernáculo de Deus"}}
		case d.celulasExtra && strings.HasPrefix(st.SQL, "SELECT id, nome FROM setores"):
			out[i].Rows = [][]any{{int64(1), "Fogo no Altar"}}
		case d.celulasExtra && strings.HasPrefix(st.SQL, "SELECT c.id, c.nome"):
			out[i].Rows = [][]any{{int64(3), "Hope", int64(1), "Fogo no Altar", int64(1), "#0e8a8c", "ter", "20:00", int64(7)}}
		case strings.HasPrefix(st.SQL, "SELECT c.nome"):
			out[i].Rows = [][]any{{"Hope", "Fogo no Altar"}, {"Betânia", "Tabernáculo de Deus"}}
		case strings.HasPrefix(st.SQL, "SELECT nome FROM respostas"):
			if st.Args[0] == int64(5) {
				out[i].Rows = [][]any{{"Bia Souza"}}
			}
		case strings.HasPrefix(st.SQL, "UPDATE respostas SET discipulador_id = NULL"), strings.HasPrefix(st.SQL, "UPDATE respostas SET discipulador = ("):
		case strings.HasPrefix(st.SQL, "UPDATE respostas"):
			d.escritas = append(d.escritas, st)
			out[i].Affected = d.afetadas
		case strings.HasPrefix(st.SQL, "SELECT id FROM respostas WHERE id = ?"):
			// cadastro visível no escopo quando o teste espera linhas afetadas
			if d.afetadas > 0 {
				out[i].Rows = [][]any{{st.Args[0]}}
			}
		case strings.HasPrefix(st.SQL, "SELECT r.id, CASE"):
			d.leituras = append(d.leituras, st)
			out[i].Rows = d.membros
		case strings.HasPrefix(st.SQL, "SELECT a.resposta_id"):
			d.leituras = append(d.leituras, st)
			out[i].Rows = d.casas
		case strings.HasPrefix(st.SQL, "SELECT COUNT(*) FROM respostas WHERE interesse_anfitriao"):
			d.leituras = append(d.leituras, st)
			out[i].Rows = [][]any{{d.interessados}}
		case strings.HasPrefix(st.SQL, "SELECT e.resposta_id, e.lat"):
			d.leituras = append(d.leituras, st)
			out[i].Rows = d.pontos
		case strings.HasPrefix(st.SQL, "SELECT cep"):
			if d.endereco != nil && d.afetadas > 0 {
				out[i].Rows = [][]any{d.endereco}
			}
		case strings.HasPrefix(st.SQL, "INSERT INTO enderecos"), strings.HasPrefix(st.SQL, "DELETE FROM enderecos"), strings.HasPrefix(st.SQL, "UPDATE enderecos"):
			d.escritas = append(d.escritas, st)
			out[i].Affected = d.afetadas
		case strings.HasPrefix(st.SQL, "SELECT capacidade"):
			if d.anfitriao != nil && d.afetadas > 0 {
				out[i].Rows = [][]any{d.anfitriao}
			}
		case strings.HasPrefix(st.SQL, "INSERT INTO anfitrioes"), strings.HasPrefix(st.SQL, "DELETE FROM anfitrioes"):
			d.escritas = append(d.escritas, st)
			out[i].Affected = d.afetadas
		case strings.HasPrefix(st.SQL, "INSERT INTO fotos"):
			d.escritas = append(d.escritas, st)
			out[i].Affected = d.afetadas
		case strings.HasPrefix(st.SQL, "SELECT f.imagem"):
			if d.foto != nil && st.Args[0] == int64(7) {
				out[i].Rows = [][]any{{d.foto, "image/png", "2026-11-14T10:00:00Z"}}
			}
		case strings.HasPrefix(st.SQL, "SELECT 1 FROM respostas WHERE id = ?"):
			if d.afetadas > 0 {
				out[i].Rows = [][]any{{int64(1)}}
			}
		case strings.HasPrefix(st.SQL, "INSERT INTO anotacoes"):
			d.escritas = append(d.escritas, st)
			out[i].Affected = d.afetadas
		case strings.HasPrefix(st.SQL, "UPDATE"), strings.HasPrefix(st.SQL, "DELETE FROM anotacoes"):
			out[i].Affected = d.afetadas
		}
	}
	return out, nil
}

func (d *painelDB) Tx(ctx context.Context, stmts ...turso.Stmt) ([]*turso.Result, error) {
	d.tx = append(d.tx, stmts...)
	return d.Do(ctx, stmts...)
}

func painelServer(t *testing.T, afetadas int64) (*Server, *painelDB, string) {
	t.Helper()
	hash, err := auth.HashPassword("senha-de-teste")
	if err != nil {
		t.Fatal(err)
	}
	db := &painelDB{hash: hash, afetadas: afetadas, escopos: [][]any{{"lider", "CELULA", "Hope"}}}
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

func TestRegistroSalvarVinculaDiscipulador(t *testing.T) {
	s, db, token := painelServer(t, 1)
	d := dados(t, map[string]string{"nome": "Ana Silva", "discipulador": "bia"})
	d["discipuladorId"] = json.RawMessage("5")
	rep := s.registroSalvar(context.Background(), adminReq{Token: token, Linha: 7, Dados: d})
	if rep.body["ok"] != true || rep.body["discipuladorId"] != int64(5) {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if nome := rep.body["dados"].(map[string]string)["discipulador"]; nome != "Bia Souza" {
		t.Errorf("discipulador = %q, queria o nome do cadastro vinculado", nome)
	}
	if !strings.Contains(db.escritas[0].SQL, "discipulador_id = ?") {
		t.Errorf("vínculo não gravado: %s", db.escritas[0].SQL)
	}

	for _, id := range []string{"7", "99", "-1", `"x"`} { // a própria pessoa, inexistente, inválidos
		d["discipuladorId"] = json.RawMessage(id)
		rep := s.registroSalvar(context.Background(), adminReq{Token: token, Linha: 7, Dados: d})
		if rep.body["erro"] != "discipulador_invalido" {
			t.Errorf("id %s: erro = %v, queria discipulador_invalido", id, rep.body["erro"])
		}
	}
	if len(db.escritas) != 1 {
		t.Fatalf("gravou vínculo inválido: %d escritas", len(db.escritas))
	}
}

func TestDiscipuladorSoAlcancaOsSeusDiscipulos(t *testing.T) {
	s, db, token := painelServer(t, 1)
	db.escopos, db.cadastro = nil, 5 // não lidera nada; o login está ligado ao cadastro 5
	rep := s.registroSalvar(context.Background(), adminReq{Token: token, Linha: 7, Dados: dados(t, map[string]string{"nome": "Ana Silva"})})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	st := db.escritas[0]
	if !strings.Contains(st.SQL, "AND (discipulador_id = ?)") || st.Args[len(st.Args)-1] != int64(5) {
		t.Errorf("escopo do discipulador ausente: %s %#v", st.SQL, st.Args[len(st.Args)-2:])
	}

	db.cadastro = 0 // sem célula e sem cadastro ligado: nenhum acesso
	rep = s.registroSalvar(context.Background(), adminReq{Token: token, Linha: 7, Dados: dados(t, map[string]string{"nome": "Ana Silva"})})
	if rep.body["erro"] != "sem_escopo" {
		t.Errorf("erro = %v, queria sem_escopo", rep.body["erro"])
	}
}

func TestAnotacaoSoDentroDoEscopo(t *testing.T) {
	s, _, token := painelServer(t, 0) // o INSERT ... SELECT não acha o cadastro no escopo
	rep := s.anotacaoSalvar(context.Background(), adminReq{Token: token, Linha: 9, Texto: "Conversamos no culto."})
	if rep.body["erro"] != "nao_encontrado" {
		t.Fatalf("erro = %v, queria nao_encontrado", rep.body["erro"])
	}
	rep = s.anotacaoSalvar(context.Background(), adminReq{Token: token, Linha: 9, Texto: "   "})
	if rep.body["erro"] != "texto_vazio" {
		t.Fatalf("erro = %v, queria texto_vazio", rep.body["erro"])
	}
}
