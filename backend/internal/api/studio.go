package api

import (
	"io/fs"
	"net/http"
	"strings"
)

const studioPath = "/design-system/"
const studioCookie = "__Secure-vec_studio"

// StudioHandler serves the synthetic catalog using the panel's existing session.
func (s *Server) StudioHandler(assets fs.FS) http.Handler {
	mux := http.NewServeMux()
	files := http.StripPrefix(studioPath, http.FileServerFS(assets))
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
		if err != nil && r.URL.Path == studioPath {
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
		if r.URL.Path == studioPath+"screens/preview.html" {
			w.Header().Set("X-Frame-Options", "SAMEORIGIN")
			w.Header().Set("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; frame-ancestors 'self'; form-action 'none'; sandbox allow-scripts allow-forms allow-same-origin; base-uri 'none'; object-src 'none'")
		}
		files.ServeHTTP(w, r)
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		mux.ServeHTTP(w, r)
	})
}

func writeStudioCookie(w http.ResponseWriter, token string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name: studioCookie, Value: token, Path: studioPath, MaxAge: maxAge,
		Secure: true, HttpOnly: true, SameSite: http.SameSiteStrictMode,
	})
}
