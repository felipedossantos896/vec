# Design system VEC

**Versão vigente:** 1.0
**Atualizado em:** 2026-11-14

## Fonte da verdade

Os tokens compartilhados ficam em [`frontend/design-tokens.css`](../frontend/design-tokens.css).
As regras específicas do formulário e do painel ficam em
[`frontend/style.css`](../frontend/style.css) e
[`frontend/admin/admin.css`](../frontend/admin/admin.css).
As páginas devem carregar os tokens antes dos estilos locais.

Esta versão mantém a identidade azul-marinho, dourado e creme e acrescenta
fundos suaves, hierarquia de superfícies e sombras discretas. O código e os
tokens no Git são a referência principal; imagens de tela são opcionais e só
devem ser guardadas quando ajudarem a comparar uma mudança visual.

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

- **1.0 — 2026-11-14:** tokens compartilhados e primeira atualização visual do
  formulário e do painel, sem alterar fluxos ou dados.
