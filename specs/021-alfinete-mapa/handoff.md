# Handoff — Spec 021

- T001 / Issue #222 na branch `codex/spec-021-alfinete-mapa`.
- Editor de endereço e Área exibem alfinete confirmado dentro do escopo existente, com consentimento específico. Posições automáticas permanecem aproximadas. Revogação preserva o endereço. O modo manual usa as colunas existentes.
- Gofmt, go vet, go test, go build, typecheck, build, 93 testes frontend e diff check passaram.
- SQLite verificou gravação, geocodificação atrasada, versão obsoleta, escrita fora do escopo e revogação. Testes da API verificaram consentimento, limites e saída aproximada ou exata.
- Chrome em 1440 e 390 px com dados fictícios e API simulada: abertura pelo mapa, teclado e toque, cancelar, recusa sem autorização, salvar, reabrir e revogar. Arrastar em dispositivo físico e gravação no Turso ficaram fora deste ensaio.
- Ajuste da revisão: resposta de gravação invalida o mapa mesmo quando a ficha já fechou. Repetido o Chrome em 1440 e 390 px com revogação atrasada e fechamento antes da resposta. O mapa voltou ao marcador aproximado nos dois tamanhos. Typecheck, build e 93 testes frontend passaram novamente.
- Segunda revisão: edição comum também exige a versão que o painel leu. Formulários antigos não substituem ponto confirmado. Conflito oferece recarregar endereço. O mapa é recarregado mesmo quando a resposta da gravação falha. SQLite cobriu edição comum obsoleta e cliente sem versão; Chrome cobriu revogação efetivada com HTTP 500 na resposta. Typecheck, build, testes frontend e testes Go de API/store passaram.
- Próxima etapa: CI e revisão independente do SHA do PR. Rollback por reversão.
