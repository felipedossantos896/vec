# Handoff — Spec 018

- T001 / Issue #216 confirmada aberta. Branch `codex/spec-nitidez-mapa`.
- Implementados tiles Retina, teto automático 14, teto manual 16, teto da camada 17, régua métrica e aviso de localização aproximada.
- Typecheck, build, 93 testes frontend e `git diff --check` passaram.
- Chrome com painel local e um grupo fictício em 1440 × 900 e 390 × 844, nas densidades 1× e 2×: abriu no zoom 14, chegou ao 16, carregou tiles do OpenStreetMap nos níveis esperados e mostrou a régua de 200 m acima da gaveta recolhida.
- Comparação em Chrome no mesmo centro em Fortaleza e zoom 16, com um marcador fictício. Frente à base `b31fdea`, em 2× os contornos e as letras ganham definição e surgem nomes de vias secundárias. Alguns rótulos ficam menores e aparecem mais números de imóveis. Em 1×, a camada mantém a resolução anterior.

| Tela | Densidade | Tiles carregados antes → depois |
| --- | --- | --- |
| 1440 × 900 | 1× | 24 → 24 |
| 1440 × 900 | 2× | 24 → 80 |
| 390 × 844 | 1× | 8 → 8 |
| 390 × 844 | 2× | 8 → 28 |

- Capturas locais com dados fictícios em `/tmp/vec-216-{1440,390}-{1,2}-{antes,depois}.png`.
- Pendentes: cobertura dos outros recortes e nova revisão independente após o CI. A Issue permanece aberta.
- Rollback: reverter o PR.
