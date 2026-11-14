# Design system VEC

**Versão vigente:** 3.0
**Atualizado em:** 2026-11-14

## Fonte da verdade

Os tokens compartilhados ficam em [`frontend/design-tokens.css`](../frontend/design-tokens.css).
As regras específicas ficam em [`frontend/style.css`](../frontend/style.css)
(formulário) e em [`frontend/admin/`](../frontend/admin/): `admin.css` (base,
login, navegação e diálogos), `dashboard.css` (visão geral, cadastros e detalhe)
e `users.css` (usuários). As páginas carregam, nesta ordem: tokens, `tailwind.css`
(reset) e estilos locais.

Formulário e painel compartilham uma só identidade: azul-marinho, dourado e
papel claro, com Fraunces nos títulos e Source Sans 3 no restante. O marinho
marca ação e seleção; o dourado marca progresso e destaque, e nunca é usado
como texto sobre fundo claro (para isso existe `--gold-ink`). A jornada é o
elemento de assinatura: aparece como caminho numerado no formulário, no login
e no painel, e como trechos preenchidos em cada cadastro. O código e os tokens
no Git são a referência principal; imagens de tela são opcionais e só devem ser
guardadas quando ajudarem a comparar uma mudança visual.

## Princípios de interface

- **Clareza:** títulos e rótulos explícitos; conteúdo agrupado por tarefa.
- **Acessibilidade:** contraste legível, foco visível, operação por teclado,
  suporte a movimento reduzido e alvos de toque de pelo menos 44 px.
- **Mobile primeiro:** campos confortáveis, conteúdo sem rolagem horizontal e
  progressão responsiva até telas grandes.
- **Feedback:** seleção, carregamento, validação e conclusão têm estados visíveis.
- **Consistência:** reutilizar cores, tipografia, raios e foco definidos nos tokens.

## Como registrar a próxima versão

1. Atualize os tokens e as telas relacionadas na mesma alteração.
2. Mantenha cada arquivo com no máximo 300 linhas; extraia um módulo quando
   necessário, sem ultrapassar o limite para acomodar uma nova mudança.
3. Atualize o número, a data e o resumo desta versão.
4. Rode `npm run build` e revise as páginas em celular e desktop, incluindo foco
   por teclado e preferência por movimento reduzido.
5. Use o histórico do Git para comparar versões. Evite imagens binárias por
   padrão; se uma comparação visual precisar delas, prefira capturas WebP
   otimizadas e sem dados reais de membros.

## Histórico

- **3.0 — 2026-11-14:** identidade única para formulário e painel; perguntas
  Sim/Não em linhas compactas, jornada como caminho numerado, painel com
  indicadores, jornada da área, navegação lateral e detalhe em painel lateral.
- **1.3 — 2026-11-14:** foco com contraste reforçado e abas do painel operáveis
  por setas do teclado.
- **1.2 — 2026-11-14:** painel com título de contexto e hierarquia reforçada
  para indicadores, distribuição por célula e cartões de usuários.
- **1.1 — 2026-11-14:** formulário público dividido em etapas com navegação,
  progresso por etapa e foco acessível nos títulos.
- **1.0 — 2026-11-14:** tokens compartilhados e primeira atualização visual do
  formulário e do painel, sem alterar fluxos ou dados.
