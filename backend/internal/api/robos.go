package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ---------------------------------------------------------------------------
// Proteção do formulário público contra robôs (Spec 007)
// ---------------------------------------------------------------------------
// Sem serviço externo nem cookie: campo-armadilha, marca de tempo assinada pelo
// servidor e limite de envios por IP. Toda recusa volta com um código visível
// para a pessoa; nada é descartado em silêncio.

const (
	marcaMinima    = 3 * time.Second
	marcaValidade  = 24 * time.Hour
	enviosPorIP    = 60
	janelaEnvios   = 10 * time.Minute
	limpezaEnvios  = 1000 // entradas acima das quais as janelas vencidas são apagadas
	rotuloMarcaKey = "vec/formulario-marca/v1"
)

// chaveMarca deriva da chave do servidor uma chave só para a marca, para que ela
// nunca sirva como token de sessão (e vice-versa).
func (s *Server) chaveMarca() []byte {
	m := hmac.New(sha256.New, s.Secret)
	m.Write([]byte(rotuloMarcaKey))
	return m.Sum(nil)
}

func (s *Server) assinarMarca(unix int64) string {
	m := hmac.New(sha256.New, s.chaveMarca())
	m.Write([]byte(strconv.FormatInt(unix, 10)))
	return hex.EncodeToString(m.Sum(nil))
}

// marcaFormulario é entregue à página quando ela abre: só o horário e a assinatura.
func (s *Server) marcaFormulario(now time.Time) string {
	u := now.Unix()
	return strconv.FormatInt(u, 10) + "." + s.assinarMarca(u)
}

// conferirMarca devolve "" se a marca é válida e foi emitida entre 3 s e 24 h atrás;
// senão, o código de erro para a pessoa.
func (s *Server) conferirMarca(marca string, now time.Time) string {
	unixTxt, assinatura, ok := strings.Cut(marca, ".")
	if !ok || len(marca) > 100 {
		return "envio_expirado"
	}
	unix, err := strconv.ParseInt(unixTxt, 10, 64)
	if err != nil || !hmac.Equal([]byte(assinatura), []byte(s.assinarMarca(unix))) {
		return "envio_expirado"
	}
	idade := now.Sub(time.Unix(unix, 0))
	switch {
	case idade > marcaValidade || idade < -time.Minute: // futuro além de folga de relógio
		return "envio_expirado"
	case idade < marcaMinima:
		return "envio_rapido"
	}
	return ""
}

// ---------------------------------------------------------------------------
// Limite de envios por IP
// ---------------------------------------------------------------------------

type janelaIP struct {
	inicio time.Time
	ids    map[string]bool // _requestId já contados: reenvio do mesmo cadastro não conta de novo
	n      int
}

type limiteEnvios struct {
	mu  sync.Mutex
	ips map[string]*janelaIP
}

// shortcut: limite local a este processo, como o do login; use um limite
// compartilhado no ingresso antes de escalar horizontalmente.
func (l *limiteEnvios) permitir(ip, requestID string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.ips == nil {
		l.ips = map[string]*janelaIP{}
	}
	if len(l.ips) > limpezaEnvios {
		for k, j := range l.ips {
			if now.Sub(j.inicio) >= janelaEnvios {
				delete(l.ips, k)
			}
		}
	}
	j := l.ips[ip]
	if j == nil || now.Before(j.inicio) || now.Sub(j.inicio) >= janelaEnvios {
		j = &janelaIP{inicio: now, ids: map[string]bool{}}
		l.ips[ip] = j
	}
	if requestID != "" && j.ids[requestID] {
		return true
	}
	if j.n >= enviosPorIP {
		return false
	}
	j.n++
	if requestID != "" {
		j.ids[requestID] = true
	}
	return true
}

// ipCliente usa o IP que o proxy do Fly informa; fora do Fly, o da conexão.
func ipCliente(r *http.Request) string {
	if ip := strings.TrimSpace(r.Header.Get("Fly-Client-IP")); ip != "" && net.ParseIP(ip) != nil {
		return ip
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// ipParcial mostra só o começo do IP no log (rede, não a pessoa).
func ipParcial(ip string) string {
	if p := net.ParseIP(ip); p != nil && p.To4() != nil {
		partes := strings.Split(p.To4().String(), ".")
		return partes[0] + "." + partes[1] + ".x.x"
	}
	if partes := strings.Split(ip, ":"); len(partes) > 2 {
		return partes[0] + ":" + partes[1] + ":…"
	}
	return "?"
}
