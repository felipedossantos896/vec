package api

import (
	"context"
	"strings"
	"unicode"
)

// erroCliente registra no log um erro de JavaScript do painel, para a equipe achar
// defeitos que só aparecem com os dados reais sem pedir nada ao líder. Grava só o tipo,
// o local (arquivo:linha) e a mensagem técnica, curtos e numa linha; nunca o usuário,
// o cadastro ou o conteúdo da tela.
func (s *Server) erroCliente(ctx context.Context, req adminReq) reply {
	_, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("erro_cliente", err)
	}
	if code != "" {
		return failReply(code)
	}
	s.Log.Warn("erro no painel", "tipo", textoLog(req.Tipo, 40), "onde", textoLog(req.Onde, 400), "erro", textoLog(req.Texto, 300))
	return okReply(nil)
}

// textoLog deixa o texto numa linha só, sem caracteres de controle, e corta no limite.
func textoLog(v string, max int) string {
	v = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return ' '
		}
		return r
	}, strings.TrimSpace(v))
	if r := []rune(v); len(r) > max {
		return string(r[:max]) + "…"
	}
	return v
}
