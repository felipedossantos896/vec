# Handoff

T001 / #279, branch `codex/279-fidelidade-mapa`. Pranchas 01/03 do PR #278 comparadas lado a lado com capturas sintéticas. Título 24 px, filtros acima do mapa e zoom no topo no desktop, painel branco com três indicadores, alerta âmbar junto aos rostos e halo no selecionado individual. Os alvos compartilhados mantêm os nomes e o acesso a cada cartão, conforme #249. Os avatares seguem ADR-0011. O menu, os modos e os filtros já aprovados foram mantidos.

Playwright 1920×1080, 2560×1440, 3840×2160 e 390×844 conferiu as dimensões 36/40 e 44/48, o alerta, a seleção e o halo de dois ciclos, foco/Escape, ausência de movimento com redução ativada e o cartão dentro do mapa. Cartografia ilustrativa da fixture. Passaram typecheck, build, 92 testes frontend, Go vet/test/build e diff check. Pendente merge e validação do deploy.
