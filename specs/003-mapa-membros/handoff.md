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

### T003 / Issue #62 — 2026-11-21
- Agente: Claude Code. Branch `feat/issue-62-geocodificacao`.
- Feito: pacote `internal/geo` com cliente Nominatim. User-Agent
  `VEC-AreaVEC/<versão> (+https://github.com/felipedossantos896/vec)`, limitador
  global de 1 req/s (4/min na carga única), cache em memória, tentativas
  rua → bairro → cidade → `nao_encontrado` e `GEOCODER=off`. A consulta leva rua,
  bairro, cidade e UF, sem número, complemento nem CEP. Os erros nunca levam a URL,
  para o endereço não ir ao log. `endereco_salvar` dispara a geocodificação em
  segundo plano, e uma falha deixa o endereço pendente. Comando
  `backend/cmd/geocodificar` para a carga única, idempotente, com saída só em
  contagens.
- Testes: `go test -race` em `api` e `geo`, com Nominatim falso: consulta sem dados
  pessoais, User-Agent, recuo de precisão, erro de serviço que não vira "não
  encontrado", limitador entre goroutines, cache, interruptor, gravação do endereço
  consultado, salvamento não afetado por falha e log sem endereço. Uma consulta real
  com endereço público (Praça da Sé, SP) retornou precisão `rua` dentro de São Paulo.
- Pendente: a carga única em produção fica para a T006.
- Próximo: T004 / #63, a API do mapa.
