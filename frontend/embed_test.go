package frontend

import (
	"io/fs"
	"net/http"
	"net/http/httptest"
	"path"
	"regexp"
	"strings"
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

// Todo script e folha de estilo que as páginas pedem precisa estar embutido no binário.
// Um arquivo novo fora do go:embed passa nos testes locais e dá 404 em produção.
func TestPageAssetsAreEmbedded(t *testing.T) {
	ref := regexp.MustCompile(`<(?:script|link)[^>]+(?:src|href)="([^"]+)"`)
	for _, pagina := range []string{"index.html", "admin/index.html"} {
		html, err := fs.ReadFile(FS, pagina)
		if err != nil {
			t.Fatalf("ler %s: %v", pagina, err)
		}
		for _, m := range ref.FindAllStringSubmatch(string(html), -1) {
			alvo := strings.SplitN(m[1], "?", 2)[0]
			if strings.Contains(alvo, "://") || strings.HasPrefix(alvo, "//") || strings.HasPrefix(alvo, "data:") || !strings.HasSuffix(alvo, ".js") && !strings.HasSuffix(alvo, ".css") {
				continue
			}
			arquivo := path.Clean(path.Join(path.Dir(pagina), alvo))
			if strings.HasPrefix(alvo, "/") {
				arquivo = strings.TrimPrefix(alvo, "/")
			}
			if _, err := fs.Stat(FS, arquivo); err != nil {
				t.Errorf("%s pede %s, mas %s não está no go:embed", pagina, m[1], arquivo)
			}
		}
	}
}
