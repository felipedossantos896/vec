# Handoff — Spec 019

- T001, Issue #218, branch `codex/spec-019-sem-cuidado`.
- Removidos os alertas, as lentes de cuidado, o histórico e o registro de acompanhamento no painel. Mantidos WhatsApp, jornada, discipulado e ferramentas da Área. Backend e banco intactos.
- Typecheck, build, 93 testes do frontend e diff check passaram.
- Chrome com dados fictícios a 1440 × 900 e 390 × 844, perfis Área e Discipulador: Todos selecionado, sem alertas no mapa, cartão sem telefone abre a ficha, quatro KPIs, lista de discípulos em ordem alfabética, ficha com duas abas, WhatsApp e Acompanhamento Inicial. Nenhuma chamada de anotações ou erro de JavaScript.
- Pendentes: revisão independente e CI. As ferramentas da Área não foram exercitadas ponta a ponta.
- Rollback: reverter o PR.
