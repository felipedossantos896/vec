# ADR-0009 — Revisão independente local e gate de merge

- Status: **Aceito** (decisão do responsável pelo repositório em 2026-11-19, Issue #26; a incorporação da PR #43 confirma a aprovação)
- Data: 2026-11-19

## Contexto
O processo exigia revisão independente, mas nada a impunha: a `main` só exigia o
check `testes`. O repositório tem um único colaborador humano, e o GitHub não
permite que o autor aprove a própria PR. Os agentes de desenvolvimento são o
Codex e o Claude Code. Exigir sempre um revisor de outro modelo deixaria o fluxo
dependente de um único fornecedor, e o responsável decidiu evitar essa
dependência.

## Decisão
- O revisor é o `review-pr` local. Com veredito `Ship`, ele publica um comentário
  e o commit status `revisao-independente = success` no SHA revisado, só quando a
  base da PR é `main`. Com bloqueio, publica `failure`. A `main` passa a exigir
  esse status junto com `testes`, branch atualizada e conversas resolvidas.
- A independência vem do isolamento da sessão. O revisor recebe só o diff e as
  regras da base, sem ferramentas, servidores MCP, conectores da conta, plugins,
  configurações do usuário ou histórico de quem implementou.
- O `review-pr` prefere o agente que não é coautor (trailers `Co-Authored-By`).
  O mesmo modelo é aceito nessa sessão isolada e fica registrado como "mesmo
  modelo do autor em sessão isolada" no comentário e no status.

## Alternativas
- Aprovação formal obrigatória: inviável com um único colaborador.
- Exigir sempre outro modelo: cria dependência de um fornecedor.
- Revisão só humana: mantém o gargalo e não registra evidência no SHA.

## Consequências
- O merge acidental sem revisão fica bloqueado, inclusive para admins.
- Cada novo push ou rebase exige nova revisão.
- Quem tem permissão de escrita pode publicar o status manualmente. O gate
  previne descuido, não abuso deliberado.
- Revisar com o mesmo modelo reduz a diversidade do parecer. O risco é mitigado
  pelo isolamento e pelo registro explícito.

## Validação
Testes do `review-pr`: argumentos de isolamento da sessão, seleção do revisor,
regras de publicação (dry run e bloqueio nunca publicam `success`; `success`
só com base `main`). Uma sessão real com as flags de isolamento não enxerga
nenhuma ferramenta. Rollback da proteção em `docs/development/multi-agent.md`.
