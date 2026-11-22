package api

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
)

func TestEstruturaSalvarSoLiderDeArea(t *testing.T) {
	s, db, token := painelServer(t, 1) // líder de célula
	rep := s.estruturaSalvar(context.Background(), adminReq{Token: token, Tipo: "celula", Nome: "Nova", SetorID: 1})
	if rep.body["erro"] != "sem_permissao" {
		t.Fatalf("erro = %v, queria sem_permissao", rep.body["erro"])
	}
	if len(db.escritas) != 0 {
		t.Fatalf("gravou sem permissão: %#v", db.escritas)
	}
}

func TestEstruturaSalvarRenomeiaEmCascata(t *testing.T) {
	s, db, token := painelServer(t, 1)
	db.perfil, db.escopos = "AREA", nil
	rep := s.estruturaSalvar(context.Background(), adminReq{Token: token, Tipo: "celula", ID: 3, Nome: " Hope 2 ", SetorID: 2})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if len(db.tx) != 3 {
		t.Fatalf("esperava 3 instruções na transação, veio %d", len(db.tx))
	}
	if !strings.HasPrefix(db.tx[0].SQL, "UPDATE respostas SET celula = ?, setor =") || db.tx[0].Args[0] != "Hope 2" {
		t.Errorf("cadastros não acompanham a célula: %#v", db.tx[0])
	}
	if !strings.Contains(db.tx[1].SQL, "usuario_escopos") || !strings.HasPrefix(db.tx[2].SQL, "UPDATE celulas") {
		t.Errorf("ordem da transação inesperada: %#v", db.tx)
	}

	for _, req := range []adminReq{
		{Token: token, Tipo: "celula", Nome: "X", SetorID: 2},
		{Token: token, Tipo: "celula", Nome: "Nova"},
		{Token: token, Tipo: "outro", Nome: "Nova"},
	} {
		if rep := s.estruturaSalvar(context.Background(), req); rep.body["ok"] == true {
			t.Errorf("aceitou pedido inválido: %#v", req)
		}
	}
}

func TestEstruturaSalvarIdentidadeDaCelula(t *testing.T) {
	s, db, token := painelServer(t, 1)
	db.perfil, db.escopos = "AREA", nil
	rep := s.estruturaSalvar(context.Background(), adminReq{Token: token, Tipo: "celula", ID: 3, Nome: "Hope", SetorID: 2,
		Cor: " #0E8A8C ", DiaSemana: "TER", Horario: "20:00", AnfitriaoID: 7})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	up := db.tx[2]
	if !strings.Contains(up.SQL, "cor = ?, dia_semana = ?, horario = ?, anfitriao_id = (SELECT id FROM respostas WHERE id = ? AND excluido_em IS NULL)") {
		t.Fatalf("UPDATE sem identidade: %s", up.SQL)
	}
	if up.Args[3] != "#0e8a8c" || up.Args[4] != "ter" || up.Args[5] != "20:00" || up.Args[6] != int64(7) {
		t.Fatalf("valores normalizados errados: %#v", up.Args)
	}
	invalidos := []adminReq{
		{Cor: "#0e8a8"}, {Cor: "vermelho"}, {Cor: "#gggggg"},
		{DiaSemana: "terça"}, {Horario: "8:00"}, {Horario: "24:00"}, {Horario: "20:60"},
		{AnfitriaoID: -1},
	}
	for _, r := range invalidos {
		r.Token, r.Tipo, r.ID, r.Nome, r.SetorID = token, "celula", 3, "Hope", 2
		if rep := s.estruturaSalvar(context.Background(), r); rep.body["erro"] != "dados_invalidos" {
			t.Errorf("aceitou %#v: %#v", r, rep.body)
		}
	}
	// Vazio é válido: não definido.
	if rep := s.estruturaSalvar(context.Background(), adminReq{Token: token, Tipo: "celula", ID: 3, Nome: "Hope", SetorID: 2}); rep.body["ok"] != true {
		t.Fatalf("vazio deveria ser aceito: %#v", rep.body)
	}
}

func TestEstruturaPublicaSemCasaAnfitria(t *testing.T) {
	s, db, _ := painelServer(t, 1)
	db.celulasExtra = true
	rep := s.estruturaPublica(context.Background())
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	b, _ := json.Marshal(rep.body)
	if strings.Contains(string(b), "anfitriao") || !strings.Contains(string(b), `"cor":"#0e8a8c"`) || !strings.Contains(string(b), `"diaSemana":"ter"`) {
		t.Fatalf("público deve ter cor e dia, sem casa: %s", b)
	}
}
