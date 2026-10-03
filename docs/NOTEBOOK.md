# Guia: trabalhando no projeto pelo seu notebook

Este guia leva você de "baixei um ZIP" até "estou desenvolvendo com Git, GitHub e testes".
Funciona em Windows, macOS e Linux. Os comandos são digitados em um terminal
(no Windows: **PowerShell** ou o terminal do VS Code).

## 1. O que instalar (uma vez só)

| Programa | Para quê | Onde |
|---|---|---|
| **Git** | guardar o histórico do código | git-scm.com |
| **Go** 1.24 ou mais novo | compilar e rodar o sistema | go.dev/dl |
| **VS Code** | editar os arquivos | code.visualstudio.com (instale também a extensão **Go**) |
| **GitHub CLI** (opcional) | facilita o login no GitHub | cli.github.com |

Confira se deu certo (feche e abra o terminal depois de instalar):

```bash
git --version
go version
```

## 2. Colocar o projeto no GitHub (primeira vez)

1. No GitHub, clique em **New repository**, nome `vec`, marque **Private** e **não** adicione README nem .gitignore (o projeto já tem).
2. Extraia o ZIP que recebi e abra a pasta no terminal:

```bash
cd caminho/para/vec
git init
git add .
git status
```

3. **Confira o `git status`**: não pode aparecer `.env` nem nenhum `.csv`. (O `.gitignore` já bloqueia, mas vale olhar.)
4. Primeiro registro e envio:

```bash
git commit -m "feat: estrutura inicial em Go com Turso"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/vec.git
git push -u origin main
```

Se pedir login, use o navegador quando ele abrir, ou rode antes `gh auth login`.

**Daqui em diante, o GitHub é a fonte da verdade.** O ZIP foi só o ponto de partida.
Em outro computador (ou depois de formatar o notebook), basta:

```bash
git clone https://github.com/SEU-USUARIO/vec.git
```

## 3. Criar os bancos no Turso

Crie **dois** bancos: um para desenvolvimento (`vec-dev`, usado no seu notebook) e
outro para produção (`vec-prod`, usado só pelo servidor publicado). Assim você pode
errar à vontade no notebook sem tocar nos dados reais.

Pelo site do Turso (botão **Dashboard**) ou pela linha de comando (veja a instalação
em docs.turso.tech/cli):

```bash
turso auth login
turso group create --location aws-sa-east-1 saopaulo     # região de São Paulo
turso db create --group saopaulo vec-dev
turso db show vec-dev --http-url                          # endereço do banco
turso db tokens create vec-dev                            # token de acesso
```

Anote o endereço (começa com `libsql://`) e o token. Repita para `vec-prod` quando
for publicar.

## 4. Configurar e rodar

```bash
cp .env.example .env          # no PowerShell: copy .env.example .env
```

Abra o `.env` no VS Code e preencha:

- `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` com os dados do **vec-dev**;
- `SESSION_SECRET` com o resultado de `go run ./cmd/segredo`.

Depois:

```bash
go run ./cmd/migrate
go run ./cmd/usuario -usuario admin -nome "Administrador" -perfil AREA -gerencia
go run ./cmd/server
```

Abra `http://localhost:8080/` (formulário) e `http://localhost:8080/admin/` (painel).
Para parar o servidor: `Ctrl + C`.

> **Importante:** o `.env` guarda senhas. Ele nunca vai para o GitHub. Se você
> apagar a pasta, será preciso criá-lo de novo.

## 5. Rotina de trabalho

Para cada melhoria, uma **branch** (um "ramo" separado), para não mexer direto no que está pronto:

```bash
git switch main
git pull                              # traz o que mudou no GitHub
git switch -c feat/painel-paginacao   # cria o ramo da melhoria
```

Edite os arquivos, rode e teste:

```bash
go run ./cmd/server                   # testar na mão
go test ./...                         # testes automáticos
go vet ./...                          # análise do código
gofmt -l .                            # lista arquivos fora do padrão (o VS Code formata ao salvar)
```

Registre e envie:

```bash
git status                            # o que mudou
git add .
git commit -m "feat: paginação da lista de cadastros"
git push -u origin feat/painel-paginacao
```

No GitHub aparece um botão **Compare & pull request**. Ao abrir o Pull Request, o
GitHub roda os testes sozinho (arquivo `.github/workflows/ci.yml`). Estando verde,
clique em **Merge**. Depois, no notebook: `git switch main` e `git pull`.

Mensagens de commit: comece com `feat:` (novidade), `fix:` (correção), `docs:` (texto),
`refactor:` (reorganização sem mudar comportamento).

## 6. Mudando a estrutura do banco

Nunca altere o banco "na mão". Crie um arquivo novo em `migrations/`, por exemplo
`migrations/0003_membros_telefone.sql`:

```sql
ALTER TABLE respostas ADD COLUMN telefone TEXT NOT NULL DEFAULT '';
```

Ao iniciar, o servidor aplica as migrations pendentes (ou rode `go run ./cmd/migrate`).
Teste primeiro no `vec-dev`. Quando o código for publicado, o servidor de produção
aplica a mesma migration no `vec-prod`. As regras completas estão no topo de
`migrations/0001_inicial.sql`.

## 7. Trazendo mudanças que fiz no chat para o seu repositório

Quando eu entregar arquivos novos ou alterados:

1. Copie-os para a mesma pasta dentro do projeto (substituindo os antigos).
2. `git status` e `git diff` mostram exatamente o que mudou; leia antes de aceitar.
3. `go test ./...` para garantir que nada quebrou.
4. `git add . && git commit -m "..."`.

Se algo der errado, `git restore .` desfaz tudo o que ainda não foi registrado.

## 8. Problemas comuns

| Mensagem | Causa e solução |
|---|---|
| `go: command not found` | Go não instalado ou terminal aberto antes da instalação. Reabra o terminal. |
| `TURSO_DATABASE_URL está vazio` | Falta preencher o `.env` ou você não está na pasta do projeto. |
| `acesso negado (HTTP 401)` | Token errado ou de outro banco. Gere outro com `turso db tokens create`. |
| `SESSION_SECRET deve ter 32+ caracteres` | Rode `go run ./cmd/segredo` e cole o resultado no `.env`. |
| `address already in use` | A porta 8080 está ocupada. Mude `PORT=8081` no `.env`. |
| `git push` pede senha e falha | Use `gh auth login` ou o login pelo navegador; o GitHub não aceita mais a senha da conta. |
| Aviso de `LF will be replaced by CRLF` | Normal no Windows; o arquivo `.gitattributes` cuida disso. |
