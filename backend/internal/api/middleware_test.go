package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSegurancaAplicaCSPEstrito(t *testing.T) {
	h := Seguranca(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte("ok")) }))
	for _, caminho := range []string{"/", "/admin/", "/admin/index.html", "/admin/vendor/maplibre/maplibre-gl-csp-worker.js", "/admin/admin.js", "/api"} {
		res := httptest.NewRecorder()
		h.ServeHTTP(res, httptest.NewRequest(http.MethodGet, caminho, nil))
		csp := res.Header().Get("Content-Security-Policy")
		for _, exigido := range []string{"default-src 'self'", "script-src 'self';", "style-src 'self';", "font-src 'self';",
			"frame-ancestors 'none'", "object-src 'none'", "https://tile.openstreetmap.org", "https://viacep.com.br"} {
			if !strings.Contains(csp, exigido) {
				t.Errorf("%s: CSP sem %q: %s", caminho, exigido, csp)
			}
		}
		// Só o painel e o worker do MapLibre falam com o OpenFreeMap (Spec 028).
		painel := caminho == "/admin/" || caminho == "/admin/index.html" || strings.HasSuffix(caminho, "csp-worker.js")
		if strings.Contains(csp, "https://tiles.openfreemap.org") != painel || strings.Contains(csp, "worker-src 'self'") != painel {
			t.Errorf("%s: política do OpenFreeMap inesperada: %s", caminho, csp)
		}
		for _, proibido := range []string{"unsafe-inline", "unsafe-eval", "googleapis", "gstatic", "*"} {
			if strings.Contains(csp, proibido) {
				t.Errorf("%s: CSP não pode ter %q: %s", caminho, proibido, csp)
			}
		}
	}
}

func TestFotoMantemPoliticaPropria(t *testing.T) {
	// A foto define default-src 'none' depois do middleware: o mais restrito vence.
	h := Seguranca(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Security-Policy", "default-src 'none'")
	}))
	res := httptest.NewRecorder()
	h.ServeHTTP(res, httptest.NewRequest(http.MethodGet, "/api/foto", nil))
	if got := res.Header().Get("Content-Security-Policy"); got != "default-src 'none'" {
		t.Fatalf("foto: %q", got)
	}
}
