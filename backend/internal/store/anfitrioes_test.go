package store

import (
	"context"
	"strings"
	"testing"
	"time"

	"vec/backend/internal/turso"
)

// Dados fictícios: nenhuma pessoa ou endereço real (Spec 004).
var anfitriaoTeste = Anfitriao{Capacidade: 12, Dias: []string{"ter", "qui"}, Observacao: "Depois das 19h"}

func TestAnfitriaoUsaEscopoEmTodasAsOperacoes(t *testing.T) {
	sc := Scope{Celulas: []string{"Hope"}}
	ctx := context.Background()
	db := &recordingDB{}
	st := &Store{DB: db}
	if _, _, _, err := st.Anfitriao(ctx, sc, 7); err != nil {
		t.Fatal(err)
	}
	if _, err := st.SalvarAnfitriao(ctx, sc, 7, anfitriaoTeste, "lider", time.Now()); err != nil {
		t.Fatal(err)
	}
	if _, err := st.ExcluirAnfitriao(ctx, sc, 7); err != nil {
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
	if !strings.HasPrefix(strings.TrimSpace(db.doCalls[2][1].SQL), "DELETE FROM anfitrioes") {
		t.Fatalf("remoção deve apagar a linha: %s", db.doCalls[2][1].SQL)
	}
}

func TestAnfitriaoSemEscopoNaoConsulta(t *testing.T) {
	db := &recordingDB{}
	st := &Store{DB: db}
	ctx := context.Background()
	_, tem, visivel, err := st.Anfitriao(ctx, Scope{}, 7)
	salvo, err2 := st.SalvarAnfitriao(ctx, Scope{}, 7, anfitriaoTeste, "x", time.Now())
	removido, err3 := st.ExcluirAnfitriao(ctx, Scope{}, 7)
	cands, interessados, err4 := st.CandidatosAnfitriao(ctx, Scope{})
	membros, celVisivel, err5 := st.MembrosCelula(ctx, Scope{}, "Hope")
	if err != nil || err2 != nil || err3 != nil || err4 != nil || err5 != nil {
		t.Fatal("escopo vazio não deve dar erro")
	}
	if tem || visivel || salvo || removido || cands != nil || interessados != 0 || membros != nil || celVisivel || len(db.doCalls) != 0 {
		t.Fatalf("escopo vazio deve negar sem consultar (%d chamadas)", len(db.doCalls))
	}
}

func TestAnfitriaoDistingueForaDoEscopoDeSemConfirmacao(t *testing.T) {
	linha := []any{int64(12), "ter,qui", "Depois das 19h", "2026-11-21T10:00:00Z", "lider"}
	casos := []struct {
		nome         string
		dono, conf   [][]any
		tem, visivel bool
	}{
		{"fora do escopo ou excluído", nil, nil, false, false},
		{"visível sem confirmação", [][]any{{int64(7)}}, nil, false, true},
		{"confirmado", [][]any{{int64(7)}}, [][]any{linha}, true, true},
	}
	for _, c := range casos {
		db := &recordingDB{doResults: [][]*turso.Result{{{Rows: c.dono}, {Rows: c.conf}}}}
		a, tem, visivel, err := (&Store{DB: db}).Anfitriao(context.Background(), Scope{Todos: true}, 7)
		if err != nil || tem != c.tem || visivel != c.visivel {
			t.Fatalf("%s: tem=%v visivel=%v err=%v", c.nome, tem, visivel, err)
		}
		if c.tem && (a.Capacidade != 12 || strings.Join(a.Dias, ",") != "ter,qui" || a.Observacao != "Depois das 19h" || a.ConfirmadoPor != "lider") {
			t.Fatalf("%s: lido = %#v", c.nome, a)
		}
	}
}

func TestSalvarAnfitriaoRegistraQuemConfirmou(t *testing.T) {
	db := &recordingDB{doResults: [][]*turso.Result{{{Affected: 1}}}}
	agora := time.Date(2026, 11, 21, 13, 0, 0, 0, time.FixedZone("BRT", -3*3600))
	ok, err := (&Store{DB: db}).SalvarAnfitriao(context.Background(), Scope{Todos: true}, 7, anfitriaoTeste, "lider", agora)
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	want := []any{int64(12), "ter,qui", "Depois das 19h", "2026-11-21T16:00:00Z", "lider", int64(7)}
	args := db.doCalls[0][0].Args
	for i, w := range want {
		if args[i] != w {
			t.Fatalf("arg %d = %#v, queria %#v", i, args[i], w)
		}
	}
	// Fora do escopo o INSERT ... SELECT não grava nada.
	db = &recordingDB{doResults: [][]*turso.Result{{{Affected: 0}}}}
	if ok, _ := (&Store{DB: db}).SalvarAnfitriao(context.Background(), Scope{Todos: true}, 7, anfitriaoTeste, "lider", agora); ok {
		t.Fatal("sem linha afetada deve devolver false")
	}
}

func TestExcluirCadastroApagaAnfitriaoNaMesmaTransacao(t *testing.T) {
	db := &recordingDB{txResult: []*turso.Result{{Affected: 1}, {}, {}, {}, {}}}
	if _, err := (&Store{DB: db}).DeleteResposta(context.Background(), Scope{Todos: true}, 7, "lider", time.Now()); err != nil {
		t.Fatal(err)
	}
	for _, stmt := range db.txCalls[0] {
		if strings.HasPrefix(stmt.SQL, "DELETE FROM anfitrioes WHERE resposta_id = ?") {
			return
		}
	}
	t.Fatalf("exclusão do cadastro não apaga a confirmação: %#v", db.txCalls[0])
}

func TestCandidatosAnfitriaoUsaEscopoEFiltraPrecisao(t *testing.T) {
	sc := Scope{Setores: []string{"Norte"}}
	db := &recordingDB{doResults: [][]*turso.Result{{
		{Rows: [][]any{
			{int64(7), "Ana", int64(12), "ter,qui", -3.70, -38.50, int64(0)},
			{int64(8), "Bia", int64(6), "sab", -3.71, -38.51, int64(1)},
			{int64(9), "Cris", int64(8), "seg", nil, nil, nil},
		}},
		{Rows: [][]any{{int64(3)}}},
	}}}
	cands, interessados, err := (&Store{DB: db}).CandidatosAnfitriao(context.Background(), sc)
	if err != nil || len(cands) != 3 || interessados != 3 {
		t.Fatalf("candidatos = %#v, interessados %d, err %v", cands, interessados, err)
	}
	if cands[0].Lat == nil || *cands[0].Lat != -3.70 || cands[0].PeloBairro || cands[0].Capacidade != 12 || cands[0].Nome != "Ana" {
		t.Fatalf("rua lida errado: %#v", cands[0])
	}
	if !cands[1].PeloBairro || cands[2].Lat != nil || cands[2].PeloBairro || strings.Join(cands[2].Dias, ",") != "seg" {
		t.Fatalf("bairro/sem posição lidos errado: %#v %#v", cands[1], cands[2])
	}
	cond, args, _ := escopoSQL(sc)
	for _, st := range db.doCalls[0] {
		if !strings.Contains(st.SQL, "WHERE excluido_em IS NULL AND "+cond) || len(st.Args) != len(args) || st.Args[0] != args[0] {
			t.Fatalf("sem escopo exato: %s %#v", st.SQL, st.Args)
		}
	}
	q := db.doCalls[0][0].SQL
	if !strings.Contains(q, "e.geo_precisao IN ('rua', 'bairro', 'manual')") {
		t.Fatalf("posição pela cidade não pode entrar no ranking: %s", q)
	}
	if c := db.doCalls[0][1].SQL; !strings.Contains(c, "interesse_anfitriao = 'S'") || !strings.Contains(c, "NOT IN (SELECT resposta_id FROM anfitrioes)") {
		t.Fatalf("contagem de interessados errada: %s", c)
	}
}

func TestMembrosCelulaUsaEscopoECelula(t *testing.T) {
	sc := Scope{Celulas: []string{"Hope"}}
	db := &recordingDB{doResults: [][]*turso.Result{{{Rows: [][]any{
		{int64(7), -3.70, -38.50},
		{int64(8), nil, nil},
	}}}}}
	membros, visivel, err := (&Store{DB: db}).MembrosCelula(context.Background(), sc, "Hope")
	if err != nil || !visivel || len(membros) != 2 || membros[0].Lat == nil || membros[1].Lat != nil {
		t.Fatalf("membros = %#v visivel=%v err=%v", membros, visivel, err)
	}
	st := db.doCalls[0][0]
	cond, args, _ := escopoSQL(sc)
	if !strings.Contains(st.SQL, "celula = ? COLLATE NOCASE AND excluido_em IS NULL AND "+cond) ||
		!strings.Contains(st.SQL, "e.geo_precisao IN ('rua', 'bairro', 'manual')") {
		t.Fatalf("SQL sem célula, escopo ou filtro de precisão: %s", st.SQL)
	}
	if len(st.Args) != 1+len(args) || st.Args[0] != "Hope" || st.Args[1] != args[0] {
		t.Fatalf("args = %#v", st.Args)
	}
	// Célula sem ninguém no escopo: invisível, sem distinguir de inexistente.
	db = &recordingDB{}
	if _, visivel, _ := (&Store{DB: db}).MembrosCelula(context.Background(), sc, "Outra"); visivel {
		t.Fatal("célula sem membros no escopo deve ficar invisível")
	}
	db = &recordingDB{}
	if _, visivel, _ := (&Store{DB: db}).MembrosCelula(context.Background(), sc, "  "); visivel || len(db.doCalls) != 0 {
		t.Fatal("célula vazia não consulta")
	}
}
