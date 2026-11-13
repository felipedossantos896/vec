# Guia de deploy: colocando o sistema no ar (Fly.io + Turso)

> **Leia antes:** os comandos abaixo seguem a documentação atual do Fly.io e do Turso,
> e o `fly.toml`, o `Dockerfile` e o workflow foram validados (sintaxe, `actionlint`),
> mas **nenhum deploy real foi executado ainda**. O primeiro deploy é o teste de
> verdade. Se algo falhar, a mensagem de erro costuma dizer exatamente o que ajustar.

## Visão geral

```
GitHub (branch main)
   │  push
   ▼
GitHub Actions ── testes passam? ──► flyctl deploy ──► Fly.io (São Paulo, gru)
                                                          │  HTTPS
                                                          ▼
                                                  Turso vec-prod (São Paulo)
```

- **Fly.io** roda o servidor Go (uma máquina pequena, sempre ligada).
- **Turso** guarda os dados. Use um banco **de produção** (`vec-prod`), diferente do `vec-dev` do seu notebook.
- Os **segredos** (token do banco etc.) ficam só no Fly.io. O GitHub guarda apenas o token de deploy.

## Custo esperado

O Fly.io **não tem mensalidade de plataforma**: você paga só pelo que usa. Valores da
página oficial de preços (conferidos em 03/10/2026; confira de novo antes de criar a conta):

| Máquina `shared-cpu-1x`, ligada o mês inteiro | Ashburn (EUA) | São Paulo (`gru`) |
|---|---|---|
| 256 MB | US$ 2,19 | cerca de US$ 3,54 |
| 512 MB | US$ 3,69 | cerca de US$ 5,97 |

Os valores de Ashburn estão na página do Fly. Os de São Paulo eu **calculei** com a
fórmula e o fator regional que o próprio Fly publica (São Paulo custa 61,5% a mais).
A saída de dados para a América do Sul custa US$ 0,04 por GB (centavos para este
sistema). IPv4 compartilhado e os 10 primeiros certificados HTTPS são grátis.

Máquina de 256 MB basta para este servidor. Só aumente se o `Server-Timing` mostrar necessidade.

> **Atenção:** o primeiro deploy do Fly cria **duas máquinas** por padrão, o que
> dobra o custo. Por isso todos os comandos abaixo usam `--ha=false`.

### Os US$ 29 que aparecem no cadastro

US$ 29 por mês é o **plano de suporte "Standard"** do Fly. Ele é **opcional**: a
própria página de preços diz "Opcional. O suporte da comunidade é grátis". Você **não
precisa** dele para hospedar o sistema, então não o contrate. O suporte da comunidade
(fórum community.fly.io) já vem incluído.

Se alguma tela do cadastro **não deixar continuar** sem esse valor, pare e me envie o
texto ou uma captura: aí é outra coisa e vale reavaliar a hospedagem.

### Teste gratuito e cartão

O teste grátis dura **2 horas de máquina ligada ou 7 dias** (o que vier primeiro) e
não pede cartão. Depois você precisa cadastrar um cartão para continuar, e
**cadastrar o cartão encerra o teste**: a cobrança passa a contar daquele momento.
Não existe plano gratuito permanente para contas novas.

### Controle de gastos

A documentação do Fly sobre gerenciamento de custos diz que franquias gratuitas não
limitam a sua conta e que, na data daquela página, **não havia alertas de cobrança**.
Essa página pode estar desatualizada, mas por segurança olhe a aba **Billing** do painel
no primeiro mês. Com uma única máquina pequena, a conta não tem como fugir muito do
valor da tabela acima.

### Como pagar menos

- **Ashburn em vez de São Paulo:** economiza cerca de US$ 1,35 por mês (256 MB), mas cada acesso a partir de Fortaleza fica mais lento (o Turso cita cerca de 115 ms entre São Paulo e a Virgínia). Se mudar, use também o banco do Turso na Virgínia (`aws-us-east-1`) e troque `primary_region` para `iad`.
- **Modo economia** (veja o final deste guia): a máquina desliga quando ninguém usa e você paga só pelas horas ligadas, cerca de US$ 0,005 por hora em São Paulo (256 MB). A primeira visita depois de um tempo parado fica mais lenta.
- **Google Cloud Run:** costuma ficar de graça neste volume (veja o README), em troca de a primeira visita após um tempo parado ser mais lenta.

## 1. Banco de produção no Turso

```bash
turso group create --location aws-sa-east-1 saopaulo      # se ainda não criou
turso db create --group saopaulo vec-prod
turso db show vec-prod --http-url      # anote o endereço (libsql://...)
turso db tokens create vec-prod        # anote o token
```

Crie também um segredo de sessão **novo** (não reutilize o do notebook):

```bash
go run ./cmd/segredo
```

## 2. Instalar o `flyctl` e criar a conta

Siga fly.io/docs/flyctl/install e depois:

```bash
fly auth signup      # ou: fly auth login
```

## 3. Criar o app

Escolha um nome único (ex.: `vec-igreja-fulano`) e **edite a primeira linha do
`fly.toml`** (`app = "..."`). Depois:

```bash
fly apps create vec-igreja-fulano
```

## 4. Configurar os segredos

```bash
fly secrets set \
  TURSO_DATABASE_URL="libsql://vec-prod-SEU-USUARIO.aws-sa-east-1.turso.io" \
  TURSO_AUTH_TOKEN="O-TOKEN-DO-VEC-PROD" \
  SESSION_SECRET="O-SEGREDO-GERADO-PELO-cmd-segredo"
```

(No PowerShell, escreva tudo em uma linha só, sem as barras `\`.)

Os segredos passam a valer a partir do primeiro deploy.

## 5. Primeiro deploy (manual)

```bash
fly deploy --ha=false
fly status                 # deve mostrar 1 máquina, estado "started"
fly logs                   # deve aparecer "servidor no ar" e "migrations aplicadas"
```

Abra `https://vec-igreja-fulano.fly.dev/healthz`: deve responder `ok`.
O servidor aplicou as migrations no `vec-prod` ao iniciar.

Se `fly status` mostrar **duas** máquinas, reduza para uma: `fly scale count 1`.

## 6. Criar o primeiro administrador (no banco de produção)

O container não tem shell, então o administrador é criado **do seu notebook**,
apontando para o banco de produção. Crie um arquivo `.env.prod` (ele é ignorado
pelo Git, assim como o `.env`):

```
TURSO_DATABASE_URL=libsql://vec-prod-SEU-USUARIO.aws-sa-east-1.turso.io
TURSO_AUTH_TOKEN=O-TOKEN-DO-VEC-PROD
```

Rode (macOS/Linux):

```bash
ENV_FILE=.env.prod go run ./cmd/usuario -usuario admin -nome "Administrador" -perfil AREA -gerencia
```

No PowerShell:

```powershell
$env:ENV_FILE=".env.prod"; go run ./cmd/usuario -usuario admin -nome "Administrador" -perfil AREA -gerencia
Remove-Item Env:ENV_FILE
```

Todo comando mostra na primeira linha **qual banco** está usando (`Banco: ...`).
**Confira se aparece o endereço do vec-prod** antes de digitar a senha.

Entre em `https://vec-igreja-fulano.fly.dev/admin/` e crie os demais líderes pela aba **Usuários**.

## 7. Importar as respostas da planilha (uma vez)

1. Na planilha, aba `Respostas`: **Arquivo → Fazer download → Valores separados por vírgula (.csv)**. Salve em `dados/respostas.csv` (a pasta `dados/` é ignorada pelo Git).
2. Simule, confira o resultado e depois importe de verdade:

```bash
ENV_FILE=.env.prod go run ./cmd/importar -arquivo dados/respostas.csv -simular
ENV_FILE=.env.prod go run ./cmd/importar -arquivo dados/respostas.csv
```

Repetir a importação é seguro: o que já existe é ignorado.

## 8. Deploy automático a cada merge (CI/CD)

Depois que o deploy manual funcionou:

1. Gere um token de deploy **restrito a este app** e com validade:

```bash
fly tokens create deploy -a vec-igreja-fulano -x 8760h
```

2. No GitHub: **Settings → Secrets and variables → Actions**
   - aba **Secrets** → *New repository secret* → nome `FLY_API_TOKEN`, valor o token acima;
   - aba **Variables** → *New repository variable* → nome `FLY_DEPLOY`, valor `true`.
3. Pronto: a cada merge na `main`, se os testes passarem, o GitHub publica no Fly.io.
   Para **pausar** os deploys automáticos, mude `FLY_DEPLOY` para `false`.
   A tela de login mostra `version: MAJOR.MINOR.PATCH`. O workflow cria uma tag
   `vMAJOR.MINOR.PATCH` em cada deploy: commits `feat:`/`improve:` aumentam
   `MINOR`, correções e outros tipos aumentam `PATCH`, e `BREAKING CHANGE:` ou
   `!` no tipo aumentam `MAJOR`. Sem tags anteriores, a base é `1.0.0`. Uma
   nova tentativa do mesmo commit reutiliza sua tag.

O token vale 1 ano (8760 h). Anote uma data para gerar outro e trocar o secret.

**Voltar atrás:** faça `git revert` do commit problemático e envie. O fluxo publica
de novo a versão anterior. Migrations só andam para frente: se uma migration estiver
errada, crie uma nova que corrija.

## 9. Domínio próprio e o endereço antigo do Netlify

- **Domínio próprio** (ex.: `vec.suaigreja.com.br`): `fly certs add vec.suaigreja.com.br` e siga as instruções de DNS que o comando mostra. Vale a pena: o link passa a não depender de plataforma.
- **Manter `area-vec.netlify.app`** (já distribuído nos WhatsApps): publique no Netlify só a pasta `web/` e encaminhe `/api` para o Fly com um `netlify.toml` como o do README. Cada chamada ganha uma parada extra, então o ideal é migrar os links para o domínio próprio.

## 10. Medindo o desempenho de verdade

Abra o painel, aperte F12, aba **Network**, clique em uma chamada `api` e olhe
**Headers → Server-Timing**:

```
db;dur=2.1;desc="1 consultas", total;dur=3.4
```

- `db` é o tempo no banco; `total` é o tempo no servidor. O resto do que o navegador mostra é rede.
- O **login** é de propósito mais lento por causa do hash da senha (cerca de 350 ms no meu teste, em um processador comum). Em uma máquina `shared-cpu-1x` pode ser mais. Se o `total` do login passar de uns 1,5 s, aumente a máquina **editando o `[[vm]]` do `fly.toml`** (por exemplo `cpus = 2`) e publicando de novo. Meça antes de gastar mais.

## 11. Modo economia (opcional)

Se preferir pagar menos e aceitar uma primeira visita mais lenta depois de um tempo
sem uso, troque no `fly.toml` as três linhas marcadas como "Modo sempre ligado" pelas
do comentário "Modo economia" e publique de novo.

## Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| `fly deploy` diz que o nome do app já existe | Nome em uso por outra pessoa. Escolha outro e edite o `app` no `fly.toml`. |
| Deploy termina mas `/healthz` não abre | Veja `fly logs`. Se aparecer `TURSO_DATABASE_URL está vazio`, os segredos não foram definidos (passo 4). |
| `acesso negado (HTTP 401)` nos logs | Token do Turso errado ou de outro banco. Gere outro e rode o passo 4 de novo. |
| `SESSION_SECRET deve ter 32+ caracteres` | Gere com `go run ./cmd/segredo` e rode o passo 4 de novo. |
| Duas máquinas aparecem em `fly status` | Esqueceu o `--ha=false`. Rode `fly scale count 1`. |
| O tamanho da máquina volta ao antigo depois do deploy | O `[[vm]]` do `fly.toml` manda. Edite o arquivo, não use `fly scale vm`. |
| Deploy automático não roda | A variável `FLY_DEPLOY` precisa ser `true`, e o segredo `FLY_API_TOKEN` precisa existir. |
| Lista de cadastros vazia depois de importar | Você importou em outro banco. Confira a linha `Banco:` que o comando mostra. |
