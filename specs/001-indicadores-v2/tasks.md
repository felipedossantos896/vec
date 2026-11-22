# Tarefas — Indicadores V2

- [x] **T001 — Inventário e baseline**: mapear IDs, funções, cálculos e filtros atuais; documentar evidências. Concluído quando houver mapa de impacto e exemplos de resultados atuais.
- [x] **T002 — Testes de métricas e escopos**: definir funções testáveis e cobrir zero registros, seis etapas independentes, discipulador vazio, filtros e escopos. Concluído com testes automatizados executados no CI.
- [x] **T003 — Design system mínimo**: tokens e componentes de KPI/filtro/card, preservando identidade e acessibilidade. Concluído com validação desktop/mobile e sem regressão em outras abas.
- [x] **T004 — Reestruturação visual de Indicadores**: layout responsivo, hierarquia, cards e gráficos atuais. Concluído quando todos os indicadores existentes estiverem acessíveis e filtros coerentes.
- [x] **T005 — Central de atenção e drill-down**: contagem de jornada incompleta e sem discipulador, navegação para Pessoas filtrada. Concluído com teste de filtro e escopo autorizado.
- [x] **T006 — Validação e preparação de release**: typecheck, build, testes Go, acessibilidade, estados de UI, evidências e plano de rollback. Concluído após revisão e CI.

## Dependências
T001 precede T002–T005; T002 e T003 precedem T004/T005; T006 finaliza a entrega. Nenhuma tarefa autoriza deploy isoladamente.
