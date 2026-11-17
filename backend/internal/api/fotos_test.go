package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"image"
	"image/png"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func pngDeTeste(t *testing.T, lado int) []byte {
	t.Helper()
	var buf bytes.Buffer
	if err := png.Encode(&buf, image.NewRGBA(image.Rect(0, 0, lado, lado))); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestFotoSalvarLimitaAoEscopo(t *testing.T) {
	s, db, token := painelServer(t, 1)
	img := base64.StdEncoding.EncodeToString(pngDeTeste(t, 64))
	rep := s.fotoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Imagem: img})
	if rep.body["ok"] != true {
		t.Fatalf("resposta = %#v", rep.body)
	}
	if u, _ := rep.body["fotoUrl"].(string); !strings.HasPrefix(u, "/api/foto?") {
		t.Errorf("fotoUrl = %q", u)
	}
	if len(db.escritas) != 1 || !strings.Contains(db.escritas[0].SQL, "excluido_em IS NULL AND (celula IN (?))") {
		t.Fatalf("gravação sem limite de escopo: %#v", db.escritas)
	}

	s, _, token = painelServer(t, 0)
	if rep := s.fotoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Imagem: img}); rep.body["erro"] != "nao_encontrado" {
		t.Errorf("fora do escopo: erro = %v", rep.body["erro"])
	}
}

func TestFotoSalvarRecusaOQueNaoEImagemPequena(t *testing.T) {
	s, db, token := painelServer(t, 1)
	casos := map[string]string{
		"texto":        base64.StdEncoding.EncodeToString([]byte("<svg onload=alert(1)>")),
		"base64 ruim":  "%%%",
		"vazia":        "",
		"lado grande":  base64.StdEncoding.EncodeToString(pngDeTeste(t, 1100)),
		"muito pesada": base64.StdEncoding.EncodeToString(append(pngDeTeste(t, 8), make([]byte, fotoMaxBytes)...)),
	}
	for nome, img := range casos {
		if rep := s.fotoSalvar(context.Background(), adminReq{Token: token, Linha: 7, Imagem: img}); rep.body["erro"] != "foto_invalida" {
			t.Errorf("%s: erro = %v, queria foto_invalida", nome, rep.body["erro"])
		}
	}
	if len(db.escritas) != 0 {
		t.Fatalf("gravou foto inválida")
	}
	if rep := s.fotoSalvar(context.Background(), adminReq{Token: "falso", Linha: 7}); rep.body["erro"] != "sessao" {
		t.Errorf("sem sessão: erro = %v", rep.body["erro"])
	}
}

func TestFotoSoAbreComEnderecoAssinado(t *testing.T) {
	s, db, _ := painelServer(t, 1)
	db.foto = pngDeTeste(t, 8)
	h := s.Handler()
	pedir := func(u string) *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, u, nil))
		return rec
	}

	u := s.fotoURL(7, "2026-11-14T10:00:00Z")
	rec := pedir(u)
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "image/png" || !bytes.Equal(rec.Body.Bytes(), db.foto) {
		t.Fatalf("foto válida: status %d, tipo %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	if !strings.Contains(rec.Header().Get("Cache-Control"), "private") {
		t.Errorf("cache = %q, queria privado", rec.Header().Get("Cache-Control"))
	}

	for nome, ruim := range map[string]string{
		"outra pessoa":    strings.Replace(u, "id=7", "id=8", 1),
		"sem assinatura":  u[:strings.Index(u, "&s=")],
		"outra validade":  strings.Replace(u, "e=", "e=9", 1),
		"assinatura nula": u + "x",
	} {
		if rec := pedir(ruim); rec.Code != http.StatusNotFound {
			t.Errorf("%s: status %d, queria 404", nome, rec.Code)
		}
	}

	// Endereço vencido
	agora := s.Now()
	s.Now = func() time.Time { return agora.Add(72 * time.Hour) }
	if rec := pedir(u); rec.Code != http.StatusNotFound {
		t.Errorf("vencido: status %d, queria 404", rec.Code)
	}
}
