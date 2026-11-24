# Plano técnico — Liderança e casa da célula no mapa, card enxuto e ícones

- Status: **Aprovada** (2026-11-24)

## Dados
Sem migration. As fontes já existem:
- **líder de célula:** `usuarios.resposta_id` de um login ativo de perfil `CELULA`, com as
  células desse login;
- **anfitrião:** `celulas.anfitriao_id` de uma célula ativa (Spec 009).

## Servidor
- **`PontosMapa`:** passa a trazer também `papel IN ('lider_setor', 'lider_area')`, sempre
  com o mesmo `escopoSQL`. A resposta do `mapa` continua só com o centro da área.
- **`mapa`:** cada pessoa do ponto ganha `destaques`, só com o que quem pede pode ver:
  - `liderCelula`: nomes das células do login ligado;
  - `casaCelula`: nomes das células em que o cadastro é a Casa.
- **Contagens:** indicadores, retrato e contas das células continuam só com
  `papel = 'membro'` (Spec 013).
- **Testes Go:**
  - líderes no mapa respeitando o escopo;
  - `destaques` com login inativo (não conta), célula inativa (não conta) e mais de uma
    célula.

## Painel
- **`icones.ts`:** pacote mínimo do Phosphor 2.1.1, guardado como caminhos SVG.
  - `icone(nome, { peso, rotulo })` devolve um `<svg>` com `fill="currentColor"`;
    `aria-hidden` quando não há rótulo, `role="img"` e `aria-label` quando há.
  - Ícones: `star`, `shield-star`, `crown-simple`, `house-line` (*fill*) e `whatsapp-logo`,
    `identification-card`, `x` (*bold*).
  - A licença fica em `frontend/admin/vendor/phosphor/LICENSE`, e
    `scripts/icones/gerar.mjs` refaz o arquivo a partir do pacote com a versão fixa.
- **`mapa-regras.ts`:** regras puras, com teste em Node:
  - `selos(pessoa)`: até dois selos, liderança em cima e casa embaixo;
  - `papeisDoCard(pessoa)`: frases do card;
  - `resumo` separando membros e líderes.
- **`mapa.ts`:**
  - rostos com `.selo` (`data-papel`) e anel `.av-casa`;
  - rosto do líder com anel neutro;
  - leque com os mesmos selos;
  - `pessoasPopup` novo: nome curto, célula ou papel, papéis, `.pop-ic` (WhatsApp e
    Ficha) e "x" próprio de 44 px.
- **Fechar o card:**
  - classe `.cartao-saindo` (scale e opacity até o rosto, 180 ms), depois
    `mapaLeaflet.closePopup()`;
  - sem animação com `prefers-reduced-motion`;
  - o "x" padrão do Leaflet fica escondido (`closeButton: false`).
- **`sons.ts`:**
  - `somFechar()` com Web Audio (oscilador senoidal de ~660 para 440 Hz, ~120 ms, ganho
    0,06), criado só após um gesto da pessoa;
  - guarda "Sons do painel" no `localStorage` com try/catch, ligado por padrão;
  - sem áudio, não faz nada.
- **Barra lateral:** botão "Sons" (`#btnSons`, `aria-pressed`), ao lado de Atualizar e Sair, para
  todos os perfis (Ajustes só aparece para a gerência).
- **Arquivos JS novos** (`icones.js`, `sons.js`): entram no `ci.yml` (duas listas), no
  `frontend/embed.go` (com a licença) e no `index.html`, antes de `admin.js`.

## Testes
- **Node:** `icones` (SVG válido, rótulo acessível), selos e papéis do card, e resumo.
- **Tela** (`vec-dev`, dados fictícios): cenários 1 a 8 em 390 e 1440 px, com a área de
  toque do "x" medida, a classe de animação vista e o som chamado (espião no `AudioContext`).

## Rollback
Reverter as PRs volta ao mapa só com membros e ao card antigo. Nada muda nos dados.
