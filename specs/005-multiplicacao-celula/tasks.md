# Tarefas — Planejar a multiplicação de uma célula

As Issues e o `graph.json` serão criados após a aprovação da spec e do ADR-0007.

- [ ] **T001 — Decisões**: registrar as decisões e as respostas às questões em
  aberto; ADR-0007 para Aceito.
  - Dependências: nenhuma.
  - Verificação: spec aprovada; ADR atualizado.
- [ ] **T002 — Divisão**: `anfitriao.Dividir` (par mais distante, corte na mediana,
  sem posição no menor).
  - Dependências: T001.
  - Verificação: testes de agrupamento, determinismo, equilíbrio e casos pequenos.
- [ ] **T003 — API `multiplicacao`**: proposta e ajuste, com anfitriões por grupo.
  - Dependências: T002.
  - Verificação: testes de validação dos grupos, escopo, resposta sem coordenada e
    nenhuma escrita.
- [ ] **T004 — Tela**: painel "Planejar multiplicação" na aba Mapa.
  - Dependências: T003.
  - Verificação: testes de frontend e tela em 390×844 e 1440×900 com teclado.
- [ ] **T005 — Validação e release**: cenários de aceite 1 a 8 ponta a ponta em
  `vec-dev` e rollback.
  - Dependências: T004.
  - Verificação: CI verde, `/version` publicado e cenários conferidos.

## Dependências
T001 → T002 → T003 → T004 → T005.
