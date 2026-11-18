package frontend

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAdminScriptsAreServed(t *testing.T) {
	for _, path := range []string{"/admin/dashboard.js", "/admin/metrics.js"} {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		res := httptest.NewRecorder()
		http.FileServerFS(FS).ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("GET %s returned %d", path, res.Code)
		}
	}
}
