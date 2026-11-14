// Package frontend embute o formulário e o painel dentro do binário do servidor.
package frontend

import "embed"

//go:embed index.html admin/index.html
var FS embed.FS
