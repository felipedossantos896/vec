// Package auth cuida de senhas e sessões. Só usa a biblioteca padrão do Go.
package auth

import (
	"crypto/hmac"
	"crypto/pbkdf2"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Iterações do PBKDF2-HMAC-SHA256 (recomendação atual da OWASP: 600.000).
// Cada login leva algumas centenas de milissegundos por causa disso, de propósito.
const Iterations = 600_000

const (
	hashPrefix = "pbkdf2-sha256"
	saltBytes  = 16
	keyBytes   = 32
)

var b64 = base64.RawStdEncoding

// HashPassword gera "pbkdf2-sha256$iterações$salt$hash" (base64).
func HashPassword(password string) (string, error) {
	return hashWithIterations(password, Iterations)
}

func hashWithIterations(password string, iter int) (string, error) {
	salt := make([]byte, saltBytes)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key, err := pbkdf2.Key(sha256.New, password, salt, iter, keyBytes)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%s$%d$%s$%s", hashPrefix, iter, b64.EncodeToString(salt), b64.EncodeToString(key)), nil
}

// VerifyPassword compara a senha com um hash gerado por HashPassword.
func VerifyPassword(password, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 4 || parts[0] != hashPrefix {
		return false
	}
	iter, err := strconv.Atoi(parts[1])
	if err != nil || iter < 1 || iter > 5_000_000 {
		return false
	}
	salt, err := b64.DecodeString(parts[2])
	if err != nil {
		return false
	}
	want, err := b64.DecodeString(parts[3])
	if err != nil || len(want) == 0 {
		return false
	}
	got, err := pbkdf2.Key(sha256.New, password, salt, iter, len(want))
	if err != nil {
		return false
	}
	return subtle.ConstantTimeCompare(got, want) == 1
}

// Fingerprint é uma "impressão digital" curta do hash da senha. Vai dentro do
// token: se a senha mudar, as sessões antigas deixam de valer.
func Fingerprint(encodedHash string) string {
	sum := sha256.Sum256([]byte(encodedHash))
	return b64.EncodeToString(sum[:9])
}

// ---------------------------------------------------------------------------
// Tokens de sessão: v1.<payload>.<assinatura>
// ---------------------------------------------------------------------------

type claims struct {
	U string `json:"u"` // usuário
	E int64  `json:"e"` // expira (unix)
	F string `json:"f"` // fingerprint da senha
}

var (
	ErrToken   = errors.New("token inválido")
	ErrExpired = errors.New("token expirado")
)

func sign(secret []byte, data string) string {
	m := hmac.New(sha256.New, secret)
	m.Write([]byte(data))
	return b64.EncodeToString(m.Sum(nil))
}

// NewToken cria um token assinado válido por ttl.
func NewToken(secret []byte, user, fingerprint string, ttl time.Duration, now time.Time) string {
	payload, _ := json.Marshal(claims{U: user, E: now.Add(ttl).Unix(), F: fingerprint})
	body := "v1." + b64.EncodeToString(payload)
	return body + "." + sign(secret, body)
}

// ParseToken confere assinatura e validade e devolve usuário e fingerprint.
func ParseToken(secret []byte, token string, now time.Time) (user, fingerprint string, err error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 || parts[0] != "v1" {
		return "", "", ErrToken
	}
	body := parts[0] + "." + parts[1]
	if !hmac.Equal([]byte(sign(secret, body)), []byte(parts[2])) {
		return "", "", ErrToken
	}
	raw, err := b64.DecodeString(parts[1])
	if err != nil {
		return "", "", ErrToken
	}
	var c claims
	if err := json.Unmarshal(raw, &c); err != nil || c.U == "" {
		return "", "", ErrToken
	}
	if now.Unix() >= c.E {
		return "", "", ErrExpired
	}
	return c.U, c.F, nil
}
