# ✝ Sistema da Área VEC

Formulário de cadastro de membros e painel da liderança, com permissões por
**área, setor e célula**. Backend escrito em Go, sem dependências externas;
frontend em TypeScript com Tailwind CSS; banco no [Turso](https://turso.tech) (SQLite na nuvem).

```
Navegador ──►  Servidor Go  ──►  Turso (SQLite)
  (formulário,    (/api + páginas)     (dados)
   painel)
```

Um único programa (`backend/cmd/server`) serve as páginas e a API. O formato da API é o
mesmo que o Google Apps Script usava, então o formulário e o painel quase não
mudaram.

## O que tem aqui

```
backend/
  cmd/         servidor, migrations, usuários, importação e geração do SESSION_SECRET
  internal/    API, SQL, cliente Turso, autenticação e configuração
  migrations/  versões do banco: 0001_inicial.sql, 0002_... (VERSIONADAS NO GIT)
frontend/      fontes TypeScript em src/; HTML/CSS, Tailwind e JavaScript compilado embutido pelo Go
go.mod         módulo Go compartilhado pelo backend e pelo pacote de frontend
fly.toml       configuração do Fly.io
Dockerfile     imagem do servidor
docs/          guias: NOTEBOOK.md (trabalhar no computador), DEPLOY.md (deploy) e
               ROADMAP-REFATORACAO.md (diagnóstico e fases)
```

## Versionamento do banco

A **estrutura** do banco (tabelas, colunas, índices) fica na pasta `backend/migrations/`,
em arquivos numerados que vão para o Git como qualquer código. Cada arquivo roda
uma única vez, em ordem, dentro de uma transação, e fica registrado na tabela
`schema_migrations`.

- Mudou o banco? **Crie um arquivo novo** (`0003_descricao.sql`). Nunca edite um já aplicado.
- Os **dados** (nomes, nascimentos...) **nunca** vão para o Git. O `.gitignore` já bloqueia `.env`, `*.csv` e `*.db`.

## Primeira vez no seu computador

Veja o passo a passo completo em **[docs/NOTEBOOK.md](docs/NOTEBOOK.md)**. Resumo:

1. Instale **Git**, **Go** (1.24 ou mais novo), **Node.js** (24 ou mais novo) e o **VS Code**.
2. No Turso, crie um banco de **desenvolvimento** (`vec-dev`) e um token para ele.
3. Copie `.env.example` para `.env` e preencha (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`).
4. Rode:

```bash
npm ci
npm run build
go run ./backend/cmd/segredo          # gera o valor do SESSION_SECRET (cole no .env)
go run ./backend/cmd/migrate          # cria as tabelas no banco
go run ./backend/cmd/usuario -usuario admin -nome "Administrador" -perfil AREA -gerencia
go run ./backend/cmd/server           # abre em http://localhost:8080
```

Formulário: `http://localhost:8080/` · Painel: `http://localhost:8080/admin/`

## Comandos do dia a dia

| Para quê | Comando |
|---|---|
| Compilar o frontend após editar TypeScript ou estilos | `npm run build` |
| Verificar tipos do frontend | `npm run typecheck` |
| Rodar o sistema | `go run ./backend/cmd/server` |
| Rodar os testes | `go test ./...` |
| Conferir o código | `go vet ./...` e `gofmt -l .` |
| Aplicar migrations | `go run ./backend/cmd/migrate` (o servidor também faz isso ao iniciar) |
| Criar usuário | `go run ./backend/cmd/usuario -usuario ana -nome "Ana" -perfil CELULA -celulas "Hope"` |
| Importar a planilha | `go run ./backend/cmd/importar -arquivo dados/respostas.csv` (use `-simular` antes) |
| Agir no banco de produção | `ENV_FILE=.env.prod go run ./backend/cmd/usuario ...` (todo comando mostra `Banco: ...` na primeira linha) |

As fontes TypeScript do frontend ficam em `frontend/src/`; as classes do Tailwind
são geradas a partir do HTML e do TypeScript. Após editar fontes ou estilos, rode
`npm run build`: os arquivos JavaScript e CSS gerados são mantidos nos caminhos
embutidos pelo Go, e o CI verifica que estão sincronizados.

## Permissões

| Perfil | Vê |
|---|---|
| `AREA` | todos os cadastros |
| `SETOR` | os cadastros dos setores marcados (e das células extras marcadas) |
| `CELULA` | os cadastros das células marcadas |

O filtro é aplicado **no servidor**, na própria consulta SQL: quem não tem
permissão nunca recebe os dados. Quem tem "Pode gerenciar usuários" vê a aba
**Usuários** no painel e cria/edita acessos, troca senhas e desativa pessoas.

## Hospedagem (onde o servidor roda)

O servidor é um container comum (`Dockerfile`, binário único de ~7 MB), então roda em
qualquer lugar. O caminho com tudo pronto (configuração e deploy automático) é o **Fly.io**, na região de São Paulo,
com o banco do Turso também em São Paulo (assim cada consulta leva cerca de 1 ms
entre servidor e banco). **Guia completo: [docs/DEPLOY.md](docs/DEPLOY.md).**

| | Fly.io | Google Cloud Run |
|---|---|---|
| Custo aproximado | máquina de 256 MB sempre ligada: cerca de **US$ 3,54/mês em São Paulo** (US$ 2,19 em Ashburn, nos EUA) | tende a ficar na faixa gratuita para esse volume |
| Primeira visita após tempo parado | sem espera (sempre ligado) | o servidor "dorme" e a primeira visita fica mais lenta (não medi quanto) |
| Conta | cartão obrigatório depois do teste de 7 dias; sem plano gratuito para contas novas | exige uma conta de cobrança no Google |
| Arquivo de configuração | `fly.toml` (já incluído) | nenhum (usa o `Dockerfile`) |

Sobre os preços:

- O Fly **não tem mensalidade**. Os **US$ 29** que aparecem em alguns lugares são o plano de **suporte** opcional; não é necessário.
- No Cloud Run, a faixa gratuita (2 milhões de requisições, 180 mil vCPU-segundos e 360 mil GiB-segundos por mês) vale em São Paulo como um desconto em dólares calculado a preço da faixa 1. Como São Paulo é da faixa 2, o limite efetivo de CPU fica em cerca de 128 mil vCPU-segundos. É muito acima do que um sistema de poucos usuários consome.

> **Por que não Netlify Functions?** Funções em Go no Netlify usam o modo "Lambda
> compatibility", que a Netlify declarou **obsoleto: deploys com funções nesse modo
> deixam de ser aceitos a partir de 1º de julho de 2027**. O Netlify continua servindo
> para hospedar só as páginas, se você quiser manter o endereço atual (veja o guia de deploy).

**CI/CD:** a cada merge na `main`, o GitHub Actions roda os testes e, se passarem e a
variável `FLY_DEPLOY` estiver como `true`, publica no Fly.io (`.github/workflows/ci.yml`).

**Cloud Run (alternativa):** segue a documentação do Google, mas não foi testado aqui:

```bash
gcloud run deploy vec --source . --region southamerica-east1 --allow-unauthenticated \
  --set-env-vars "TURSO_DATABASE_URL=libsql://...,TURSO_AUTH_TOKEN=...,SESSION_SECRET=..."
```

## Plano de virada (sem tirar o formulário do ar)

1. Suba o servidor com o banco de produção vazio e crie o administrador (veja [docs/DEPLOY.md](docs/DEPLOY.md), passos 1 a 6).
2. Na planilha, aba `Respostas`: **Arquivo → Fazer download → Valores separados por vírgula**. Salve em `dados/respostas.csv`.
3. `ENV_FILE=.env.prod go run ./backend/cmd/importar -arquivo dados/respostas.csv -simular`, confira, e rode sem `-simular`.
4. Teste o painel com os dados importados e crie os líderes pela aba **Usuários**. As senhas antigas **não** migram (são guardadas de outro jeito): cada líder recebe uma senha nova.
5. Troque o link do formulário (ou aponte o Netlify para o novo servidor). A planilha e o Apps Script antigo continuam intactos como plano B.
6. Depois de alguns dias, importe de novo (é seguro repetir) para pegar quem respondeu no meio do caminho.

## Segurança — o que já tem e o que falta

Já tem: senhas com PBKDF2-SHA256 (600 mil iterações) e sal individual; sessões
assinadas que caem quando a senha muda ou o usuário é desativado; bloqueio de 15
minutos após 5 senhas erradas; limite de 10 tentativas de login por minuto no
processo; permissões aplicadas no servidor; textos validados e limitados;
proteção contra fórmulas em CSV; painel sem cache e fora do Google.

Ainda falta (ideias para as próximas etapas): proteção contra robôs no formulário
público (por exemplo Cloudflare Turnstile), política de CSP, paginação do painel
quando passar de alguns milhares de cadastros, e backup periódico do banco para um
local **privado** (nunca o Git).

## Limitações conhecidas

- O painel baixa todos os cadastros do escopo de uma vez (sem paginação).
- `logout` não invalida o token no servidor (ele expira em 6 h); trocar a senha ou desativar o usuário derruba na hora.
- A hierarquia Área > Setor > Célula ainda não está ligada (a tabela `celulas` tem `setor_id` vazio): falta definir a qual setor cada célula pertence.
