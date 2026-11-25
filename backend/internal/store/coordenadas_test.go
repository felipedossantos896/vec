package store

import (
	"context"
	"os/exec"
	"strings"
	"testing"
	"time"

	"vec/backend/internal/backup"
	"vec/backend/internal/turso"
)

func TestSalvarEnderecoInvalidaCoordenadaSoQuandoMudaAConsulta(t *testing.T) {
	db := &recordingDB{}
	if _, err := (&Store{DB: db}).SalvarEndereco(context.Background(), Scope{Todos: true}, 7, enderecoTeste, "lider", time.Now()); err != nil {
		t.Fatal(err)
	}
	sql := db.doCalls[0][0].SQL
	for _, col := range []string{"lat", "lng", "geo_fonte", "geo_precisao", "geo_em"} {
		if !strings.Contains(sql, col+" = COALESCE(excluded."+col+", CASE WHEN "+mesmaConsultaGeo+" THEN "+col+" END)") {
			t.Errorf("%s não é invalidada quando a consulta muda: %s", col, sql)
		}
	}
	for _, campo := range []string{"cep", "logradouro", "bairro", "cidade", "uf"} {
		if !strings.Contains(mesmaConsultaGeo, campo+" = excluded."+campo) {
			t.Errorf("mudança de %s não invalida a coordenada", campo)
		}
	}
}

func TestPontoManualNoSQLite(t *testing.T) {
	bin, err := exec.LookPath("sqlite3")
	if err != nil {
		t.Skip("sqlite3 não disponível")
	}
	now := time.Date(2026, 11, 21, 12, 0, 0, 0, time.UTC)
	ctx := context.Background()
	db := &recordingDB{}
	st := &Store{DB: db}
	e := enderecoTeste
	lat, lng := -3.731234, -38.521234
	e.Ponto = &PontoEndereco{Lat: lat, Lng: lng, Exato: true}
	versao := now.Format(time.RFC3339Nano)
	e.VersaoEsperada = &versao
	st.SalvarEndereco(ctx, Scope{Todos: true}, 7, enderecoTeste, "lider", now)
	st.SalvarEndereco(ctx, Scope{Todos: true}, 7, e, "lider", now.Add(time.Second))
	st.GravarCoordenada(ctx, 7, enderecoTeste, nil, nil, "nominatim", GeoNaoEncontrado, now.Add(2*time.Second))
	st.SalvarEndereco(ctx, Scope{Todos: true}, 7, e, "lider", now.Add(3*time.Second)) // versão obsoleta
	st.SalvarEndereco(ctx, Scope{Celulas: []string{"Outra"}}, 7, e, "lider", now.Add(4*time.Second))
	edicaoAntiga := enderecoTeste
	edicaoAntiga.Numero = "99"
	edicaoAntiga.VersaoEsperada = &versao
	st.SalvarEndereco(ctx, Scope{Todos: true}, 7, edicaoAntiga, "lider", now.Add(4*time.Second))
	st.ExcluirEndereco(ctx, Scope{Todos: true}, 7, &versao)
	st.ExcluirEndereco(ctx, Scope{Todos: true}, 7, nil)
	edicaoAntiga.VersaoEsperada = nil
	st.SalvarEndereco(ctx, Scope{Todos: true}, 7, edicaoAntiga, "lider", now.Add(4*time.Second))
	e.Ponto, e.RevogarPonto = nil, true
	versao = now.Add(time.Second).Format(time.RFC3339Nano)
	edicaoAntiga.VersaoEsperada = &versao
	st.SalvarEndereco(ctx, Scope{Todos: true}, 7, edicaoAntiga, "lider", now.Add(4*time.Second))
	st.SalvarEndereco(ctx, Scope{Todos: true}, 7, e, "lider", now.Add(5*time.Second))
	var script strings.Builder
	script.WriteString(`CREATE TABLE respostas (id INTEGER PRIMARY KEY, excluido_em TEXT, celula TEXT);
	CREATE TABLE enderecos (resposta_id INTEGER PRIMARY KEY, cep TEXT, logradouro TEXT, numero TEXT, complemento TEXT, bairro TEXT, cidade TEXT, uf TEXT, consentimento_em TEXT, consentimento_por TEXT, atualizado_em TEXT, atualizado_por TEXT, lat REAL, lng REAL, geo_fonte TEXT, geo_precisao TEXT, geo_em TEXT);
	INSERT INTO respostas VALUES (7,NULL,'Hope');`)
	for _, call := range db.doCalls {
		stmt := call[0]
		partes := strings.Split(stmt.SQL, "?")
		if len(partes) != len(stmt.Args)+1 {
			t.Fatalf("parâmetros do SQL: %d vs %d", len(partes)-1, len(stmt.Args))
		}
		for i, arg := range stmt.Args {
			lit, err := backup.Literal(arg)
			if err != nil {
				t.Fatal(err)
			}
			script.WriteString(partes[i] + lit)
		}
		script.WriteString(partes[len(partes)-1] + "; SELECT changes(),COALESCE(geo_precisao,'-'),COALESCE(lat,0) FROM enderecos;")
	}
	cmd := exec.Command(bin, "-batch", "-bail", ":memory:")
	cmd.Stdin = strings.NewReader(script.String())
	out, err := cmd.CombinedOutput()
	const esperado = "1|-|0\n1|manual|-3.731234\n0|manual|-3.731234\n0|manual|-3.731234\n0|manual|-3.731234\n0|manual|-3.731234\n0|manual|-3.731234\n0|manual|-3.731234\n0|manual|-3.731234\n0|manual|-3.731234\n1|-|0"
	if err != nil || strings.TrimSpace(string(out)) != esperado {
		t.Fatalf("SQLite: %v\n%s", err, out)
	}
}

func TestGravarCoordenadaSoSeOEnderecoAindaEOConsultado(t *testing.T) {
	db := &recordingDB{doResults: [][]*turso.Result{{{Affected: 1}}}}
	lat, lng := -3.7, -38.5
	ok, err := (&Store{DB: db}).GravarCoordenada(context.Background(), 7, enderecoTeste, &lat, &lng, "nominatim", GeoRua, time.Date(2026, 11, 21, 12, 0, 0, 0, time.UTC))
	if err != nil || !ok {
		t.Fatalf("ok=%v err=%v", ok, err)
	}
	st := db.doCalls[0][0]
	if !strings.Contains(st.SQL, "WHERE resposta_id = ? AND cep = ? AND logradouro = ? AND bairro = ? AND cidade = ? AND uf = ?") {
		t.Fatalf("gravação sem conferir o endereço consultado: %s", st.SQL)
	}
	want := []any{-3.7, -38.5, "nominatim", "rua", "2026-11-21T12:00:00Z", int64(7), "60000000", "Rua Exemplo", "Centro", "Fortaleza", "CE"}
	for i, w := range want {
		if st.Args[i] != w {
			t.Fatalf("arg %d = %#v, queria %#v", i, st.Args[i], w)
		}
	}
	// Não encontrado grava a tentativa sem coordenada
	db = &recordingDB{}
	if _, err := (&Store{DB: db}).GravarCoordenada(context.Background(), 7, enderecoTeste, nil, nil, "nominatim", GeoNaoEncontrado, time.Now()); err != nil {
		t.Fatal(err)
	}
	if db.doCalls[0][0].Args[0] != nil || db.doCalls[0][0].Args[1] != nil {
		t.Fatalf("não encontrado deve gravar lat/lng nulos: %#v", db.doCalls[0][0].Args)
	}
}

func TestPendentesGeoSoDeCadastrosAtivosSemTentativa(t *testing.T) {
	db := &recordingDB{doResults: [][]*turso.Result{{{Rows: [][]any{{int64(7), "60000000", "Rua Exemplo", "Centro", "Fortaleza", "CE"}}}}}}
	p, err := (&Store{DB: db}).PendentesGeo(context.Background(), 5)
	if err != nil || len(p) != 1 || p[0].Linha != 7 || p[0].Logradouro != "Rua Exemplo" || p[0].Numero != "" {
		t.Fatalf("pendentes = %#v, err %v", p, err)
	}
	sql := db.doCalls[0][0].SQL
	if !strings.Contains(sql, "r.excluido_em IS NULL AND e.geo_em IS NULL") || strings.Contains(sql, "numero") || strings.Contains(sql, "complemento") {
		t.Fatalf("consulta de pendentes inesperada: %s", sql)
	}
}

func TestPontosMapaUsaEscopoEDevolveASituacao(t *testing.T) {
	sc := Scope{Celulas: []string{"Hope"}}
	db := &recordingDB{doResults: [][]*turso.Result{{{Rows: [][]any{
		{int64(7), -3.7, -38.5, "rua", int64(0)},
		{int64(8), nil, nil, "nao_encontrado", int64(0)},
		{int64(9), nil, nil, nil, int64(1)},
	}}}}}
	pts, err := (&Store{DB: db}).PontosMapa(context.Background(), sc)
	if err != nil || len(pts) != 3 {
		t.Fatalf("pontos = %#v, err %v", pts, err)
	}
	if pts[0].Lat == nil || *pts[0].Lat != -3.7 || pts[0].Pendente || pts[1].Lat != nil || pts[1].Precisao != GeoNaoEncontrado || !pts[2].Pendente {
		t.Fatalf("situações lidas errado: %#v %#v %#v", pts[0], pts[1], pts[2])
	}
	cond, args, _ := escopoSQL(sc)
	st := db.doCalls[0][0]
	if !strings.Contains(st.SQL, "WHERE excluido_em IS NULL AND "+cond) || len(st.Args) != len(args) || st.Args[0] != args[0] {
		t.Fatalf("mapa sem escopo exato: %s %#v", st.SQL, st.Args)
	}
	db = &recordingDB{}
	if pts, _ := (&Store{DB: db}).PontosMapa(context.Background(), Scope{}); pts != nil || len(db.doCalls) != 0 {
		t.Fatal("escopo vazio deve negar sem consultar")
	}
}
