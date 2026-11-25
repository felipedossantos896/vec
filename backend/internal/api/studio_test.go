package api

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"vec/backend/internal/auth"
	studio "vec/design-system"
)

func TestStudioSession(t *testing.T) {
	s, db, token := painelServer(t, 1)
	assetRoot := studioAssetRoot(token)
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
		if res := request(http.MethodGet, assetRoot+path, "", nil); res.Code != 401 {
			t.Errorf("arquivo sem sessão %s = %d", path, res.Code)
		}
	}
	if res := request(http.MethodPost, studioPath+"session", "inválido", nil); res.Code != 401 {
		t.Errorf("sessão inválida = %d", res.Code)
	}
	if res := request(http.MethodPost, studioPath+"session", token, nil); res.Code != 403 || len(res.Result().Cookies()) != 0 {
		t.Errorf("sessão sem permissão administrativa = %d", res.Code)
	}
	db.gerente = true
	res := request(http.MethodPost, studioPath+"session", token, nil)
	cookies := res.Result().Cookies()
	if res.Code != 200 || len(cookies) != 1 || !strings.Contains(res.Body.String(), "studio/studio.js") {
		t.Fatalf("sessão válida = %d, cookies %d", res.Code, len(cookies))
	}
	cookie := cookies[0]
	if !cookie.Secure || !cookie.HttpOnly || cookie.SameSite != http.SameSiteStrictMode || cookie.Path != assetRoot ||
		res.Header().Get("X-Vec-Studio-Assets") != assetRoot || !strings.Contains(res.Body.String(), `<base href="`+assetRoot+`">`) {
		t.Error("cookie do Studio precisa ser restrito à rota e ao HTTPS")
	}
	for _, path := range []string{"", "?catalogo=1", "index.html", "screens/%2e%2e/index.html", "%2e%2e/index.html"} {
		if res := request(http.MethodGet, studioPath+path, "", cookie); !strings.Contains(res.Body.String(), "access/session.js") {
			t.Errorf("%s: a entrada deve verificar a sessão da aba mesmo com um cookie existente", path)
		}
	}
	for _, path := range []string{"inventory.json", "studio/studio.js"} {
		res := request(http.MethodGet, assetRoot+path, "", cookie)
		if res.Code != 200 || res.Header().Get("Cache-Control") != "no-store" {
			t.Errorf("arquivo com sessão %s = %d", path, res.Code)
		}
	}
	if res := request(http.MethodHead, assetRoot+"inventory.json", "outro-token", cookie); res.Code != 401 {
		t.Errorf("cookie de outra sessão = %d, esperado 401", res.Code)
	}
	for _, path := range []string{"screens/preview.html", "screens/%2e/preview.html", "screens/sub/%2e%2e/preview.html", "%2e%2e/screens/preview.html"} {
		res := request(http.MethodGet, assetRoot+path, "", cookie)
		policy := res.Header().Get("Content-Security-Policy")
		if res.Code != 200 || !strings.Contains(policy, "connect-src 'none'") || !strings.Contains(policy, "'sha256-") ||
			strings.Contains(policy, "allow-same-origin") || res.Header().Get("X-Frame-Options") != "SAMEORIGIN" {
			t.Errorf("%s: resposta %d precisa isolar a origem e permitir apenas scripts empacotados", path, res.Code)
		}
		if strings.Contains(res.Body.String(), "<script src=") || !strings.Contains(res.Body.String(), "data:image/svg+xml;base64,") {
			t.Errorf("%s: preview deve carregar sem solicitar recursos autenticados", path)
		}
	}
	other := auth.NewToken(s.Secret, "lider", auth.Fingerprint(db.hash), s.TTL, s.Now().Add(-time.Minute))
	res = request(http.MethodDelete, studioPath+"session", other, cookie)
	if cookies := res.Result().Cookies(); res.Code != 204 || len(cookies) != 1 || cookies[0].MaxAge >= 0 ||
		cookies[0].Path != studioAssetRoot(other) || cookies[0].Path == assetRoot {
		t.Error("saída deve apagar somente o cookie da sessão que saiu")
	}
	if res := request(http.MethodGet, studioAssetRoot(other)+"inventory.json", "", cookie); res.Code != 401 {
		t.Errorf("cookie enviado ao caminho de outra sessão = %d, esperado 401", res.Code)
	}
	db.gerente = false
	for _, path := range []string{"inventory.json", "screens/preview.html"} {
		if res := request(http.MethodGet, assetRoot+path, "", cookie); res.Code != 403 {
			t.Errorf("%s após remover a permissão administrativa = %d", path, res.Code)
		}
	}
}
