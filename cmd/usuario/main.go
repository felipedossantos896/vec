// Comando usuario: cria ou atualiza um usuário do painel direto no banco.
// Serve para criar o PRIMEIRO administrador (depois, use a aba "Usuários" do painel).
//
//	go run ./cmd/usuario -usuario admin -nome "Administrador" -perfil AREA -gerencia
//	go run ./cmd/usuario -usuario ana -nome "Ana" -perfil CELULA -celulas "Hope,Betânia"
package main

import (
	"bufio"
	"context"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"vec/internal/api"
	"vec/internal/auth"
	"vec/internal/config"
	"vec/internal/store"
)

func main() {
	config.LoadEnv()

	usuario := flag.String("usuario", "", "login (3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado)")
	nome := flag.String("nome", "", "nome de exibição")
	perfil := flag.String("perfil", "AREA", "AREA, SETOR ou CELULA")
	setores := flag.String("setores", "", "setores que lidera, separados por vírgula (perfil SETOR)")
	celulas := flag.String("celulas", "", "células que lidera, separadas por vírgula")
	gerencia := flag.Bool("gerencia", false, "pode gerenciar usuários pelo painel")
	inativo := flag.Bool("inativo", false, "cria o usuário já desativado")
	senha := flag.String("senha", "", "senha (se omitida, será perguntada)")
	flag.Parse()

	u := api.NormUser(*usuario)
	if !api.ValidUser(u) {
		die("informe -usuario com 3 a 30 caracteres: letras minúsculas, números, ponto, hífen ou sublinhado")
	}
	p := strings.ToUpper(strings.TrimSpace(*perfil))
	if p != "AREA" && p != "SETOR" && p != "CELULA" {
		die("-perfil deve ser AREA, SETOR ou CELULA")
	}
	setoresL, celulasL := lista(*setores), lista(*celulas)
	switch p {
	case "AREA":
		setoresL, celulasL = nil, nil
	case "CELULA":
		setoresL = nil
		if len(celulasL) == 0 {
			die("perfil CELULA exige -celulas")
		}
	case "SETOR":
		if len(setoresL) == 0 {
			die("perfil SETOR exige -setores")
		}
	}

	db, err := config.OpenDB()
	if err != nil {
		die(err.Error())
	}
	fmt.Println("Banco:", config.DBHost())
	st := &store.Store{DB: db}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	existente, err := st.GetUser(ctx, u)
	if err != nil {
		die(err.Error())
	}
	criar := existente == nil

	pw := *senha
	if pw == "" && criar {
		fmt.Print("Senha (vai aparecer na tela enquanto você digita): ")
		linha, _ := bufio.NewReader(os.Stdin).ReadString('\n')
		pw = strings.TrimSpace(linha)
	}
	hash := ""
	if pw != "" {
		if len([]rune(pw)) < 6 {
			die("a senha precisa ter pelo menos 6 caracteres")
		}
		if hash, err = auth.HashPassword(pw); err != nil {
			die(err.Error())
		}
	}
	nomeFinal := strings.TrimSpace(*nome)
	if nomeFinal == "" {
		if existente != nil {
			nomeFinal = existente.Nome
		} else {
			nomeFinal = u
		}
	}

	err = st.SaveUser(ctx, store.User{
		Usuario: u, Nome: nomeFinal, Perfil: p, Ativo: !*inativo, Gerencia: *gerencia,
		Setores: setoresL, Celulas: celulasL,
	}, hash, criar, time.Now())
	if errors.Is(err, store.ErrUserExists) {
		die("esse usuário já existe")
	}
	if err != nil {
		die(err.Error())
	}
	if criar {
		fmt.Printf("Usuário %q criado (perfil %s).\n", u, p)
	} else {
		fmt.Printf("Usuário %q atualizado (perfil %s).\n", u, p)
	}
}

func lista(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func die(msg string) {
	fmt.Fprintln(os.Stderr, "erro:", msg)
	os.Exit(1)
}
