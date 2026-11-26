# Handoff

T001 / #241 em `codex/studio-admin-identity`. A permissão Gerencia protege a sessão do Studio e seus arquivos. A navegação do mapa, das pessoas, dos indicadores e dos ajustes vem do mesmo componente. O PR registra testes e validação pós-deploy. Para reverter, revertam o PR.

Go vet, go test e go build passaram. Playwright verificou login para visitante, acesso negado a uma conta comum e abertura com conta administrativa sintética. Inventário e movimento passaram em Full HD, QHD, 4K e mobile.
