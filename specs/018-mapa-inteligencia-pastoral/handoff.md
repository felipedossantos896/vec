# Handoff — Spec 018
- Estado: escopo P0/P1 aprovado e preview validado; nenhuma implementação iniciada.
- Baseline: Specs 016 e 017 entregues segundo documentação; mapa e central existentes devem ser reaproveitados.
- Próxima ação: revisão independente da T001 no PR #214. Após merge e validação, iniciar T002 / #205.
- Issues #204–#212 e dependências em graph.json.
- Codex/Claude Code: seguir AGENTS.md, uma tarefa por worktree/PR; verificar estado real das Issues e reserva antes de executar.
- Registrar branch/PR, arquivos, testes efetivos, evidências sintéticas, riscos e próximo passo. Não registrar dados reais.

## Proposta para revisão — T001 / #204

- Validar um preview com superfícies claras de alto contraste e menu grafite em 390×844 e 1440×900. Adiar o menu compacto até a validação do layout principal.
- Mostrar as seis etapas da jornada sob demanda, com nome e estado independentes. Omitir a seção se a fonte atual não sustentar a apresentação. Dados ausentes não indicam conclusão.
- Manter Leaflet/OSM e os centros aproximados existentes. Adiar P2. Antes de replanejar territórios e calor, revisar supressão de grupos pequenos e resistência à inferência entre filtros com fixtures sintéticas. O limiar fica pendente dessa revisão. Atualizar Spec e grafo em conjunto se o adiamento for aprovado.
- Branch de revisão: `docs/spec-018-t001-revisao`.
- Evidência: grafo, Spec e ADR conferidos. Preview e testes de aplicação ficam pendentes.
- Próximo passo: registrar as decisões aprovadas e atualizar a Spec, a ADR e o grafo conforme necessário. A T002 / #205 aguarda a conclusão da T001.


## Validação do preview

Chromium via Playwright em 390×844 e 1440×900. Navegação, filtros, painel, atribuição ilustrativa e gaveta ficaram dentro do viewport com cartão e gaveta fechados e abertos. Largura rolável igual à largura do viewport. Preview estático com dados fictícios; gestos do mapa, busca e integração não fazem parte desta evidência. P2 adiado; T009 depende de T006 nesta entrega.
