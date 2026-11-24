# Plano técnico — Mapa em tela cheia com gaveta suspensa

- Status: **Entregue** (v1.61.0)

## Estrutura (`admin/index.html`)
- O `h1` da Área vira `sr-only`. A frase `#areaSub` passa para o resumo da gaveta.
- `.area-palco` passa a conter:
  - o mapa;
  - a barra de filtros (`.area-filtros`, flutuante);
  - o painel escuro;
  - o painel de ferramenta;
  - a gaveta `.gaveta`, com a alça `<button class="gv-alca" aria-expanded>`, o resumo e
    `.gv-corpo`.
- `#mapaStatus`, `#mapaAviso`, `#mapaVazio`, `#faleCom`, a lista das áreas e `#aConteudo` vão
  para dentro de `.gv-corpo`.

## Altura do palco
- `area-layout.ts` mede a barra do topo e as abas de baixo com um `ResizeObserver` e grava
  `--topo` e `--abas` no CSSOM.
- O palco fica com `height: calc(100dvh - var(--topo) - var(--abas))`; no computador, `100dvh`
  à direita do menu.
- Na aba Área, `body.na-area` tira o padding do `.wrap` e a rolagem da página.

## Painel escuro no celular
- Abaixo de 721 px de largura ou com até 500 px de altura, `area-layout.ts` move o
  `#areaPainel` para o topo de `.gv-corpo`.
- Acima disso, ele volta para o palco.
- É o mesmo elemento: os ouvintes e o estado das lentes continuam.

## Gaveta
- **Estado:** `data-estado="recolhida|aberta"` e a variável `--gv-y` (a posição durante o
  arrasto).
- **Regras puras** (`gaveta-regras.ts`, com teste em Node):
  - `alturas(palco, recolhida)`: recolhida = 64 px; aberta = 85% do palco, no mínimo 64 px;
  - `soltar(y, velocidade)`: o estado mais próximo, com "arremesso" pela velocidade;
  - `limitar`.
- **Arrasto:** `pointerdown`, `pointermove` e `pointerup` na alça, com `setPointerCapture` e
  `touch-action: none` só na alça. A transição é `transform` de 220 ms, nenhuma com
  `prefers-reduced-motion`.
- **Gestos:** `L.DomEvent.disableClickPropagation` e `disableScrollPropagation` na gaveta, na
  barra de filtros e no painel, para não arrastar o mapa por eles.
- **Recolhida:** `inert` no `.gv-corpo`. Esc fecha.
- **Resumo:** `regrasGaveta.resumo(nCuidado, nFale)`.

## Mapa
- **Enquadramento:** o `fitBounds` passa a usar os recuos reais (`folgasMapa()`): a barra de
  filtros, o painel escuro no computador, a gaveta recolhida e o painel de ferramenta.
- **Zoom:** `L.control.zoom({ position: 'bottomright' })`, acima da gaveta (margem pelo CSS).
- **Camadas:** `.leaflet-map-pane` com `z-index: auto`, para a ordem ser rostos (600), depois
  painel, filtros e ferramenta, depois o cartão (700) e por fim a gaveta. O cartão desvia
  dessas partes (`autoPanPadding` com `folgasMapa()`) e fecha quando a gaveta abre.
- **Tamanho:** `invalidateSize()` quando o palco muda de tamanho (`ResizeObserver`).
- **Ferramenta no celular:** `abrirFerramenta` abre a gaveta e rola até a ferramenta, que no
  celular passa para dentro da gaveta.

## Som
- Saem `#btnSons`, `renderBotaoSons` e a preferência (`sons.ligados` e `sons.definir`).
- `sons.fechar()` toca sempre, com a mesma proteção sem áudio.
- Os ícones `som` e `semSom` saem do gerador; os testes são ajustados.

## Outros
- "← Voltar ao mapa" usa `icone('voltar')` (`arrow-left`, *bold*), novo no gerador. O teste
  de varredura passa a pegar "←" e "→" soltos em texto de botão.
- `area-layout.js` e `gaveta-regras.js` entram no `ci.yml`, no `embed.go` e no `index.html`,
  antes de `mapa.js`.

## Testes
- **Node:**
  - regras da gaveta (alturas, soltar, resumo);
  - sons sem preferência;
  - varredura de ícones.
- **Tela** (`vec-dev`, dados fictícios), cenários 1 a 10 em 1440 × 900, 390 × 844 e
  844 × 390 (celular deitado):
  - medir mapa e gaveta;
  - arrastar com o mouse e com toque;
  - conferir o foco e o `inert`;
  - capturar as telas.

## Rollback
Reverter a PR volta o mapa em caixa e o conteúdo empilhado. Nada muda nos dados.
