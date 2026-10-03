package auth

import (
	"strings"
	"testing"
	"time"
)

func TestSenha(t *testing.T) {
	// Poucas iterações só para o teste ser rápido.
	h, err := hashWithIterations("minha-senha", 1000)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(h, "pbkdf2-sha256$1000$") {
		t.Fatalf("formato inesperado: %s", h)
	}
	if !VerifyPassword("minha-senha", h) {
		t.Error("senha correta deveria passar")
	}
	if VerifyPassword("outra", h) {
		t.Error("senha errada não deveria passar")
	}
	h2, _ := hashWithIterations("minha-senha", 1000)
	if h == h2 {
		t.Error("o salt deveria tornar cada hash diferente")
	}
}

func TestSenhaFormatoInvalido(t *testing.T) {
	for _, h := range []string{"", "abc", "pbkdf2-sha256$x$y$z", "pbkdf2-sha256$0$AAAA$AAAA", "md5$1$AAAA$AAAA", "pbkdf2-sha256$99999999$AAAA$AAAA"} {
		if VerifyPassword("x", h) {
			t.Errorf("hash inválido %q não deveria validar", h)
		}
	}
}

func TestIteracoesPadrao(t *testing.T) {
	if Iterations < 600_000 {
		t.Errorf("iterações abaixo do recomendado: %d", Iterations)
	}
}

func TestToken(t *testing.T) {
	secret := []byte(strings.Repeat("s", 32))
	now := time.Date(2026, 10, 3, 12, 0, 0, 0, time.UTC)
	tok := NewToken(secret, "ana", "fp123", time.Hour, now)

	u, fp, err := ParseToken(secret, tok, now.Add(30*time.Minute))
	if err != nil || u != "ana" || fp != "fp123" {
		t.Fatalf("token válido falhou: %v %q %q", err, u, fp)
	}
	if _, _, err := ParseToken(secret, tok, now.Add(2*time.Hour)); err != ErrExpired {
		t.Errorf("esperava ErrExpired, veio %v", err)
	}
	if _, _, err := ParseToken([]byte(strings.Repeat("x", 32)), tok, now); err != ErrToken {
		t.Errorf("segredo diferente deveria falhar, veio %v", err)
	}
	partes := strings.Split(tok, ".")
	adulterado := partes[0] + "." + partes[1] + "A." + partes[2]
	if _, _, err := ParseToken(secret, adulterado, now); err != ErrToken {
		t.Errorf("payload adulterado deveria falhar, veio %v", err)
	}
	for _, lixo := range []string{"", "a.b", "v1.x.y", "v2.a.b"} {
		if _, _, err := ParseToken(secret, lixo, now); err == nil {
			t.Errorf("token lixo %q deveria falhar", lixo)
		}
	}
}

func TestFingerprintMudaComASenha(t *testing.T) {
	a, _ := hashWithIterations("um", 1000)
	b, _ := hashWithIterations("um", 1000)
	if Fingerprint(a) == Fingerprint(b) {
		t.Error("hashes diferentes deveriam ter fingerprints diferentes")
	}
	if Fingerprint(a) != Fingerprint(a) {
		t.Error("o fingerprint deve ser estável")
	}
}
