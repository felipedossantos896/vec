# Handoff — Spec 002, endereço do membro

Estado verificável entre agentes. Não substitui `graph.json`, Issues, CI nem revisão.

### T002 / Issue #48 — 2026-11-20
- Agente: Claude Code. Branch `feat/issue-48-endereco-store`.
- Feito: migration aditiva `0010_enderecos.sql`; `store/enderecos.go` (`Endereco`,
  `SalvarEndereco`, `ExcluirEndereco`, todos com escopo no SQL); `DeleteResposta`
  apaga o endereço na mesma transação.
- Testes: `go test ./...`, `go vet ./...`, `gofmt`. Escopo em ler, salvar e remover;
  escopo vazio não consulta; fora do escopo é tratado à parte de sem endereço;
  consentimento registrado com quem salva; exclusão do cadastro apaga o endereço.
  Três mutações que anulam o escopo foram detectadas pelos testes. A migration foi
  aplicada em SQLite local; os CHECK de CEP e UF recusam valores inválidos.
- Pendente: aplicar a 0010 em `vec-dev` depois do merge (em produção ela sai no deploy).
- Próximo: T003 / #49, a API com validação e consentimento.
