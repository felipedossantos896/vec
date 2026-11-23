# Tarefas — Nova identidade e telas centradas no mapa

Issues #120 a #132; dependências em [`graph.json`](graph.json).

- [x] **T001 (#120) — Decisões**: respostas às questões em aberto; ADRs 0009–0011 para Aceito
  (e 0002 para Substituído).
- [x] **T002 (#121) — Base visual**: fontes, tokens, componentes e avatar; telas atuais passam
  a usar a base sem mudar de lugar. *Dep.: T001.*
- [x] **T003 (#122) — Cor e encontro da célula**: migration 0013, Ajustes de células e uso da
  cor em selos e formulário. *Dep.: T002.*
- [x] **T004 (#123) — Área**: mapa com rostos, lentes, card da pessoa e blocos de baixo;
  Acompanhar e Mapa saem do menu. *Dep.: T003.*
- [x] **T005 (#124) — Ferramentas no mapa**: anfitrião e multiplicação na Área. *Dep.: T004.*
- [x] **T006 (#125) — Contato estruturado**: migration 0014, diálogo, linha do tempo e
  lembrete. *Dep.: T002.*
- [x] **T007 (#126) — Pessoas e ficha**: tabela, gaveta com as três abas, editar e excluir.
  *Dep.: T006.*
- [x] **T008 (#127) — Indicadores**: migration 0015, retrato mensal e tela nova. *Dep.: T002.*
- [x] **T009 (#128) — Ajustes**: usuários e setores no padrão novo. *Dep.: T003.*
- [x] **T010 (#129) — Formulário público e login**. *Dep.: T003.*
- [x] **T011 (#130) — Visão do discipulador**. *Dep.: T007.*
- [x] **T012 (#131) — Estados de tela** em todas as telas. *Dep.: T004, T007.*
- [x] **T013 (#132) — Validação e release**: cenários 1 a 9 em `vec-dev` e produção.
  *Dep.: T005, T008, T009, T010, T011, T012.*
