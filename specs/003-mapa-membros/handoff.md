# Handoff — Spec 003, mapa de membros

Estado verificável entre agentes. Não substitui `graph.json`, Issues, CI nem revisão.

### T002 / Issue #61 — 2026-11-21
- Agente: Claude Code. Branch `feat/issue-61-coordenadas`.
- Feito: migration aditiva `0011_endereco_coordenadas.sql` (`lat`, `lng`,
  `geo_fonte`, `geo_precisao`, `geo_em`). `SalvarEndereco` invalida a coordenada só
  quando muda CEP, rua, bairro, cidade ou UF; número e complemento não invalidam,
  porque não vão ao Nominatim. `GravarCoordenada` grava só se o endereço ainda é o
  consultado. `PendentesGeo` lista cadastros ativos sem tentativa, e `PontosMapa`
  devolve coordenadas com escopo no SQL.
- Testes: `go test ./...`, `go vet ./...`, `gofmt`. No SQLite real, com o SQL do
  código: trocar o número mantém a coordenada, trocar a rua invalida, e gravar um
  endereço antigo não afeta nenhuma linha.
- Próximo: T003 / #62 (geocodificação) e T004 / #63 (API do mapa), que podem seguir
  em paralelo.
