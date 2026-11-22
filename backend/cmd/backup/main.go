// Comando backup: gera o dump SQL restaurável do banco e o manifesto de contagens
// (Spec 006). Usa TURSO_DATABASE_URL e TURSO_AUTH_TOKEN (basta só leitura).
//
//	go run ./backend/cmd/backup -saida dump.sql -manifesto contagens.json
//
// Não imprime dados, contagens, URL nem token: os logs do workflow são públicos.
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"vec/backend/internal/backup"
	"vec/backend/internal/config"
)

func main() {
	saida := flag.String("saida", "", "arquivo novo do dump SQL")
	manifesto := flag.String("manifesto", "", "arquivo novo com a contagem de linhas por tabela (JSON)")
	flag.Parse()
	if *saida == "" || *manifesto == "" {
		falhar("informe -saida e -manifesto")
	}
	config.LoadEnv()
	db, err := config.OpenDB()
	if err != nil {
		falhar("banco não configurado")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	f, err := os.OpenFile(*saida, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		falhar("não foi possível criar o arquivo do dump")
	}
	buf := bufio.NewWriterSize(f, 1<<20)
	contagens, err := backup.Dump(ctx, db, buf)
	if err == nil {
		err = buf.Flush()
	}
	if cerr := f.Close(); err == nil {
		err = cerr
	}
	if err != nil {
		os.Remove(*saida)
		// A mensagem do erro pode citar nomes de tabelas, mas nunca valores nem a URL.
		falhar("dump falhou: " + seguro(err))
	}
	m, err := os.OpenFile(*manifesto, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		falhar("não foi possível criar o manifesto")
	}
	enc := json.NewEncoder(m)
	enc.SetIndent("", "  ")
	if err := enc.Encode(contagens); err != nil {
		falhar("não foi possível gravar o manifesto")
	}
	if err := m.Close(); err != nil {
		falhar("não foi possível gravar o manifesto")
	}
	fmt.Println("backup: dump e manifesto gerados")
}

// seguro corta a mensagem para não carregar a URL do banco (erros de rede do Go a incluem).
func seguro(err error) string {
	s := err.Error()
	for _, marca := range []string{"http://", "https://", "libsql://"} {
		if i := strings.Index(s, marca); i >= 0 {
			return s[:i] + "<endereço omitido>"
		}
	}
	return s
}

func falhar(msg string) {
	fmt.Fprintln(os.Stderr, "backup:", msg)
	os.Exit(1)
}
