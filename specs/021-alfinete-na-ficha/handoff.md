# Handoff

T001 / #222 na branch `codex/pino-manual-ficha`. A ficha tem editor de pino central. O servidor grava nos campos existentes, com precisão manual, consentimento, escopo no SQL e conferência da revisão do endereço. Geocodificação automática preserva o pino. Mapa e ranking mantêm a aproximação. Sem migration.

Passaram typecheck, build, 92 testes do frontend, Go vet/test/build e diff check. Teste da API cobre escopo, consentimento e revisão. Conferência visual autenticada com dados fictícios pendente.
