package studio

import "embed"

//go:embed index.html inventory.json foundations/*.css studio/*.css studio/*.js screens/*.html screens/*.js screens/*.css screens/*.svg access/*.html access/*.js access/*.css
var FS embed.FS
