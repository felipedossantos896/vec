package api

import (
	"context"
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
