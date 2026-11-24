package api

import (
	"context"
	"math"
	"regexp"
	"strings"
	"time"

	"vec/backend/internal/geo"
	"vec/backend/internal/store"
)

// ---------------------------------------------------------------------------
// Endereço da pessoa (Spec 002)
// ---------------------------------------------------------------------------
// Só pelo painel, só dentro do escopo (o store põe o escopo no SQL) e só com
// consentimento marcado agora por quem salva. O conteúdo nunca vai para o log.

// enderecoIn é o endereço enviado pelo painel em endereco_salvar.
type enderecoIn struct {
	CEP          string           `json:"cep"`
	Logradouro   string           `json:"logradouro"`
	Numero       string           `json:"numero"`
	Complemento  string           `json:"complemento"`
	Bairro       string           `json:"bairro"`
	Cidade       string           `json:"cidade"`
	UF           string           `json:"uf"`
	Ponto        *pontoEnderecoIn `json:"ponto"`
	RevogarPonto bool             `json:"revogarPonto"`
	Versao       *string          `json:"versao"`
}

type pontoEnderecoIn struct {
	Lat        *float64 `json:"lat"`
	Lng        *float64 `json:"lng"`
	Autorizado bool     `json:"autorizado"`
}

const (
	maxLogradouro  = 120
	maxNumero      = 10
	maxComplemento = 60
	maxBairro      = 80
	maxCidade      = 80
)

var (
	reNaoDigito = regexp.MustCompile(`\D`)
	ufsValidas  = map[string]bool{
		"AC": true, "AL": true, "AP": true, "AM": true, "BA": true, "CE": true, "DF": true,
		"ES": true, "GO": true, "MA": true, "MT": true, "MS": true, "MG": true, "PA": true,
		"PB": true, "PR": true, "PE": true, "PI": true, "RJ": true, "RN": true, "RS": true,
		"RO": true, "RR": true, "SC": true, "SP": true, "SE": true, "TO": true,
	}
)

// validarEndereco normaliza o endereço e devolve o código de erro ("" = válido).
// Textos acima do limite são recusados, não cortados, para não gravar endereço errado.
func validarEndereco(in enderecoIn) (store.Endereco, string) {
	cep := in.CEP
	if strings.ContainsFunc(cep, func(r rune) bool { return !strings.ContainsRune("0123456789.- ", r) }) {
		return store.Endereco{}, "cep_invalido"
	}
	if cep = reNaoDigito.ReplaceAllString(cep, ""); len(cep) != 8 {
		return store.Endereco{}, "cep_invalido"
	}
	uf := strings.ToUpper(strings.TrimSpace(in.UF))
	if !ufsValidas[uf] {
		return store.Endereco{}, "uf_invalida"
	}
	campo := func(s string, max int) (string, bool) {
		v := cleanLine(s, max+1)
		return v, len([]rune(v)) <= max
	}
	e := store.Endereco{CEP: cep, UF: uf}
	var ok [5]bool
	e.Logradouro, ok[0] = campo(in.Logradouro, maxLogradouro)
	e.Numero, ok[1] = campo(in.Numero, maxNumero)
	e.Complemento, ok[2] = campo(in.Complemento, maxComplemento)
	e.Bairro, ok[3] = campo(in.Bairro, maxBairro)
	e.Cidade, ok[4] = campo(in.Cidade, maxCidade)
	for _, v := range ok {
		if !v {
			return store.Endereco{}, "dados_invalidos"
		}
	}
	if strings.EqualFold(strings.ReplaceAll(e.Numero, " ", ""), "s/n") || strings.EqualFold(e.Numero, "sn") {
		e.Numero = "s/n"
	}
	if e.Logradouro == "" || e.Numero == "" || e.Bairro == "" || e.Cidade == "" {
		return store.Endereco{}, "endereco_incompleto"
	}
	if in.RevogarPonto && (in.Ponto != nil || in.Versao == nil || *in.Versao == "") {
		return store.Endereco{}, "dados_invalidos"
	}
	if p := in.Ponto; p != nil {
		if !p.Autorizado {
			return store.Endereco{}, "consentimento_ponto"
		}
		if p.Lat == nil || p.Lng == nil || math.IsNaN(*p.Lat) || math.IsNaN(*p.Lng) || math.Abs(*p.Lat) > 85 || math.Abs(*p.Lng) > 180 {
			return store.Endereco{}, "ponto_invalido"
		}
		if in.Versao == nil {
			return store.Endereco{}, "endereco_desatualizado"
		}
		e.Ponto = &store.PontoEndereco{Lat: *p.Lat, Lng: *p.Lng, Exato: true}
	}
	e.VersaoEsperada = in.Versao
	e.RevogarPonto = in.RevogarPonto
	return e, ""
}

func enderecoOut(e store.Endereco) map[string]any {
	ponto := e.Ponto
	if ponto != nil && !ponto.Exato {
		ponto = &store.PontoEndereco{Lat: arred(centroGrade(ponto.Lat)), Lng: arred(centroGrade(ponto.Lng))}
	}
	return map[string]any{
		"cep": e.CEP, "logradouro": e.Logradouro, "numero": e.Numero, "complemento": e.Complemento,
		"bairro": e.Bairro, "cidade": e.Cidade, "uf": e.UF,
		"consentimentoEm": fmtLocal(e.ConsentimentoEm), "consentimentoPor": e.ConsentimentoPor,
		"atualizadoEm": fmtLocal(e.AtualizadoEm), "atualizadoPor": e.AtualizadoPor,
		"ponto": ponto, "versao": e.AtualizadoEm,
	}
}

func (s *Server) enderecoLer(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("endereco_ler", err)
	}
	if code != "" {
		return failReply(code)
	}
	if req.Linha <= 0 {
		return failReply("dados_invalidos")
	}
	e, tem, visivel, err := s.Store.Endereco(ctx, a.scope, req.Linha)
	if err != nil {
		return s.internal("endereco_ler", err)
	}
	if !visivel {
		return failReply("nao_encontrado")
	}
	if !tem {
		return okReply(map[string]any{"endereco": nil})
	}
	return okReply(map[string]any{"endereco": enderecoOut(e)})
}

func (s *Server) enderecoSalvar(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("endereco_salvar", err)
	}
	if code != "" {
		return failReply(code)
	}
	if req.Linha <= 0 || req.Endereco == nil {
		return failReply("dados_invalidos")
	}
	if !req.Consentimento {
		return failReply("consentimento_endereco")
	}
	e, erro := validarEndereco(*req.Endereco)
	if erro != "" {
		return failReply(erro)
	}
	ok, err := s.Store.SalvarEndereco(ctx, a.scope, req.Linha, e, a.user.Usuario, s.Now())
	if err != nil {
		return s.internal("endereco_salvar", err)
	}
	if !ok {
		atual, _, visivel, err := s.Store.Endereco(ctx, a.scope, req.Linha)
		if err != nil {
			return s.internal("endereco_salvar", err)
		}
		if visivel {
			if atual.Ponto != nil && atual.Ponto.Exato && e.Ponto == nil && !e.RevogarPonto &&
				e.VersaoEsperada != nil && *e.VersaoEsperada == atual.AtualizadoEm {
				return failReply("ponto_reconfirmar")
			}
			return failReply("endereco_desatualizado")
		}
		return failReply("nao_encontrado")
	}
	s.Log.Info("endereço salvo", "linha", req.Linha, "por", a.user.Usuario)
	if e.Ponto == nil {
		s.geocodificarDepois(req.Linha, e)
	}
	return s.enderecoLer(ctx, req)
}

func (s *Server) enderecoExcluir(ctx context.Context, req adminReq) reply {
	a, code, err := s.authenticate(ctx, req.Token)
	if err != nil {
		return s.internal("endereco_excluir", err)
	}
	if code != "" {
		return failReply(code)
	}
	if req.Linha <= 0 {
		return failReply("dados_invalidos")
	}
	ok, err := s.Store.ExcluirEndereco(ctx, a.scope, req.Linha)
	if err != nil {
		return s.internal("endereco_excluir", err)
	}
	if !ok {
		return failReply("nao_encontrado")
	}
	s.Log.Info("endereço removido", "linha", req.Linha, "por", a.user.Usuario)
	return okReply(nil)
}

// Geocodificador é o que a API precisa do pacote geo (substituível nos testes).
type Geocodificador interface {
	Geocodificar(ctx context.Context, e store.Endereco) (geo.Resultado, error)
}

// geocodificarDepois busca a coordenada em segundo plano: o salvamento já respondeu
// e nunca espera nem falha por causa disso. Falha deixa o endereço pendente para a
// carga única. O log tem só a linha e o resultado, nunca o endereço.
func (s *Server) geocodificarDepois(linha int64, e store.Endereco) {
	if s.Geo == nil {
		return
	}
	s.geoWG.Add(1)
	go func() {
		defer s.geoWG.Done()
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
		defer cancel()
		r, err := s.Geo.Geocodificar(ctx, e)
		if err != nil {
			s.Log.Warn("geocodificação adiada", "linha", linha, "motivo", err.Error())
			return
		}
		ok, err := s.Store.GravarCoordenada(ctx, linha, e, r.Lat, r.Lng, geo.Fonte, r.Precisao, s.Now())
		if err != nil {
			s.Log.Warn("geocodificação não gravada", "linha", linha)
			return
		}
		s.Log.Info("endereço geocodificado", "linha", linha, "precisao", r.Precisao, "gravado", ok)
	}()
}
