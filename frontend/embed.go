// Package frontend embute as páginas e o JavaScript compilado dentro do binário do servidor.
package frontend

import "embed"

//go:embed index.html style.css design-tokens.css tailwind.css app.js admin/index.html admin/admin.css admin/dashboard.css admin/users.css admin/admin.js admin/dashboard.js admin/users.js
var FS embed.FS
