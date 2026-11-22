# Tarefas — CSP

Issues #109 a #113; dependências em [`graph.json`](graph.json).

- [x] **T001 (#109) — Decisões**: spec com as decisões do responsável.
- [x] **T002 (#110) — Fontes locais**: woff2, licença, `@font-face`; sem Google Fonts.
  - Dependências: T001.
- [x] **T003 (#111) — Sem estilos inline**: classes e estilos aplicados por JavaScript.
  - Dependências: T001.
- [x] **T004 (#112) — Cabeçalho CSP**: aplicado em todas as páginas, com o teste de telas
  que falha a qualquer violação.
  - Dependências: T002, T003.
- [x] **T005 (#113) — Validação**: cenários 1 a 5 em produção.
  - Dependências: T004.
