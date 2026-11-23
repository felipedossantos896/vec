# Plano técnico — Rostos maiores e grupos que se abrem no mapa

- Status: **Entregue** (v1.55.0)

## Foto
- `area.css`: `.leaflet-marker-pane .av img { width: 100%; height: 100%; max-width: 100%;
  object-fit: cover; object-position: 50% 30% }`, com especificidade acima da regra do
  Leaflet.

## Tamanho por zoom
- `regrasMapa.tamanhoRosto(zoom, celular)`: 40 px até o zoom 12, sobe até 60 px no 16
  (celular até 52). O mapa grava o valor em `--rosto` no contêiner, via CSSOM, a cada
  `zoomend`; `.av-pin` e o "!" usam `var(--rosto)`. O `iconSize` e o `iconAnchor` dos
  marcadores são refeitos com o tamanho novo.

## Leque
- `regrasMapa.leque(n, raioBase)`: posições `{x, y}` em pixels. Círculo para até 8 (raio
  cresce com n); acima de 8, espiral de Arquimedes. Puro e testado.
- Marcador do grupo: o `divIcon` traz a pilha (até 3 e "+N") e, escondidos, todos os rostos
  do leque e um SVG com as linhas. Abrir = classe `aberto` no marcador; cada rosto recebe
  `--x`/`--y` por CSSOM e uma transição de `transform` (mola com `cubic-bezier`).
- **Eventos:**
  - computador: `mouseenter` abre e `mouseleave` fecha com 250 ms de atraso (a não ser que
    tenha sido aberto por clique);
  - celular (`pointer: coarse`): toque abre;
  - `click` no mapa, `movestart`, `zoomstart` e Esc fecham. Um aberto por vez.
- `prefers-reduced-motion`: sem transição.

## Cartão
- `L.popup` pequeno ancorado no rosto, no padrão da Spec 009: rosto, nome curto, célula,
  motivo de cuidado (`regrasArea.motivo`), "Contato feito" (`data-contato`), "Ficha"
  (`data-mapa-pessoa`) e WhatsApp. Substitui o `pessoasPopup` atual.

## Testes
- Node: tamanho por zoom (limites, celular) e leque (n=1, 3, 8, 9, 20: sem sobreposição,
  simetria, espiral crescente).
- Tela (`vec-dev`, pessoas fictícias com fotos de proporções diferentes, endereços no meio
  do Atlântico): cenários 1 a 9.

## Rollback
Reverter as PRs volta à pilha e ao popup atuais. Sem dados nem API envolvidos.
