package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotEnv(t *testing.T) {
	dir := t.TempDir()
	arq := filepath.Join(dir, ".env")
	conteudo := "\ufeff# comentário\n\nCHAVE_A=valor-a\nCHAVE_B = \"com espaço\"\nCHAVE_C='aspas simples'\nCHAVE_JA_DEFINIDA=do-arquivo\nsem-igual\n=sem-nome\nCHAVE_URL=libsql://x.turso.io?a=b\n"
	if err := os.WriteFile(arq, []byte(conteudo), 0o600); err != nil {
		t.Fatal(err)
	}
	for _, k := range []string{"CHAVE_A", "CHAVE_B", "CHAVE_C", "CHAVE_URL"} {
		t.Setenv(k, "")
		os.Unsetenv(k)
	}
	t.Setenv("CHAVE_JA_DEFINIDA", "do-ambiente")

	LoadDotEnv(arq)

	quer := map[string]string{
		"CHAVE_A":           "valor-a",
		"CHAVE_B":           "com espaço",
		"CHAVE_C":           "aspas simples",
		"CHAVE_JA_DEFINIDA": "do-ambiente", // o ambiente real sempre vence o arquivo
		"CHAVE_URL":         "libsql://x.turso.io?a=b",
	}
	for k, v := range quer {
		if got := os.Getenv(k); got != v {
			t.Errorf("%s = %q, queria %q", k, got, v)
		}
	}
}

func TestLoadDotEnvArquivoInexistente(t *testing.T) {
	LoadDotEnv(filepath.Join(t.TempDir(), "nao-existe.env")) // não deve dar pânico
}

func TestLoadEnvUsaENV_FILE(t *testing.T) {
	dir := t.TempDir()
	arq := filepath.Join(dir, ".env.prod")
	if err := os.WriteFile(arq, []byte("TESTE_ENV_FILE=veio-do-prod\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	os.Unsetenv("TESTE_ENV_FILE")
	t.Setenv("ENV_FILE", arq)
	LoadEnv()
	if got := os.Getenv("TESTE_ENV_FILE"); got != "veio-do-prod" {
		t.Errorf("TESTE_ENV_FILE = %q", got)
	}
	os.Unsetenv("TESTE_ENV_FILE")
}

func TestDBHostNaoVazaToken(t *testing.T) {
	t.Setenv("TURSO_DATABASE_URL", "libsql://vec-prod-fulano.aws-sa-east-1.turso.io")
	t.Setenv("TURSO_AUTH_TOKEN", "segredo-super-secreto")
	if got := DBHost(); got != "vec-prod-fulano.aws-sa-east-1.turso.io" {
		t.Errorf("DBHost = %q", got)
	}
	t.Setenv("TURSO_DATABASE_URL", "")
	if got := DBHost(); got != "(não definido)" {
		t.Errorf("DBHost vazio = %q", got)
	}
}
