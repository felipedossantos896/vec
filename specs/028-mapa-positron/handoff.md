# Handoff

T001 / #294 na branch `claude/mapa-positron`.

- `mapa.ts`: `iniciarFundoVetorial` (Positron do OpenFreeMap via `L.maplibreGL`) e `usarFundoOSM` (alternativa). A atribuição é adicionada à mão, porque o adaptador não a repassa.
- `middleware.go`: `cspPainel` para `/admin/`, `/admin/index.html` e o worker; o teste cobre painel e páginas comuns.
- `admin/vendor/maplibre`: arquivos e hashes em `VERSAO.txt`; `embed.go` atualizado.

Verificado: typecheck, build, 99 testes de frontend, Go vet/test, `git diff --check`. No Playwright (Chromium, 1440×900 e 390×844, com a CSP do painel aplicada), o Positron carrega sem erro de CSP. Com o OpenFreeMap bloqueado, o mapa volta ao OpenStreetMap com a atribuição certa.

Próximo passo: conferir em produção após o deploy.
