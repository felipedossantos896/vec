// Comando server: serve o formulário, o painel e a API em um único programa.
//
//	go run ./cmd/server        (desenvolvimento, lê o arquivo .env)
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"vec/internal/api"
	"vec/internal/config"
	"vec/internal/store"
	"vec/internal/turso"
	"vec/migrations"
	"vec/web"
)

func main() {
	config.LoadEnv()
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	db, err := config.OpenDB()
	if err != nil {
		fatal(log, "banco", err)
	}

	secret := os.Getenv("SESSION_SECRET")
	if len(secret) < 32 {
		fatal(log, "configuração", errors.New("SESSION_SECRET deve ter 32+ caracteres (gere com: go run ./cmd/segredo)"))
	}

	if os.Getenv("AUTO_MIGRATE") != "0" {
		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		feitas, err := turso.Migrate(ctx, db, migrations.FS, ".")
		cancel()
		if err != nil {
			fatal(log, "migrations", err)
		}
		if len(feitas) > 0 {
			log.Info("migrations aplicadas", "arquivos", strings.Join(feitas, ", "))
		}
	}

	srv, err := api.New(&store.Store{DB: api.WrapDB(db)}, []byte(secret), log)
	if err != nil {
		fatal(log, "servidor", err)
	}

	root := http.NewServeMux()
	apiHandler := srv.Handler()
	root.Handle("/api", apiHandler)
	root.Handle("/healthz", apiHandler)
	root.Handle("/", noCacheHTML(http.FileServerFS(web.FS)))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	httpSrv := &http.Server{
		Addr:              ":" + port,
		Handler:           api.Gzip(api.Seguranca(root)),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = httpSrv.Shutdown(shutdown)
	}()

	log.Info("servidor no ar", "porta", port, "banco", config.DBHost())
	if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		fatal(log, "http", err)
	}
	log.Info("servidor encerrado")
}

// As páginas HTML mudam a cada deploy, então o navegador deve sempre conferir.
func noCacheHTML(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if w.Header().Get("Cache-Control") == "" { // o painel já vem como no-store
			w.Header().Set("Cache-Control", "no-cache")
		}
		next.ServeHTTP(w, r)
	})
}

func fatal(log *slog.Logger, onde string, err error) {
	log.Error("falha ao iniciar", "onde", onde, "erro", err.Error())
	os.Exit(1)
}
