# Tarefas — Liderança e casa da célula no mapa, card enxuto e ícones

Issues #176 a #179; dependências em [`graph.json`](graph.json).

- [x] **T001 (#176) — Aprovação**: decisões e pontos confirmados na spec; ADR-0012 aceita; status
  para Aprovada.
- [x] **T002 (#177) — Servidor**: líderes em `PontosMapa` no escopo; `destaques` (líder de célula
  e casa) na resposta do `mapa`; testes Go. *Dep.: T001.*
- [x] **T003 (#178) — Painel**: pacote de ícones Phosphor, selos e anel da casa no mapa e no leque,
  card enxuto com botões-ícone, "x" de 44 px com animação e som, botão "Sons" na barra
  lateral; regras puras com teste. *Dep.: T002.*
- [ ] **T004 (#179) — Validação e release**: cenários 1 a 8 no `vec-dev` e conferência em
  produção; `release-validation.md`. *Dep.: T003.*
