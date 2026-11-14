// Package frontend embute o formulário e o painel dentro do binário do servidor.
package frontend

import "embed"

//go:embed index.html style.css app.js admin/index.html admin/admin.css admin/admin.js admin/users.js
var FS embed.FS
