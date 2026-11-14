// Package migrations embute os arquivos .sql dentro do binário.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
