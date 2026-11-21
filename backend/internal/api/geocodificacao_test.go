package api

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"strings"
	"sync"
	"testing"

	"vec/backend/internal/geo"
	"vec/backend/internal/store"
)

type geoFalso struct {
	mu        sync.Mutex
	recebidos []store.Endereco
	resultado geo.Resultado
	err       error
}

func (g *geoFalso) Geocodificar(_ context.Context, e store.Endereco) (geo.Resultado, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.recebidos = append(g.recebidos, e)
	return g.resultado, g.err
}

func TestSalvarEnderecoGeocodificaEmSegundoPlanoEGravaOConsultado(t *testing.T) {
	s, db, token := painelServer(t, 1)
	lat, lng := -3.7, -38.5
	g := &geoFalso{resultado: geo.Resultado{Lat: &lat, Lng: &lng, Precisao: store.GeoRua}}
	s.Geo = g
	rep := s.enderecoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Endereco: enderecoValido(), Consentimento: true})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	s.geoWG.Wait()
	if len(g.recebidos) != 1 || g.recebidos[0].CEP != "60000000" || g.recebidos[0].UF != "CE" {
		t.Fatalf("geocodificação recebeu %#v", g.recebidos)
	}
	var grava string
	for _, st := range db.escritas {
		if strings.HasPrefix(st.SQL, "UPDATE enderecos SET lat") {
			grava = st.SQL
			if st.Args[0] != -3.7 || st.Args[3] != store.GeoRua || st.Args[5] != int64(7) || st.Args[7] != "Rua Exemplo" {
				t.Errorf("gravação da coordenada = %#v", st.Args)
			}
		}
	}
	if grava == "" {
		t.Fatalf("coordenada não gravada: %#v", db.escritas)
	}
}

func TestFalhaDaGeocodificacaoNaoAfetaOSalvamentoNemVazaNoLog(t *testing.T) {
	s, db, token := painelServer(t, 1)
	var log bytes.Buffer
	s.Log = slog.New(slog.NewTextHandler(&log, nil))
	s.Geo = &geoFalso{err: errors.New("nominatim: falha de rede")}
	rep := s.enderecoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Endereco: enderecoValido(), Consentimento: true})
	s.geoWG.Wait()
	if rep.body["ok"] != true {
		t.Fatalf("salvamento falhou junto com a geocodificação: %#v", rep.body)
	}
	for _, st := range db.escritas {
		if strings.HasPrefix(st.SQL, "UPDATE enderecos SET lat") {
			t.Fatal("gravou coordenada mesmo com falha do serviço")
		}
	}
	if !strings.Contains(log.String(), "geocodificação adiada") {
		t.Errorf("falha não registrada: %s", log.String())
	}
	for _, segredo := range []string{"Rua Exemplo", "Centro", "Fortaleza", "60000000"} {
		if strings.Contains(log.String(), segredo) {
			t.Errorf("log com dado do endereço (%q): %s", segredo, log.String())
		}
	}
}

func TestSemGeocodificadorNadaRodaEmSegundoPlano(t *testing.T) {
	s, _, token := painelServer(t, 1)
	if rep := s.enderecoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Endereco: enderecoValido(), Consentimento: true}); rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	s.geoWG.Wait() // não deve travar
}
