# Handoff — Spec 018

- T001 / Issue #216 confirmada aberta. Branch `codex/spec-nitidez-mapa`.
- Implementados tiles Retina, teto automático 14, teto manual 16, teto da camada 17, régua métrica e aviso de localização aproximada.
- Typecheck, build, 93 testes frontend e `git diff --check` passaram.
- Chrome com painel local e um grupo fictício em 1440 × 900 e 390 × 844, nas densidades 1× e 2×: abriu no zoom 14, chegou ao 16, carregou tiles do OpenStreetMap nos níveis esperados e mostrou a régua de 200 m acima da gaveta recolhida.
- Pendentes: comparação visual de legibilidade com capturas, cobertura dos outros recortes e revisão independente após o CI. A Issue permanece aberta.
- Rollback: reverter o PR.
