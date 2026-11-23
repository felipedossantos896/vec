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

// Roda as migrations e o SQL do retrato num SQLite de verdade e confere as contagens
// com as mesmas regras do painel.
func TestRetratoNoSQLite(t *testing.T) {
	bin, err := exec.LookPath("sqlite3")
	if err != nil {
		t.Skip("sqlite3 não disponível")
	}
	arq := filepath.Join(t.TempDir(), "r.db")
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
INSERT INTO respostas (id, criado_em, nome, setor, celula, cafe_pastor, estacao_dna, acomp_inicial, nova_criatura, batismo, batismo_espirito, discipulador) VALUES
 (1, '2026-01-01T00:00:00Z', 'P1', 'A', 'X', 'S','S','S','S','S','S', 'Ana'),
 (2, '2026-01-01T00:00:00Z', 'P2', 'A', 'X', 'S','N','','','','', ''),
 (3, '2026-01-01T00:00:00Z', 'P3', 'A', 'Y', '','','','','','', ''),
 (4, '2026-01-01T00:00:00Z', 'P4', 'B', 'Z', '','','','','','', '   '),
 (5, '2026-01-01T00:00:00Z', 'P5', 'B', 'Z', 'S','S','S','S','S','S', 'Bia'),
 (6, '2026-01-01T00:00:00Z', 'P6', '', '', '','','','','','', ''),
 (7, '2026-01-01T00:00:00Z', 'Líder', 'A', '', 'S','S','S','S','S','S', '');
UPDATE respostas SET papel = 'lider_setor' WHERE id = 7;
UPDATE respostas SET excluido_em = '2026-11-01T00:00:00Z' WHERE id = 5;
INSERT INTO anotacoes (resposta_id, autor, autor_nome, criado_em, texto, tipo, contato_em, lembrar_em) VALUES
 (1, 'u', 'U', '2026-11-13T10:00:00Z', '', 'ligacao', '2026-11-13', ''),
 (3, 'u', 'U', '2026-08-01T10:00:00Z', '', 'visita', '2026-08-01', '2026-12-01'),
 (4, 'u', 'U', '2026-08-01T10:00:00Z', 'x', 'nota', '', ''),
 (6, 'u', 'U', '2026-11-01T10:00:00Z', '', 'whatsapp', '2026-11-01', '2026-11-14');`)
	gravar := func(criado string) {
		// Aspas duplas por fora: sem elas o sqlite3 calcula 2026-11 como número.
		rodar(".parameter set ?1 \"'2026-11'\"\n.parameter set ?2 \"'2026-11-14'\"\n.parameter set ?3 \"'2026-09-15T12:00:00Z'\"\n.parameter set ?4 \"'" + criado + "'\"\n" + SQLRetrato + ";")
	}
	gravar("2026-11-14T12:00:00Z")
	ler := func() string {
		return rodar(`SELECT group_concat(escopo_tipo || ':' || escopo_nome || ':' || indicador || '=' || valor, ' ') FROM (SELECT * FROM retrato_mensal WHERE mes = '2026-11' ORDER BY escopo_tipo, escopo_nome, indicador);`)
	}
	// P5 excluída não conta; o líder de setor (7) também não (Spec 013). Cuidado: P2 (nunca), P4 (90 dias, sem lembrete) e P6 (lembrete
	// vence hoje); P3 tem contato antigo, mas o lembrete ainda não venceu; P1 falou ontem.
	want := "area::com_discipulador=1 area::jornada_completa=1 area::pessoas=5 area::precisam_cuidado=3 " +
		"celula:X:com_discipulador=1 celula:X:jornada_completa=1 celula:X:pessoas=2 celula:X:precisam_cuidado=1 " +
		"celula:Y:com_discipulador=0 celula:Y:jornada_completa=0 celula:Y:pessoas=1 celula:Y:precisam_cuidado=0 " +
		"celula:Z:com_discipulador=0 celula:Z:jornada_completa=0 celula:Z:pessoas=1 celula:Z:precisam_cuidado=1 " +
		"setor:A:com_discipulador=1 setor:A:jornada_completa=1 setor:A:pessoas=3 setor:A:precisam_cuidado=1 " +
		"setor:B:com_discipulador=0 setor:B:jornada_completa=0 setor:B:pessoas=1 setor:B:precisam_cuidado=1"
	if got := ler(); got != want {
		t.Fatalf("retrato:\n got %s\nwant %s", got, want)
	}
	// O primeiro retrato do mês vale: gravar de novo não muda nada
	rodar(`UPDATE respostas SET excluido_em = '2026-11-20T00:00:00Z' WHERE id = 1;`)
	gravar("2026-11-20T12:00:00Z")
	if got := ler(); got != want {
		t.Fatalf("retrato regravado:\n got %s", got)
	}
	if got := rodar(`SELECT COUNT(DISTINCT criado_em) FROM retrato_mensal;`); got != "1" {
		t.Fatalf("criado_em mudou: %s", got)
	}
	// A tabela recusa indicador desconhecido e valor negativo
	for _, q := range []string{
		`INSERT INTO retrato_mensal VALUES ('2026-11', 'area', '', 'nomes', 1, 'x');`,
		`INSERT INTO retrato_mensal VALUES ('2026-12', 'area', '', 'pessoas', -1, 'x');`,
		`INSERT INTO retrato_mensal VALUES ('2026-13x', 'area', '', 'pessoas', 1, 'x');`,
	} {
		c := exec.Command(bin, arq, q)
		if b, err := c.CombinedOutput(); err == nil && !strings.Contains(string(b), "CHECK") {
			t.Fatalf("aceitou: %s", q)
		}
	}
}

func TestListRetratosLimitaAoEscopo(t *testing.T) {
	db := &recordingDB{}
	st := &Store{DB: db}
	if _, err := st.ListRetratos(context.Background(), Scope{Todos: true}, "2025-12"); err != nil {
		t.Fatal(err)
	}
	if q := db.doCalls[0][0].SQL; !strings.Contains(q, "mes >= ? AND (1 = 1)") {
		t.Fatalf("área: %s", q)
	}
	db.doCalls = nil
	st.ListRetratos(context.Background(), Scope{Setores: []string{"A"}}, "2025-12")
	a := db.doCalls[0][0].Args
	if len(a) != 6 || a[0] != "2025-12" || a[2] != "A" || a[5] != "A" {
		t.Fatalf("setor: %#v", a)
	}
	db.doCalls = nil
	if l, _ := st.ListRetratos(context.Background(), Scope{Discipulador: 9}, "2025-12"); len(l) != 0 || len(db.doCalls) != 0 {
		t.Fatal("só discipulador não lê retrato")
	}
}

func TestPapelNoSQLite(t *testing.T) {
	bin, err := exec.LookPath("sqlite3")
	if err != nil {
		t.Skip("sqlite3 não disponível")
	}
	arq := filepath.Join(t.TempDir(), "p.db")
	nomes, _ := fs.Glob(migrations.FS, "*.sql")
	sort.Strings(nomes)
	var todas strings.Builder
	for _, n := range nomes {
		b, _ := fs.ReadFile(migrations.FS, n)
		todas.Write(b)
		todas.WriteString("\n")
	}
	todas.WriteString(`INSERT INTO respostas (id, criado_em, nome) VALUES (1, 'x', 'Ana');
SELECT papel FROM respostas WHERE id = 1;`)
	c := exec.Command(bin, arq)
	c.Stdin = strings.NewReader(todas.String())
	b, err := c.CombinedOutput()
	if err != nil || strings.TrimSpace(string(b)) != "membro" {
		t.Fatalf("padrão: %v %s", err, b)
	}
	c = exec.Command(bin, arq, `INSERT INTO respostas (criado_em, nome, papel) VALUES ('x', 'Eva', 'pastor');`)
	if b, err := c.CombinedOutput(); err == nil && !strings.Contains(string(b), "CHECK") {
		t.Fatal("papel desconhecido aceito")
	}
}

func TestDefinirPapelLimpaCelula(t *testing.T) {
	db := &recordingDB{}
	st := &Store{DB: db}
	_ = st.DefinirPapel(context.Background(), 7, "lider_setor", "A")
	_ = st.DefinirPapel(context.Background(), 8, "lider_area", "")
	_ = st.DefinirPapel(context.Background(), 9, "membro", "")
	q := func(i int) string { return db.doCalls[i][0].SQL }
	if !strings.Contains(q(0), "celula = '', setor = ?") || db.doCalls[0][0].Args[0] != "A" ||
		!strings.Contains(q(1), "celula = '', setor = ''") || strings.Contains(q(2), "celula") {
		t.Fatalf("papel: %s | %s | %s", q(0), q(1), q(2))
	}
}
