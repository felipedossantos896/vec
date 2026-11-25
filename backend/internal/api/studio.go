package api

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"io/fs"
	"net/http"
	"path"
	"regexp"
	"strings"
	"time"
)

const studioPath = "/design-system/"
const studioCookie = "__Secure-vec_studio"

// StudioHandler serves the synthetic catalog using the panel's existing session.
func (s *Server) StudioHandler(assets fs.FS) http.Handler {
	mux := http.NewServeMux()
	preview, previewCSP, previewErr := studioPreview(assets)
	serveFile := func(w http.ResponseWriter, r *http.Request, name string) {
		content, err := fs.ReadFile(assets, name)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		http.ServeContent(w, r, name, time.Time{}, bytes.NewReader(content))
	}
	mux.HandleFunc("POST "+studioPath+"session", func(w http.ResponseWriter, r *http.Request) {
		token, bearer := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !bearer {
			http.Error(w, "Sessão necessária", http.StatusUnauthorized)
			return
		}
		session, _, err := s.authenticate(r.Context(), token)
		if err != nil {
			http.Error(w, "Não foi possível verificar a sessão", http.StatusServiceUnavailable)
			return
		}
		if session == nil {
			http.Error(w, "Sessão necessária", http.StatusUnauthorized)
			return
		}
		catalog, err := fs.ReadFile(assets, "index.html")
		if err != nil {
			http.Error(w, "Catálogo indisponível", http.StatusInternalServerError)
			return
		}
		writeStudioCookie(w, token, 0)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(catalog)
	})
	mux.HandleFunc("DELETE "+studioPath+"session", func(w http.ResponseWriter, _ *http.Request) {
		writeStudioCookie(w, "", -1)
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("GET "+studioPath+"access/session.js", func(w http.ResponseWriter, r *http.Request) {
		serveFile(w, r, "access/session.js")
	})
	mux.HandleFunc("GET "+studioPath, func(w http.ResponseWriter, r *http.Request) {
		relative := strings.TrimPrefix(r.URL.Path, studioPath)
		name := strings.TrimPrefix(path.Clean("/"+relative), "/")
		if name == "" || name == "index.html" {
			serveFile(w, r, "access/index.html")
			return
		}
		cookie, err := r.Cookie(studioCookie)
		if err != nil {
			http.Error(w, "Sessão necessária", http.StatusUnauthorized)
			return
		}
		if bearer := r.Header.Get("Authorization"); bearer != "" && bearer != "Bearer "+cookie.Value {
			http.Error(w, "Sessão necessária", http.StatusUnauthorized)
			return
		}
		session, _, err := s.authenticate(r.Context(), cookie.Value)
		if err != nil {
			http.Error(w, "Não foi possível verificar a sessão", http.StatusServiceUnavailable)
			return
		}
		if session == nil {
			writeStudioCookie(w, "", -1)
			http.Error(w, "Sessão necessária", http.StatusUnauthorized)
			return
		}
		if name == "screens/preview.html" {
			if previewErr != nil {
				http.Error(w, "Preview indisponível", http.StatusInternalServerError)
				return
			}
			w.Header().Set("X-Frame-Options", "SAMEORIGIN")
			w.Header().Set("Content-Security-Policy", previewCSP)
			http.ServeContent(w, r, "preview.html", time.Time{}, strings.NewReader(preview))
			return
		}
		// All HTML entry points have their own handler and policy.
		if path.Ext(name) == ".html" {
			http.NotFound(w, r)
			return
		}
		serveFile(w, r, name)
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		mux.ServeHTTP(w, r)
	})
}

var studioPreviewAsset = regexp.MustCompile(`<link rel="stylesheet" href="([^"]+)">|<script src="([^"]+)"></script>`)

// Inline the preview's bundled files so its opaque-origin iframe needs no
// authenticated subresource requests. Only the bundled scripts are executable.
func studioPreview(assets fs.FS) (string, string, error) {
	html, err := fs.ReadFile(assets, "screens/preview.html")
	if err != nil {
		return "", "", err
	}
	svg, err := fs.ReadFile(assets, "screens/map.svg")
	if err != nil {
		return "", "", err
	}
	var hashes []string
	var assetErr error
	preview := studioPreviewAsset.ReplaceAllStringFunc(string(html), func(tag string) string {
		if assetErr != nil {
			return ""
		}
		match := studioPreviewAsset.FindStringSubmatch(tag)
		if match[1] != "" {
			var css []byte
			css, assetErr = fs.ReadFile(assets, path.Join("screens", match[1]))
			cssText := strings.ReplaceAll(string(css), "url(map.svg)", "url(data:image/svg+xml;base64,"+base64.StdEncoding.EncodeToString(svg)+")")
			return "<style>" + cssText + "</style>"
		}
		var script []byte
		script, assetErr = fs.ReadFile(assets, path.Join("screens", match[2]))
		sum := sha256.Sum256(script)
		hashes = append(hashes, "'sha256-"+base64.StdEncoding.EncodeToString(sum[:])+"'")
		return "<script>" + string(script) + "</script>"
	})
	policy := "default-src 'none'; script-src " + strings.Join(hashes, " ") +
		"; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-ancestors 'self'; form-action 'none'; sandbox allow-scripts allow-forms; base-uri 'none'"
	return preview, policy, assetErr
}

func writeStudioCookie(w http.ResponseWriter, token string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name: studioCookie, Value: token, Path: studioPath, MaxAge: maxAge,
		Secure: true, HttpOnly: true, SameSite: http.SameSiteStrictMode,
	})
}
