package api

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"image"
	_ "image/jpeg" // formatos aceitos na foto de perfil
	_ "image/png"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"vec/backend/internal/auth"
	"vec/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Fotos de perfil
// ---------------------------------------------------------------------------
// O navegador reduz a foto antes de enviar; aqui só conferimos se é mesmo uma imagem
// pequena. Para exibir, o painel recebe em "listar" um endereço assinado de cada foto:
// assim a <img> funciona sem o token da sessão e só quem enxerga a pessoa recebe o endereço.

const (
	fotoMaxBytes = 40 << 10 // cabe no limite do corpo da API mesmo em base64
	fotoMaxLado  = 1024
)

// fotoURL monta o endereço da foto. Ele vale até o fim do dia seguinte (UTC) e não muda
// ao longo do dia, então o navegador reaproveita o cache; trocar a foto muda "v".
func (s *Server) fotoURL(id int64, em string) string {
	if em == "" {
		return ""
	}
	exp := s.Now().UTC().Truncate(24 * time.Hour).Add(48 * time.Hour).Unix()
	q := url.Values{}
	q.Set("id", strconv.FormatInt(id, 10))
	q.Set("v", em)
	q.Set("e", strconv.FormatInt(exp, 10))
	q.Set("s", auth.AssinarURL(s.Secret, fotoDados(id, em, exp)))
	return "/api/foto?" + q.Encode()
}

func fotoDados(id int64, v string, exp int64) string { return fmt.Sprintf("foto.%d.%s.%d", id, v, exp) }

func (s *Server) handleFoto(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("X-Content-Type-Options", "nosniff")
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		h.Set("Allow", "GET, HEAD")
		http.Error(w, "método não permitido", http.StatusMethodNotAllowed)
		return
	}
	q := r.URL.Query()
	id, errID := strconv.ParseInt(q.Get("id"), 10, 64)
	exp, errExp := strconv.ParseInt(q.Get("e"), 10, 64)
	if errID != nil || errExp != nil || id <= 0 || s.Now().Unix() > exp || !auth.ConfereURL(s.Secret, fotoDados(id, q.Get("v"), exp), q.Get("s")) {
		h.Set("Cache-Control", "no-store")
		http.NotFound(w, r)
		return
	}
	f, ok, err := s.Store.Foto(r.Context(), id)
	if err != nil {
		s.Log.Error("erro interno", "acao", "foto", "erro", err.Error())
		h.Set("Cache-Control", "no-store")
		http.Error(w, "erro interno", http.StatusInternalServerError)
		return
	}
	if !ok {
		h.Set("Cache-Control", "no-store")
		http.NotFound(w, r)
		return
	}
	h.Set("Content-Type", f.Tipo)
	h.Set("Content-Length", strconv.Itoa(len(f.Imagem)))
	h.Set("Cache-Control", "private, max-age=86400")
	h.Set("Content-Security-Policy", "default-src 'none'")
	if r.Method == http.MethodGet {
		_, _ = w.Write(f.Imagem)
	}
}

// lerFoto confere a imagem enviada: JPEG ou PNG, pequena e com no máximo 1024 px de lado.
func lerFoto(b64 string) (store.Foto, bool) {
	img, err := base64.StdEncoding.DecodeString(b64)
	if err != nil || len(img) == 0 || len(img) > fotoMaxBytes {
		return store.Foto{}, false
	}
	tipo := http.DetectContentType(img)
	if tipo != "image/jpeg" && tipo != "image/png" {
		return store.Foto{}, false
	}
	cfg, _, err := image.DecodeConfig(bytes.NewReader(img))
	if err != nil || cfg.Width <= 0 || cfg.Height <= 0 || cfg.Width > fotoMaxLado || cfg.Height > fotoMaxLado {
		return store.Foto{}, false
	}
	return store.Foto{Imagem: img, Tipo: tipo}, true
}

func (s *Server) fotoSalvar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("foto_salvar", err)
	}
	if code != "" {
		return failReply(code)
	}
	f, valida := lerFoto(req.Imagem)
	if req.Linha <= 0 || !valida {
		return failReply("foto_invalida")
	}
	now := s.Now()
	ok, err := s.Store.SalvarFoto(ctx, a.scope, req.Linha, f, a.user.Usuario, now)
	if err != nil {
		return s.internal("foto_salvar", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	s.Log.Info("foto trocada", "linha", req.Linha, "por", a.user.Usuario)
	return okReply(map[string]any{"fotoUrl": s.fotoURL(req.Linha, now.UTC().Format(time.RFC3339))})
}

func (s *Server) fotoExcluir(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("foto_excluir", err)
	}
	if code != "" {
		return failReply(code)
	}
	if req.Linha <= 0 {
		return failReply("dados_invalidos")
	}
	ok, err := s.Store.ExcluirFoto(ctx, a.scope, req.Linha)
	if err != nil {
		return s.internal("foto_excluir", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	s.Log.Info("foto removida", "linha", req.Linha, "por", a.user.Usuario)
	return okReply(nil)
}
