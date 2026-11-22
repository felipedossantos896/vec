package api

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"

	"vec/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Setores e células
// ---------------------------------------------------------------------------

// estruturaPublica devolve os setores com as células ativas, para o formulário público.
func (s *Server) estruturaPublica(ctx context.Context) reply {
	setores, celulas, err := s.Store.Estrutura(ctx)
	if err != nil {
		return s.internal("estrutura", err)
	}
	out := make([]map[string]any, 0, len(setores))
	for _, st := range setores {
		nomes := []string{}
		detalhes := []map[string]any{}
		for pos, c := range celulas {
			if c.Ativa && c.SetorID == st.ID {
				nomes = append(nomes, c.Nome)
				// Público: cor, dia e horário. A casa anfitriã nunca sai daqui (Spec 009).
				detalhes = append(detalhes, map[string]any{"nome": c.Nome, "cor": c.Cor, "diaSemana": c.DiaSemana, "horario": c.Horario, "posicao": pos})
			}
		}
		out = append(out, map[string]any{"nome": st.Nome, "celulas": nomes, "detalhes": detalhes})
	}
	return okReply(map[string]any{"setores": out})
}

// estruturaPainel é a estrutura completa, com ids e células inativas.
func estruturaPainel(setores []store.Setor, celulas []store.Celula) map[string]any {
	ss := make([]map[string]any, 0, len(setores))
	for _, st := range setores {
		ss = append(ss, map[string]any{"id": st.ID, "nome": st.Nome})
	}
	cs := make([]map[string]any, 0, len(celulas))
	for _, c := range celulas {
		cs = append(cs, map[string]any{"id": c.ID, "nome": c.Nome, "setorId": c.SetorID, "setor": c.Setor, "ativa": c.Ativa,
			"cor": c.Cor, "diaSemana": c.DiaSemana, "horario": c.Horario, "anfitriaoId": c.AnfitriaoID})
	}
	return map[string]any{"setores": ss, "celulas": cs}
}

// estruturaSalvar cria ou altera um setor ou uma célula. Só o líder de área pode.
func (s *Server) estruturaSalvar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("estrutura_salvar", err)
	}
	if code != "" {
		return failReply(code)
	}
	if a.user.Perfil != "AREA" {
		return failReply("sem_permissao")
	}
	nome := cleanLine(req.Nome, 60)
	if len([]rune(nome)) < 2 || req.ID < 0 {
		return failReply("nome_invalido")
	}
	switch req.Tipo {
	case "setor":
		err = s.Store.SalvarSetor(ctx, req.ID, nome)
	case "celula":
		if req.SetorID <= 0 {
			return failReply("setor_obrigatorio")
		}
		cor, dia, hora, ok := identidadeCelula(req.Cor, req.DiaSemana, req.Horario)
		if !ok || req.AnfitriaoID < 0 {
			return failReply("dados_invalidos")
		}
		err = s.Store.SalvarCelula(ctx, store.Celula{ID: req.ID, Nome: nome, SetorID: req.SetorID, Ativa: req.Ativo == nil || *req.Ativo,
			Cor: cor, DiaSemana: dia, Horario: hora, AnfitriaoID: req.AnfitriaoID})
	default:
		return failReply("dados_invalidos")
	}
	switch {
	case errors.Is(err, store.ErrNomeExiste):
		return failReply("nome_existe")
	case errors.Is(err, store.ErrNaoEncontrado):
		return failReply("nao_encontrado")
	case err != nil:
		return s.internal("estrutura_salvar", err)
	}
	s.limparListas()
	s.Log.Info("estrutura alterada", "tipo", req.Tipo, "id", req.ID, "por", a.user.Usuario)
	return okReply(nil)
}

var (
	reCor     = regexp.MustCompile(`^#[0-9a-f]{6}$`)
	reHorario = regexp.MustCompile(`^([01][0-9]|2[0-3]):[0-5][0-9]$`)
	diasCel   = map[string]bool{"": true, "seg": true, "ter": true, "qua": true, "qui": true, "sex": true, "sab": true, "dom": true}
)

// identidadeCelula normaliza e confere cor (#rrggbb), dia e horário (HH:MM); vazio = não definido.
func identidadeCelula(cor, dia, hora string) (string, string, string, bool) {
	cor = strings.ToLower(strings.TrimSpace(cor))
	dia = strings.ToLower(strings.TrimSpace(dia))
	hora = strings.TrimSpace(hora)
	if (cor != "" && !reCor.MatchString(cor)) || !diasCel[dia] || (hora != "" && !reHorario.MatchString(hora)) {
		return "", "", "", false
	}
	return cor, dia, hora, true
}

// limparListas faz o próximo envio do formulário reler setores e células do banco.
func (s *Server) limparListas() {
	s.cache.mu.Lock()
	s.cache.at = time.Time{}
	s.cache.mu.Unlock()
}
