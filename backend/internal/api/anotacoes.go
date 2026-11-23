package api

import (
	"context"
	"time"

	"vec/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Anotações de acompanhamento
// ---------------------------------------------------------------------------
// Quem enxerga a pessoa lê e escreve anotações sobre ela; cada um apaga só as suas.

const maxAnotacao = 2000

func (s *Server) anotacoes(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("anotacoes", err)
	}
	if code != "" {
		return failReply(code)
	}
	return s.listaAnotacoes(ctx, a, req.Linha)
}

func (s *Server) anotacaoSalvar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("anotacao_salvar", err)
	}
	if code != "" {
		return failReply(code)
	}
	texto := cleanText(req.Texto, maxAnotacao)
	tipo, quando, lembrar, code := contatoValido(req.Tipo, req.ContatoEm, req.LembrarEm, s.Now())
	if code != "" || req.Linha <= 0 {
		return failReply(firstNonEmpty(code, "dados_invalidos"))
	}
	if texto == "" && tipo == "nota" { // a anotação simples precisa de texto; um contato não
		return failReply("texto_vazio")
	}
	ok, err := s.Store.AddAnotacao(ctx, a.scope, req.Linha, store.Anotacao{Autor: a.user.Usuario, AutorNome: nomeOuUsuario(a.user), Texto: texto,
		Tipo: tipo, ContatoEm: quando, LembrarEm: lembrar}, s.Now())
	if err != nil {
		return s.internal("anotacao_salvar", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	return s.listaAnotacoes(ctx, a, req.Linha)
}

func (s *Server) anotacaoExcluir(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("anotacao_excluir", err)
	}
	if code != "" {
		return failReply(code)
	}
	ok, err := s.Store.DeleteAnotacao(ctx, a.scope, req.ID, a.user.Usuario)
	if err != nil {
		return s.internal("anotacao_excluir", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	return s.listaAnotacoes(ctx, a, req.Linha)
}

var tiposContato = map[string]bool{"": true, "nota": true, "ligacao": true, "whatsapp": true, "visita": true, "encontro": true}

// contatoValido confere o tipo, o dia do contato (até um ano atrás, não no futuro) e o
// lembrete (depois de hoje, até um ano). Datas em AAAA-MM-DD; vazio = não informado.
func contatoValido(tipo, quando, lembrar string, now time.Time) (string, string, string, string) {
	if !tiposContato[tipo] {
		return "", "", "", "dados_invalidos"
	}
	if tipo == "" {
		tipo = "nota"
	}
	hoje := now.In(fusoBR).Format("2006-01-02")
	limite := func(dias int) string { return now.In(fusoBR).AddDate(0, 0, dias).Format("2006-01-02") }
	if quando != "" {
		if _, err := time.Parse("2006-01-02", quando); err != nil || quando > hoje || quando < limite(-366) {
			return "", "", "", "data_invalida"
		}
	}
	if lembrar != "" {
		if _, err := time.Parse("2006-01-02", lembrar); err != nil || lembrar <= hoje || lembrar > limite(366) {
			return "", "", "", "data_invalida"
		}
	}
	return tipo, quando, lembrar, ""
}

func firstNonEmpty(a, b string) string {
	if a != "" {
		return a
	}
	return b
}

func (s *Server) listaAnotacoes(ctx context.Context, a *session, linha int64) reply {
	as, ok, err := s.Store.ListAnotacoes(ctx, a.scope, linha)
	if err != nil {
		return s.internal("anotacoes", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	out := make([]map[string]any, 0, len(as))
	for _, n := range as {
		out = append(out, map[string]any{"id": n.ID, "autor": n.Autor, "autorNome": n.AutorNome, "em": fmtLocal(n.CriadoEm), "texto": n.Texto, "minha": n.Autor == a.user.Usuario,
			"tipo": n.Tipo, "contatoEm": n.ContatoEm, "lembrarEm": n.LembrarEm})
	}
	return okReply(map[string]any{"anotacoes": out})
}
