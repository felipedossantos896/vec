package api

import (
	"context"
	"testing"
	"time"
)

func TestLoginRateAllowsTenAttemptsPerMinute(t *testing.T) {
	var l loginRate
	now := time.Date(2026, 11, 14, 12, 0, 0, 0, time.UTC)
	for i := 0; i < maxLoginMinuto; i++ {
		if !l.allow(now) {
			t.Fatalf("tentativa %d foi recusada antes do limite", i+1)
		}
	}
	if l.allow(now) {
		t.Fatal("tentativa acima do limite foi aceita")
	}
	if !l.allow(now.Add(time.Minute)) {
		t.Fatal("limite não foi renovado após um minuto")
	}
}

func TestLoginRejectsOverLimitBeforeDatabaseAccess(t *testing.T) {
	db := &apiTestDB{}
	s := testAPIServer(db)
	now := s.Now()
	for i := 0; i < maxLoginMinuto; i++ {
		s.loginRate.allow(now)
	}

	rep := s.login(context.Background(), adminReq{Usuario: "ana", Senha: "senha"})
	if rep.body["erro"] != "login_limitado" {
		t.Fatalf("erro = %v, queria login_limitado", rep.body["erro"])
	}
	if len(db.doCalls) != 0 {
		t.Fatalf("banco consultado depois do limite: %#v", db.doCalls)
	}
}

func TestLoginUnknownUserUsesOneFailureBucket(t *testing.T) {
	db := &apiTestDB{}
	s := testAPIServer(db)
	s.dummyHash = "invalid-test-hash"

	rep := s.login(context.Background(), adminReq{Usuario: "naoexiste", Senha: "senha"})
	if rep.body["erro"] != "credenciais" {
		t.Fatalf("erro = %v, queria credenciais", rep.body["erro"])
	}
	if len(db.txCalls) != 1 || len(db.txCalls[0]) != 2 {
		t.Fatalf("falha não foi registrada: %#v", db.txCalls)
	}
	if got := db.txCalls[0][0].Args[0]; got != "" {
		t.Errorf("nome inexistente armazenado individualmente: %v", got)
	}

}
