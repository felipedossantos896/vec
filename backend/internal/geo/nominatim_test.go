package geo

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	"vec/backend/internal/store"
)

// Dados fictícios: nenhum endereço real em testes.
var enderecoTeste = store.Endereco{
	CEP: "60000000", Logradouro: "Rua Exemplo", Numero: "1234", Complemento: "Apto 56",
	Bairro: "Centro", Cidade: "Fortaleza", UF: "CE",
}

type falso struct {
	mu        sync.Mutex
	consultas []url.Values
	agentes   []string
	horarios  []time.Time
	responde  func(q url.Values) (int, string)
}

func (f *falso) servidor(t *testing.T) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		f.mu.Lock()
		f.consultas = append(f.consultas, r.URL.Query())
		f.agentes = append(f.agentes, r.UserAgent())
		f.horarios = append(f.horarios, time.Now())
		f.mu.Unlock()
		status, corpo := f.responde(r.URL.Query())
		w.WriteHeader(status)
		_, _ = w.Write([]byte(corpo))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func cliente(srv *httptest.Server, intervalo time.Duration) *Cliente {
	c := Novo("1.2.3")
	c.BaseURL = srv.URL
	c.Intervalo = intervalo
	return c
}

func TestConsultaSemDadosPessoaisEComUserAgentDoVEC(t *testing.T) {
	f := &falso{responde: func(url.Values) (int, string) { return 200, `[{"lat":"-3.7","lon":"-38.5"}]` }}
	r, err := cliente(f.servidor(t), 0).Geocodificar(context.Background(), enderecoTeste)
	if err != nil || r.Precisao != store.GeoRua || *r.Lat != -3.7 || *r.Lng != -38.5 {
		t.Fatalf("resultado = %#v, err %v", r, err)
	}
	q := f.consultas[0]
	if q.Get("street") != "Rua Exemplo" || q.Get("city") != "Fortaleza" || q.Get("countrycodes") != "br" {
		t.Errorf("consulta inesperada: %v", q)
	}
	bruto := q.Encode()
	for _, proibido := range []string{"1234", "Apto", "56", "60000000"} {
		if strings.Contains(bruto, proibido) {
			t.Errorf("consulta enviou dado que não deve sair (%q): %s", proibido, bruto)
		}
	}
	if f.agentes[0] != "VEC-AreaVEC/1.2.3 (+https://github.com/felipedossantos896/vec)" {
		t.Errorf("User-Agent = %q", f.agentes[0])
	}
}

func TestRecuaParaBairroECidadeEMarcaNaoEncontrado(t *testing.T) {
	casos := []struct {
		nome     string
		acha     string // qual tentativa responde com resultado
		precisao string
		chamadas int
	}{
		{"bairro", "q", store.GeoBairro, 2},
		{"cidade", "city-only", store.GeoCidade, 3},
		{"nada", "", store.GeoNaoEncontrado, 3},
	}
	for _, c := range casos {
		f := &falso{responde: func(q url.Values) (int, string) {
			tipo := "street"
			if q.Has("q") {
				tipo = "q"
			} else if !q.Has("street") {
				tipo = "city-only"
			}
			if tipo == c.acha {
				return 200, `[{"lat":"-3.8","lon":"-38.6"}]`
			}
			return 200, `[]`
		}}
		r, err := cliente(f.servidor(t), 0).Geocodificar(context.Background(), enderecoTeste)
		if err != nil || r.Precisao != c.precisao || len(f.consultas) != c.chamadas {
			t.Errorf("%s: precisão %q, %d chamadas, err %v", c.nome, r.Precisao, len(f.consultas), err)
		}
		if c.precisao == store.GeoNaoEncontrado && (r.Lat != nil || r.Lng != nil) {
			t.Errorf("não encontrado com coordenada: %#v", r)
		}
	}
}

func TestErroDoServicoNaoViraNaoEncontrado(t *testing.T) {
	for _, resp := range []struct {
		status int
		corpo  string
	}{{429, ""}, {500, ""}, {200, "<html>"}, {200, `[{"lat":"x","lon":"y"}]`}, {200, `[{"lat":"200","lon":"0"}]`}} {
		f := &falso{responde: func(url.Values) (int, string) { return resp.status, resp.corpo }}
		if _, err := cliente(f.servidor(t), 0).Geocodificar(context.Background(), enderecoTeste); err == nil {
			t.Errorf("HTTP %d %q deveria ser erro (tentar de novo depois)", resp.status, resp.corpo)
		}
	}
}

func TestLimitadorEspacaRequisicoesDeTodasAsGoroutines(t *testing.T) {
	f := &falso{responde: func(url.Values) (int, string) { return 200, `[]` }}
	c := cliente(f.servidor(t), 80*time.Millisecond)
	var wg sync.WaitGroup
	for i := 0; i < 3; i++ {
		wg.Add(1)
		e := enderecoTeste
		e.Logradouro = "Rua " + string(rune('A'+i)) // consultas diferentes: sem cache
		e.Bairro, e.Cidade = "Bairro "+string(rune('A'+i)), "Cidade "+string(rune('A'+i))
		go func() { defer wg.Done(); _, _ = c.Geocodificar(context.Background(), e) }()
	}
	wg.Wait()
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.horarios) != 9 {
		t.Fatalf("chamadas = %d", len(f.horarios))
	}
	inicio, fim := f.horarios[0], f.horarios[0]
	for _, h := range f.horarios {
		if h.Before(inicio) {
			inicio = h
		}
		if h.After(fim) {
			fim = h
		}
	}
	if minimo := 8 * 80 * time.Millisecond * 9 / 10; fim.Sub(inicio) < minimo {
		t.Fatalf("9 requisições em %v; o limitador exige ao menos %v", fim.Sub(inicio), minimo)
	}
}

func TestCacheEvitaRepetirAMesmaConsulta(t *testing.T) {
	f := &falso{responde: func(url.Values) (int, string) { return 200, `[{"lat":"-3.7","lon":"-38.5"}]` }}
	c := cliente(f.servidor(t), 0)
	for i := 0; i < 3; i++ {
		if _, err := c.Geocodificar(context.Background(), enderecoTeste); err != nil {
			t.Fatal(err)
		}
	}
	if len(f.consultas) != 1 {
		t.Fatalf("consultas ao serviço = %d, queria 1", len(f.consultas))
	}
}

func TestInterruptorGEOCODER(t *testing.T) {
	t.Setenv("GEOCODER", "off")
	if !Desligado() {
		t.Fatal("GEOCODER=off deve desligar")
	}
	t.Setenv("GEOCODER", "")
	if Desligado() {
		t.Fatal("sem GEOCODER deve ficar ligado")
	}
}
