# Spec 015 — Ícones do painel e do formulário com o Phosphor

- Status: **Entregue** (v1.60.0, 2026-11-24) · [validação](release-validation.md)
- Data: 2026-11-24
- ADRs: [0012](../../docs/architecture/adr/0012-pacote-de-icones.md) (pacote de ícones) e
  [0009](../../docs/architecture/adr/0009-identidade-visual.md) (identidade visual). Sem
  ADR nova.
- Relacionadas: Spec 014, que adotou o Phosphor no mapa e deixou a troca dos outros ícones
  para esta spec.

## Contexto
- Depois da Spec 014, o mapa e o botão "Sons" usam o Phosphor.
- O resto do painel e o formulário público ainda usam cerca de 25 ícones desenhados à
  mão, cada um com traço e tamanho próprios.
- Alguns botões usam caracteres de texto como ícone ("→", "+", "›", "×"). Cada fonte e
  aparelho mostra esses caracteres de um jeito diferente.

## Objetivo
Um único conjunto de ícones no painel e no formulário: o Phosphor, em **negrito**, como no
card do mapa.

## Escopo
Troca, sem mudar o que cada botão faz:

| Onde | Hoje | Phosphor (*bold*) |
|---|---|---|
| Aba Meus discípulos | coração | `heart` |
| Aba Área | mapa dobrado | `map-trifold` |
| Aba Pessoas | pessoas | `users` |
| Aba Indicadores | barras | `chart-bar` |
| Aba Configurações | controles | `sliders-horizontal` |
| Atualizar | seta circular | `arrow-clockwise` |
| Sair | porta com seta | `sign-out` |
| Exportar CSV | download | `download-simple` |
| Busca de Pessoas | lupa | `magnifying-glass` |
| Novo usuário; Nova pessoa nas Ferramentas ("+") | + | `plus` |
| "x" dos diálogos (ficha, usuário, contato, estrutura, Nova pessoa) e "×" dos filtros | x | `x` |
| Foto da ficha | câmera | `camera` |
| Etapas feitas da jornada | ✓ | `check` |
| "Tudo em dia" | ✓ no círculo | `check-circle` |
| Setas "→" das Ferramentas e de "Onde agir" | → | `arrow-right` |
| Setas "›" das listas (Pessoas e Estrutura) | › | `caret-right` |
| Formulário: privacidade | cadeado | `lock-simple` |
| Formulário: enviado | ✓ | `check` |

### Fora de escopo
- **A marca "Área VEC"** no menu, no login e no formulário: é identidade visual e continua
  desenhada à mão (decisão do responsável).
- **Desenhos que não são ícones:** avatares ilustrados, minigráficos dos indicadores e
  linhas do leque do mapa.
- **O "✓" das etapas do formulário**, desenhado só pelo CSS. Fica para uma próxima vez,
  se fizer falta.
- **O "!" de cuidado no mapa:** é um selo de alerta, não um ícone.

## Requisitos funcionais
1. **Mesmo lugar e tamanho:** cada ícone fica onde está, no mesmo tamanho (12 a 30 px), na
   cor do texto.
2. **Acessibilidade sem mudança:**
   - os ícones continuam decorativos (`aria-hidden`);
   - o nome de cada botão continua no texto ou no `aria-label` de hoje.
3. **HTML fixo:**
   - nos ícones do `index.html` do painel e do formulário, o lugar do ícone já reserva o
     tamanho, para nada pular quando o ícone chega;
   - o ícone é preenchido pelo script de ícones.
4. **CSP:** nada inline. O formulário público passa a carregar `admin/icones.js`, como já
   carrega `admin/avatar-regras.js`.
5. **Sem ícone esquecido:** um teste falha se o painel ou o formulário voltar a ter
   `<svg>` desenhado à mão, fora da marca e dos desenhos listados acima.

## Cenários de aceite
1. **Dado** o painel em 1440 e 390 px, **então** abas, Atualizar, Sair, Sons, CSV, busca,
   "x" e setas mostram os ícones do Phosphor no mesmo lugar e tamanho.
2. **Dado** a ficha, **então** as etapas feitas da jornada mostram o `check` e a câmera da
   foto é a do Phosphor.
3. **Dado** o formulário público, **então** o cadeado e o "✓" de enviado são do Phosphor, e
   a marca continua a mesma.
4. **Dado** o leitor de tela, **então** os nomes dos botões não mudam e nenhum ícone é lido.
5. **Dado** as duas larguras, **então** zero violação de CSP e sem rolagem lateral.

## Requisitos não funcionais
- Sem migration e sem mudança no servidor.
- Os ícones novos entram pela lista do `scripts/icones/gerar.mjs`.

## Decisões do responsável (2026-11-24)
1. Estilo negrito, igual ao do card do mapa.
2. Trocar no painel e no formulário público.
3. A marca continua desenhada à mão; as setas e o "+" de texto viram ícones.
