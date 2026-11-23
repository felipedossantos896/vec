package api

import (
	"context"
	"strings"
	"testing"
)

func salvarLider(token, perfil string, setores []string, cadastro int64, criar *cadastroLiderIn) adminReq {
	ativo := true
	return adminReq{Token: token, Novo: true, Usuario: "marcos.teste", Nome: "Marcos Teste", Senha: "senha-forte-1", Perfil: perfil, Setores: setores, Ativo: &ativo, Cadastro: cadastro, CriarCadastro: criar}
}

func escritasCom(db *painelDB, prefixo string) int {
	n := 0
	for _, e := range db.escritas {
		if strings.HasPrefix(e.SQL, prefixo) {
			n++
		}
	}
	return n
}

// Spec 013: a área cria o cadastro do líder junto do login, já ligado a ele.
func TestUsuarioSalvarCriaCadastroDoLider(t *testing.T) {
	s, db, token := novaPessoaServer(t)
	db.perfil, db.escopos, db.gerente = "AREA", nil, true
	rep := s.usuarioSalvar(context.Background(), salvarLider(token, "SETOR", []string{"Fogo no Altar"}, 0, &cadastroLiderIn{Nascimento: "1980-01-01", Autorizou: true}))
	if rep.body["ok"] != true || escritasCom(db, "INSERT INTO respostas") != 1 {
		t.Fatalf("resposta = %#v", rep.body)
	}
	var ins []any
	for _, e := range db.escritas {
		if strings.HasPrefix(e.SQL, "INSERT INTO respostas") {
			ins = e.Args
		}
	}
	if ins[5] != "lider_setor" {
		t.Fatalf("papel = %v", ins[5])
	}
	// O login foi salvo com o cadastro criado (42)
	ligado := false
	for _, st := range db.tx {
		if strings.Contains(st.SQL, "INSERT INTO usuarios") {
			for _, a := range st.Args {
				ligado = ligado || a == int64(42)
			}
		}
	}
	if !ligado {
		t.Fatalf("login sem o cadastro: %#v", db.tx)
	}
}

func TestUsuarioSalvarCadastroDoLiderRecusas(t *testing.T) {
	// Sem autorização
	s, db, token := novaPessoaServer(t)
	db.perfil, db.escopos, db.gerente = "AREA", nil, true
	if rep := s.usuarioSalvar(context.Background(), salvarLider(token, "AREA", nil, 0, &cadastroLiderIn{Nascimento: "1980-01-01"})); rep.body["erro"] != "consentimento" || escritasCom(db, "INSERT INTO respostas") != 0 {
		t.Fatalf("sem autorização: %#v", rep.body)
	}
	// Perfil de célula não tem cadastro de liderança
	s, db, token = novaPessoaServer(t)
	db.perfil, db.escopos, db.gerente = "AREA", nil, true
	req := salvarLider(token, "CELULA", nil, 0, &cadastroLiderIn{Nascimento: "1980-01-01", Autorizou: true})
	req.Celulas = []string{"Hope"}
	if rep := s.usuarioSalvar(context.Background(), req); rep.body["erro"] != "dados_invalidos" {
		t.Fatalf("célula: %#v", rep.body)
	}
	// Quem gerencia usuários mas não vê a área toda não cria liderança
	s, db, token = novaPessoaServer(t)
	db.perfil, db.gerente = "SETOR", true
	db.escopos = [][]any{{"lider", "SETOR", "Fogo no Altar"}}
	if rep := s.usuarioSalvar(context.Background(), salvarLider(token, "SETOR", []string{"Fogo no Altar"}, 0, &cadastroLiderIn{Nascimento: "1980-01-01", Autorizou: true})); rep.body["erro"] != "sem_permissao" || escritasCom(db, "INSERT INTO respostas") != 0 {
		t.Fatalf("setor criando liderança: %#v", rep.body)
	}
}

// O papel do cadastro ligado acompanha o perfil do login.
func TestUsuarioSalvarSincronizaPapel(t *testing.T) {
	casos := []struct {
		perfil, atual, alvo string
		setores             []string
	}{
		{"AREA", "lider_setor", "lider_area", nil},
		{"SETOR", "membro", "lider_setor", []string{"Fogo no Altar"}},
		{"CELULA", "lider_area", "membro", nil},
		{"CELULA", "membro", "", nil}, // membro continua membro: nada a mudar
	}
	for _, c := range casos {
		s, db, token := novaPessoaServer(t)
		db.perfil, db.escopos, db.gerente, db.papel = "AREA", nil, true, c.atual
		req := salvarLider(token, c.perfil, c.setores, 5, nil)
		if c.perfil == "CELULA" {
			req.Celulas = []string{"Hope"}
		}
		if rep := s.usuarioSalvar(context.Background(), req); rep.body["ok"] != true {
			t.Fatalf("%s: %#v", c.perfil, rep.body)
		}
		mudou := ""
		for _, e := range db.escritas {
			if strings.HasPrefix(e.SQL, "UPDATE respostas SET papel") {
				mudou = strings.Split(strings.Split(e.SQL, "papel = '")[1], "'")[0]
			}
		}
		if mudou != c.alvo {
			t.Fatalf("%s com cadastro %s: papel %q, esperado %q", c.perfil, c.atual, mudou, c.alvo)
		}
	}
}
