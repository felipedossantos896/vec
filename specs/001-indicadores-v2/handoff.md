# Handoff entre Codex e Claude Code — Indicadores V2

Este arquivo registra **somente o estado verificável** e pode ser atualizado
por qualquer agente na branch da tarefa. Não substitui `graph.json`,
a consulta às Issues, a revisão ou os testes.

## Estado inicial (2026-11-18)
- Spec: `001-indicadores-v2`; plano e especificação ainda marcados como **Proposto**.
- T001 / Issue #13: baseline técnico documentado em `baseline.md`, Issue encerrada.
- T002 / Issue #14: testes de métricas e escopos; não há implementação confirmada neste handoff.
- T003 / Issue #15: design system mínimo; não há implementação confirmada neste handoff.
- T004–T006: dependem das etapas anteriores conforme `graph.json`.
- O executor Codex do GitHub Actions (PR #23) foi integrado, mas a execução ponta a ponta ainda não foi confirmada.

## Modelo de atualização por tarefa
Copie o bloco abaixo ao final **na branch/PR da tarefa**. Nunca escreva
credenciais, dados de membros ou conteúdo confidencial.

### Txxx / Issue #nn — YYYY-MM-DD
- Agente utilizado: Codex | Claude Code
- Branch/PR e commit:
- Objetivo e escopo:
- Arquivos alterados:
- Testes realmente executados e resultados:
- Decisões e riscos:
- Pendências/bloqueios:
- Próxima ação recomendada:
- Estado da Issue confirmado em:

### T002 / Issue #14 — 2026-11-18
- Agente utilizado: Codex
- Branch/PR e commit: `feat/issue-14-metricas`; implementação em `f07f7e8`; PR ainda pendente.
- Objetivo e escopo: extrair regras puras dos Indicadores e testar métricas, filtros e escopos sem alterar contratos ou persistência.
- Arquivos alterados: métricas e testes do frontend, testes de escopo do store, asset embutido, script npm e CI.
- Testes realmente executados e resultados: `npm run typecheck`, `npm run build`, `npm run test:frontend` (5 testes), `go vet ./...`, `go test ./...`, `go build ./...`, `gofmt` e `git diff --check`; todos aprovados localmente. CI do PR #25 aprovado antes do último ajuste solicitado na revisão independente. Playwright MCP validou Indicadores com `vec-dev` em 390x844 e 1440x900: KPIs, filtros compartilhados, estado vazio, foco de teclado, movimento reduzido, ausência de overflow e console sem warnings/erros.
- Decisões e riscos: testes usam `node:test` do Node 24 já presente no CI, sem nova dependência; o JavaScript compilado permanece versionado. O usuário AREA temporário do teste E2E foi removido do `vec-dev` após logout e o servidor local foi encerrado.
- Pendências/bloqueios: revisão independente antes de considerar a tarefa concluída; nenhum bloqueio técnico conhecido.
- Próxima ação recomendada: revisar o diff e validar que o commit revisado corresponde ao commit aprovado antes do merge.
- Estado da Issue confirmado em: aberta em 2026-11-18; T001/#13, sua única dependência, encerrada.

### T003 / Issue #15 — 2026-11-18
- Agente utilizado: Codex.
- Branch/PR e commit: `feat/issue-15-design-system`; PR #31; implementação em `bc33f6f`.
- Objetivo e escopo: formalizar tokens e componentes mínimos de KPI, card e barra de filtros, preservando classes, IDs, dados e navegação existentes.
- Arquivos alterados: tokens CSS, estilos do painel, markup dos filtros, renderer de Indicadores, JavaScript compilado e teste de contrato visual.
- Testes realmente executados e resultados: `npm run typecheck`, `npm run build`, `npm run test:frontend` (8 testes), `gofmt`, `go vet ./...`, `go test ./...`, `go build ./...` e `git diff --check`; aprovados. Playwright MCP validou 1440×900 e 390×844 com dados sintéticos: 4 KPIs, 6 cards, grupos de filtros nomeados, foco visível, movimento reduzido, abas Acompanhar/Pessoas/Indicadores, sem overflow horizontal e console sem warnings/erros.
- Decisões e riscos: componentes novos coexistem com seletores antigos para migração incremental; nenhuma mudança de API, autorização, banco ou regra de métrica. A validação visual não usou dados reais nem escreveu no Turso.
- Pendências/bloqueios: primeira revisão independente pediu fortalecer o teste do rótulo de cada grupo; correção aplicada. CI da PR #31 passou no SHA `aae438a` antes desse ajuste final; novo CI e revisão ainda pendentes.
- Próxima ação recomendada: confirmar o CI e revisar o novo SHA final da PR #31 antes do merge.
- Estado da Issue confirmado em: aberta em 2026-11-18; T001/#13, sua única dependência, encerrada.

### T004 / Issue #16 — 2026-11-19
- Agente utilizado: Codex.
- Branch/PR e commit: `feat/issue-16-indicadores-layout`; PR #32; implementação em `09a91ce`.
- Objetivo e escopo: reorganizar Indicadores em visão geral, jornada e perfil; destacar total de pessoas e manter todas as métricas e gráficos existentes.
- Arquivos alterados: renderer e JavaScript compilado de Indicadores, CSS do dashboard e testes de contrato visual.
- Testes realmente executados e resultados: `npm run typecheck`, `npm run build`, `npm run test:frontend` (9 testes), `gofmt`, `go vet ./...`, `go test ./...`, `go build ./...` e `git diff --check`; aprovados. Playwright MCP em 1440×900 e 390×844 validou cinco KPIs, três seções, três regiões de gráfico, rolagem interna no mobile, ausência de overflow da página e console sem warnings/erros. O filtro Norte alterou o total sintético de 12 para 8 e sincronizou Pessoas, Indicadores e Acompanhar.
- Decisões e riscos: gráficos de 12 meses rolam dentro do card no mobile; nenhuma métrica, API, autorização ou persistência foi alterada. Validação visual com dados sintéticos, sem escrita no Turso.
- Pendências/bloqueios: revisão independente e CI do PR.
- Próxima ação recomendada: revisar a PR #32 no SHA final; após merge, T006 ainda dependerá também da T005.
- Estado da Issue confirmado em: aberta em 2026-11-19; dependências T002/#14 e T003/#15 encerradas.

### T005 / Issue #17 — 2026-11-19
- Agente utilizado: Codex.
- Branch/PR e commit: `feat/issue-17-central-atencao`; PR #33; implementação em `d7a55ba`.
- Objetivo e escopo: adicionar central de atenção em Indicadores para jornada incompleta e ausência de discipulador, reutilizando a lista e os filtros existentes de Pessoas.
- Arquivos alterados: métricas, situações do painel, renderer/JavaScript compilado de Indicadores, CSS e testes frontend.
- Testes realmente executados e resultados: `npm run typecheck`, `npm run build`, `npm run test:frontend` (11 testes), `gofmt`, `go vet ./...`, `go test ./...`, `go build ./...` e `git diff --check`; aprovados. Playwright MCP em 390×844 validou setor Norte com 2 jornadas incompletas e 1 pessoa sem discipulador; ambos os cards abriram Pessoas com situação, setor, contagem e chips corretos, sem overflow ou mensagens no console.
- Decisões e riscos: grupos podem se sobrepor e isso é informado na interface; o drill-down usa `data-sit` e o conjunto já recortado pelo backend, sem endpoint ou autorização nova. Teste visual com dados sintéticos, sem escrita no Turso.
- Pendências/bloqueios: revisão independente e CI do PR.
- Próxima ação recomendada: revisar a PR #33 no SHA final; após merge, T006 fica desbloqueada.
- Estado da Issue confirmado em: aberta em 2026-11-19; dependências T002/#14 e T003/#15 encerradas.

### T006 / Issue #18 — 2026-11-19
- Agente utilizado: Codex.
- Branch/PR e commit: `feat/issue-18-validacao-release`; PR #34; documentação em `eb3a74f`; base validada `9c5613c` (`v1.14.0`).
- Objetivo e escopo: validar a entrega completa de Indicadores V2, registrar evidências, riscos residuais e um rollback reversível, sem alterar aplicação ou produção.
- Arquivos alterados: relatório de validação de release e este handoff.
- Testes realmente executados e resultados: `npm run typecheck`, `npm run build`, `npm run test:frontend` (11 testes), `gofmt`, `go vet ./...`, `go test ./...`, `go build ./...` e `git diff --check`; aprovados. Playwright MCP validou estado normal, vazio e erro, mobile 390×844 sem overflow, foco visível e movimento reduzido. O HTTP 500 e seu erro de console foram produzidos intencionalmente para validar a recuperação.
- Decisões e riscos: a versão conserva a janela fixa de 12 meses; não existe seletor de período e a definição desse controle segue como questão aberta na spec. A inspeção usou dados sintéticos, sem escrita no Turso. Não há migration, alteração de API, autorização ou infraestrutura.
- Pendências/bloqueios: o CI da PR #34 passou em `eb3a74f` (run `44452726022`); uma primeira revisão independente bloqueou a redação do passo 5 do rollback, corrigida no commit seguinte. Novo CI e nova revisão são obrigatórios no SHA final. Spec e plano permanecem **Proposta**.
- Próxima ação recomendada: revisar o relatório, confirmar o SHA final no CI e incorporar apenas com checks obrigatórios aprovados.
- Estado da Issue confirmado em: aberta em 2026-11-19; dependências T004/#16 e T005/#17 encerradas.
