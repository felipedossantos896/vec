package api

import (
	"context"
	"encoding/json"
	"net/http"
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
	setorDe map[string]string
}

// listas devolve setores, células e o setor de cada célula, guardando o resultado
// por 1 minuto para não consultar o banco a cada envio do formulário.
func (s *Server) listas(ctx context.Context) ([]string, []string, map[string]string, error) {
	c := &s.cache
	c.mu.Lock()
	defer c.mu.Unlock()
	if !c.at.IsZero() && time.Since(c.at) < time.Minute {
		return c.setores, c.celulas, c.setorDe, nil
	}
	set, cel, setorDe, err := s.Store.Listas(ctx)
	if err != nil {
		return nil, nil, nil, err
	}
	c.at, c.setores, c.celulas, c.setorDe = time.Now(), set, cel, setorDe
	return set, cel, setorDe, nil
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

// validar limpa e confere os campos de um cadastro, vindos do formulário público ou da
// edição no painel. O setor é sempre o da célula escolhida, quando a célula tem setor.
// Devolve os valores prontos para gravar, ou o código do erro de negócio.
func (s *Server) validar(ctx context.Context, raw map[string]json.RawMessage, now time.Time, exigeNascimento bool) (map[string]string, string, error) {
	v := make(map[string]string, len(store.Campos))
	for _, c := range store.Campos {
		var texto string
		if bruto, ok := raw[c.Chave]; ok {
			if err := json.Unmarshal(bruto, &texto); err != nil {
				return nil, "dados_invalidos", nil
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
			return nil, "dados_invalidos", nil
		}
	}

	if len([]rune(v["nome"])) < 3 {
		return nil, "nome_invalido", nil
	}
	if exigeNascimento || v["nascimento"] != "" {
		nasc, err := time.Parse("2006-01-02", v["nascimento"])
		hoje := now.In(fusoBR)
		dataHoje := time.Date(hoje.Year(), hoje.Month(), hoje.Day(), 0, 0, 0, 0, time.UTC)
		if err != nil || nasc.Before(time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC)) || nasc.After(dataHoje) {
			return nil, "nascimento_invalido", nil
		}
	}

	setores, celulas, setorDe, err := s.listas(ctx)
	if err != nil {
		return nil, "", err
	}
	if len(setores) > 0 {
		c, ok := canonico(v["setor"], setores)
		if !ok {
			return nil, "dados_invalidos", nil
		}
		v["setor"] = c
	}
	if len(celulas) > 0 {
		c, ok := canonico(v["celula"], celulas)
		if !ok {
			return nil, "dados_invalidos", nil
		}
		v["celula"] = c
	}
	if setor := setorDe[strings.ToLower(v["celula"])]; setor != "" {
		v["setor"] = setor
	}
	if v["serveMinisterio"] != "S" {
		v["ministerioNome"] = ""
	}
	tel, ok := telefoneBR(v["telefone"])
	if !ok {
		return nil, "telefone_invalido", nil
	}
	v["telefone"] = tel
	return v, "", nil
}

// formulario recebe o envio público do formulário de membro.
func (s *Server) formulario(ctx context.Context, body []byte, ip string) reply {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return failReply("requisicao_invalida")
	}
	now := s.Now()
	requestID := ""
	if rawID, ok := raw["_requestId"]; ok {
		if err := json.Unmarshal(rawID, &requestID); err != nil {
			return failReply("dados_invalidos")
		}
		requestID = strings.ToLower(requestID)
		if !validRequestID(requestID) {
			return failReply("dados_invalidos")
		}
	}
	// Proteção contra robôs (Spec 007), antes de validar e gravar.
	if !s.envios.permitir(ip, requestID, now) {
		s.Log.Warn("envio recusado", "motivo", "muitos_envios", "rede", ipParcial(ip))
		return reply{http.StatusTooManyRequests, map[string]any{"ok": false, "erro": "muitos_envios"}}
	}
	if texto(raw, "_site") != "" {
		s.Log.Warn("envio recusado", "motivo", "armadilha", "rede", ipParcial(ip))
		return failReply("envio_recusado")
	}
	if code := s.conferirMarca(texto(raw, "_marca"), now); code != "" {
		s.Log.Warn("envio recusado", "motivo", code, "rede", ipParcial(ip))
		return failReply(code)
	}
	// Sem a autorização de uso dos dados (LGPD), o envio não é gravado.
	var aceite string
	if bruto, ok := raw["consentimento"]; !ok || json.Unmarshal(bruto, &aceite) != nil || aceite != "S" {
		return failReply("consentimento")
	}
	v, code, err := s.validar(ctx, raw, now, true)
	if err != nil {
		return s.internal("formulario", err)
	}
	if code != "" {
		return failReply(code)
	}

	if store.BatismoSemRequisitos(v) {
		if requestID != "" {
			enviado, err := s.Store.EnvioRegistrado(ctx, requestID)
			if err != nil {
				return s.internal("formulario", err)
			}
			if enviado {
				return okReply(nil)
			}
		}
		return failReply(erroBatismo(v))
	}
	if requestID == "" {
		requestID, err = newRequestID()
		if err != nil {
			return s.internal("formulario", err)
		}
	}

	err = s.Store.InsertResposta(ctx, store.Resposta{
		CriadoEm:      now.UTC().Format(time.RFC3339),
		Consentimento: now.UTC().Format(time.RFC3339),
		RequestID:     requestID,
		V:             v,
	})
	if err != nil {
		return s.internal("formulario", err)
	}
	return okReply(nil)
}

func erroBatismo(v map[string]string) string {
	switch {
	case v["cafePastor"] == "S":
		return "batismo_nova_criatura"
	case v["novaCriatura"] == "S":
		return "batismo_cafe_pastor"
	default:
		return "batismo_requisitos"
	}
}

// telefoneBR deixa só os dígitos de um telefone brasileiro com DDD (10 ou 11 dígitos),
// sem o código do país. Vazio é aceito: o campo é opcional.
func telefoneBR(s string) (string, bool) {
	var b strings.Builder
	for _, r := range s {
		if r >= '0' && r <= '9' {
			b.WriteRune(r)
		}
	}
	d := b.String()
	if (len(d) == 12 || len(d) == 13) && strings.HasPrefix(d, "55") {
		d = d[2:]
	}
	if d == "" || ((len(d) == 10 || len(d) == 11) && d[0] != '0') {
		return d, true
	}
	return "", false
}

// texto lê um campo de texto do JSON bruto ("" se ausente ou de outro tipo).
func texto(raw map[string]json.RawMessage, chave string) string {
	var v string
	if b, ok := raw[chave]; ok {
		_ = json.Unmarshal(b, &v)
	}
	return v
}
