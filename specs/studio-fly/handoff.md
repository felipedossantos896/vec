# Handoff

T001 / #239 em `codex/studio-fly`. O catálogo embutido usa a sessão existente do Área VEC para autorizar seus arquivos. O preview tem uma política de conteúdo própria. O PR registra testes, revisão e estado do deploy. Reverta o PR para restaurar o comportamento anterior.

Typecheck, build do frontend, gofmt, go vet, go test e go build passaram. Playwright em Chrome verificou o handler Go com uma sessão sintética, acesso anônimo bloqueado aos arquivos, catálogo e ficha no iframe, e retorno à tela de acesso após limpar a sessão, em Full HD, QHD, 4K e mobile.

O preview funciona em origem opaca. O servidor incorpora seus recursos e autoriza os scripts pelo hash no CSP. O catálogo só aceita pedidos de navegação do iframe atual para telas do inventário. Playwright verificou o bloqueio de acesso ao armazenamento da sessão e o fluxo de novo acesso nas quatro resoluções.

A entrada verifica o token da aba em cada abertura e faz uma única tentativa de troca por cookie. Playwright verificou duas contas sintéticas em abas alternadas e a mensagem exibida quando o navegador bloqueia o cookie.

O HTML do catálogo sai pela troca autenticada, e a URL de entrada sempre entrega a tela de acesso. Playwright confirmou que abrir a URL em outra aba sem sessão permanece na tela de acesso mesmo quando há um cookie válido no navegador.
