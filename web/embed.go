// Package web embute o formulário e o painel dentro do binário do servidor.
package web

import "embed"

//go:embed index.html admin/index.html
var FS embed.FS
