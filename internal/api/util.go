package api

import (
	"regexp"
	"strings"
	"time"

	"vec/internal/store"
)

// Fortaleza não tem horário de verão desde 2019: UTC-3 fixo dispensa o banco de fusos.
var fusoBR = time.FixedZone("-03", -3*60*60)

var reUsuario = regexp.MustCompile(`^[a-z0-9._-]{3,30}$`)

func normUser(s string) string { return strings.ToLower(strings.TrimSpace(s)) }

func validUser(s string) bool { return reUsuario.MatchString(s) }

// NormUser e ValidUser são usados também pelos comandos de linha (cmd/usuario).
func NormUser(s string) string { return normUser(s) }

func ValidUser(s string) bool { return validUser(s) }

// fmtLocal converte um instante ISO (UTC) para "dd/MM/yyyy HH:mm:ss" em Fortaleza.
func fmtLocal(iso string) string {
	if iso == "" {
		return ""
	}
	t, err := time.Parse(time.RFC3339, iso)
	if err != nil {
		return iso
	}
	return t.In(fusoBR).Format("02/01/2006 15:04:05")
}

func nomeOuUsuario(u *store.User) string {
	if u.Nome != "" {
		return u.Nome
	}
	return u.Usuario
}

func nonNil(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}

// cleanLine limpa um texto de uma linha só: tira caracteres de controle e
// quebras de linha, apara espaços e limita o tamanho (em caracteres).
func cleanLine(s string, max int) string {
	return clean(s, max, false)
}

// cleanText é como cleanLine, mas preserva quebras de linha (campos longos).
func cleanText(s string, max int) string {
	return clean(s, max, true)
}

func clean(s string, max int, multiline bool) string {
	s = strings.ToValidUTF8(s, "")
	var b strings.Builder
	n := 0
	for _, r := range s {
		if r == '\n' || r == '\r' || r == '\t' {
			if !multiline {
				r = ' '
			} else if r == '\r' {
				continue
			}
		} else if r < 32 || r == 127 {
			continue
		}
		if n >= max {
			break
		}
		b.WriteRune(r)
		n++
	}
	return strings.TrimSpace(b.String())
}

func cleanList(in []string) []string {
	var out []string
	seen := map[string]bool{}
	for _, s := range in {
		s = cleanLine(strings.NewReplacer(",", " ", ";", " ").Replace(s), 100)
		k := strings.ToLower(s)
		if s == "" || seen[k] {
			continue
		}
		seen[k] = true
		out = append(out, s)
		if len(out) >= 30 {
			break
		}
	}
	return out
}
