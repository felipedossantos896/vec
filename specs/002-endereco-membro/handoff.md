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

### T003 / Issue #49 — 2026-11-20
- Agente: Claude Code. Branch `feat/issue-49-endereco-api`.
- Feito: `api/enderecos.go` com as ações `endereco_ler`, `endereco_salvar` e
  `endereco_excluir`, registradas no `handleAPI`; `adminReq` ganhou `endereco` e
  `consentimento`. Validação: CEP de 8 dígitos (aceita máscara), UF entre as 27
  siglas, campos obrigatórios, tamanhos máximos (recusa em vez de cortar) e "s/n"
  normalizado. Sem consentimento devolve `consentimento_endereco`. Cadastro
  inexistente ou fora do escopo devolve `nao_encontrado`. O log registra só a
  linha e o autor.
- Testes: normalização e gravação no escopo; 11 casos de validação sem gravar;
  fora do escopo em ler, salvar e remover; leitura sem endereço; remoção;
  endereço ausente de `store.Campos` (base da lista e do CSV); log sem o
  conteúdo. Mutações que ignoram o consentimento ou registram a rua no log foram
  detectadas.
- Pendente: a 0010 em `vec-dev` (comando no PR #54) antes do teste de tela da T004.
- Próximo: T004 / #50, o endereço na ficha.

### T004 / Issue #50 — 2026-11-20
- Agente: Claude Code. Branch `feat/issue-50-endereco-ficha`.
- Feito: seção Endereço na aba "Ficha completa", carregada sob demanda
  (`endereco_ler`). Estados: carregando, vazio, visualização (com autorização e
  autor), edição, erro e removido. O formulário tem rótulos e `autocomplete`, erro
  por campo com `aria-invalid`/`aria-describedby`, foco no primeiro inválido e
  consentimento desmarcado a cada edição. A remoção pede confirmação. Regras puras
  em `endereco-regras.ts`. Os novos `.js` foram registrados no `index.html`, no
  `embed.go` e na conferência de compilados do CI.
- Testes: `npm run typecheck`, `npm run build`, `npm run test:frontend` (18, sendo
  6 novos), `go test ./...`. Tela em 390×844 e 1440×900, com login e ficha reais em
  `vec-dev` e respostas de endereço simuladas: 11 checagens por tamanho e console
  sem erros.
- Pendente: aplicar a 0010 em `vec-dev` para um teste ponta a ponta com banco real
  (produção já tem a 0010).
- Próximo: T005 / #51, a busca pelo CEP.

### T005 / Issue #51 — 2026-11-21
- Agente: Claude Code. Branch `feat/issue-51-busca-cep`.
- Feito: ao digitar um CEP de 8 dígitos, o navegador consulta o ViaCEP enviando só
  o CEP (sem referrer nem cookies, limite de 5 s) e preenche rua, bairro, cidade e
  UF quando o serviço traz o valor; número e complemento nunca são alterados. CEP
  inexistente, resposta estranha, falha ou demora geram um aviso
  (`aria-live="polite"`) sem bloquear o preenchimento manual. Respostas atrasadas
  de um CEP anterior são descartadas.
- Testes: `npm run test:frontend` com 22 testes (4 novos: URL só com o CEP, resposta
  aplicada sem tocar em número/complemento, CEP de cidade inteira, CEP inexistente
  ou resposta inválida).
- Pendente: validação de tela com o ViaCEP simulado, bloqueada porque a sessão do
  `turso` CLI expirou (`turso auth login`).
- Próximo: T006 / #52, validação e release.

### T006 / Issue #52 — 2026-11-21
- Agente: Claude Code. Branch `docs/issue-52-validacao-endereco`.
- Feito: `release-validation.md` com os 8 cenários; spec marcada como Entregue;
  decisão de retenção registrada (sem prazo, reavaliar na Spec 003).
- Testes: ponta a ponta em `vec-dev`, com interface e API reais e endereço
  fictício gravado e removido (10 checagens); `vec-dev` terminou com 0 endereços e
  o usuário temporário foi removido. Migration 0010 aplicada em `vec-dev`.
- Pendente: nada na Spec 002. Próximo passo sugerido: Spec 003 (mapa, ADR-0005).
