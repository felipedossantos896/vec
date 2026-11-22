package store

import (
	"context"
	"strings"
	"testing"

	"vec/backend/internal/turso"
)

func TestEstruturaLeIdentidadeDaCelula(t *testing.T) {
	db := &recordingDB{doResults: [][]*turso.Result{{
		{Rows: [][]any{{int64(1), "Fogo no Altar"}}},
		{Rows: [][]any{{int64(3), "Hope", int64(1), "Fogo no Altar", int64(1), "#0e8a8c", "ter", "20:00", int64(7)}}},
	}}}
	_, cs, err := (&Store{DB: db}).Estrutura(context.Background())
	if err != nil || len(cs) != 1 {
		t.Fatalf("células = %#v, %v", cs, err)
	}
	c := cs[0]
	if c.Cor != "#0e8a8c" || c.DiaSemana != "ter" || c.Horario != "20:00" || c.AnfitriaoID != 7 {
		t.Fatalf("identidade lida errado: %#v", c)
	}
	if q := db.doCalls[0][1].SQL; !strings.Contains(q, "r.excluido_em IS NULL") {
		t.Fatalf("casa de cadastro excluído não pode aparecer: %s", q)
	}
}

func TestNovaCelulaGravaIdentidade(t *testing.T) {
	db := &recordingDB{doResults: [][]*turso.Result{{{Affected: 1}}}}
	err := (&Store{DB: db}).SalvarCelula(context.Background(), Celula{Nome: "Nova", SetorID: 1, Ativa: true, Cor: "#7450d0", DiaSemana: "qua", Horario: "19:30", AnfitriaoID: 9})
	if err != nil {
		t.Fatal(err)
	}
	st := db.doCalls[0][0]
	if !strings.Contains(st.SQL, "cor, dia_semana, horario, anfitriao_id") || st.Args[2] != "#7450d0" || st.Args[3] != "qua" || st.Args[4] != "19:30" || st.Args[5] != int64(9) {
		t.Fatalf("INSERT sem identidade: %s %#v", st.SQL, st.Args)
	}
}
