# Validação de release — Indicadores V2

- Data: 2026-11-19
- Issue: #18 / T006
- Base validada: `9c5613c49a3b61136cb6edfe137d60ce43653dad` (`v1.14.0`)
- Resultado: pronta para revisão e CI, com a ressalva de período descrita abaixo

## Matriz de aceite

| Cenário da spec | Evidência | Resultado |
| --- | --- | --- |
| 1. Escopo autorizado | Testes de store cobrem AREA, SETOR e CELULA; o frontend continua usando somente o conjunto retornado pelo backend. | Aprovado |
| 2. Jornada completa | Teste automatizado cobre 12 pessoas, 6 completas e resultado de 50%. | Aprovado |
| 3. Etapas independentes | Teste automatizado conta uma etapa posterior sem exigir a anterior. | Aprovado |
| 4. Filtros compartilhados | Playwright validou que setor/célula atualizam cards, gráficos, central e a aba Pessoas no mesmo escopo. | Aprovado |
| 5. Alteração de período | A entrega mantém a janela fixa existente de 12 meses e não possui seletor de período. A própria spec deixa período e comparação temporal como questão em aberto. | Não aplicável nesta versão; decisão pendente da liderança |
| 6. Drill-down sem discipulador | Playwright abriu Pessoas com situação e setor preservados; testes cobrem valor ausente e espaços. | Aprovado |
| 7. Zero registros | Teste impede divisão por zero; Playwright exibiu `Ainda não há cadastros para mostrar.` | Aprovado |
| 8. Mobile e teclado | Playwright em 390×844 confirmou ausência de overflow da página, foco visível e transições zeradas com movimento reduzido. | Aprovado |

## Verificações executadas

Os comandos abaixo passaram localmente na base validada:

```text
npm run typecheck
npm run build
npm run test:frontend       # 11 testes aprovados
test -z "$(gofmt -l .)"
go vet ./...
go test ./...
go build ./...
git diff --check
```

No Playwright MCP, com dados sintéticos e sem escrita no Turso, foram verificados:

- estado normal com cinco KPIs, três seções, três regiões de gráficos e Central de atenção;
- estado vazio com mensagem explícita;
- falha HTTP com mensagem `Não foi possível carregar os dados.` e ação `Tentar novamente`;
- viewport 390×844 sem overflow horizontal da página;
- foco de teclado visível no filtro de setor;
- `prefers-reduced-motion: reduce` com transições de controles em `0s`;
- drill-down e sincronização de filtros já validados nas T004 e T005.

O erro registrado no console durante a execução foi provocado deliberadamente pelo cenário HTTP 500. O cenário normal não apresentou warning ou erro.

## Plano de release e rollback

Esta tarefa é documental e não altera aplicação, banco, autenticação ou infraestrutura. A publicação só deve ocorrer pelo fluxo normal de merge protegido e CI.

Se os Indicadores V2 precisarem ser revertidos depois da publicação:

1. abrir uma PR de rollback e reverter, nesta ordem, os merges `9c5613c` (T005), `b48f12e` (T004) e `13b377c` (T003);
2. executar a mesma matriz de typecheck, build, testes frontend e Go;
3. obter revisão independente e aguardar os checks obrigatórios;
4. incorporar a PR, acompanhar o deploy e verificar `/healthz` e as abas Acompanhar, Pessoas e Indicadores;
5. confirmar que a versão anterior `b29a05f` voltou a ser servida.

Não usar reset da `main`, não reescrever histórico e não executar rollback de banco: a entrega não contém migration nem mudança de dados. Se somente uma regressão isolada for confirmada, reverter apenas o merge responsável é preferível à reversão completa.

## Riscos residuais

- O seletor de período não faz parte desta versão; a série permanece fixa nos últimos 12 meses. A nomenclatura e a comparação temporal continuam dependendo de decisão da liderança.
- A inspeção visual usou dados sintéticos para não expor dados pessoais. Escopos são cobertos por testes automatizados e pela autorização existente no servidor.
- Não foi realizado teste de carga; esta entrega não adiciona endpoint, consulta ou volume de payload.
- A spec e o plano continuam com status **Proposta**. Esta validação não os promove para decisão aprovada.
