# Tarefas — Nova identidade e telas centradas no mapa

As Issues e o `graph.json` serão criados após a aprovação da spec e dos ADRs.

- [ ] **T001 — Decisões**: respostas às questões em aberto; ADRs 0009–0011 para Aceito
  (e 0002 para Substituído).
- [ ] **T002 — Base visual**: fontes, tokens, componentes e avatar; telas atuais passam
  a usar a base sem mudar de lugar. *Dep.: T001.*
- [ ] **T003 — Cor e encontro da célula**: migration 0013, Ajustes de células e uso da
  cor em selos e formulário. *Dep.: T002.*
- [ ] **T004 — Área**: mapa com rostos, lentes, card da pessoa e blocos de baixo;
  Acompanhar e Mapa saem do menu. *Dep.: T003.*
- [ ] **T005 — Ferramentas no mapa**: anfitrião e multiplicação na Área. *Dep.: T004.*
- [ ] **T006 — Contato estruturado**: migration 0014, diálogo, linha do tempo e
  lembrete. *Dep.: T002.*
- [ ] **T007 — Pessoas e ficha**: tabela, gaveta com as três abas, editar e excluir.
  *Dep.: T006.*
- [ ] **T008 — Indicadores**: migration 0015, retrato mensal e tela nova. *Dep.: T002.*
- [ ] **T009 — Ajustes**: usuários e setores no padrão novo. *Dep.: T003.*
- [ ] **T010 — Formulário público e login**. *Dep.: T003.*
- [ ] **T011 — Visão do discipulador**. *Dep.: T007.*
- [ ] **T012 — Estados de tela** em todas as telas. *Dep.: T004, T007.*
- [ ] **T013 — Validação e release**: cenários 1 a 9 em `vec-dev` e produção.
  *Dep.: T005, T008, T009, T010, T011, T012.*
