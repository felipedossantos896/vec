# ADR-0009 — Nova identidade visual

- Status: **Aceito** em 2026-11-22 pelo responsável. Implementado pela Spec 009.
- Data: 2026-11-22
- Substitui: [ADR-0002](./0002-design-system.md) (design system incremental), quando aceito.

## Contexto
O painel usa azul-marinho, dourado e bege, com Fraunces e Source Sans 3, e cada tela
evoluiu por conta própria. A liderança aprovou previews de uma identidade nova
(`specs/009-nova-identidade/previews/`), pensada para um app centrado em pessoas e no
mapa: rostos, cores por célula e ações à vista.

## Decisão proposta
- **Tipografia:** Bricolage Grotesque (títulos, nomes e números) e Instrument Sans
  (texto e interface), ambas sob a SIL Open Font License, **servidas pelo próprio app**
  (sem Google Fonts, como na Spec 008). Algarismos tabulares nas contagens.
- **Escala fixa:** 12 · 13 · 15 · 17 · 21 · 28 · 44 px, cada tamanho com uma função
  (rótulos · dados · texto · nomes em cards · títulos de seção · título de página ·
  números-chave). Textos de rótulos, nomes, botões e contagens não quebram linha.
- **Cores:** grafite `#15171c` (cromo e ação principal), papel `#f7f5f0` (fundo),
  coral `#ff5a3c` só para o que pede ação (com `#c43a1f` quando é texto, por contraste),
  verde `#1f7a4f` para o que está bom, e **uma cor por célula**, escolhida em Ajustes e
  usada igual em todo lugar (mapa, selos, gráficos).
- **Componentes base:** botão (principal, secundário, WhatsApp, perigo), campo, seletor
  Sim/Não, selo, chip de célula, card, abas, gaveta lateral, gaveta inferior (celular),
  diálogo, aviso rápido com "Desfazer" e os estados (vazio, carregando, sem conexão,
  sessão expirada, sem permissão, busca vazia).
- Tokens em CSS (`design-tokens.css`) e no Tailwind, sem biblioteca de componentes e sem
  dependência de runtime nova.

## Alternativas
Manter a identidade atual e só padronizar (ADR-0002); adotar uma biblioteca pronta
(Material, shadcn); trocar só as cores.

## Consequências
Mudança visível em todas as telas, feita por etapas sem quebrar o uso. As fontes novas
substituem as atuais (~200 KB a mais ou menos o mesmo peso). O CSP estrito continua
valendo: nada de estilo ou script inline.

## Validação
Contraste AA (texto coral só em `#c43a1f`), foco visível, movimento reduzido, 390 px a
4K, comparação com os previews e testes de tela sem violação de CSP.
