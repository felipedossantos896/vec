# Tarefas — Líderes de área e de setor sem célula fixa

Issues #168 a #171; dependências em [`graph.json`](graph.json).

- [x] **T001 (#168) — Aprovação**: decisões e pontos confirmados na spec; status para Aprovada.
- [ ] **T002 (#169) — Servidor**: migration 0017, papel em listar/pessoas/registro_criar, cadastro do
  líder e sincronização em usuario_salvar, retrato e mapa só com membros; testes Go.
  *Dep.: T001.*
- [ ] **T003 (#170) — Painel**: etiqueta e filtro Liderança, exclusões por papel, ficha do líder de
  área sem jornada, Nova pessoa com Liderança, Criar cadastro em Ajustes e grupo Liderança
  na escolha do discipulador; regras puras com teste. *Dep.: T002.*
- [ ] **T004 (#171) — Validação e release**: cenários 1 a 9 no `vec-dev` e conferência em produção;
  `release-validation.md`. *Dep.: T003.*
