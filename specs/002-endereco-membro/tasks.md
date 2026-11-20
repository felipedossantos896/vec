# Tarefas — Endereço do membro

Issues: T001 #53, T002 #48, T003 #49, T004 #50, T005 #51, T006 #52 (ver `graph.json`).

- [x] **T001 — Decisões de privacidade**: respostas registradas na spec em 2026-11-20
  (quem vê, entrada, busca por CEP, texto do consentimento). Retenção fica para a T006.
  - Dependências: nenhuma.
  - Verificação: spec sem questões bloqueantes para T002–T005.
- [ ] **T002 — Tabela e store de endereço**: migration `0010_enderecos.sql` e
  `store/enderecos.go` (ler, salvar e remover com escopo; remoção junto com a
  exclusão do cadastro).
  - Dependências: T001.
  - Verificação: testes de store para AREA/SETOR/CELULA, cadastro excluído e
    remoção definitiva; `go test ./...`.
- [ ] **T003 — API de endereço**: ações `endereco_ler`, `endereco_salvar` e
  `endereco_excluir`, com validação e consentimento obrigatório.
  - Dependências: T002.
  - Verificação: testes de API para cada validação e para fora de escopo como
    `nao_encontrado`; contrato de `listar`/CSV sem endereço.
- [ ] **T004 — Endereço na ficha**: seção, formulário, consentimento, remoção e
  estados de interface.
  - Dependências: T003.
  - Verificação: testes de frontend, typecheck/build e smoke de tela em 390×844 e
    1440×900.
- [ ] **T005 — Busca pelo CEP (opcional)**: preencher logradouro, bairro, cidade e
  UF a partir do CEP (aprovado, decisão 3).
  - Dependências: T004.
  - Verificação: falha da busca não bloqueia o preenchimento manual; nenhum dado
    além do CEP é enviado.
- [ ] **T006 — Validação e release**: cenários de aceite, rollback descrito e
  verificação em produção depois do deploy.
  - Dependências: T004 (e T005, se incluída).
  - Verificação: CI verde, `/version` publicado, cenários 1 a 8 conferidos e
    decisão de retenção registrada.

## Dependências
T001 precede T002; T002 precede T003; T003 precede T004; T005 depende de T004; T006 depende de T004 e T005.
