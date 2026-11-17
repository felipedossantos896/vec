# Design system VEC

**Versão vigente:** 3.5
**Atualizado em:** 2026-11-17

## Fonte da verdade

Os tokens compartilhados ficam em [`frontend/design-tokens.css`](../frontend/design-tokens.css).
As regras específicas ficam em [`frontend/style.css`](../frontend/style.css)
(formulário) e em [`frontend/admin/`](../frontend/admin/): `admin.css` (base,
login, navegação e diálogos), `dashboard.css` (visão geral, indicadores, cadastros e detalhe)
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

- **3.5 — 2026-11-17:** painel organizado por tarefa: abas Acompanhar, Pessoas,
  Indicadores e Configurações (Células e Usuários num seletor segmentado). Pessoas
  sem painéis no topo, com etiquetas `--gold-wash` para os filtros ativos e o filtro
  de situação em grupos. Detalhe com a jornada no topo, botão de WhatsApp no
  cabeçalho e abas internas no mesmo estilo segmentado de `--sunken`.
- **3.4 — 2026-11-17:** WhatsApp opcional e autorização de uso dos dados no
  formulário (caixa marcada em `--gold-wash`, erro em `--danger-bg`); no detalhe,
  bloco Acompanhamento com anotações marcadas por um filete `--gold`, datas das
  etapas em `--muted` ao lado do "Sim" e gráfico de colunas "Jornada mês a mês".
- **3.3 — 2026-11-17:** aba Células para o líder de área: um cartão por setor
  com as células em linhas tocáveis, célula inativa em texto `--muted` com selo
  "Inativa", e diálogo único para criar, renomear, mudar de setor e desativar.
- **3.2 — 2026-11-17:** edição de cadastros no detalhe: rodapé fixo com as ações,
  perguntas Sim/Não como controle de três posições (Sim em `--navy`, sem resposta
  discreta), exclusão confirmada no próprio rodapé em `--danger` e aviso de
  possível duplicado em `--gold-wash`.
- **3.1 — 2026-11-17:** aba Indicadores no painel, voltada ao acompanhamento:
  próximos passos com nomes, mapa da jornada por setor e célula (cinco tons de
  `--navy-2`, texto branco a partir do quarto), quem quer servir cruzado com os
  treinamentos, aniversariantes e sugestões. Todo número leva à lista de
  pessoas. No fim, o retrato da área: colunas de novos cadastros por mês e de
  faixa etária e medidores, em uma só cor, com valor no topo e dica ao passar o
  mouse ou focar.
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
