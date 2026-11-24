# Plano técnico — Ícones do painel e do formulário com o Phosphor

- Status: **Entregue** (v1.60.0)

## Ícones
- `scripts/icones/gerar.mjs` ganha os ícones da tabela da spec, todos em *bold*:
  - `heart`, `map-trifold`, `users`, `chart-bar`, `sliders-horizontal`;
  - `arrow-clockwise`, `sign-out`, `download-simple`, `magnifying-glass`, `plus`;
  - `camera`, `check`, `check-circle`, `arrow-right`, `caret-right`, `lock-simple`.

  `x` já existe.
- **HTML fixo:** `icone.ts.txt` ganha `preencherIcones(raiz)`.
  - Troca cada `<span class="ic-slot" data-ic="nome">` pelo `<svg>`.
  - Roda ao carregar o script (`defer`, antes do `DOMContentLoaded`).
  - O `.ic-slot` tem a largura e a altura do ícone no CSS, para nada pular.

## Painel
- **`admin/index.html`:** os 14 `<svg>` viram `ic-slot`, exceto as duas marcas. O tamanho
  vem por classe (`ic-16`, `ic-18`).
- **TS:**
  - "x" dos diálogos em `anotacoes`, `estrutura` e `nova-pessoa`;
  - câmera em `fotos`;
  - `ICONE_CHECK` (`detalhe`) e `ICONE_OK` (`acompanhamento`);
  - "→" em `area` e `charts`;
  - "+" em `area`;
  - "›" em `dashboard` e `estrutura`;
  - "×" dos filtros em `dashboard`.

  Todos passam a chamar `icone(...)`.
- **CSS:**
  - `.ic` herda a cor;
  - `.ic-12` a `.ic-30` para os tamanhos de hoje;
  - ajuste fino de alinhamento onde o texto vira ícone (setas e chips).

## Formulário público
- **`index.html`:** carrega `admin/icones.js` antes de `app.js`; cadeado e "✓" de enviado
  viram `ic-slot`. A marca fica.

## Testes
- **Node:** ícones novos gerados e o arquivo igual ao do gerador (teste da Spec 014).
- **Varredura:** fora da marca e dos desenhos listados, nenhum `<svg ... stroke=` nos HTML e
  nos TS, e nenhum "→", "›" ou "×" usado como ícone.
- **Tela** (`vec-dev`, dados fictícios): cenários 1 a 5 em 1440 e 390 px, com capturas
  antes e depois para comparar o alinhamento.

## Rollback
Reverter a PR volta os ícones desenhados à mão. Nada muda nos dados.
