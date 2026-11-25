# VEC Design Studio
Catálogo local de propostas V2. Não é aplicação de produção nem fonte de dados reais.

## Executar
Na raiz: `python3 -m http.server 4173 --bind 127.0.0.1 --directory design-system`
Abra http://127.0.0.1:4173. Sem instalação npm, login ou API. O preview usa iframe com viewport CSS real e escala visual; 4K não implica DPR 4.

## Escopo
Inventário de 21 frames e duas galerias, Fundamentos e Componentes. O mapa esquemático usa marcadores fictícios. As ações dos protótipos usam estado local durante a sessão.

## Governança
Tokens V2 são candidatos isolados; não substituem frontend/design-tokens.css nem ADRs aceitos. Aprovar identidade e telas antes de migrar produção. Registrar estados, acessibilidade, comportamento e screenshots sintéticos por PR. Nunca copiar dados reais. Não incluir Studio em rotas ou embed do servidor. CI atual pode disparar deploy em merge de documentação; não alterar pipeline neste PR.

## V0.2 — Map Experience
Frames A02–A04 compartilham busca por nome ou célula, filtros, contagens derivadas, seleção, zoom esquemático e gaveta. Contato e perfil mostram feedback local. A suíte de movimento cobre navegação por teclado, fechamento com Escape e retorno de foco no mapa.

## V0.3 — People Management

Frames A07, A08, A14 e A15 compartilham busca e filtro, ficha em gaveta com três trilhos e formulários de cadastro e edição. Cadastros demonstrativos duram apenas enquanto o frame está aberto.

## V0.4 — Complete Inventory

Os 21 frames têm preview. As ferramentas da Área simulam resultados, Indicadores e Discípulos usam fixtures, e os fluxos de acesso e cadastro público demonstram as transições sem criar contas nem enviar dados.

## V0.5 — Motion & Interaction

O catálogo oferece navegação por setas, Home e End. O mapa e a ficha devolvem o foco ao fechar, e as transições respeitam a preferência por movimento reduzido. O preview mobile mantém escala de 100% e oferece rolagem quando a janela do catálogo é menor.

## V0.6 — Visual Testing

Com Playwright e Chromium disponíveis, execute a partir da raiz:

```sh
node design-system/tests/visual.mjs --record /tmp/vec-referencia.json
node design-system/tests/visual.mjs --compare /tmp/vec-referencia.json
```

Use `STUDIO_CHROME=1` para testar com o Chrome instalado e `STUDIO_ARTIFACTS` para escolher a pasta das capturas. Registre a referência a partir de uma revisão aprovada e compare usando a mesma plataforma, versão de navegador e DPR. Para aprovar uma mudança visual intencional, registre em um novo arquivo.

Preserve as capturas de referência junto do JSON com o mesmo caminho relativo. Use diretórios distintos para gravação e comparação. A suíte tolera até 64 pixels por frame com diferença máxima de cinco níveis por canal, para acomodar variações de rasterização observadas no Chrome.

A matriz registra páginas completas. Para a lista do mapa e a gaveta de Pessoas, também registra o fim da região interna quando há conteúdo rolável.

## V1.0 — Design System

`foundations/tokens.css` define Cloud para o fundo, Navy para a estrutura e azul para a ação primária. Use 60/30/10 como proporção visual aproximada. As cores semânticas indicam estado com texto visível. A tipografia usa a fonte do sistema em escala de 24, 17 e 14 px.

Use controles nativos com rótulos e foco visível. Os controles compartilhados usam altura mínima de 36 px no desktop e 44 px no mobile. Prefira uma ação primária por contexto. Em diálogos, mova o foco para dentro ao abrir e devolva ao acionador ao fechar. Use `foundations/motion.css` para integrar transições e respeitar movimento reduzido.

Ao alterar um token, valide os 21 frames e ambas as galerias. O ADR-0014 descreve os limites de integração.

O iframe permite a validação nativa dos formulários que executam ações locais, e a política `form-action 'none'` bloqueia envios pelo navegador.

Para executar os testes de interação, instale as dependências da raiz com `npm ci` e o navegador com `npx playwright install chromium`. Execute `node design-system/tests/people.mjs`, `node design-system/tests/inventory.mjs`, `node design-system/tests/motion.mjs` e `node design-system/tests/library.mjs`.

A V0.6 ([PR #235](https://github.com/felipedossantos896/vec/pull/235)) é a primeira revisão do Studio com o executor de comparação. Para mudanças posteriores à V1.0, gere a referência a partir do merge da V1.0 ou use o JSON e os PNGs do pacote de evidências da entrega.
