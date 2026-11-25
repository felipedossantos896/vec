# Handoff

T001 / #239 em `codex/studio-fly`. O catálogo embutido usa a sessão existente do Área VEC para autorizar seus arquivos. O preview tem uma política de conteúdo própria. O PR registra testes, revisão e estado do deploy. Reverta o PR para restaurar o comportamento anterior.

Typecheck, build do frontend, gofmt, go vet, go test e go build passaram. Playwright em Chrome verificou o handler Go com uma sessão sintética, acesso anônimo bloqueado aos arquivos, catálogo e ficha no iframe, e retorno à tela de acesso após limpar a sessão, em Full HD, QHD, 4K e mobile.
