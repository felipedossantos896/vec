package api

import (
	"compress/gzip"
	"net/http"
	"strings"
	"sync"
)

// Gzip comprime respostas de texto (HTML, JSON, CSS, JS) quando o navegador aceita.
// Menos bytes na rede = tela abrindo mais rápido em 4G.
func Gzip(next http.Handler) http.Handler {
	pool := sync.Pool{New: func() any { return gzip.NewWriter(nil) }}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Vary", "Accept-Encoding")
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") || r.Method == http.MethodHead {
			next.ServeHTTP(w, r)
			return
		}
		gw := &gzipWriter{ResponseWriter: w, pool: &pool}
		defer gw.close()
		next.ServeHTTP(gw, r)
	})
}

type gzipWriter struct {
	http.ResponseWriter
	pool        *sync.Pool
	gz          *gzip.Writer
	wroteHeader bool
}

func compressible(contentType string) bool {
	ct := strings.ToLower(contentType)
	return strings.HasPrefix(ct, "text/") ||
		strings.HasPrefix(ct, "application/json") ||
		strings.HasPrefix(ct, "application/javascript") ||
		strings.HasPrefix(ct, "image/svg+xml")
}

func (g *gzipWriter) WriteHeader(code int) {
	if g.wroteHeader {
		return
	}
	g.wroteHeader = true
	h := g.Header()
	if code == http.StatusOK && h.Get("Content-Encoding") == "" && compressible(h.Get("Content-Type")) {
		h.Set("Content-Encoding", "gzip")
		h.Del("Content-Length")
		g.gz = g.pool.Get().(*gzip.Writer)
		g.gz.Reset(g.ResponseWriter)
	}
	g.ResponseWriter.WriteHeader(code)
}

func (g *gzipWriter) Write(b []byte) (int, error) {
	if !g.wroteHeader {
		if g.Header().Get("Content-Type") == "" {
			g.Header().Set("Content-Type", http.DetectContentType(b))
		}
		g.WriteHeader(http.StatusOK)
	}
	if g.gz != nil {
		return g.gz.Write(b)
	}
	return g.ResponseWriter.Write(b)
}

func (g *gzipWriter) close() {
	if g.gz != nil {
		_ = g.gz.Close()
		g.pool.Put(g.gz)
		g.gz = nil
	}
}

// Seguranca adiciona cabeçalhos de proteção básicos a todas as respostas.
func Seguranca(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		if strings.HasPrefix(r.URL.Path, "/admin") {
			h.Set("X-Robots-Tag", "noindex, nofollow")
			h.Set("Cache-Control", "no-store")
		}
		next.ServeHTTP(w, r)
	})
}
