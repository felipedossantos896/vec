# Tarefas — Cartão do mapa: abre ao passar o mouse e visual novo

Issues #196 a #198 e #202; dependências em [`graph.json`](graph.json).

- [x] **T001 (#196) — Aprovação**: decisões na spec; status para Aprovada.
- [x] **T002 (#197) — Cartão novo**: passar o mouse abre e sair fecha, clique fixa; visual com
  rosto grande, subtítulo, faixa de atenção e botões Entrar em contato e Ver perfil; regras
  puras com teste. *Dep.: T001.*
- [x] **T003 (#198) — Validação e release**: cenários 1 a 8 no `vec-dev` e conferência em
  produção; `release-validation.md`. *Dep.: T002.*
- [x] **T004 (#202) — Cartão fiel ao modelo**: o cartão entregue na v1.62.0 não se parecia
  com o modelo. Ajustes: fonte sem serifa do sistema, rosto de 52 px sem anel, faixa com
  ícone e título na mesma linha e o motivo abaixo, botões iguais (verde-escuro sem ícone e "Ver
  perfil →" com borda clara), "x" fino. O cartão aberto pelo mouse desliza para fora do painel
  e da ferramenta. *Dep.: T003.*
