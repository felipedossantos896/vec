// Comando e2e-usuario: cria e remove o usuário AREA temporário do smoke E2E.
//
// Só aceita o banco vec-dev e só remove usuários com o prefixo "e2e-".
// Não lê .env: TURSO_DATABASE_URL e TURSO_AUTH_TOKEN vêm do ambiente do
// processo (o script npm run test:e2e:dev os define). A senha só é gravada
// no arquivo indicado, criado com permissão 0600, e nunca vai para a saída.
//
//	e2e-usuario criar -arquivo /tmp/dir/credencial.json
//	e2e-usuario remover -usuario e2e-1a2b3c4d
//	e2e-usuario contar [-usuario e2e-1a2b3c4d]
package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"os"
	"regexp"
	"strings"
	"time"

	"vec/backend/internal/api"
	"vec/backend/internal/auth"
	"vec/backend/internal/config"
	"vec/backend/internal/store"
	"vec/backend/internal/turso"
)

const (
	prefixo     = "e2e-"
	bancoDev    = "vec-dev"
	tempoLimite = 30 * time.Second
)

func main() {
	if len(os.Args) < 2 {
		die("uso: e2e-usuario <criar|remover|contar> [opções]")
	}
	if !hostDev(config.DBHost()) {
		die("recusado: TURSO_DATABASE_URL precisa apontar exatamente para o banco " + bancoDev)
	}
	db, err := config.OpenDB()
	if err != nil {
		die(err.Error())
	}
	ctx, cancel := context.WithTimeout(context.Background(), tempoLimite)
	defer cancel()

	flags := flag.NewFlagSet(os.Args[1], flag.ExitOnError)
	switch os.Args[1] {
	case "criar":
		arquivo := flags.String("arquivo", "", "arquivo novo onde gravar usuário e senha (0600)")
		_ = flags.Parse(os.Args[2:])
		err = criar(ctx, db, *arquivo)
	case "remover":
		usuario := flags.String("usuario", "", "usuário temporário (prefixo e2e-)")
		_ = flags.Parse(os.Args[2:])
		err = remover(ctx, db, *usuario)
	case "contar":
		usuario := flags.String("usuario", "", "conta só este usuário temporário (padrão: todos)")
		_ = flags.Parse(os.Args[2:])
		var n int
		if n, err = contar(ctx, db, *usuario); err == nil {
			fmt.Println(n)
		}
	default:
		err = errors.New("comando desconhecido: " + os.Args[1])
	}
	if err != nil {
		die(err.Error())
	}
}

// hostDev confere que o host é da Turso e começa com "vec-dev-" (Turso monta
// <banco>-<organização>.<região>.turso.io). Recusa vec-dev2, vec-prod e outros
// domínios. Como nomes podem ter hífen, não distingue um banco "vec-dev-x";
// o script resolve a URL pelo nome exato com o turso CLI.
func hostDev(host string) bool {
	rotulo, resto, ok := strings.Cut(host, ".")
	if !ok || !strings.HasSuffix("."+resto, ".turso.io") {
		return false
	}
	org, ok := strings.CutPrefix(rotulo, bancoDev+"-")
	return ok && org != ""
}

// reTemporario é exatamente o formato gerado por criar: e2e- + 8 hexadecimais.
var reTemporario = regexp.MustCompile(`^e2e-[0-9a-f]{8}$`)

func temporario(usuario string) bool {
	return reTemporario.MatchString(usuario) && api.ValidUser(usuario)
}

func aleatorio(bytes int) (string, error) {
	b := make([]byte, bytes)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func criar(ctx context.Context, db turso.DB, arquivo string) error {
	if arquivo == "" {
		return errors.New("informe -arquivo")
	}
	sufixo, err := aleatorio(4)
	if err != nil {
		return err
	}
	senha, err := aleatorio(18)
	if err != nil {
		return err
	}
	usuario := prefixo + sufixo
	hash, err := auth.HashPassword(senha)
	if err != nil {
		return err
	}
	// O arquivo é criado antes do usuário: se falhar, nada fica no banco.
	f, err := os.OpenFile(arquivo, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o600)
	if err != nil {
		return fmt.Errorf("criando arquivo de credencial: %w", err)
	}
	defer f.Close()
	if err := json.NewEncoder(f).Encode(map[string]string{"usuario": usuario, "senha": senha}); err != nil {
		return err
	}
	st := &store.Store{DB: db}
	u := store.User{Usuario: usuario, Nome: "Smoke E2E", Perfil: "AREA", Ativo: true}
	if err := st.SaveUser(ctx, u, hash, true, time.Now()); err != nil {
		return err
	}
	fmt.Println(usuario)
	return nil
}

func remover(ctx context.Context, db turso.DB, usuario string) error {
	if !temporario(usuario) {
		return errors.New("só usuários temporários (prefixo e2e-) podem ser removidos")
	}
	_, err := db.Tx(ctx,
		turso.Stmt{SQL: `DELETE FROM usuario_escopos WHERE usuario = ?`, Args: []any{usuario}},
		turso.Stmt{SQL: `DELETE FROM login_falhas WHERE usuario = ?`, Args: []any{usuario}},
		turso.Stmt{SQL: `DELETE FROM usuarios WHERE usuario = ?`, Args: []any{usuario}},
	)
	return err
}

// contar devolve quantos usuários temporários existem; com usuario, conta só
// esse (assim execuções simultâneas não se atrapalham).
func contar(ctx context.Context, db turso.DB, usuario string) (int, error) {
	stmt := turso.Stmt{
		SQL: `SELECT usuario FROM usuarios WHERE usuario GLOB 'e2e-[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'`,
	}
	if usuario != "" {
		if !temporario(usuario) {
			return 0, errors.New("só usuários temporários (prefixo e2e-) podem ser contados")
		}
		stmt = turso.Stmt{SQL: `SELECT usuario FROM usuarios WHERE usuario = ?`, Args: []any{usuario}}
	}
	res, err := db.Do(ctx, stmt)
	if err != nil {
		return 0, err
	}
	return len(res[0].Rows), nil
}

func die(msg string) {
	fmt.Fprintln(os.Stderr, "erro:", msg)
	os.Exit(1)
}
