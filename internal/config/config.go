// Package config lê as variáveis de ambiente (e o arquivo .env em desenvolvimento).
package config

import (
	"errors"
	"os"
	"strings"

	"vec/internal/turso"
)

// LoadDotEnv lê um arquivo .env (se existir) e define as variáveis que ainda
// não estão definidas no ambiente. Em produção as variáveis vêm da plataforma.
func LoadDotEnv(path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		return
	}
	text := strings.TrimPrefix(string(data), "\ufeff") // BOM do Bloco de Notas
	for _, line := range strings.Split(text, "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		k, v, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		k = strings.TrimSpace(k)
		v = strings.Trim(strings.TrimSpace(v), `"'`)
		if k != "" && os.Getenv(k) == "" {
			_ = os.Setenv(k, v)
		}
	}
}

// OpenDB abre o cliente do Turso com TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.
func OpenDB() (*turso.Client, error) {
	url := os.Getenv("TURSO_DATABASE_URL")
	if url == "" {
		return nil, errors.New("defina TURSO_DATABASE_URL (veja o arquivo .env.example)")
	}
	return turso.New(url, os.Getenv("TURSO_AUTH_TOKEN"))
}
