package api

import (
	"context"
	"encoding/json"
	"strings"
	"sync"
	"time"

	"vec/backend/internal/store"
)

type listasCache struct {
	mu      sync.Mutex
	at      time.Time
	setores []string
	celulas []string
}

// listas devolve setores e células, guardando o resultado por 1 minuto
// para não consultar o banco a cada envio do formulário.
func (s *Server) listas(ctx context.Context) ([]string, []string, error) {
	c := &s.cache
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.at.IsZero() && time.Since(c.at) < time.Minute {
		return c.setores, c.celulas, nil
	}
	set, cel, err := s.Store.Listas(ctx)
	if err != nil {
		return nil, nil, err
	}
	c.at, c.setores, c.celulas = time.Now(), set, cel
	return set, cel, nil
}

// canonico devolve o nome como está na lista (maiúsculas/acentos corretos).
func canonico(valor string, lista []string) (string, bool) {
	if valor == "" {
		return "", true
	}
	for _, item := range lista {
		if strings.EqualFold(item, valor) {
			return item, true
		}
	}
	return "", false
}

// formulario recebe o envio público do formulário de membro.
func (s *Server) formulario(ctx context.Context, body []byte) reply {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return failReply("requisicao_invalida")
	}
	v := make(map[string]string, len(store.Campos))
	for _, c := range store.Campos {
		var texto string
		if bruto, ok := raw[c.Chave]; ok {
			if err := json.Unmarshal(bruto, &texto); err != nil {
				return failReply("dados_invalidos")
			}
		}
		switch c.Chave {
		case "sugestao":
			v[c.Chave] = cleanText(texto, 2000)
		case "nascimento":
			v[c.Chave] = cleanLine(texto, 10)
		default:
			v[c.Chave] = cleanLine(texto, 200)
		}
		if c.SN && v[c.Chave] != "" && v[c.Chave] != "S" && v[c.Chave] != "N" {
			return failReply("dados_invalidos")
		}
	}

	if len([]rune(v["nome"])) < 3 {
		return failReply("nome_invalido")
	}
	nasc, err := time.Parse("2006-01-02", v["nascimento"])
	if err != nil || nasc.Before(time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)) ||
		nasc.After(s.Now().In(fusoBR).Add(24*time.Hour)) {
		return failReply("nascimento_invalido")
	}

	setores, celulas, err := s.listas(ctx)
	if err != nil {
		return s.internal("formulario", err)
	}
	if len(setores) > 0 {
		c, ok := canonico(v["setor"], setores)
		if !ok {
			return failReply("dados_invalidos")
		}
		v["setor"] = c
	}
	if len(celulas) > 0 {
		c, ok := canonico(v["celula"], celulas)
		if !ok {
			return failReply("dados_invalidos")
		}
		v["celula"] = c
	}
	if v["serveMinisterio"] != "S" {
		v["ministerioNome"] = ""
	}

	err = s.Store.InsertResposta(ctx, store.Resposta{
		CriadoEm: s.Now().UTC().Format(time.RFC3339),
		V:        v,
	})
	if err != nil {
		return s.internal("formulario", err)
	}
	return okReply(nil)
}
