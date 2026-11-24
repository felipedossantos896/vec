# Handoff — Spec 021

- T001 / Issue #222 na branch `codex/spec-021-alfinete-mapa`.
- Editor de endereço e Área exibem alfinete confirmado dentro do escopo existente, com consentimento específico. Posições automáticas permanecem aproximadas. Revogação preserva o endereço. O modo manual usa as colunas existentes.
- Gofmt, go vet, go test, go build, typecheck, build, 93 testes frontend e diff check passaram.
- SQLite verificou gravação, geocodificação atrasada, versão obsoleta, escrita fora do escopo e revogação. Testes da API verificaram consentimento, limites e saída aproximada ou exata.
- Chrome em 1440 e 390 px com dados fictícios e API simulada: abertura pelo mapa, teclado e toque, cancelar, recusa sem autorização, salvar, reabrir e revogar. Arrastar em dispositivo físico e gravação no Turso ficaram fora deste ensaio.
- Próxima etapa: CI e revisão independente do SHA do PR. Rollback por reversão.
