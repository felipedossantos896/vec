package api

import (
	"context"
	"testing"
)

// Ajustes (Spec 009) mostra "há 2 h": a lista traz o último acesso também em RFC 3339.
func TestUsuariosListarTrazUltimoAcessoBruto(t *testing.T) {
	s, db, token := painelServer(t, 1)
	db.perfil, db.gerente = "AREA", true
	db.escopos = nil
	rep := s.usuariosListar(context.Background(), adminReq{Token: token})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	us := rep.body["usuarios"].([]map[string]any)
	if len(us) != 1 || us[0]["acessoEm"] != "2026-11-14T09:30:00Z" || us[0]["acesso"] == "" {
		t.Fatalf("usuários = %#v", us)
	}
}
