# Plano técnico — Cartão do mapa: abre ao passar o mouse e visual novo

- Status: **Aprovada** (2026-11-24)

## Regras puras (`mapa-regras.ts`, com teste em Node)
- `subtituloCartao(p, celula)`: "célula · papel" (por exemplo, "Pi-Hairote · Membro", "Hope ·
  Líder da célula" ou "Líder do setor X"), e os papéis que sobram para os selos.
- `acaoContato(telefone)`: `{ tipo: 'whatsapp' | 'registrar', rotulo }`.
- O motivo vem de `regrasArea.motivo` (o mesmo de "Fale com eles"). A faixa aparece só com
  `naLente('cuidado')` e `temTrilha`.

## Mapa (`mapa.ts`)
- **Estado do cartão:** `cartaoDe` ganha `fixo: boolean`.
  - `abrirCartao(g, j, fixo)`: o passar do mouse abre com `fixo = false`; clique, teclado e
    toque abrem com `fixo = true`;
  - um cartão fixo só é trocado por outro com `fixo = true`.
- **Passar o mouse** (só com `temMouse()`):
  - `mouseenter` no marcador sozinho e em cada `.lq-rosto` abre o cartão;
  - `mouseleave` no rosto e no elemento do popup agenda `fecharCartao({ som: false })` em
    300 ms;
  - `mouseenter` no popup cancela o fechamento;
  - o leque só fecha quando o mouse sai do grupo e do cartão.
- **Fechar:** `fecharCartao(opcoes)` mantém a animação; o som toca só quando
  `opcoes.som !== false` (x e Esc).
- **`cartaoPessoa(r)` novo:**
  - cabeça com `avatar(r, 'av-l')` e o anel `--cel`, nome curto, subtítulo e selos;
  - faixa `.cartao-atencao` (ícone `aviso`, `warning-circle` do Phosphor, novo no gerador),
    quando precisa;
  - botões `.cartao-a`: "Entrar em contato" (link do WhatsApp) ou "Registrar contato"
    (`data-contato`), e "Ver perfil" (`data-mapa-pessoa`) com o ícone `seguir`.

## CSS (`area.css`)
- Cartão com 300 a 340 px de largura (no celular, até `100vw - 32px`).
- Rosto de 64 px; nome em `--t21` no display.
- Faixa âmbar com tokens novos `--atencao-bg` e `--atencao-ink` (contraste AA).
- Botões de 48 px: o principal com `--whatsapp`, o secundário com contorno.
- Abertura com a animação atual; com "reduzir movimento", sem animação.

## Testes
- **Node:** subtítulo, ação de contato e quando a faixa aparece.
- **Tela** (`vec-dev`, dados fictícios), cenários 1 a 8 em 1440 e 390 px:
  - passar e sair com `page.mouse`;
  - o caminho até "Ver perfil" sem fechar;
  - leque, fixar por clique, som só no "x" (espião);
  - faixa por situação e os dois tipos de contato.

## Rollback
Reverter a PR volta o cartão da Spec 014. Nada muda nos dados.
