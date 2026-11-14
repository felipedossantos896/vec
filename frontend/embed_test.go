package frontend

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestAdminDashboardScriptIsServed(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/admin/dashboard.js", nil)
	res := httptest.NewRecorder()
	http.FileServerFS(FS).ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("GET /admin/dashboard.js returned %d", res.Code)
	}
}
