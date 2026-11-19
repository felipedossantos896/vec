# Alternância entre Codex e Claude Code

## Objetivo
Trabalhar com **um agente por vez**, alternando ferramentas sem perder
o contexto versionado. Não exige chave de API para usar os CLIs locais
autenticados com suas respectivas contas; o executor remoto do GitHub Actions
é separado e atualmente requer `OPENAI_API_KEY`.

## Codex local
```bash
git switch main && git pull --ff-only
git switch -c feat/issue-14-metricas
codex
```
O Codex lê `AGENTS.md`. Peça para seguir a Issue #14, a Spec 001 e
atualizar `handoff.md` com resultados verificáveis.

## Claude Code local
Após salvar/commitar as mudanças na branch e fechar a sessão anterior:
```bash
git status
claude
```
O Claude Code lê `CLAUDE.md`, que remete ao mesmo `AGENTS.md`.
Peça para continuar a mesma Issue a partir do handoff, do diff e dos commits.

## Troca de ferramenta
1. Finalize a sessão atual; confira `git status`.
2. Faça commit ou preserve conscientemente o estado local, sem sobrescrever.
3. Inicie a outra ferramenta **na mesma branch**, se a intenção for continuar
   a tarefa, ou em outra branch/worktree para tarefa diferente.
4. Leia a Issue, `graph.json`, `handoff.md`, diff e testes; não suponha que
   o novo agente conheça o chat anterior.
5. Abra um PR por tarefa, sem mesclar branches não relacionadas.

## CI e governança
- O workflow `agent-execute.yml` do GitHub Actions é um piloto **Codex remoto**,
  não uma exigência para uso local e não executa Claude Code.
- Nenhum agente deve contornar CI, revisões ou permissões de produção.
- O handoff documenta fatos, mas não prova que uma tarefa foi concluída.

## Revisão independente local

Depois que o CI do PR estiver verde, outro agente local pode revisar o SHA e,
se não houver bloqueio, registrar o parecer no PR:

O CLI requer Rust 1.100 ou compatível. Instale o toolchain uma vez; as
dependências ficam fixadas em `scripts/automation/Cargo.lock`.

```bash
cargo run --locked --manifest-path scripts/automation/Cargo.toml -- review-pr <PR> --agent codex
```

Use `--agent claude` quando o Claude Code estiver instalado e autenticado, ou
omita a opção para preferir um CLI disponível **que não seja coautor da PR**
(conforme os trailers `Co-Authored-By` dos commits). Se só o modelo coautor
estiver disponível, ou for pedido explicitamente, a revisão roda mesmo assim:
a independência vem da sessão isolada, que recebe apenas o diff e as regras,
sem ferramentas nem o histórico de quem implementou. Nesse caso o comentário e
o status registram "mesmo modelo do autor em sessão isolada", para que fique
visível. Assim o fluxo não depende de um único modelo. Para ensaiar sem
comentar nem publicar status, use `--dry-run`.

Para PRs que alteram `.github/workflows/ci.yml`, o revisor também compara as
etapas do workflow e confirma que as validações obrigatórias foram preservadas
antes de o CLI publicar o parecer.

Por segurança pragmática, a publicação autônoma só aceita PR criada pelo dono
do repositório e cuja branch de origem também pertença a ele. PRs de forks ou
outros autores devem seguir revisão humana.

O binário Rust monta o diff diretamente dos objetos Git, sem fazer checkout da PR,
executa o agente em modo de revisão, exige veredito explícito, reconfirma SHA e
CI, inclui no contexto confiável a evidência dos checks do SHA exato e registra
no PR somente base, head e aprovação fixa quando o veredito for
`Ship`. Bloqueios ficam locais para correção. Incorpore a PR pelo GitHub após
conferir o parecer e a branch de destino. A `main` exige o check `testes` do
GitHub Actions, o status `revisao-independente` (veja abaixo) e uma branch
atualizada. O CLI rejeita `--merge` porque a API
do GitHub aceita uma condição para o SHA de origem, mas não para a branch de
destino revisada. O agente recebe somente variáveis de
ambiente necessárias à sessão local e recebe o diff por entrada, sem ferramentas
de shell ou acesso ao checkout. O binário usa as sessões locais de
`codex`/`claude` e `gh`: não requer API key nem cria uma falsa aprovação por
uma segunda conta GitHub.

### Gate de revisão na `main`

Com veredito `Ship`, o `review-pr` publica, além do comentário, o commit status
`revisao-independente = success` no SHA revisado. Com bloqueio, publica
`failure`. O status pertence ao SHA, então qualquer novo push ou rebase
exige nova revisão. Como o repositório tem um único colaborador e o GitHub não
permite que o autor aprove a própria PR, o gate usa status obrigatório em vez
de aprovação formal.

Configuração da proteção (aplicar só depois que este fluxo estiver na `main`).
O `PUT` substitui a proteção inteira; o estado anterior está no rollback:

```bash
gh api -X PUT repos/<owner>/<repo>/branches/main/protection --input - <<'JSON'
{"required_status_checks":{"strict":true,"contexts":["testes","revisao-independente"]},
 "enforce_admins":true,
 "required_pull_request_reviews":{"required_approving_review_count":0},
 "restrictions":null,"required_conversation_resolution":true,
 "allow_force_pushes":false,"allow_deletions":false}
JSON
```

Isso exige PR (sem aprovação formal), conversas resolvidas, CI e revisão
independente no SHA atual, com a branch atualizada, inclusive para admins.

Rollback para o estado anterior a esta mudança (registrado em 2026-11-19):

```bash
gh api -X PUT repos/<owner>/<repo>/branches/main/protection --input - <<'JSON'
{"required_status_checks":{"strict":true,"contexts":["testes"]},
 "enforce_admins":true,"required_pull_request_reviews":null,
 "restrictions":null,"required_conversation_resolution":false,
 "allow_force_pushes":false,"allow_deletions":false}
JSON
```

Limite conhecido: quem tem permissão de escrita pode publicar um status
manualmente; o gate impede merge acidental sem revisão, não um colaborador
mal-intencionado. Deploy e auto-merge seguem desabilitados por padrão.
