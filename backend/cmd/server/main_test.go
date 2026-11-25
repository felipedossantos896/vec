package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"vec/frontend"
)

func TestStudioEntryPoint(t *testing.T) {
	mux := http.NewServeMux()
	registerStudioEntryPoint(mux)

	for _, method := range []string{http.MethodGet, http.MethodHead} {
		for _, path := range []string{"/design-system", "/design-system/?next=https://example.invalid"} {
			res := httptest.NewRecorder()
			mux.ServeHTTP(res, httptest.NewRequest(method, path, nil))
			if res.Code != http.StatusFound || res.Header().Get("Location") != "https://vec-design-studio.secret-sage-3814.chatgpt.site/" {
				t.Errorf("%s %s: status %d, Location %q", method, path, res.Code, res.Header().Get("Location"))
			}
		}
	}

	res := httptest.NewRecorder()
	mux.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/design-system/inventory.json", nil))
	if res.Code != http.StatusNotFound {
		t.Errorf("subcaminho do Studio: status %d, esperado 404", res.Code)
	}
}

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
	for _, caminho := range []string{"/fonts/bricolage-grotesque-latin.woff2", "/fonts/instrument-sans-latin-ext.woff2", "/fonts/fonts.css"} {
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
