// Package config lê as variáveis de ambiente (e o arquivo .env em desenvolvimento).
package config

import (
	"errors"
	"net/url"
	"os"
	"strings"

	"vec/backend/internal/turso"
)

// LoadEnv carrega o arquivo indicado na variável ENV_FILE ou, se ela não
// existir, o arquivo ".env". Assim dá para ter um ".env.prod" separado para
// tarefas pontuais no banco de produção, sem misturar com o de desenvolvimento.
func LoadEnv() {
	path := os.Getenv("ENV_FILE")
	if path == "" {
		path = ".env"
	}
	LoadDotEnv(path)
}

// DBHost devolve só o endereço do banco (sem token), para mostrar em qual
// banco um comando está agindo.
func DBHost() string {
	raw := strings.Replace(os.Getenv("TURSO_DATABASE_URL"), "libsql://", "https://", 1)
	if u, err := url.Parse(raw); err == nil && u.Host != "" {
		return u.Host
	}
	return "(não definido)"
}

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
