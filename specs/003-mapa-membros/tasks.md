# Tarefas — Mapa de membros

Issues: T001 #60, T002 #61, T003 #62, T004 #63, T005 #64, T006 #65 (ver `graph.json`).

- [x] **T001 — Decisões e políticas**: registrar as decisões do responsável, o contato
  do User-Agent e a reconferência das políticas Nominatim/OSM; ADR-0005 para Aceito.
  - Dependências: nenhuma.
  - Verificação: spec sem questões bloqueantes; ADR atualizado.
- [ ] **T002 — Coordenadas no store**: migration `0011`, invalidação ao mudar o
  endereço, `GravarCoordenada`, `PendentesGeo` e `PontosMapa` com escopo.
  - Dependências: T001.
  - Verificação: testes de store para escopo, invalidação e gravação condicional.
- [ ] **T003 — Geocodificação no servidor**: pacote `geo` (Nominatim, limitador,
  fallback, interruptor), disparo após salvar e comando `geocodificar`.
  - Dependências: T002.
  - Verificação: testes com Nominatim falso (consulta sem número/complemento,
    User-Agent, 1 req/s, `GEOCODER=off`, falhas não bloqueiam o salvamento).
- [ ] **T004 — API do mapa**: ação `mapa` com agrupamento em grade de ~300 m e lista
  "sem posição", sempre no escopo.
  - Dependências: T002.
  - Verificação: nenhuma coordenada exata, número ou complemento na resposta; fora
    do escopo ausente.
- [ ] **T005 — Visão Mapa**: Leaflet versionado, tiles OSM com atribuição, grupos
  focáveis, lista equivalente e filtros compartilhados.
  - Dependências: T004.
  - Verificação: testes de frontend e tela em 390×844 e 1440×900 com os tiles simulados.
- [ ] **T006 — Validação e release**: carga única em produção, cenários 1 a 8,
  rollback e revisão da retenção.
  - Dependências: T003, T005.
  - Verificação: CI verde, `/version` publicado e cenários conferidos.

## Dependências
T001 precede T002; T002 precede T003 e T004; T004 precede T005; T006 depende de T003 e T005.
