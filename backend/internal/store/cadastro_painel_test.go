package store

import (
	"context"
	"io/fs"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"vec/backend/migrations"
)

// Migration 0016 num SQLite de verdade: padrão "formulario", origem só formulario ou
// painel, e a busca de possíveis duplicados ignora excluídos.
func TestCadastroPainelNoSQLite(t *testing.T) {
	bin, err := exec.LookPath("sqlite3")
	if err != nil {
		t.Skip("sqlite3 não disponível")
	}
	arq := filepath.Join(t.TempDir(), "c.db")
	rodar := func(sql string) (string, error) {
		c := exec.Command(bin, arq)
		c.Stdin = strings.NewReader(sql)
		b, err := c.CombinedOutput()
		if err == nil && strings.Contains(string(b), "Error") {
			err = exec.ErrNotFound
		}
		return strings.TrimSpace(string(b)), err
	}
	nomes, _ := fs.Glob(migrations.FS, "*.sql")
	sort.Strings(nomes)
	var todas strings.Builder
	for _, n := range nomes {
		b, _ := fs.ReadFile(migrations.FS, n)
		todas.Write(b)
		todas.WriteString("\n")
	}
	if out, err := rodar(todas.String()); err != nil {
		t.Fatalf("migrations: %v %s", err, out)
	}
	if out, err := rodar(`INSERT INTO respostas (id, criado_em, nome, nascimento, telefone) VALUES (1, 'x', 'Ana', '1990-01-01', '85999990000'), (2, 'x', 'Bia', '1990-01-01', ''), (3, 'x', 'Caio', '1980-01-01', '85999990000');
		UPDATE respostas SET excluido_em = 'x' WHERE id = 3;
		INSERT INTO respostas (id, criado_em, nome, origem, cadastrado_por) VALUES (4, 'x', 'Davi', 'painel', 'lider');`); err != nil {
		t.Fatalf("dados: %v %s", err, out)
	}
	if out, _ := rodar(`SELECT group_concat(id || ':' || origem || ':' || IFNULL(cadastrado_por, '-'), ' ') FROM respostas;`); out != "1:formulario:- 2:formulario:- 3:formulario:- 4:painel:lider" {
		t.Fatalf("origem = %s", out)
	}
	if _, err := rodar(`INSERT INTO respostas (criado_em, nome, origem) VALUES ('x', 'Eva', 'planilha');`); err == nil {
		t.Fatal("origem desconhecida aceita")
	}
	// A mesma consulta de CandidatosDuplicado, com os valores no lugar dos parâmetros
	q := `SELECT group_concat(id) FROM respostas WHERE excluido_em IS NULL AND (('1990-01-01' <> '' AND nascimento = '1990-01-01') OR ('85999990000' <> '' AND telefone = '85999990000'));`
	if out, _ := rodar(q); out != "1,2" {
		t.Fatalf("candidatos = %s (o excluído não entra)", out)
	}
}

func TestCandidatosDuplicadoMandaNascimentoETelefone(t *testing.T) {
	db := &recordingDB{}
	if _, err := (&Store{DB: db}).CandidatosDuplicado(context.Background(), "1990-01-01", ""); err != nil {
		t.Fatal(err)
	}
	st := db.doCalls[0][0]
	if !strings.Contains(st.SQL, "excluido_em IS NULL") || st.Args[0] != "1990-01-01" || st.Args[2] != "" {
		t.Fatalf("consulta = %s %#v", st.SQL, st.Args)
	}
}
