package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	studio "vec/design-system"
)

func TestStudioSession(t *testing.T) {
	s, _, token := painelServer(t, 1)
	mux := http.NewServeMux()
	mux.Handle(studioPath, s.StudioHandler(studio.FS))
	handler := Seguranca(mux)
	request := func(method, path, bearer string, cookie *http.Cookie) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, nil)
		if bearer != "" {
			req.Header.Set("Authorization", "Bearer "+bearer)
		}
		if cookie != nil {
			req.AddCookie(cookie)
		}
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		return res
	}

	if res := request(http.MethodGet, "/design-system", "", nil); res.Header().Get("Location") != studioPath {
		t.Fatalf("entrada sem barra = %d, Location %q", res.Code, res.Header().Get("Location"))
	}
	if res := request(http.MethodGet, studioPath, "", nil); res.Code != 200 || !strings.Contains(res.Body.String(), "/admin/?studio=1") {
		t.Fatalf("entrada anônima deve exibir o acesso do Área VEC, status %d", res.Code)
	}
	for _, path := range []string{"inventory.json", "screens/preview.html", "studio/studio.js"} {
		if res := request(http.MethodGet, studioPath+path, "", nil); res.Code != 401 {
			t.Errorf("arquivo sem sessão %s = %d", path, res.Code)
		}
	}
	if res := request(http.MethodPost, studioPath+"session", "inválido", nil); res.Code != 401 {
		t.Errorf("sessão inválida = %d", res.Code)
	}
	res := request(http.MethodPost, studioPath+"session", token, nil)
	cookies := res.Result().Cookies()
	if res.Code != 204 || len(cookies) != 1 {
		t.Fatalf("sessão válida = %d, cookies %d", res.Code, len(cookies))
	}
	cookie := cookies[0]
	if !cookie.Secure || !cookie.HttpOnly || cookie.SameSite != http.SameSiteStrictMode || cookie.Path != studioPath {
		t.Error("cookie do Studio precisa ser restrito à rota e ao HTTPS")
	}
	for _, path := range []string{"", "inventory.json", "screens/preview.html", "studio/studio.js"} {
		res := request(http.MethodGet, studioPath+path, "", cookie)
		if res.Code != 200 || res.Header().Get("Cache-Control") != "no-store" {
			t.Errorf("arquivo com sessão %s = %d", path, res.Code)
		}
		if path == "screens/preview.html" && (!strings.Contains(res.Header().Get("Content-Security-Policy"), "connect-src 'none'") ||
			res.Header().Get("X-Frame-Options") != "SAMEORIGIN") {
			t.Error("preview precisa permitir somente o iframe da própria origem")
		}
	}
	res = request(http.MethodDelete, studioPath+"session", "", cookie)
	if cookies := res.Result().Cookies(); res.Code != 204 || len(cookies) != 1 || cookies[0].MaxAge >= 0 {
		t.Error("saída deve apagar o cookie do Studio")
	}
}
