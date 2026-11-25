package store

import (
	"context"
	"strings"
	"time"

	"vec/backend/internal/turso"
)

// ---------------------------------------------------------------------------
// Endereço da pessoa (Spec 002)
// ---------------------------------------------------------------------------
// Dado pessoal de finalidade específica: só é lido e gravado dentro do escopo de
// quem pede, com o escopo na própria instrução SQL, como foto e anotações. A
// validação dos campos e do consentimento fica na API.

type Endereco struct {
	CEP         string
	Logradouro  string
	Numero      string
	Complemento string
	Bairro      string
	Cidade      string
	UF          string

	// Preenchidos pelo store a partir de quem salva; ignorados na entrada.
	ConsentimentoEm  string
	ConsentimentoPor string
	AtualizadoEm     string
	AtualizadoPor    string
	Ponto            *PontoEndereco
	RevogarPonto     bool
	VersaoEsperada   *string
}

type PontoEndereco struct {
	Lat   float64 `json:"lat"`
	Lng   float64 `json:"lng"`
	Exato bool    `json:"exato"`
}

const GeoManual = "manual"

const enderecoCols = `cep, logradouro, numero, complemento, bairro, cidade, uf,
	consentimento_em, consentimento_por, atualizado_em, atualizado_por`

// Endereco devolve o endereço de um cadastro do escopo. visivel=false quando o
// cadastro não existe, foi excluído ou está fora do escopo; tem=false quando ele
// é visível mas ainda não tem endereço.
func (s *Store) Endereco(ctx context.Context, sc Scope, respostaID int64) (e Endereco, tem, visivel bool, err error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return Endereco{}, false, false, nil
	}
	alvo := append([]any{respostaID}, args...)
	dono := `SELECT id FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: dono, Args: alvo},
		turso.Stmt{SQL: `SELECT ` + enderecoCols + `, lat, lng, geo_precisao FROM enderecos WHERE resposta_id IN (` + dono + `)`, Args: alvo},
	)
	if err != nil || len(res[0].Rows) == 0 {
		return Endereco{}, false, false, err
	}
	if len(res[1].Rows) == 0 {
		return Endereco{}, false, true, nil
	}
	r := res[1].Rows[0]
	var ponto *PontoEndereco
	if len(r) >= 14 {
		lat, temLat := r[11].(float64)
		lng, temLng := r[12].(float64)
		if temLat && temLng {
			ponto = &PontoEndereco{Lat: lat, Lng: lng, Exato: turso.Str(r, 13) == GeoManual}
		}
	}
	return Endereco{
		CEP: turso.Str(r, 0), Logradouro: turso.Str(r, 1), Numero: turso.Str(r, 2),
		Complemento: turso.Str(r, 3), Bairro: turso.Str(r, 4), Cidade: turso.Str(r, 5), UF: turso.Str(r, 6),
		ConsentimentoEm: turso.Str(r, 7), ConsentimentoPor: turso.Str(r, 8),
		AtualizadoEm: turso.Str(r, 9), AtualizadoPor: turso.Str(r, 10),
		Ponto: ponto,
	}, true, true, nil
}

// mesmaConsultaGeo é verdadeira quando mudam só número, complemento ou
// consentimento: a coordenada (em nível de rua) continua valendo. Na atualização do
// upsert, os nomes sem prefixo são os valores antigos da linha.
const mesmaConsultaGeo = `(cep = excluded.cep AND logradouro = excluded.logradouro AND bairro = excluded.bairro AND cidade = excluded.cidade AND uf = excluded.uf
	AND (COALESCE(geo_precisao, '') <> 'manual' OR (numero = excluded.numero AND complemento = excluded.complemento)))`

// SalvarEndereco grava ou troca o endereço de um cadastro do escopo, registrando o
// consentimento informado agora por quem salva. Devolve false se o cadastro não
// existe, foi excluído ou está fora do escopo.
func (s *Store) SalvarEndereco(ctx context.Context, sc Scope, respostaID int64, e Endereco, por string, now time.Time) (bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return false, nil
	}
	quando := now.UTC().Format(time.RFC3339Nano)
	var lat, lng, fonte, precisao, em any
	guarda, existe := ` WHERE COALESCE(enderecos.geo_precisao, '') <> 'manual'`, ""
	preservar := mesmaConsultaGeo
	if e.RevogarPonto {
		preservar = `0 = 1`
	}
	if e.Ponto != nil {
		lat, lng, fonte, precisao, em = e.Ponto.Lat, e.Ponto.Lng, GeoManual, GeoManual, quando
	}
	params := append([]any{e.CEP, e.Logradouro, e.Numero, e.Complemento, e.Bairro, e.Cidade, e.UF,
		quando, por, quando, por, lat, lng, fonte, precisao, em, respostaID}, args...)
	if e.VersaoEsperada != nil {
		guarda = ` WHERE enderecos.atualizado_em = ?`
		if *e.VersaoEsperada != "" {
			existe = ` AND EXISTS (SELECT 1 FROM enderecos WHERE resposta_id = respostas.id)`
		}
		params = append(params, *e.VersaoEsperada)
		if e.Ponto == nil && !e.RevogarPonto {
			guarda += ` AND (COALESCE(enderecos.geo_precisao, '') <> 'manual' OR ` + mesmaConsultaGeo + `)`
		}
	}
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL: `INSERT INTO enderecos (resposta_id, ` + enderecoCols + `, lat, lng, geo_fonte, geo_precisao, geo_em)
		      SELECT id, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond + existe + `
		      ON CONFLICT(resposta_id) DO UPDATE SET
		      lat = COALESCE(excluded.lat, CASE WHEN ` + preservar + ` THEN lat END),
		      lng = COALESCE(excluded.lng, CASE WHEN ` + preservar + ` THEN lng END),
		      geo_fonte = COALESCE(excluded.geo_fonte, CASE WHEN ` + preservar + ` THEN geo_fonte END),
		      geo_precisao = COALESCE(excluded.geo_precisao, CASE WHEN ` + preservar + ` THEN geo_precisao END),
		      geo_em = COALESCE(excluded.geo_em, CASE WHEN ` + preservar + ` THEN geo_em END),
		      cep = excluded.cep, logradouro = excluded.logradouro,
		      numero = excluded.numero, complemento = excluded.complemento, bairro = excluded.bairro,
		      cidade = excluded.cidade, uf = excluded.uf,
		      consentimento_em = excluded.consentimento_em, consentimento_por = excluded.consentimento_por,
		      atualizado_em = excluded.atualizado_em, atualizado_por = excluded.atualizado_por` + guarda,
		Args: params,
	})
	if err != nil {
		return false, err
	}
	return res[0].Affected > 0, nil
}

// ExcluirEndereco só apaga a versão vista por quem pediu a remoção.
func (s *Store) ExcluirEndereco(ctx context.Context, sc Scope, respostaID int64, versao *string) (bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return false, nil
	}
	alvo := append([]any{respostaID}, args...)
	dono := `SELECT id FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond
	guarda := `COALESCE(geo_precisao, '') <> 'manual'`
	if versao != nil {
		guarda = `atualizado_em = ?`
		alvo = append([]any{*versao}, alvo...)
	}
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL:  `DELETE FROM enderecos WHERE ` + guarda + ` AND resposta_id IN (` + dono + `)`,
		Args: alvo,
	})
	if err != nil {
		return false, err
	}
	return res[0].Affected > 0, nil
}

// ---------------------------------------------------------------------------
// Coordenadas (Spec 003)
// ---------------------------------------------------------------------------

// Precisões possíveis da geocodificação.
const (
	GeoRua           = "rua"
	GeoBairro        = "bairro"
	GeoCidade        = "cidade"
	GeoNaoEncontrado = "nao_encontrado"
)

// PendenteGeo é um endereço ainda sem geocodificação, só com o que vai para a consulta.
type PendenteGeo struct {
	Linha int64
	Endereco
}

// GravarCoordenada grava o resultado da geocodificação, mas só se o endereço
// consultado ainda é o atual (o líder pode ter trocado no meio). Uso interno do
// servidor: não há escopo porque nada é devolvido a um usuário.
func (s *Store) GravarCoordenada(ctx context.Context, respostaID int64, consultado Endereco, lat, lng *float64, fonte, precisao string, now time.Time) (bool, error) {
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL: `UPDATE enderecos SET lat = ?, lng = ?, geo_fonte = ?, geo_precisao = ?, geo_em = ?
		      WHERE resposta_id = ? AND cep = ? AND logradouro = ? AND bairro = ? AND cidade = ? AND uf = ?
		        AND COALESCE(geo_precisao, '') <> 'manual'`,
		Args: []any{numOuNulo(lat), numOuNulo(lng), fonte, precisao, iso(now), respostaID,
			consultado.CEP, consultado.Logradouro, consultado.Bairro, consultado.Cidade, consultado.UF},
	})
	if err != nil {
		return false, err
	}
	return res[0].Affected > 0, nil
}

// PendentesGeo lista até limite endereços de cadastros ativos ainda não geocodificados.
func (s *Store) PendentesGeo(ctx context.Context, limite int) ([]PendenteGeo, error) {
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL: `SELECT e.resposta_id, e.cep, e.logradouro, e.bairro, e.cidade, e.uf FROM enderecos e
		      JOIN respostas r ON r.id = e.resposta_id
		      WHERE r.excluido_em IS NULL AND e.geo_em IS NULL ORDER BY e.resposta_id LIMIT ?`,
		Args: []any{limite},
	})
	if err != nil {
		return nil, err
	}
	out := make([]PendenteGeo, 0, len(res[0].Rows))
	for _, r := range res[0].Rows {
		id, _ := r[0].(int64)
		out = append(out, PendenteGeo{Linha: id, Endereco: Endereco{
			CEP: turso.Str(r, 1), Logradouro: turso.Str(r, 2), Bairro: turso.Str(r, 3), Cidade: turso.Str(r, 4), UF: turso.Str(r, 5)}})
	}
	return out, nil
}

// PontoMapa é a situação de geocodificação de uma pessoa do escopo que tem
// endereço. Só o servidor vê a coordenada; a API do mapa a converte no centro de
// uma grade antes de responder. Pendente = ainda sem tentativa de geocodificação.
type PontoMapa struct {
	Linha    int64
	Lat, Lng *float64
	Precisao string
	Pendente bool
	// Destaques (Spec 014): células que a pessoa lidera (login de célula ativo ligado ao
	// cadastro) e células que se reúnem na casa dela. Só células ativas.
	LiderCelula, CasaCelula []string
}

// sqlLiderCelula e sqlCasaCelula listam as células ativas, separadas por quebra de linha.
const sqlLiderCelula = `(SELECT group_concat(nome, char(10)) FROM (SELECT DISTINCT c.nome, c.ordem FROM usuarios u
	  JOIN usuario_escopos ue ON ue.usuario = u.usuario AND ue.tipo = 'CELULA'
	  JOIN celulas c ON c.nome = ue.nome AND c.ativa = 1
	  WHERE u.resposta_id = e.resposta_id AND u.ativo = 1 AND u.perfil = 'CELULA' ORDER BY c.ordem, c.nome))`
const sqlCasaCelula = `(SELECT group_concat(nome, char(10)) FROM (SELECT c.nome FROM celulas c
	  WHERE c.anfitriao_id = e.resposta_id AND c.ativa = 1 ORDER BY c.ordem, c.nome))`

// PontosMapa devolve, no escopo, todas as pessoas com endereço e a situação da
// coordenada (com posição, sem posição ou pendente). Inclui os líderes de área e de
// setor (Spec 014), com o mesmo escopo de Pessoas.
func (s *Store) PontosMapa(ctx context.Context, sc Scope) ([]PontoMapa, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return nil, nil
	}
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL: `SELECT e.resposta_id, e.lat, e.lng, e.geo_precisao, e.geo_em IS NULL, ` + sqlLiderCelula + `, ` + sqlCasaCelula + ` FROM enderecos e
		      WHERE e.resposta_id IN (SELECT id FROM respostas WHERE excluido_em IS NULL AND ` + cond + `)`,
		Args: args,
	})
	if err != nil {
		return nil, err
	}
	out := make([]PontoMapa, 0, len(res[0].Rows))
	for _, r := range res[0].Rows {
		id, _ := r[0].(int64)
		p := PontoMapa{Linha: id, Precisao: turso.Str(r, 3)}
		lat, ok1 := r[1].(float64)
		lng, ok2 := r[2].(float64)
		if ok1 && ok2 {
			p.Lat, p.Lng = &lat, &lng
		}
		pend, _ := r[4].(int64)
		p.Pendente = pend == 1
		p.LiderCelula, p.CasaCelula = linhasDe(turso.Str(r, 5)), linhasDe(turso.Str(r, 6))
		out = append(out, p)
	}
	return out, nil
}

// linhasDe separa o group_concat por quebra de linha; vazio vira nil.
func linhasDe(s string) []string {
	if s == "" {
		return nil
	}
	return strings.Split(s, "\n")
}

func numOuNulo(v *float64) any {
	if v == nil {
		return nil
	}
	return *v
}
