package api

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
)

// Dados fictícios (Spec 004).
func anfitriaoValido() *anfitriaoIn {
	return &anfitriaoIn{Capacidade: 12, Dias: []string{"qui", "ter", "qui"}, Observacao: "  Depois das 19h  "}
}

var linhaAnfitriao = []any{int64(12), "ter,qui", "Depois das 19h", "2026-11-21T12:00:00Z", "lider"}

func TestAnfitriaoSalvarNormalizaGravaNoEscopoEDevolve(t *testing.T) {
	s, db, token := painelServer(t, 1)
	db.anfitriao = linhaAnfitriao
	var log bytes.Buffer
	s.Log = slog.New(slog.NewTextHandler(&log, nil))
	rep := s.anfitriaoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Anfitriao: anfitriaoValido(), Confirmacao: true})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if len(db.escritas) != 1 {
		t.Fatalf("escritas = %d", len(db.escritas))
	}
	st := db.escritas[0]
	if !strings.Contains(st.SQL, "excluido_em IS NULL AND (celula IN (?))") {
		t.Fatalf("gravação sem limite de escopo: %s", st.SQL)
	}
	// Dias sem repetição e na ordem da semana; observação aparada; autor de quem salva.
	want := []any{int64(12), "ter,qui", "Depois das 19h"}
	for i, w := range want {
		if st.Args[i] != w {
			t.Errorf("campo %d = %#v, queria %#v", i, st.Args[i], w)
		}
	}
	if st.Args[4] != "lider" || st.Args[5] != int64(7) {
		t.Errorf("autor/linha = %#v / %#v", st.Args[4], st.Args[5])
	}
	a, _ := rep.body["anfitriao"].(map[string]any)
	if a["capacidade"] != 12 || a["confirmadoPor"] != "lider" || strings.Join(a["dias"].([]string), ",") != "ter,qui" {
		t.Errorf("devolvido = %#v", rep.body["anfitriao"])
	}
	if strings.Contains(log.String(), "19h") {
		t.Errorf("log contém a observação: %s", log.String())
	}
}

func TestAnfitriaoSalvarExigeConfirmacaoEValida(t *testing.T) {
	s, db, token := painelServer(t, 1)
	muda := func(f func(*anfitriaoIn)) *anfitriaoIn { a := anfitriaoValido(); f(a); return a }
	casos := []struct {
		nome        string
		in          *anfitriaoIn
		confirmacao bool
		erro        string
	}{
		{"sem confirmação", anfitriaoValido(), false, "confirmacao_anfitriao"},
		{"sem dados", nil, true, "dados_invalidos"},
		{"capacidade 1", muda(func(a *anfitriaoIn) { a.Capacidade = 1 }), true, "capacidade_invalida"},
		{"capacidade 51", muda(func(a *anfitriaoIn) { a.Capacidade = 51 }), true, "capacidade_invalida"},
		{"sem dias", muda(func(a *anfitriaoIn) { a.Dias = nil }), true, "dias_invalidos"},
		{"dia inválido", muda(func(a *anfitriaoIn) { a.Dias = []string{"ter", "Sábado"} }), true, "dias_invalidos"},
		{"observação longa", muda(func(a *anfitriaoIn) { a.Observacao = strings.Repeat("é", maxObservacao+1) }), true, "dados_invalidos"},
	}
	for _, c := range casos {
		rep := s.anfitriaoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Anfitriao: c.in, Confirmacao: c.confirmacao})
		if rep.body["erro"] != c.erro {
			t.Errorf("%s: erro = %v, queria %s", c.nome, rep.body["erro"], c.erro)
		}
	}
	if len(db.escritas) != 0 {
		t.Fatalf("gravou confirmação inválida: %#v", db.escritas)
	}
	// Limites aceitos: 2, 50 e observação com exatamente 200 caracteres.
	for _, a := range []*anfitriaoIn{
		muda(func(a *anfitriaoIn) { a.Capacidade = 2 }),
		muda(func(a *anfitriaoIn) { a.Capacidade = 50; a.Observacao = strings.Repeat("é", maxObservacao) }),
	} {
		if rep := s.anfitriaoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Anfitriao: a, Confirmacao: true}); rep.body["ok"] != true {
			t.Errorf("limite recusado: %#v -> %#v", a, rep.body)
		}
	}
}

func TestAnfitriaoForaDoEscopoEhNaoEncontrado(t *testing.T) {
	s, db, token := painelServer(t, 0) // nenhum cadastro visível no escopo
	db.anfitriao = linhaAnfitriao
	ctx := context.Background()
	reqs := map[string]reply{
		"ler":     s.anfitriaoLer(ctx, adminReq{Token: token, Linha: 7}),
		"salvar":  s.anfitriaoSalvar(ctx, adminReq{Token: token, Linha: 7, Anfitriao: anfitriaoValido(), Confirmacao: true}),
		"excluir": s.anfitriaoExcluir(ctx, adminReq{Token: token, Linha: 7}),
	}
	for nome, rep := range reqs {
		if rep.body["erro"] != "nao_encontrado" {
			t.Errorf("%s: erro = %v, queria nao_encontrado", nome, rep.body["erro"])
		}
		if _, vazou := rep.body["anfitriao"]; vazou {
			t.Errorf("%s: devolveu confirmação fora do escopo", nome)
		}
	}
}

func TestAnfitriaoLerSemConfirmacaoEExcluir(t *testing.T) {
	s, db, token := painelServer(t, 1)
	ctx := context.Background()
	rep := s.anfitriaoLer(ctx, adminReq{Token: token, Linha: 7})
	if rep.body["ok"] != true || rep.body["anfitriao"] != nil {
		t.Fatalf("sem confirmação: %#v", rep.body)
	}
	rep = s.anfitriaoExcluir(ctx, adminReq{Token: token, Linha: 7})
	if rep.body["ok"] != true || len(db.escritas) != 1 || !strings.HasPrefix(db.escritas[0].SQL, "DELETE FROM anfitrioes") {
		t.Fatalf("remoção: %#v %#v", rep.body, db.escritas)
	}
	if rep := s.anfitriaoLer(ctx, adminReq{Token: token}); rep.body["erro"] != "dados_invalidos" {
		t.Errorf("sem linha: %v", rep.body["erro"])
	}
	if rep := s.anfitriaoLer(ctx, adminReq{Token: "invalido", Linha: 7}); rep.body["ok"] == true {
		t.Errorf("sem sessão deveria falhar: %#v", rep.body)
	}
}
