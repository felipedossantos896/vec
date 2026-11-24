package store

import (
	"io/fs"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"vec/backend/migrations"
)

// Spec 014: o SQL dos pontos do mapa num SQLite de verdade. Líderes entram no escopo e os
// destaques só contam login de célula ativo e células ativas.
func TestPontosMapaComLiderancaNoSQLite(t *testing.T) {
	bin, err := exec.LookPath("sqlite3")
	if err != nil {
		t.Skip("sqlite3 não disponível")
	}
	arq := filepath.Join(t.TempDir(), "m.db")
	rodar := func(sql string) string {
		t.Helper()
		c := exec.Command(bin, arq)
		c.Stdin = strings.NewReader(sql)
		b, err := c.CombinedOutput()
		if err != nil || strings.Contains(string(b), "Error") {
			t.Fatalf("%v\n%s", err, b)
		}
		return strings.TrimSpace(string(b))
	}
	nomes, _ := fs.Glob(migrations.FS, "*.sql")
	sort.Strings(nomes)
	var todas strings.Builder
	for _, n := range nomes {
		b, _ := fs.ReadFile(migrations.FS, n)
		todas.Write(b)
		todas.WriteString("\n")
	}
	rodar(todas.String())
	rodar(`
INSERT INTO setores (id, nome) VALUES (91, 'SA'), (92, 'SB');
INSERT INTO celulas (id, nome, setor_id, ordem, ativa, anfitriao_id) VALUES
 (91, 'Alfa', 91, 1, 1, 2), (92, 'Beta', 91, 2, 1, 1), (93, 'Gama', 92, 3, 0, 1);
INSERT INTO respostas (id, criado_em, nome, setor, celula, papel) VALUES
 (1, 'x', 'Membro A', 'SA', 'Alfa', 'membro'),
 (2, 'x', 'Membro B', 'SA', 'Alfa', 'membro'),
 (3, 'x', 'Lider Setor', 'SA', '', 'lider_setor'),
 (4, 'x', 'Lider Area', '', '', 'lider_area'),
 (5, 'x', 'Membro C', 'SB', 'Delta', 'membro');
INSERT INTO enderecos (resposta_id, cep, logradouro, numero, bairro, cidade, uf, lat, lng, geo_precisao, geo_em, consentimento_em, consentimento_por, atualizado_em, atualizado_por)
 SELECT id, '60000000', 'Rua', '1', 'B', 'C', 'CE', -3.7, -38.5, 'rua', 'x', 'x', 'x', 'x', 'x' FROM respostas;
INSERT INTO usuarios (usuario, nome, senha_hash, perfil, ativo, criado_em, resposta_id) VALUES
 ('la', 'LA', 'h', 'CELULA', 1, 'x', 1), ('lb', 'LB', 'h', 'CELULA', 0, 'x', 2), ('ls', 'LS', 'h', 'SETOR', 1, 'x', 3);
INSERT INTO usuario_escopos (usuario, tipo, nome) VALUES
 ('la', 'CELULA', 'Beta'), ('la', 'CELULA', 'Alfa'), ('la', 'CELULA', 'Gama'), ('lb', 'CELULA', 'Alfa'), ('ls', 'SETOR', 'SA');`)
	// Os argumentos do escopo entram como literais: dados fixos do teste
	consultar := func(sc Scope) string {
		cond, args, _ := escopoSQL(sc)
		for _, x := range args {
			cond = strings.Replace(cond, "?", "'"+x.(string)+"'", 1)
		}
		lista := func(sub string) string { return `IFNULL(replace(` + sub + `, char(10), ','), '-')` }
		return strings.ReplaceAll(rodar(`SELECT e.resposta_id || ':' || `+lista(sqlLiderCelula)+` || ':' || `+lista(sqlCasaCelula)+` FROM enderecos e
		 WHERE e.resposta_id IN (SELECT id FROM respostas WHERE excluido_em IS NULL AND `+cond+`) ORDER BY e.resposta_id;`), "\n", " | ")
	}
	// Área: todos; o líder da célula só pelas células ativas do login ativo, na ordem;
	// a casa só nas células ativas
	if got, want := consultar(Scope{Todos: true}), "1:Alfa,Beta:Beta | 2:-:Alfa | 3:-:- | 4:-:- | 5:-:-"; got != want {
		t.Fatalf("área: %q", got)
	}
	// Setor SA: os membros do setor e o líder de setor; nunca o líder de área nem outro setor
	if got, want := consultar(Scope{Setores: []string{"SA"}}), "1:Alfa,Beta:Beta | 2:-:Alfa | 3:-:-"; got != want {
		t.Fatalf("setor: %q", got)
	}
}
