package api

import (
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
	files := http.StripPrefix(studioPath, http.FileServerFS(assets))
	preview, previewCSP, previewErr := studioPreview(assets)
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
		writeStudioCookie(w, token, 0)
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("DELETE "+studioPath+"session", func(w http.ResponseWriter, _ *http.Request) {
		writeStudioCookie(w, "", -1)
		w.WriteHeader(http.StatusNoContent)
	})
	mux.Handle("GET "+studioPath+"access/session.js", files)
	mux.HandleFunc("GET "+studioPath, func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(studioCookie)
		if r.URL.Path == studioPath && (r.URL.Query().Get("catalogo") != "1" || err != nil) {
			entry := r.Clone(r.Context())
			entry.URL.Path = studioPath + "access/"
			files.ServeHTTP(w, entry)
			return
		}
		if err != nil {
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
			if r.URL.Path == studioPath {
				http.Redirect(w, r, studioPath, http.StatusSeeOther)
				return
			}
			http.Error(w, "Sessão necessária", http.StatusUnauthorized)
			return
		}
		// FileServer cleans the decoded path, including escaped dot segments.
		// Apply the preview policy to every spelling that resolves to this file.
		if path.Clean(r.URL.Path) == studioPath+"screens/preview.html" {
			if previewErr != nil {
				http.Error(w, "Preview indisponível", http.StatusInternalServerError)
				return
			}
			w.Header().Set("X-Frame-Options", "SAMEORIGIN")
			w.Header().Set("Content-Security-Policy", previewCSP)
			http.ServeContent(w, r, "preview.html", time.Time{}, strings.NewReader(preview))
			return
		}
		files.ServeHTTP(w, r)
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
