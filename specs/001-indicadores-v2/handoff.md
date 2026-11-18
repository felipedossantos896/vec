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
- Testes realmente executados e resultados: `npm run typecheck`, `npm run build`, `npm run test:frontend` (4 testes), `go vet ./...`, `go test ./...`, `go build ./...`, `gofmt` e `git diff --check`; todos aprovados localmente.
- Decisões e riscos: testes usam `node:test` do Node 24 já presente no CI, sem nova dependência; o JavaScript compilado permanece versionado. Não houve teste visual em navegador.
- Pendências/bloqueios: publicar a branch, abrir PR não-draft e confirmar CI/revisão independente antes de considerar a tarefa concluída.
- Próxima ação recomendada: revisar o diff, executar o CI no PR e validar que o commit revisado corresponde ao commit aprovado.
- Estado da Issue confirmado em: aberta em 2026-11-18; T001/#13, sua única dependência, encerrada.
