package api

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"vec/backend/internal/store"
)

const envioTeste = "0123456789abcdef0123456789abcdef"

// Servidor com um líder da célula Hope, estrutura com Hope ativa e o cadastro 42 pronto
// para voltar depois de criado.
func novaPessoaServer(t *testing.T) (*Server, *painelDB, string) {
	s, db, token := painelServer(t, 1)
	db.celulasExtra = true
	linha := []any{int64(42), "2026-11-14T12:00:00Z", "", "", int64(0), "2026-11-14T12:00:00Z", "", "", ""}
	for _, c := range store.Campos {
		switch c.Chave {
		case "nome":
			linha = append(linha, "Zeca Teste")
		case "celula":
			linha = append(linha, "Hope")
		default:
			linha = append(linha, "")
		}
	}
	db.respostas = [][]any{linha}
	return s, db, token
}

func pedidoNova(token string, campos map[string]string, autorizou bool) adminReq {
	d := map[string]json.RawMessage{}
	for k, v := range campos {
		b, _ := json.Marshal(v)
		d[k] = b
	}
	return adminReq{Token: token, RequestID: envioTeste, Autorizou: autorizou, Dados: d}
}

var zeca = map[string]string{"nome": "Zeca Teste", "nascimento": "1990-05-10", "celula": "Hope", "telefone": "(85) 99999-0000"}

func insercoes(db *painelDB) []string {
	var out []string
	for _, e := range db.escritas {
		if strings.HasPrefix(e.SQL, "INSERT INTO respostas") {
			out = append(out, e.SQL)
		}
	}
	return out
}

func TestRegistroCriarNoEscopoComAutorizacao(t *testing.T) {
	s, db, token := novaPessoaServer(t)
	rep := s.registroCriar(context.Background(), pedidoNova(token, zeca, true))
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if r := rep.body["registro"].(map[string]any); r["linha"] != int64(42) || r["nome"] != "Zeca Teste" {
		t.Fatalf("registro = %#v", r)
	}
	var ins []any
	for _, e := range db.escritas {
		if strings.HasPrefix(e.SQL, "INSERT INTO respostas") {
			ins = e.Args
		}
	}
	if ins == nil || ins[0] != envioTeste || ins[2] == nil || ins[3] != "painel" || ins[4] != "lider" {
		t.Fatalf("gravação = %#v", ins)
	}
	for i, c := range store.Campos {
		if c.Chave == "recebeuJesus" && ins[i+5] != "S" {
			t.Fatalf("recebeuJesus = %v, esperado S por padrão", ins[i+5])
		}
		if c.Chave == "setor" && ins[i+5] != "Fogo no Altar" {
			t.Fatalf("setor = %v, esperado o da célula", ins[i+5])
		}
		if c.Chave == "telefone" && ins[i+5] != "85999990000" {
			t.Fatalf("telefone = %v", ins[i+5])
		}
	}
}

func TestRegistroCriarRecusas(t *testing.T) {
	casos := []struct {
		nome      string
		campos    map[string]string
		autorizou bool
		erro      string
	}{
		{"sem autorização", zeca, false, "consentimento"},
		{"sem nascimento", map[string]string{"nome": "Zeca Teste", "celula": "Hope"}, true, "nascimento_invalido"},
		{"sem célula", map[string]string{"nome": "Zeca Teste", "nascimento": "1990-05-10"}, true, "celula_invalida"},
		{"célula fora do escopo", map[string]string{"nome": "Zeca Teste", "nascimento": "1990-05-10", "celula": "Betânia"}, true, "celula_invalida"},
		{"nome curto", map[string]string{"nome": "Ze", "nascimento": "1990-05-10", "celula": "Hope"}, true, "nome_invalido"},
	}
	for _, c := range casos {
		s, db, token := novaPessoaServer(t)
		rep := s.registroCriar(context.Background(), pedidoNova(token, c.campos, c.autorizou))
		if rep.body["erro"] != c.erro || len(insercoes(db)) != 0 {
			t.Fatalf("%s: resposta %#v, inserções %d", c.nome, rep.body, len(insercoes(db)))
		}
	}
}

func TestRegistroCriarSoDiscipuladorNaoCadastra(t *testing.T) {
	s, db, token := novaPessoaServer(t)
	db.escopos, db.cadastro = nil, 5
	if rep := s.registroCriar(context.Background(), pedidoNova(token, zeca, true)); rep.body["erro"] != "sem_permissao" || len(insercoes(db)) != 0 {
		t.Fatalf("discipulador: %#v", rep.body)
	}
}

func TestRegistroCriarDuplicadoNoEscopoMostraQuemE(t *testing.T) {
	s, db, token := novaPessoaServer(t)
	db.candidatos = [][]any{{int64(9), "Zéca  TESTE", "1990-05-10", "", "Fogo no Altar", "Hope", int64(0)}}
	campos := map[string]string{"nome": "zeca teste", "nascimento": "1990-05-10", "celula": "Hope"}
	rep := s.registroCriar(context.Background(), pedidoNova(token, campos, true))
	ex, _ := rep.body["existente"].(map[string]any)
	if rep.body["erro"] != "duplicado" || ex["linha"] != int64(9) || ex["celula"] != "Hope" || len(insercoes(db)) != 0 {
		t.Fatalf("duplicado no escopo: %#v", rep.body)
	}
}

func TestRegistroCriarDuplicadoForaDoEscopoNaoRevela(t *testing.T) {
	s, db, token := novaPessoaServer(t)
	db.candidatos = [][]any{{int64(11), "Outra Pessoa Sigilosa", "1980-01-01", "85999990000", "Tabernáculo de Deus", "Betânia", int64(0)}}
	rep := s.registroCriar(context.Background(), pedidoNova(token, zeca, true))
	b, _ := json.Marshal(rep.body)
	if rep.body["erro"] != "duplicado_fora" || strings.Contains(string(b), "Sigilosa") || strings.Contains(string(b), "Betânia") || strings.Contains(string(b), "11") || len(insercoes(db)) != 0 {
		t.Fatalf("duplicado fora do escopo vazou ou gravou: %s", b)
	}
	// Mesmo nome com outra data de nascimento não é duplicado
	s, db, token = novaPessoaServer(t)
	db.candidatos = [][]any{{int64(12), "Zeca Teste", "1990-05-10", "", "Fogo no Altar", "Hope", int64(0)}}
	outro := map[string]string{"nome": "Zeca Teste", "nascimento": "1991-05-10", "celula": "Hope"}
	db.candidatos[0][2] = "1990-05-10"
	if rep := s.registroCriar(context.Background(), pedidoNova(token, outro, true)); rep.body["ok"] != true {
		t.Fatalf("nascimento diferente: %#v", rep.body)
	}
}

func TestRegistroCriarReenvioNaoDuplica(t *testing.T) {
	s, db, token := novaPessoaServer(t)
	db.criado = true // o mesmo envio já foi gravado
	rep := s.registroCriar(context.Background(), pedidoNova(token, zeca, true))
	if rep.body["ok"] != true || len(insercoes(db)) != 0 {
		t.Fatalf("reenvio: %#v, inserções %d", rep.body, len(insercoes(db)))
	}
	if rep := s.registroCriar(context.Background(), adminReq{Token: token, RequestID: "curto", Dados: map[string]json.RawMessage{}}); rep.body["erro"] != "dados_invalidos" {
		t.Fatalf("id de envio inválido: %#v", rep.body)
	}
}

func TestCelulaPermitidaEDuplicadoDe(t *testing.T) {
	cels := []store.Celula{{Nome: "Hope", Setor: "A", Ativa: true}, {Nome: "Fechada", Setor: "A", Ativa: false}, {Nome: "Betânia", Setor: "B", Ativa: true}}
	if !celulaPermitida(store.Scope{Setores: []string{"A"}}, "hope", nil, cels) || celulaPermitida(store.Scope{Setores: []string{"A"}}, "Fechada", nil, cels) ||
		celulaPermitida(store.Scope{Setores: []string{"A"}}, "Betânia", nil, cels) || !celulaPermitida(store.Scope{Todos: true}, "Betânia", nil, cels) {
		t.Fatal("célula permitida pelo escopo e ativa")
	}
	if _, ok := duplicadoDe(map[string]string{"nome": "Joao  da Silva", "nascimento": "2000-01-01"}, []store.Candidato{{Nome: "João da SILVA", Nascimento: "2000-01-01"}}); !ok {
		t.Fatal("nome sem acento e maiúsculas deveria casar")
	}
}
