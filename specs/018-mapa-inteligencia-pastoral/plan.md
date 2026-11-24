# Plano técnico — Spec 018

## Baseline observado
- frontend/admin/index.html: Área em tela cheia, mapaCanvas, aSetor/aCelula, areaPainel, areaFerrPainel, gaveta e faleCom.
- frontend/src/admin/mapa.ts: Leaflet, OSM raster, ZOOM_MAX=16, cache temporal de dados, camadas de grupos e ferramentas, selos, card da Spec 017.
- frontend/src/admin/area.ts: naLente, renderPainelArea, renderFaleCom, renderArea, ferramentas existentes e priorização de cuidado.
- frontend/admin/area.css, mapa.css, frontend/design-tokens.css: superfícies/layout atuais.
- Specs 016 e 017 registram entregas de tela cheia e cartão; não duplicar seus comportamentos.
- package.json oferece typecheck, build, test:frontend e test:e2e:dev; verificar CI e scripts atuais no início de cada tarefa.

## Abordagem
1. Aprovar escopo e preview; inventariar funções, estado, contratos e cobertura; criar baseline sintético.
2. Refatorar somente markup/CSS necessários para barra, painel, busca e encaixe de overlays; preservar IDs/handlers ou atualizar consumidores e testes juntos. Manter tema e tipografia dos ADRs aceitos.
3. Extrair regras puras de busca, contagem, agregação de centros aproximados e visibilidade de camadas; testar antes de renderizar. Usar Leaflet existente, sem biblioteca nova.
4. Ajustar marcadores, leque e cartão sem regressão do foco, hover ou toque; usar regra de cuidado e trilha já existente. Não presumir dados ainda não verificados.
5. Reutilizar gaveta e lista de cuidado; compartilhar estado de filtros e busca, limpar seleção inválida, localizar apenas centro aproximado.
6. Introduzir modos de representação independentes do filtro; manter camadas de anfitrião/multiplicação isoladas; evitar duplicar controles. Estilo de tiles alternativo só após análise de termos, custo e privacidade.
7. P2: fazer avaliação de privacidade e protótipo com dados sintéticos antes de ativar agregações; evitar revelar grupos por subtração ou consultas repetidas. Se não for possível demonstrar proteção, manter desligado. Aprimorar ferramentas existentes sem novas rotas externas nesta entrega.

## Validação
- npm ci, npm run typecheck, npm run build, npm run test:frontend, gofmt, go vet ./..., go test ./..., go build ./... conforme CI.
- E2E em vec-dev, fixtures fictícias e tiles simulados; 390, 1440 e viewport baixo; teclado, touch, movimento reduzido, CSP e ausência de rolagem lateral.
- Testes negativos de autorização/escopo e ausência de dados adicionais na API, DOM, logs e chamadas externas.
- Medir baseline e pós-alteração (14/100/1000 registros), verificar memória, eventos e atualização de camadas. Não gerar carga automatizada sobre OSM.
- Registrar screenshot sintético, resultados efetivamente executados e limitações por PR.

## Release e rollback
Uma tarefa por branch/PR, dependências no grafo e aprovação antes de executar. Revisão independente e CI antes de merge. P2 isolado e desligado até aprovação específica. Reverter PRs por ordem inversa; nenhuma migration prevista. Verificar /version e /healthz após deploy autorizado e registrar release-validation.md.

A primeira entrega cobre P0/P1. T007 e T008 ficam no backlog do P2. T009 valida P0/P1 após T006.
