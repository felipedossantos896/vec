// Comando migrate: aplica as migrations pendentes no banco.
//
//	go run ./backend/cmd/migrate
package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"vec/backend/internal/config"
	"vec/backend/internal/turso"
	"vec/backend/migrations"
)

func main() {
	config.LoadEnv()
	db, err := config.OpenDB()
	if err != nil {
		fmt.Fprintln(os.Stderr, "erro:", err)
		os.Exit(1)
	}
	fmt.Println("Banco:", config.DBHost())
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	feitas, err := turso.Migrate(ctx, db, migrations.FS, ".")
	if err != nil {
		fmt.Fprintln(os.Stderr, "erro:", err)
		os.Exit(1)
	}
	if len(feitas) == 0 {
		fmt.Println("Banco já está atualizado. Nenhuma migration pendente.")
		return
	}
	for _, f := range feitas {
		fmt.Println("aplicada:", f)
	}
}
