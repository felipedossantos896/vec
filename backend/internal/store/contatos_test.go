package store

import (
	"context"
	"strings"
	"testing"
	"time"

	"vec/backend/internal/turso"
)

func TestAddAnotacaoGravaContato(t *testing.T) {
	db := &recordingDB{doResults: [][]*turso.Result{{{Affected: 1}}}}
	ok, err := (&Store{DB: db}).AddAnotacao(context.Background(), Scope{Todos: true}, 7, Anotacao{Autor: "u", AutorNome: "U", Tipo: "visita", ContatoEm: "2026-11-20", LembrarEm: "2026-12-20"}, time.Now())
	if err != nil || !ok {
		t.Fatal(ok, err)
	}
	a := db.doCalls[0][0].Args
	if a[4] != "visita" || a[5] != "2026-11-20" || a[6] != "2026-12-20" {
		t.Fatalf("args = %#v", a)
	}
	db = &recordingDB{doResults: [][]*turso.Result{{{Affected: 1}}}}
	(&Store{DB: db}).AddAnotacao(context.Background(), Scope{Todos: true}, 7, Anotacao{Texto: "x"}, time.Now())
	if db.doCalls[0][0].Args[4] != "nota" {
		t.Fatalf("sem tipo vira nota: %#v", db.doCalls[0][0].Args)
	}
}

func TestListaAnotacoesPeloDiaDoContato(t *testing.T) {
	db := &recordingDB{doResults: [][]*turso.Result{{{Rows: [][]any{{int64(1)}}}, {Rows: [][]any{{int64(9), "u", "U", "2026-11-22T10:00:00Z", "", "ligacao", "2026-11-21", "2026-12-21"}}}}}}
	l, ok, err := (&Store{DB: db}).ListAnotacoes(context.Background(), Scope{Todos: true}, 7)
	if err != nil || !ok || len(l) != 1 || l[0].Tipo != "ligacao" || l[0].ContatoEm != "2026-11-21" || l[0].LembrarEm != "2026-12-21" {
		t.Fatalf("lista = %#v", l)
	}
	if q := db.doCalls[0][1].SQL; !strings.Contains(q, "ORDER BY "+QuandoContato+" DESC") {
		t.Fatalf("ordem pelo dia do contato: %s", q)
	}
}

func TestListRespostasLeUltimoEProximoContato(t *testing.T) {
	row := []any{int64(1), "2026-01-01T00:00:00Z", "", "", int64(0), "", "2026-11-21T12:00:00Z", "2026-12-21", ""}
	for range Campos {
		row = append(row, "")
	}
	row[9] = "Ana Teste" // primeiro campo (nome)
	db := &recordingDB{doResults: [][]*turso.Result{{{Rows: [][]any{row}}, {}}}}
	rs, err := (&Store{DB: db}).ListRespostas(context.Background(), Scope{Todos: true})
	if err != nil || len(rs) != 1 {
		t.Fatal(rs, err)
	}
	if rs[0].UltimoContato != "2026-11-21T12:00:00Z" || rs[0].ProximoContato != "2026-12-21" || rs[0].V[Campos[0].Chave] != "Ana Teste" {
		t.Fatalf("resposta = %+v", rs[0])
	}
	if q := db.doCalls[0][0].SQL; !strings.Contains(q, "a.lembrar_em FROM anotacoes a") {
		t.Fatalf("sem lembrete na lista: %s", q)
	}
}
