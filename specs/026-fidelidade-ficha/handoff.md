# Handoff

T001 / #280, branch `codex/280-fidelidade-ficha`. Comparadas as pranchas 02 e 03 do PR #278 com capturas do painel. Ficha central de 720 px no desktop e tela inteira em 390 px; nome 24 px semibold, cabeçalho claro, ações verdes e azuis, ícones e sublinhado nas abas, cards de resumo e da ficha. Jornada usa os registros existentes e torna os estados legíveis sem depender de cor. Modal central, duas abas, ações de edição, autorização e pino preservados. Divergências documentadas na Spec.

Playwright em 1920×1080, 2560×1440, 3840×2160 e 390×844 verificou colunas, tipografia, ações, estados, foco das abas, Escape, entrada na edição, pino e consentimento com dados fictícios e movimento reduzido. Uma sobreposição de rótulos em 390 px foi corrigida e as capturas foram refeitas. Passaram typecheck, build, 92 testes frontend, Go vet/test/build e diff check. Pendente merge e confirmação em produção.
