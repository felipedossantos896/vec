package main

import "testing"

func TestHostDevAceitaSomenteVecDev(t *testing.T) {
	casos := map[string]bool{
		"vec-dev-org.aws-us-east-1.turso.io":  true,
		"vec-prod-org.aws-us-east-1.turso.io": false,
		"vec-dev.aws-us-east-1.turso.io":      false,
		"vec-dev2-org.turso.io":               false,
		"vec-devorg.turso.io":                 false,
		"(não definido)":                      false,
		"":                                    false,
	}
	for host, esperado := range casos {
		if hostDev(host) != esperado {
			t.Errorf("hostDev(%q) = %v, esperado %v", host, !esperado, esperado)
		}
	}
}

func TestRemocaoRestritaAUsuariosTemporarios(t *testing.T) {
	casos := map[string]bool{
		"e2e-1a2b3c4d": true,
		"admin":        false,
		"e2e-":         false,
		"xe2e-abc":     false,
		"e2e-ABC":      false,
		"e2e-a b":      false,
	}
	for usuario, esperado := range casos {
		if temporario(usuario) != esperado {
			t.Errorf("temporario(%q) = %v, esperado %v", usuario, !esperado, esperado)
		}
	}
}

func TestAleatorioTemTamanhoEVaria(t *testing.T) {
	a, err := aleatorio(4)
	if err != nil {
		t.Fatal(err)
	}
	b, _ := aleatorio(4)
	if len(a) != 8 || a == b {
		t.Fatalf("valores inesperados: %q %q", a, b)
	}
}
