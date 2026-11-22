// Package frontend embute as páginas e o JavaScript compilado dentro do binário do servidor.
package frontend

import "embed"

//go:embed fonts/fonts.css fonts/*.woff2 fonts/OFL-bricolagegrotesque.txt fonts/OFL-instrumentsans.txt index.html style.css design-tokens.css tailwind.css celula-regras.js app.js contato.js admin/index.html admin/admin.css admin/dashboard.css admin/users.css admin/editar.css admin/acompanhar.css admin/fotos.css admin/admin.js admin/metrics.js admin/dashboard.js admin/detalhe.js admin/charts.js admin/acompanhamento.js admin/editar.js admin/discipulado.js admin/estrutura.js admin/anotacoes.js admin/avatar-regras.js admin/fotos.js admin/endereco-regras.js admin/enderecos.js admin/mapa-regras.js admin/mapa.js admin/vendor/leaflet/leaflet.js admin/vendor/leaflet/leaflet.css admin/vendor/leaflet/LICENSE admin/mapa.css admin/anfitriao.css admin/anfitriao-regras.js admin/anfitriao.js admin/multiplicacao-regras.js admin/multiplicacao.js admin/users.js
var FS embed.FS
