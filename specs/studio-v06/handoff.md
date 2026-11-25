# Handoff — V0.6

T001 / #231 em `codex/studio-v06`. A suíte gera evidências locais para 92 combinações de frame e viewport. Referências são criadas explicitamente e vinculadas ao ambiente de renderização. Próximo passo após merge é aplicar os tokens e componentes da V1.0 e registrar uma nova referência.

Playwright com Chrome gravou e comparou as 92 capturas nos quatro viewports. Uma alteração de cor isolada nos títulos do cadastro foi detectada nos cinco passos em cada resolução. A referência fica em artefatos locais. CI e revisão independente são verificados no PR.

A captura adicional do fim da lista do mapa mobile levou a matriz a 93 imagens. O teste de alteração isolada da última linha detectou diferenças nas capturas do mapa, incluindo a posição rolada.
