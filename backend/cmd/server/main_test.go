package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"vec/frontend"
)

func TestVersionHandler(t *testing.T) {
	handler := versionHandler("42")

	res := httptest.NewRecorder()
	handler.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/version", nil))

	if res.Code != http.StatusOK || res.Body.String() != "42" {
		t.Fatalf("GET /version = %d %q", res.Code, res.Body.String())
	}
	if res.Header().Get("Cache-Control") != "no-store" {
		t.Errorf("Cache-Control = %q", res.Header().Get("Cache-Control"))
	}

	res = httptest.NewRecorder()
	handler.ServeHTTP(res, httptest.NewRequest(http.MethodPost, "/version", nil))
	if res.Code != http.StatusMethodNotAllowed || res.Header().Get("Allow") != http.MethodGet {
		t.Errorf("POST /version = %d, Allow %q", res.Code, res.Header().Get("Allow"))
	}
}

// As fontes saem do próprio app (Spec 008), com tipo de fonte e sem ir ao Google.
func TestFontesServidasPeloApp(t *testing.T) {
	h := noCacheHTML(http.FileServerFS(frontend.FS))
	for _, caminho := range []string{"/fonts/fraunces-latin.woff2", "/fonts/source-sans-3-latin-ext.woff2", "/fonts/fonts.css"} {
		res := httptest.NewRecorder()
		h.ServeHTTP(res, httptest.NewRequest(http.MethodGet, caminho, nil))
		if res.Code != http.StatusOK {
			t.Fatalf("GET %s = %d", caminho, res.Code)
		}
		ct := res.Header().Get("Content-Type")
		if strings.HasSuffix(caminho, ".woff2") && ct != "font/woff2" {
			t.Errorf("%s: Content-Type = %q", caminho, ct)
		}
		if strings.HasSuffix(caminho, ".css") && !strings.HasPrefix(ct, "text/css") {
			t.Errorf("%s: Content-Type = %q", caminho, ct)
		}
	}
	for _, pagina := range []string{"index.html", "admin/index.html"} {
		b, err := frontend.FS.ReadFile(pagina)
		if err != nil {
			t.Fatal(err)
		}
		if strings.Contains(string(b), "googleapis") || strings.Contains(string(b), "gstatic") || !strings.Contains(string(b), "fonts/fonts.css") {
			t.Errorf("%s ainda usa o Google Fonts ou não carrega as fontes locais", pagina)
		}
	}
}
