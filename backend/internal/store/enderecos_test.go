package store

import (
	"context"
	"strings"
	"testing"
	"time"

	"vec/backend/internal/turso"
)

// Dados fictícios: nenhum endereço real em testes (Spec 002).
var enderecoTeste = Endereco{
	CEP: "60000000", Logradouro: "Rua Exemplo", Numero: "10", Complemento: "Casa B",
	Bairro: "Centro", Cidade: "Fortaleza", UF: "CE",
}

// exigeEscopo confere que a instrução limita ao cadastro pedido, não excluído e
// dentro do escopo exato, com o id antes dos argumentos do escopo.
func exigeEscopo(t *testing.T, stmt turso.Stmt, sc Scope, id int64) {
	t.Helper()
	cond, args, _ := escopoSQL(sc)
	if !strings.Contains(stmt.SQL, "WHERE id = ? AND excluido_em IS NULL AND "+cond) {
		t.Fatalf("SQL sem escopo %q: %s", cond, stmt.SQL)
	}
	tail := stmt.Args[len(stmt.Args)-len(args)-1:]
	if tail[0] != id {
		t.Fatalf("id = %v, queria %v (args %#v)", tail[0], id, stmt.Args)
	}
	for i, a := range args {
		if tail[i+1] != a {
			t.Fatalf("argumentos do escopo = %#v, queria %#v", tail[1:], args)
		}
	}
}

func TestEnderecoUsaEscopoEmTodasAsOperacoes(t *testing.T) {
	sc := Scope{Setores: []string{"Norte"}}
	ctx := context.Background()

	db := &recordingDB{}
	st := &Store{DB: db}
	if _, _, _, err := st.Endereco(ctx, sc, 7); err != nil {
		t.Fatal(err)
	}
	if _, err := st.SalvarEndereco(ctx, sc, 7, enderecoTeste, "lider", time.Now()); err != nil {
		t.Fatal(err)
	}
	if _, err := st.ExcluirEndereco(ctx, sc, 7); err != nil {
		t.Fatal(err)
	}
	if len(db.doCalls) != 3 {
		t.Fatalf("chamadas = %d", len(db.doCalls))
	}
	for _, call := range db.doCalls {
		for _, stmt := range call {
			exigeEscopo(t, stmt, sc, 7)
		}
	}
	if !strings.HasPrefix(strings.TrimSpace(db.doCalls[2][1].SQL), "DELETE FROM enderecos") {
		t.Fatalf("remoção deve apagar a linha: %s", db.doCalls[2][1].SQL)
	}
}

func TestEnderecoSemEscopoNaoConsulta(t *testing.T) {
	db := &recordingDB{}
	st := &Store{DB: db}
	ctx := context.Background()
	_, tem, visivel, err := st.Endereco(ctx, Scope{}, 7)
	salvo, err2 := st.SalvarEndereco(ctx, Scope{}, 7, enderecoTeste, "x", time.Now())
	removido, err3 := st.ExcluirEndereco(ctx, Scope{}, 7)
	if err != nil || err2 != nil || err3 != nil || tem || visivel || salvo || removido || len(db.doCalls) != 0 {
		t.Fatalf("escopo vazio deve negar sem consultar: %v %v %v %v %d", tem, visivel, salvo, removido, len(db.doCalls))
	}
}

func TestEnderecoDistingueForaDoEscopoDeSemEndereco(t *testing.T) {
	sc := Scope{Todos: true}
	ctx := context.Background()
	linha := []any{"60000000", "Rua Exemplo", "10", "Casa B", "Centro", "Fortaleza", "CE",
		"2026-11-20T10:00:00Z", "lider", "2026-11-20T10:00:00Z", "lider"}
	casos := []struct {
		nome         string
		dono, end    [][]any
		tem, visivel bool
	}{
		{"fora do escopo ou excluído", nil, nil, false, false},
		{"visível sem endereço", [][]any{{int64(7)}}, nil, false, true},
		{"com endereço", [][]any{{int64(7)}}, [][]any{linha}, true, true},
	}
	for _, c := range casos {
		db := &recordingDB{doResults: [][]*turso.Result{{{Rows: c.dono}, {Rows: c.end}}}}
		e, tem, visivel, err := (&Store{DB: db}).Endereco(ctx, sc, 7)
		if err != nil || tem != c.tem || visivel != c.visivel {
			t.Fatalf("%s: tem=%v visivel=%v err=%v", c.nome, tem, visivel, err)
		}
		if c.tem && (e.CEP != "60000000" || e.UF != "CE" || e.Complemento != "Casa B" || e.AtualizadoPor != "lider") {
			t.Fatalf("%s: endereço lido = %#v", c.nome, e)
		}
	}
}

func TestSalvarEnderecoRegistraConsentimentoDeQuemSalva(t *testing.T) {
	db := &recordingDB{doResults: [][]*turso.Result{{{Affected: 1}}}}
	agora := time.Date(2026, 11, 20, 13, 0, 0, 0, time.FixedZone("BRT", -3*3600))
	ok, err := (&Store{DB: db}).SalvarEndereco(context.Background(), Scope{Todos: true}, 7, enderecoTeste, "lider", agora)
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	args := db.doCalls[0][0].Args
	want := []any{"60000000", "Rua Exemplo", "10", "Casa B", "Centro", "Fortaleza", "CE",
		"2026-11-20T16:00:00Z", "lider", "2026-11-20T16:00:00Z", "lider", nil, nil, nil, nil, nil, int64(7)}
	for i, w := range want {
		if args[i] != w {
			t.Fatalf("arg %d = %#v, queria %#v (todos: %#v)", i, args[i], w, args)
		}
	}
}

func TestExcluirCadastroApagaEnderecoNaMesmaTransacao(t *testing.T) {
	db := &recordingDB{txResult: []*turso.Result{{Affected: 1}, {}, {}, {}}}
	if _, err := (&Store{DB: db}).DeleteResposta(context.Background(), Scope{Todos: true}, 7, "lider", time.Now()); err != nil {
		t.Fatal(err)
	}
	if len(db.txCalls) != 1 {
		t.Fatalf("transações = %d", len(db.txCalls))
	}
	for _, stmt := range db.txCalls[0] {
		if strings.HasPrefix(stmt.SQL, "DELETE FROM enderecos WHERE resposta_id = ?") {
			return
		}
	}
	t.Fatalf("exclusão do cadastro não apaga o endereço: %#v", db.txCalls[0])
}
