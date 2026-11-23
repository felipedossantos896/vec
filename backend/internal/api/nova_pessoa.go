package api

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"vec/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Nova pessoa pelo painel (Spec 010)
// ---------------------------------------------------------------------------
// Quem chega pelo painel já aceitou Jesus e é membro de uma célula: o líder cadastra,
// dentro do próprio escopo, com a autorização verbal da pessoa. Um cadastro que já
// existe (mesmo nome e nascimento, ou mesmo WhatsApp) é bloqueado; se ele estiver fora
// do escopo de quem pede, a resposta não diz quem é.

func (s *Server) registroCriar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("registro_criar", err)
	}
	if code != "" {
		return failReply(code)
	}
	if a.user.SoDiscipulador() || (!a.scope.Todos && len(a.scope.Setores) == 0 && len(a.scope.Celulas) == 0) {
		return failReply("sem_permissao")
	}
	requestID := strings.ToLower(req.RequestID)
	if !validRequestID(requestID) || req.Dados == nil {
		return failReply("dados_invalidos")
	}
	// Reenvio do mesmo cadastro (clique duplo ou rede caiu na volta): devolve o que já foi gravado
	if id, err := s.Store.IDDoEnvio(ctx, requestID); err != nil {
		return s.internal("registro_criar", err)
	} else if id != 0 {
		return s.devolverCadastro(ctx, a, id)
	}
	if !req.Autorizou {
		return failReply("consentimento")
	}
	now := s.Now()
	if _, tem := req.Dados["recebeuJesus"]; !tem {
		req.Dados["recebeuJesus"] = json.RawMessage(`"S"`)
	}
	v, code, err := s.validar(ctx, req.Dados, now, true)
	if err != nil {
		return s.internal("registro_criar", err)
	}
	if code != "" {
		return failReply(code)
	}
	// A célula é obrigatória, ativa e do escopo de quem cadastra
	setores, celulas, err := s.Store.Estrutura(ctx)
	if err != nil {
		return s.internal("registro_criar", err)
	}
	if !celulaPermitida(a.scope, v["celula"], setores, celulas) {
		return failReply("celula_invalida")
	}
	var discipulador int64
	if bruto, tem := req.Dados["discipuladorId"]; tem {
		if err := json.Unmarshal(bruto, &discipulador); err != nil || discipulador < 0 {
			return failReply("discipulador_invalido")
		}
	}
	if discipulador != 0 {
		nome, existe, err := s.Store.NomeDaPessoa(ctx, discipulador)
		if err != nil {
			return s.internal("registro_criar", err)
		}
		if !existe {
			return failReply("discipulador_invalido")
		}
		v["discipulador"] = nome
	}
	// Duplicado: na área inteira, mas só mostra quem é se estiver no escopo
	cands, err := s.Store.CandidatosDuplicado(ctx, v["nascimento"], v["telefone"])
	if err != nil {
		return s.internal("registro_criar", err)
	}
	if c, ok := duplicadoDe(v, cands); ok {
		if visivel(a.scope, c) {
			return reply{200, map[string]any{"ok": false, "erro": "duplicado", "existente": map[string]any{"linha": c.ID, "nome": c.Nome, "celula": c.Celula}}}
		}
		return failReply("duplicado_fora")
	}
	err = s.Store.InsertResposta(ctx, store.Resposta{
		CriadoEm:      now.UTC().Format(time.RFC3339),
		Consentimento: now.UTC().Format(time.RFC3339),
		RequestID:     requestID,
		Origem:        "painel",
		CadastradoPor: a.user.Usuario,
		V:             v,
	})
	if err != nil {
		return s.internal("registro_criar", err)
	}
	id, err := s.Store.IDDoEnvio(ctx, requestID)
	if err != nil || id == 0 {
		return s.internal("registro_criar", err)
	}
	if discipulador != 0 {
		// O vínculo com o discipulador usa a mesma gravação da edição
		if _, err := s.Store.UpdateResposta(ctx, a.scope, id, v, discipulador, a.user.Usuario, now); err != nil {
			return s.internal("registro_criar", err)
		}
	}
	s.Log.Info("cadastro criado pelo painel", "linha", id, "por", a.user.Usuario)
	return s.devolverCadastro(ctx, a, id)
}

// devolverCadastro responde com o cadastro no mesmo formato de listar.
func (s *Server) devolverCadastro(ctx context.Context, a *session, id int64) reply {
	rs, err := s.Store.ListRespostas(ctx, a.scope)
	if err != nil {
		return s.internal("registro_criar", err)
	}
	for _, r := range rs {
		if r.ID == id {
			return okReply(map[string]any{"registro": s.registroMapa(r)})
		}
	}
	return failReply("nao_encontrado")
}

// celulaPermitida: a célula existe, está ativa e está no escopo (célula ou setor dela).
func celulaPermitida(sc store.Scope, nome string, setores []store.Setor, celulas []store.Celula) bool {
	if nome == "" {
		return false
	}
	for _, c := range celulas {
		if !strings.EqualFold(c.Nome, nome) || !c.Ativa {
			continue
		}
		return sc.Todos || temNome(sc.Celulas, c.Nome) || temNome(sc.Setores, c.Setor)
	}
	return false
}

// visivel diz se um cadastro está no escopo (a mesma regra do SQL de escopoSQL).
func visivel(sc store.Scope, c store.Candidato) bool {
	return sc.Todos || temNome(sc.Setores, c.Setor) || temNome(sc.Celulas, c.Celula) || (sc.Discipulador != 0 && c.DiscipuladorID == sc.Discipulador)
}

func temNome(lista []string, nome string) bool {
	for _, x := range lista {
		if nome != "" && strings.EqualFold(x, nome) {
			return true
		}
	}
	return false
}

// duplicadoDe acha, entre os candidatos, um com o mesmo WhatsApp ou com o mesmo nome
// (sem acento, maiúsculas e espaços extras) e a mesma data de nascimento.
func duplicadoDe(v map[string]string, cands []store.Candidato) (store.Candidato, bool) {
	nome := nomeComparavel(v["nome"])
	for _, c := range cands {
		if v["telefone"] != "" && c.Telefone == v["telefone"] {
			return c, true
		}
		if c.Nascimento == v["nascimento"] && nomeComparavel(c.Nome) == nome {
			return c, true
		}
	}
	return store.Candidato{}, false
}

var semAcento = strings.NewReplacer(
	"á", "a", "à", "a", "â", "a", "ã", "a", "ä", "a", "é", "e", "è", "e", "ê", "e", "ë", "e",
	"í", "i", "ì", "i", "î", "i", "ï", "i", "ó", "o", "ò", "o", "ô", "o", "õ", "o", "ö", "o",
	"ú", "u", "ù", "u", "û", "u", "ü", "u", "ç", "c", "ñ", "n",
)

func nomeComparavel(s string) string {
	return semAcento.Replace(strings.Join(strings.Fields(strings.ToLower(s)), " "))
}
