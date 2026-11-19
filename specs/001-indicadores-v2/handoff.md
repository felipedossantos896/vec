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
- Branch/PR e commit: `feat/issue-16-indicadores-layout`; PR e commit pendentes neste registro.
- Objetivo e escopo: reorganizar Indicadores em visão geral, jornada e perfil; destacar total de pessoas e manter todas as métricas e gráficos existentes.
- Arquivos alterados: renderer e JavaScript compilado de Indicadores, CSS do dashboard e testes de contrato visual.
- Testes realmente executados e resultados: `npm run typecheck`, `npm run build`, `npm run test:frontend` (9 testes), `gofmt`, `go vet ./...`, `go test ./...`, `go build ./...` e `git diff --check`; aprovados. Playwright MCP em 1440×900 e 390×844 validou cinco KPIs, três seções, três regiões de gráfico, rolagem interna no mobile, ausência de overflow da página e console sem warnings/erros. O filtro Norte alterou o total sintético de 12 para 8 e sincronizou Pessoas, Indicadores e Acompanhar.
- Decisões e riscos: gráficos de 12 meses rolam dentro do card no mobile; nenhuma métrica, API, autorização ou persistência foi alterada. Validação visual com dados sintéticos, sem escrita no Turso.
- Pendências/bloqueios: revisão independente e CI do PR.
- Próxima ação recomendada: criar e revisar a PR da Issue #16 no SHA final; após merge, T006 ainda dependerá também da T005.
- Estado da Issue confirmado em: aberta em 2026-11-19; dependências T002/#14 e T003/#15 encerradas.
