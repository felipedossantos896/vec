# Tarefas — Recomendação de anfitriões

As Issues e o `graph.json` serão criados após a aprovação da spec e do ADR-0006.

- [ ] **T001 — Decisões**: registrar as decisões do responsável e as respostas às
  questões em aberto; ADR-0006 para Aceito.
  - Dependências: nenhuma.
  - Verificação: spec aprovada; ADR atualizado.
- [ ] **T002 — Confirmação de anfitrião no store**: migration `0012`,
  `store/anfitrioes.go` com escopo e remoção junto com o cadastro.
  - Dependências: T001.
  - Verificação: testes de store para escopo e remoção.
- [ ] **T003 — API da confirmação**: `anfitriao_ler`, `anfitriao_salvar` e
  `anfitriao_excluir`, com validação e confirmação obrigatória.
  - Dependências: T002.
  - Verificação: testes de validação e de fora do escopo.
- [ ] **T004 — Ranking**: pacote `anfitriao` (Haversine, ordenação, capacidade) e ação
  `anfitrioes_ranking`.
  - Dependências: T002.
  - Verificação: testes de ordem, desempate, capacidade, sem posição e resposta sem
    coordenada.
- [ ] **T005 — Telas**: seção Anfitrião na ficha e painel "Escolher anfitrião" na aba
  Mapa.
  - Dependências: T003, T004.
  - Verificação: testes de frontend e tela em 390×844 e 1440×900.
- [ ] **T006 — Validação e release**: cenários de aceite 1 a 8, ponta a ponta em
  `vec-dev` e rollback.
  - Dependências: T005.
  - Verificação: CI verde, `/version` publicado e cenários conferidos.

## Dependências
T001 precede T002; T002 precede T003 e T004; T005 depende de T003 e T004; T006 depende de T005.
