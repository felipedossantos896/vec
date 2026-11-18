# ADR-0001 — Modernização incremental

- Status: **Proposto**
- Data: 2026-11-18

## Contexto
O VEC já opera em produção. O roteiro existente prioriza integridade, testes e manutenção da stack Go + TypeScript + Tailwind, evitando reescrita.

## Decisão proposta
Modernizar módulos existentes em entregas pequenas, compatíveis com contratos e autorização atuais. Começar pela tela de Indicadores. Cada entrega terá testes, revisão e rollback planejado. Não migrar para React/Next.js apenas para modernizar a UI.

## Alternativas
Reescrita completa; migração para framework; manutenção sem modernização.

## Consequências
Menor risco de regressão e implantação gradual; exige consistência visual entre telas durante a transição.

## Validação
Build, typecheck, testes Go, acessibilidade básica, regressão funcional e revisão antes do deploy.
