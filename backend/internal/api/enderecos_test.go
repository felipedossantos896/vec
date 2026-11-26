package api

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"

	"vec/backend/internal/store"
)

// Dados fictícios: nenhum endereço real em testes (Spec 002).
func enderecoValido() *enderecoIn {
	return &enderecoIn{CEP: "60.000-000", Logradouro: "Rua Exemplo", Numero: "S/N",
		Complemento: "Casa B", Bairro: "Centro", Cidade: "Fortaleza", UF: "ce"}
}

var linhaEndereco = []any{"60000000", "Rua Exemplo", "s/n", "Casa B", "Centro", "Fortaleza", "CE",
	"2026-11-14T12:00:00Z", "lider", "2026-11-14T12:00:00Z", "lider"}

func TestEnderecoSalvarNormalizaGravaNoEscopoEDevolve(t *testing.T) {
	s, db, token := painelServer(t, 1)
	db.endereco = linhaEndereco
	var log bytes.Buffer
	s.Log = slog.New(slog.NewTextHandler(&log, nil))
	rep := s.enderecoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Endereco: enderecoValido(), Consentimento: true})
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
	want := []any{"60000000", "Rua Exemplo", "s/n", "Casa B", "Centro", "Fortaleza", "CE"}
	for i, w := range want {
		if st.Args[i] != w {
			t.Errorf("campo %d = %#v, queria %#v", i, st.Args[i], w)
		}
	}
	if st.Args[8] != "lider" || st.Args[10] != "lider" {
		t.Errorf("consentimento/autor = %#v / %#v", st.Args[8], st.Args[10])
	}
	e, _ := rep.body["endereco"].(map[string]any)
	if e["cep"] != "60000000" || e["consentimentoPor"] != "lider" {
		t.Errorf("endereço devolvido = %#v", rep.body["endereco"])
	}
	for _, segredo := range []string{"Rua Exemplo", "60000000", "Centro", "Casa B"} {
		if strings.Contains(log.String(), segredo) {
			t.Errorf("log contém dado do endereço (%q): %s", segredo, log.String())
		}
	}
}

func TestEnderecoSalvarExigeConsentimentoEValida(t *testing.T) {
	s, db, token := painelServer(t, 1)
	muda := func(f func(*enderecoIn)) *enderecoIn { e := enderecoValido(); f(e); return e }
	casos := []struct {
		nome          string
		end           *enderecoIn
		consentimento bool
		erro          string
	}{
		{"sem consentimento", enderecoValido(), false, "consentimento_endereco"},
		{"sem endereço", nil, true, "dados_invalidos"},
		{"CEP curto", muda(func(e *enderecoIn) { e.CEP = "6000000" }), true, "cep_invalido"},
		{"CEP com letra", muda(func(e *enderecoIn) { e.CEP = "6000000a" }), true, "cep_invalido"},
		{"UF inexistente", muda(func(e *enderecoIn) { e.UF = "XX" }), true, "uf_invalida"},
		{"sem logradouro", muda(func(e *enderecoIn) { e.Logradouro = "  " }), true, "endereco_incompleto"},
		{"sem número", muda(func(e *enderecoIn) { e.Numero = "" }), true, "endereco_incompleto"},
		{"sem bairro", muda(func(e *enderecoIn) { e.Bairro = "" }), true, "endereco_incompleto"},
		{"sem cidade", muda(func(e *enderecoIn) { e.Cidade = "" }), true, "endereco_incompleto"},
		{"logradouro longo", muda(func(e *enderecoIn) { e.Logradouro = strings.Repeat("a", maxLogradouro+1) }), true, "dados_invalidos"},
		{"número longo", muda(func(e *enderecoIn) { e.Numero = strings.Repeat("1", maxNumero+1) }), true, "dados_invalidos"},
	}
	for _, c := range casos {
		rep := s.enderecoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Endereco: c.end, Consentimento: c.consentimento})
		if rep.body["erro"] != c.erro {
			t.Errorf("%s: erro = %v, queria %s", c.nome, rep.body["erro"], c.erro)
		}
	}
	if len(db.escritas) != 0 {
		t.Fatalf("gravou endereço inválido: %#v", db.escritas)
	}
}

func TestEnderecoForaDoEscopoEhNaoEncontrado(t *testing.T) {
	s, db, token := painelServer(t, 0) // nenhum cadastro visível no escopo
	db.endereco = linhaEndereco
	ctx := context.Background()
	reqs := map[string]reply{
		"ler":     s.enderecoLer(ctx, adminReq{Token: token, Linha: 7}),
		"salvar":  s.enderecoSalvar(ctx, adminReq{Token: token, Linha: 7, Endereco: enderecoValido(), Consentimento: true}),
		"excluir": s.enderecoExcluir(ctx, adminReq{Token: token, Linha: 7}),
	}
	for nome, rep := range reqs {
		if rep.body["erro"] != "nao_encontrado" {
			t.Errorf("%s: erro = %v, queria nao_encontrado", nome, rep.body["erro"])
		}
		if _, vazou := rep.body["endereco"]; vazou {
			t.Errorf("%s: devolveu endereço fora do escopo", nome)
		}
	}
}

func TestEnderecoLerSemEnderecoEExcluir(t *testing.T) {
	s, db, token := painelServer(t, 1)
	ctx := context.Background()
	rep := s.enderecoLer(ctx, adminReq{Token: token, Linha: 7})
	if rep.body["ok"] != true || rep.body["endereco"] != nil {
		t.Fatalf("sem endereço: %#v", rep.body)
	}
	rep = s.enderecoExcluir(ctx, adminReq{Token: token, Linha: 7})
	if rep.body["ok"] != true || len(db.escritas) != 1 || !strings.HasPrefix(db.escritas[0].SQL, "DELETE FROM enderecos") {
		t.Fatalf("remoção: %#v %#v", rep.body, db.escritas)
	}
	if rep := s.enderecoLer(ctx, adminReq{Token: token}); rep.body["erro"] != "dados_invalidos" {
		t.Errorf("sem linha: %v", rep.body["erro"])
	}
}

// O endereço não pode vazar para a lista de pessoas nem para o CSV, que são
// montados a partir de store.Campos.
func TestEnderecoForaDaListaEDoCSV(t *testing.T) {
	proibidos := []string{"cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf", "endereco"}
	for _, c := range store.Campos {
		for _, p := range proibidos {
			if strings.EqualFold(c.Chave, p) || strings.EqualFold(c.Coluna, p) {
				t.Errorf("campo de endereço %q em store.Campos", c.Chave)
			}
		}
	}
}

func TestPinoEnderecoExigeEscopoConsentimentoERevisao(t *testing.T) {
	ctx := context.Background()
	const revisao = "2026-11-14T12:00:00Z"
	lat, lng := -3.73123, -38.49789
	pino := &store.PinoEndereco{Lat: &lat, Lng: &lng, Revisao: revisao}
	s, db, token := painelServer(t, 1)
	db.pinoEndereco = []any{lat, lng, "manual", revisao}
	req := adminReq{Token: token, Linha: 7}
	rep := s.enderecoPino(ctx, req)
	recebido, ok := rep.body["pinoEndereco"].(*store.PinoEndereco)
	if !ok || recebido.Lat == nil || *recebido.Lat != lat || recebido.Precisao != "manual" ||
		len(db.leituras) != 1 || !strings.Contains(db.leituras[0].SQL, "excluido_em IS NULL") {
		t.Fatal("o editor deve retornar o ponto com escopo no SQL")
	}
	req.PinoEndereco = pino
	if s.enderecoPino(ctx, req).body["erro"] != "consentimento_endereco" || len(db.escritas) != 0 {
		t.Fatal("não deve salvar sem consentimento")
	}
	req.Consentimento = true
	if s.enderecoPino(ctx, req).body["ok"] != true || len(db.escritas) != 1 ||
		!strings.Contains(db.escritas[0].SQL, "atualizado_em = ? AND resposta_id IN") {
		t.Fatal("a gravação manual deve conferir revisão e escopo")
	}
	db.afetadas = 0
	if s.enderecoPino(ctx, req).body["erro"] != "pino_desatualizado" {
		t.Fatal("não deve salvar pino desatualizado ou fora do escopo")
	}
	req.PinoEndereco = nil
	if s.enderecoPino(ctx, req).body["erro"] != "nao_encontrado" {
		t.Fatal("não deve ler ponto fora do escopo")
	}
}
