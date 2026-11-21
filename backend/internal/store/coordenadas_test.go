package store

import (
	"context"
	"strings"
	"testing"
	"time"

	"vec/backend/internal/turso"
)

func TestSalvarEnderecoInvalidaCoordenadaSoQuandoMudaAConsulta(t *testing.T) {
	db := &recordingDB{}
	if _, err := (&Store{DB: db}).SalvarEndereco(context.Background(), Scope{Todos: true}, 7, enderecoTeste, "lider", time.Now()); err != nil {
		t.Fatal(err)
	}
	sql := db.doCalls[0][0].SQL
	for _, col := range []string{"lat", "lng", "geo_fonte", "geo_precisao", "geo_em"} {
		if !strings.Contains(sql, col+" = CASE WHEN "+mesmaConsultaGeo+" THEN "+col+" END") {
			t.Errorf("%s não é invalidada quando a consulta muda: %s", col, sql)
		}
	}
	for _, campo := range []string{"cep", "logradouro", "bairro", "cidade", "uf"} {
		if !strings.Contains(mesmaConsultaGeo, campo+" = excluded."+campo) {
			t.Errorf("mudança de %s não invalida a coordenada", campo)
		}
	}
	for _, campo := range []string{"numero", "complemento"} {
		if strings.Contains(mesmaConsultaGeo, campo) {
			t.Errorf("%s não vai ao Nominatim e não deve invalidar a coordenada", campo)
		}
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

func TestPontosMapaUsaEscopoEIgnoraSemCoordenada(t *testing.T) {
	sc := Scope{Celulas: []string{"Hope"}}
	db := &recordingDB{doResults: [][]*turso.Result{{{Rows: [][]any{{int64(7), -3.7, -38.5, "rua"}, {int64(8), nil, nil, "nao_encontrado"}}}}}}
	pts, err := (&Store{DB: db}).PontosMapa(context.Background(), sc)
	if err != nil || len(pts) != 1 || pts[0].Linha != 7 || pts[0].Lat != -3.7 {
		t.Fatalf("pontos = %#v, err %v", pts, err)
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
