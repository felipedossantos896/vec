// Package geo transforma o endereço da pessoa em coordenada aproximada usando o
// Nominatim (OpenStreetMap), seguindo a política de uso do serviço público
// (https://operations.osmfoundation.org/policies/nominatim/):
//
//   - no máximo 1 requisição por segundo somando a aplicação inteira;
//   - User-Agent próprio que identifica o VEC e traz um contato;
//   - resultados guardados (cache em memória aqui; no banco, pelo store);
//   - desligável sem nova versão (GEOCODER=off);
//   - sem dados pessoais: a consulta leva rua, bairro, cidade, UF e país, nunca
//     nome, número, complemento ou CEP.
package geo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"vec/backend/internal/store"
)

const (
	BaseURL   = "https://nominatim.openstreetmap.org/search"
	Contato   = "+https://github.com/felipedossantos896/vec"
	Fonte     = "nominatim"
	maxCache  = 2000
	tempoHTTP = 10 * time.Second
)

// Resultado da geocodificação. Lat/Lng nulos quando nada foi encontrado.
type Resultado struct {
	Lat, Lng *float64
	Precisao string // store.GeoRua, GeoBairro, GeoCidade ou GeoNaoEncontrado
}

// Cliente do Nominatim. Seguro para uso concorrente: o limitador e o cache são
// compartilhados por todas as goroutines do processo.
type Cliente struct {
	BaseURL   string
	UserAgent string
	Intervalo time.Duration // espaço mínimo entre duas requisições
	HTTP      *http.Client

	mu      sync.Mutex
	proxima time.Time
	cache   map[string]*ponto
}

type ponto struct{ lat, lng float64 }

// Desligado indica GEOCODER=off (interruptor exigido pela política de uso).
func Desligado() bool { return strings.EqualFold(strings.TrimSpace(os.Getenv("GEOCODER")), "off") }

// Novo cria o cliente de produção: 1 requisição por segundo e User-Agent do VEC.
func Novo(versao string) *Cliente {
	return &Cliente{
		BaseURL:   BaseURL,
		UserAgent: fmt.Sprintf("VEC-AreaVEC/%s (%s)", versao, Contato),
		Intervalo: time.Second,
		HTTP:      &http.Client{Timeout: tempoHTTP},
	}
}

// Geocodificar tenta rua, depois bairro, depois cidade. Erro = tentar de novo mais
// tarde (rede, bloqueio, resposta inválida); não encontrado não é erro.
func (c *Cliente) Geocodificar(ctx context.Context, e store.Endereco) (Resultado, error) {
	tem := func(s string) bool { return strings.TrimSpace(s) != "" }
	tentativas := []struct {
		precisao string
		pode     bool
		params   url.Values
	}{
		{store.GeoRua, tem(e.Logradouro) && tem(e.Cidade), url.Values{"street": {e.Logradouro}, "city": {e.Cidade}, "state": {e.UF}, "country": {"Brasil"}}},
		{store.GeoBairro, tem(e.Bairro) && tem(e.Cidade), url.Values{"q": {strings.Join([]string{e.Bairro, e.Cidade, e.UF, "Brasil"}, ", ")}}},
		{store.GeoCidade, tem(e.Cidade), url.Values{"city": {e.Cidade}, "state": {e.UF}, "country": {"Brasil"}}},
	}
	for _, t := range tentativas {
		if !t.pode {
			continue
		}
		p, err := c.buscar(ctx, t.params)
		if err != nil {
			return Resultado{}, err
		}
		if p != nil {
			lat, lng := p.lat, p.lng
			return Resultado{Lat: &lat, Lng: &lng, Precisao: t.precisao}, nil
		}
	}
	return Resultado{Precisao: store.GeoNaoEncontrado}, nil
}

func (c *Cliente) buscar(ctx context.Context, params url.Values) (*ponto, error) {
	params.Set("format", "jsonv2")
	params.Set("limit", "1")
	params.Set("countrycodes", "br")
	chave := params.Encode()

	c.mu.Lock()
	if p, ok := c.cache[chave]; ok {
		c.mu.Unlock()
		return p, nil
	}
	// Reserva o próximo horário livre: o limite vale para o processo inteiro.
	agora := time.Now()
	espera := time.Duration(0)
	if c.proxima.After(agora) {
		espera = c.proxima.Sub(agora)
	} else {
		c.proxima = agora
	}
	c.proxima = c.proxima.Add(c.Intervalo)
	c.mu.Unlock()
	if espera > 0 {
		select {
		case <-time.After(espera):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}

	// Os erros nunca levam a URL: ela contém rua e bairro e poderia ir parar no log.
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.BaseURL+"?"+chave, nil)
	if err != nil {
		return nil, errors.New("nominatim: requisição inválida")
	}
	req.Header.Set("User-Agent", c.UserAgent)
	req.Header.Set("Accept", "application/json")
	res, err := c.HTTP.Do(req)
	if err != nil {
		if ctx.Err() != nil {
			return nil, errors.New("nominatim: tempo esgotado")
		}
		return nil, errors.New("nominatim: falha de rede")
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("nominatim: HTTP %d", res.StatusCode)
	}
	var corpo []struct {
		Lat string `json:"lat"`
		Lon string `json:"lon"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(nil, res.Body, 1<<16)).Decode(&corpo); err != nil {
		return nil, errors.New("nominatim: resposta inválida")
	}
	var p *ponto
	if len(corpo) > 0 {
		lat, err1 := strconv.ParseFloat(corpo[0].Lat, 64)
		lng, err2 := strconv.ParseFloat(corpo[0].Lon, 64)
		if err1 != nil || err2 != nil || lat < -90 || lat > 90 || lng < -180 || lng > 180 {
			return nil, errors.New("nominatim: coordenada inválida")
		}
		p = &ponto{lat, lng}
	}
	c.mu.Lock()
	if c.cache == nil || len(c.cache) >= maxCache {
		c.cache = map[string]*ponto{}
	}
	c.cache[chave] = p
	c.mu.Unlock()
	return p, nil
}
