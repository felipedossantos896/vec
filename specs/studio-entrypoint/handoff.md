# Handoff

T001 / #237 em `codex/studio-entrypoint`. O mux redireciona somente o endereço de entrada do Studio, com ou sem barra final. O destino fixo preserva a separação descrita no ADR-0014. O PR registra testes, revisão e estado da validação no Fly.io. Para reverter, reverta o PR.

Validação local concluída com typecheck e build do frontend, gofmt nos arquivos alterados, go vet, go test e go build. A confirmação externa depende do pipeline da main após o merge.
