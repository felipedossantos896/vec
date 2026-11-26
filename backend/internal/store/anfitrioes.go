package store

import (
	"context"
	"strings"
	"time"

	"vec/backend/internal/turso"
)

// ---------------------------------------------------------------------------
// Confirmação de anfitrião (Spec 004)
// ---------------------------------------------------------------------------
// Como o endereço, é lida e gravada só dentro do escopo de quem pede, com o escopo
// na própria instrução SQL. A validação (capacidade, dias, observação e a
// confirmação) fica na API.

type Anfitriao struct {
	Capacidade int
	Dias       []string // siglas seg..dom, na ordem da semana
	Observacao string

	// Preenchidos pelo store a partir de quem salva; ignorados na entrada.
	ConfirmadoEm  string
	ConfirmadoPor string
}

// Anfitriao devolve a confirmação de um cadastro do escopo. visivel=false quando o
// cadastro não existe, foi excluído ou está fora do escopo; tem=false quando ele é
// visível mas não tem confirmação.
func (s *Store) Anfitriao(ctx context.Context, sc Scope, respostaID int64) (a Anfitriao, tem, visivel bool, err error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return Anfitriao{}, false, false, nil
	}
	alvo := append([]any{respostaID}, args...)
	dono := `SELECT id FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: dono, Args: alvo},
		turso.Stmt{SQL: `SELECT capacidade, dias, observacao, confirmado_em, confirmado_por FROM anfitrioes WHERE resposta_id IN (` + dono + `)`, Args: alvo},
	)
	if err != nil || len(res[0].Rows) == 0 {
		return Anfitriao{}, false, false, err
	}
	if len(res[1].Rows) == 0 {
		return Anfitriao{}, false, true, nil
	}
	r := res[1].Rows[0]
	return Anfitriao{
		Capacidade: inteiro(r[0]), Dias: separarDias(turso.Str(r, 1)), Observacao: turso.Str(r, 2),
		ConfirmadoEm: turso.Str(r, 3), ConfirmadoPor: turso.Str(r, 4),
	}, true, true, nil
}

// SalvarAnfitriao grava ou troca a confirmação de um cadastro do escopo,
// registrando quem confirmou agora. Devolve false se o cadastro não existe, foi
// excluído ou está fora do escopo.
func (s *Store) SalvarAnfitriao(ctx context.Context, sc Scope, respostaID int64, a Anfitriao, por string, now time.Time) (bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return false, nil
	}
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL: `INSERT INTO anfitrioes (resposta_id, capacidade, dias, observacao, confirmado_em, confirmado_por)
		      SELECT id, ?, ?, ?, ?, ? FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond + `
		      ON CONFLICT(resposta_id) DO UPDATE SET
		      capacidade = excluded.capacidade, dias = excluded.dias, observacao = excluded.observacao,
		      confirmado_em = excluded.confirmado_em, confirmado_por = excluded.confirmado_por`,
		Args: append([]any{int64(a.Capacidade), strings.Join(a.Dias, ","), a.Observacao, iso(now), por, respostaID}, args...),
	})
	if err != nil {
		return false, err
	}
	return res[0].Affected > 0, nil
}

// ExcluirAnfitriao apaga de fato a confirmação de um cadastro do escopo. Devolve
// false se o cadastro não existe, foi excluído ou está fora do escopo.
func (s *Store) ExcluirAnfitriao(ctx context.Context, sc Scope, respostaID int64) (bool, error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return false, nil
	}
	alvo := append([]any{respostaID}, args...)
	dono := `SELECT id FROM respostas WHERE id = ? AND excluido_em IS NULL AND ` + cond
	res, err := s.DB.Do(ctx,
		turso.Stmt{SQL: dono, Args: alvo},
		turso.Stmt{SQL: `DELETE FROM anfitrioes WHERE resposta_id IN (` + dono + `)`, Args: alvo},
	)
	if err != nil {
		return false, err
	}
	return len(res[0].Rows) > 0, nil
}

// posicaoRanking só aceita coordenadas de rua ou bairro: pela cidade é impreciso
// demais para comparar casas (Spec 004, requisito 3).
const posicaoRanking = `e.geo_precisao IN ('rua', 'bairro', 'manual') AND e.lat IS NOT NULL AND e.lng IS NOT NULL`

// O ranking usa o centro da grade para pontos confirmados, como o mapa geral.
const latRanking = `CASE WHEN e.geo_precisao = 'manual' THEN (CAST((e.lat + 180) / 0.003 AS INTEGER) + 0.5) * 0.003 - 180 ELSE e.lat END`
const lngRanking = `CASE WHEN e.geo_precisao = 'manual' THEN (CAST((e.lng + 180) / 0.003 AS INTEGER) + 0.5) * 0.003 - 180 ELSE e.lng END`

// CandidatoAnfitriao é uma pessoa confirmada do escopo. Lat/Lng ficam nil quando
// não há endereço geocodificado pela rua ou pelo bairro. Só o servidor vê a
// coordenada; a API devolve apenas distâncias.
type CandidatoAnfitriao struct {
	Linha      int64
	Nome       string
	Capacidade int
	Dias       []string
	Lat, Lng   *float64
	PeloBairro bool
}

// CandidatosAnfitriao devolve as pessoas confirmadas do escopo e quantas marcaram
// interesse no formulário mas ainda não têm confirmação.
func (s *Store) CandidatosAnfitriao(ctx context.Context, sc Scope) (cands []CandidatoAnfitriao, interessadosSemConfirmacao int, err error) {
	cond, args, ok := escopoSQL(sc)
	if !ok {
		return nil, 0, nil
	}
	noEscopo := `SELECT id FROM respostas WHERE excluido_em IS NULL AND ` + cond
	res, err := s.DB.Do(ctx,
		turso.Stmt{
			SQL: `SELECT a.resposta_id, r.nome, a.capacidade, a.dias,
			      CASE WHEN ` + posicaoRanking + ` THEN ` + latRanking + ` END, CASE WHEN ` + posicaoRanking + ` THEN ` + lngRanking + ` END,
			      e.geo_precisao = 'bairro'
			      FROM anfitrioes a JOIN respostas r ON r.id = a.resposta_id
			      LEFT JOIN enderecos e ON e.resposta_id = a.resposta_id
			      WHERE a.resposta_id IN (` + noEscopo + `) ORDER BY r.nome, a.resposta_id`,
			Args: args,
		},
		turso.Stmt{
			SQL: `SELECT COUNT(*) FROM respostas WHERE interesse_anfitriao = 'S' AND id IN (` + noEscopo + `)
			      AND id NOT IN (SELECT resposta_id FROM anfitrioes)`,
			Args: args,
		},
	)
	if err != nil {
		return nil, 0, err
	}
	cands = make([]CandidatoAnfitriao, 0, len(res[0].Rows))
	for _, r := range res[0].Rows {
		id, _ := r[0].(int64)
		c := CandidatoAnfitriao{Linha: id, Nome: turso.Str(r, 1), Capacidade: inteiro(r[2]), Dias: separarDias(turso.Str(r, 3))}
		c.Lat, c.Lng = coordenada(r[4], r[5])
		bairro, _ := r[6].(int64)
		c.PeloBairro = c.Lat != nil && bairro == 1
		cands = append(cands, c)
	}
	if len(res[1].Rows) > 0 {
		interessadosSemConfirmacao = inteiro(res[1].Rows[0][0])
	}
	return cands, interessadosSemConfirmacao, nil
}

// MembroPosicao é um membro da célula; Lat/Lng nil quando ele não tem posição de
// rua ou bairro.
type MembroPosicao struct {
	Linha    int64
	Lat, Lng *float64
}

// MembrosCelula devolve os membros ativos de uma célula dentro do escopo.
// visivel=false quando a célula não tem ninguém no escopo (fora do escopo, vazia
// ou inexistente): a API responde "não encontrado" sem distinguir os casos.
func (s *Store) MembrosCelula(ctx context.Context, sc Scope, celula string) (membros []MembroPosicao, visivel bool, err error) {
	cond, args, ok := escopoSQL(sc)
	if !ok || strings.TrimSpace(celula) == "" {
		return nil, false, nil
	}
	res, err := s.DB.Do(ctx, turso.Stmt{
		SQL: `SELECT r.id, CASE WHEN ` + posicaoRanking + ` THEN ` + latRanking + ` END, CASE WHEN ` + posicaoRanking + ` THEN ` + lngRanking + ` END
		      FROM respostas r LEFT JOIN enderecos e ON e.resposta_id = r.id
		      WHERE r.id IN (SELECT id FROM respostas WHERE celula = ? COLLATE NOCASE AND excluido_em IS NULL AND ` + cond + `)
		      ORDER BY r.id`,
		Args: append([]any{celula}, args...),
	})
	if err != nil {
		return nil, false, err
	}
	membros = make([]MembroPosicao, 0, len(res[0].Rows))
	for _, r := range res[0].Rows {
		id, _ := r[0].(int64)
		m := MembroPosicao{Linha: id}
		m.Lat, m.Lng = coordenada(r[1], r[2])
		membros = append(membros, m)
	}
	return membros, len(membros) > 0, nil
}

func coordenada(a, b any) (*float64, *float64) {
	lat, ok1 := a.(float64)
	lng, ok2 := b.(float64)
	if !ok1 || !ok2 {
		return nil, nil
	}
	return &lat, &lng
}

func inteiro(v any) int {
	switch n := v.(type) {
	case int64:
		return int(n)
	case float64:
		return int(n)
	}
	return 0
}

func separarDias(s string) []string {
	if s == "" {
		return nil
	}
	return strings.Split(s, ",")
}
