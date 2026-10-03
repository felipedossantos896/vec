# ✝ Sistema da Área VEC

Formulário de cadastro de membros e painel da liderança, com permissões por
**área, setor e célula**. Escrito em Go, **sem dependências externas**, com banco
de dados no [Turso](https://turso.tech) (SQLite na nuvem).

```
Navegador ──►  Servidor Go  ──►  Turso (SQLite)
  (formulário,    (/api + páginas)     (dados)
   painel)
```

Um único programa (`cmd/server`) serve as páginas e a API. O formato da API é o
mesmo que o Google Apps Script usava, então o formulário e o painel quase não
mudaram.

## O que tem aqui

```
cmd/
  server/      o servidor (páginas + API)
  migrate/     aplica as mudanças de estrutura do banco
  usuario/     cria/atualiza usuários direto no banco (para o 1º administrador)
  importar/    copia as respostas da planilha do Google para o banco
  segredo/     gera o SESSION_SECRET
internal/
  api/         regras de negócio e rotas HTTP
  store/       todo o SQL do projeto
  turso/       cliente do Turso (protocolo HTTP) e executor de migrations
  auth/        senhas (PBKDF2) e sessões assinadas
  config/      leitura do .env e das variáveis de ambiente
migrations/    versões do banco: 0001_inicial.sql, 0002_...  (VERSIONADAS NO GIT)
web/           formulário (index.html) e painel (admin/index.html)
docs/          guias (comece por docs/NOTEBOOK.md)
```

## Versionamento do banco

A **estrutura** do banco (tabelas, colunas, índices) fica na pasta `migrations/`,
em arquivos numerados que vão para o Git como qualquer código. Cada arquivo roda
uma única vez, em ordem, dentro de uma transação, e fica registrado na tabela
`schema_migrations`.

- Mudou o banco? **Crie um arquivo novo** (`0003_descricao.sql`). Nunca edite um já aplicado.
- Os **dados** (nomes, nascimentos...) **nunca** vão para o Git. O `.gitignore` já bloqueia `.env`, `*.csv` e `*.db`.

## Primeira vez no seu computador

Veja o passo a passo completo em **[docs/NOTEBOOK.md](docs/NOTEBOOK.md)**. Resumo:

1. Instale **Git**, **Go** (1.24 ou mais novo) e o **VS Code**.
2. No Turso, crie um banco de **desenvolvimento** (`vec-dev`) e um token para ele.
3. Copie `.env.example` para `.env` e preencha (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`).
4. Rode:

```bash
go run ./cmd/segredo          # gera o valor do SESSION_SECRET (cole no .env)
go run ./cmd/migrate          # cria as tabelas no banco
go run ./cmd/usuario -usuario admin -nome "Administrador" -perfil AREA -gerencia
go run ./cmd/server           # abre em http://localhost:8080
```

Formulário: `http://localhost:8080/` · Painel: `http://localhost:8080/admin/`

## Comandos do dia a dia

| Para quê | Comando |
|---|---|
| Rodar o sistema | `go run ./cmd/server` |
| Rodar os testes | `go test ./...` |
| Conferir o código | `go vet ./...` e `gofmt -l .` |
| Aplicar migrations | `go run ./cmd/migrate` (o servidor também faz isso ao iniciar) |
| Criar usuário | `go run ./cmd/usuario -usuario ana -nome "Ana" -perfil CELULA -celulas "Hope"` |
| Importar a planilha | `go run ./cmd/importar -arquivo dados/respostas.csv` (use `-simular` antes) |

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

O servidor é um container comum (`Dockerfile`), então roda em qualquer lugar.

> **Atenção ao Netlify:** funções em Go no Netlify usam o modo "Lambda compatibility",
> que a Netlify declarou **obsoleto: deploys com funções nesse modo deixam de ser
> aceitos a partir de 1º de julho de 2027**. Por isso este projeto **não** usa
> Netlify Functions. O Netlify continua servindo para hospedar só as páginas, se
> você quiser manter o endereço atual (veja "Manter o endereço do Netlify").

| Opção | Custo aproximado | Observações |
|---|---|---|
| **Google Cloud Run** (região `southamerica-east1`, São Paulo) | tende a ficar na faixa gratuita para esse volume | exige cartão; "dorme" quando ninguém usa (primeira visita após um tempo pode levar 1–3 s) |
| **Fly.io** (região `gru`, São Paulo) | em torno de US$ 2 a 4 por mês | sempre ligado, sem espera; exige cartão |

**Escolha a mesma região do banco.** Crie o banco do Turso em São Paulo
(`aws-sa-east-1`) e o servidor também em São Paulo: assim cada consulta leva
cerca de 1 ms entre servidor e banco.

> Os comandos abaixo seguem a documentação de cada plataforma, mas **ainda não foram
> executados de ponta a ponta** neste projeto. Confira no primeiro deploy.

### Cloud Run

```bash
gcloud run deploy vec --source . --region southamerica-east1 --allow-unauthenticated \
  --set-env-vars "TURSO_DATABASE_URL=libsql://...,TURSO_AUTH_TOKEN=...,SESSION_SECRET=..."
# opcional, para evitar a espera da primeira visita: --min-instances=1
```

### Fly.io

```bash
fly launch --region gru          # detecta o Dockerfile e cria o fly.toml
fly secrets set TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." SESSION_SECRET="..."
fly deploy
```

Use sempre o banco **de produção** (`vec-prod`) e um `SESSION_SECRET` diferente do
de desenvolvimento nas plataformas de hospedagem.

### Manter o endereço do Netlify

Se quiser continuar com `area-vec.netlify.app` (que já está nos WhatsApps), hospede
só a pasta `web/` no Netlify e encaminhe `/api` para o servidor Go:

```toml
# netlify.toml (exemplo — ajuste a URL do servidor)
[build]
  publish = "web"

[[redirects]]
  from = "/api"
  to = "https://SEU-SERVIDOR.exemplo.app/api"
  status = 200
  force = true
```

Isso acrescenta uma parada a cada chamada. Com um domínio próprio apontando direto
para o servidor, o Netlify deixa de ser necessário.

## Plano de virada (sem tirar o formulário do ar)

1. Suba o servidor com o banco de produção vazio e crie o administrador (`cmd/usuario`).
2. Na planilha, **Arquivo → Fazer download → Valores separados por vírgula**, na aba `Respostas`. Salve em `dados/respostas.csv`.
3. `go run ./cmd/importar -arquivo dados/respostas.csv -simular`, confira, e rode sem `-simular`.
4. Teste o painel com os dados importados e crie os líderes pela aba **Usuários**. As senhas antigas **não** migram (são guardadas de outro jeito): cada líder recebe uma senha nova.
5. Troque o link do formulário (ou aponte o Netlify para o novo servidor). A planilha e o Apps Script antigo continuam intactos como plano B.
6. Depois de alguns dias, importe de novo (é seguro repetir) para pegar quem respondeu no meio do caminho.

## Segurança — o que já tem e o que falta

Já tem: senhas com PBKDF2-SHA256 (600 mil iterações) e sal individual; sessões
assinadas que caem quando a senha muda ou o usuário é desativado; bloqueio de 15
minutos após 5 senhas erradas; permissões aplicadas no servidor; textos validados
e limitados; proteção contra fórmulas em CSV; painel sem cache e fora do Google.

Ainda falta (ideias para as próximas etapas): proteção contra robôs no formulário
público (por exemplo Cloudflare Turnstile), política de CSP, paginação do painel
quando passar de alguns milhares de cadastros, e backup periódico do banco para um
local **privado** (nunca o Git).

## Limitações conhecidas

- O painel baixa todos os cadastros do escopo de uma vez (sem paginação).
- `logout` não invalida o token no servidor (ele expira em 6 h); trocar a senha ou desativar o usuário derruba na hora.
- A hierarquia Área > Setor > Célula ainda não está ligada (a tabela `celulas` tem `setor_id` vazio): falta definir a qual setor cada célula pertence.
