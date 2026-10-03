package api

import (
	"reflect"
	"strings"
	"testing"
)

func TestFmtLocal(t *testing.T) {
	if got := fmtLocal("2026-10-03T21:30:05Z"); got != "03/10/2026 18:30:05" {
		t.Errorf("fmtLocal = %q", got)
	}
	if fmtLocal("") != "" || fmtLocal("lixo") != "lixo" {
		t.Error("vazio e inválido devem passar direto")
	}
}

func TestValidUser(t *testing.T) {
	for _, ok := range []string{"admin", "ana.silva", "joao-2", "a_b"} {
		if !validUser(ok) {
			t.Errorf("%q deveria ser válido", ok)
		}
	}
	for _, ruim := range []string{"", "ab", "Ana", "com espaço", "acentuação", strings.Repeat("a", 31), "a'b"} {
		if validUser(ruim) {
			t.Errorf("%q deveria ser inválido", ruim)
		}
	}
}

func TestClean(t *testing.T) {
	if got := cleanLine("  oi\nmundo\t!  ", 50); got != "oi mundo !" {
		t.Errorf("cleanLine = %q", got)
	}
	if got := cleanText("a\r\nb\x00c", 50); got != "a\nbc" {
		t.Errorf("cleanText = %q", got)
	}
	if got := cleanLine("áéíóú", 3); got != "áéí" {
		t.Errorf("limite deve contar caracteres, não bytes: %q", got)
	}
}

func TestCleanList(t *testing.T) {
	got := cleanList([]string{" Hope ", "hope", "Beta,nia", "", "Ashrei;"})
	want := []string{"Hope", "Beta nia", "Ashrei"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("cleanList = %q", got)
	}
}

func TestCanonico(t *testing.T) {
	lista := []string{"Betânia", "Hope"}
	if c, ok := canonico("betânia", lista); !ok || c != "Betânia" {
		t.Errorf("canonico = %q %v", c, ok)
	}
	if _, ok := canonico("Outra", lista); ok {
		t.Error("nome fora da lista deveria ser recusado")
	}
	if c, ok := canonico("", lista); !ok || c != "" {
		t.Error("vazio é permitido")
	}
}
