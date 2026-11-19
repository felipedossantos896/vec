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
omita a opção para escolher o primeiro CLI disponível. Para ensaiar sem comentar,
use `--dry-run`.

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
GitHub Actions e uma branch atualizada. O CLI rejeita `--merge` porque a API
do GitHub aceita uma condição para o SHA de origem, mas não para a branch de
destino revisada. O agente recebe somente variáveis de
ambiente necessárias à sessão local e recebe o diff por entrada, sem ferramentas
de shell ou acesso ao checkout. O binário usa as sessões locais de
`codex`/`claude` e `gh`: não requer API key nem cria uma falsa aprovação por
uma segunda conta GitHub.

## Smoke E2E em `vec-dev` (opt-in)

Validação visual automatizada do painel, fora do CI. Requer `turso auth login`,
Go, `npm ci` e, uma única vez, `npx playwright install chromium`.

```bash
npm run test:e2e:dev
```

O script resolve o banco pelo nome `vec-dev` (recusa qualquer outro), gera um
token Turso de 1 dia com permissões mínimas (leitura geral; escrita apenas em
`usuarios`, `usuario_escopos` e `login_falhas`), cria um usuário AREA
`e2e-<aleatório>` com senha em arquivo `0600`, sobe o servidor em porta livre
com `AUTO_MIGRATE=0` e valida, em 1440×900 e 390×844 com movimento reduzido:
login, cinco KPIs de Indicadores, filtro de setor compartilhado entre as abas,
foco de teclado visível (estilo muda com o foco), CSS sem animações com movimento reduzido, ausência de overflow horizontal, console e HTTP sem
erros, estado vazio (resposta simulada, nada é gravado) e logout.

Sempre, inclusive em falha ou Ctrl+C, encerra navegador e servidor, remove o
usuário e os arquivos temporários e confere que o usuário desta execução foi removido (outras execuções simultâneas não interferem).
Nada de token, senha, screenshot ou dado de pessoas é impresso ou gravado.
`E2E_SIMULAR_FALHA=1` força uma falha após o login para comprovar a limpeza.
O token expira sozinho em 1 dia; o Turso não permite revogar um token
isolado sem invalidar todos os do banco.

Se uma execução for morta com `kill -9`, remova o usuário restante com
`go run ./backend/cmd/e2e-usuario remover -usuario e2e-...`, com
`TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` do `vec-dev` no ambiente.
