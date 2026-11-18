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

```bash
python3 scripts/automation/review_pr.py <PR> --agent codex
```

Use `--agent claude` quando o Claude Code estiver instalado e autenticado, ou
omita a opção para escolher o primeiro CLI disponível. Para ensaiar sem comentar,
use `--dry-run`.

O script monta o diff diretamente dos objetos Git, sem fazer checkout da PR,
executa o agente em modo de revisão, exige veredito explícito, reconfirma SHA e
CI e registra no PR somente base, head e aprovação fixa quando o veredito for
`Ship`; texto livre do modelo nunca é publicado. Bloqueios ficam locais para
correção. O
merge fica separado, sujeito às proteções do GitHub, porque a CLI não consegue
fixar atomicamente o SHA da base revisada. O agente recebe somente variáveis de
ambiente necessárias à sessão local e recebe o diff por entrada, sem ferramentas
de shell ou acesso ao checkout. O script usa as sessões locais de
`codex`/`claude` e `gh`: não requer API key nem cria uma falsa aprovação por
uma segunda conta GitHub.
