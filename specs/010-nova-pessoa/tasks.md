# Tarefas — Cadastrar nova pessoa pelo painel

Issues #145 a #148; dependências em [`graph.json`](graph.json).

- [x] **T001 (#145) — Aprovação**: decisões registradas na spec; status para Aprovada.
- [x] **T002 (#146) — Servidor**: migration 0016, ação `registro_criar` com escopo, autorização,
  duplicado e idempotência; testes Go. *Dep.: T001.*
- [x] **T003 (#147) — Painel**: botão Nova pessoa, diálogo, aviso de duplicado e ficha aberta na
  trilha; regras puras com teste. *Dep.: T002.*
- [x] **T004 (#148) — Validação e release**: cenários 1 a 8 no `vec-dev` e conferência em produção;
  `release-validation.md`. *Dep.: T003.*
