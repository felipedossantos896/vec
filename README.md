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
| Discipulador | só os próprios discípulos (guardado como `CELULA` sem células, com o cadastro ligado ao login) |

O filtro é aplicado **no servidor**, na própria consulta SQL: quem não tem
permissão nunca recebe os dados. Quem tem "Pode gerenciar usuários" vê
**Configurações › Usuários do painel** e cria/edita acessos, troca senhas e desativa pessoas.

**Nova pessoa pelo painel** (Spec 010): líderes cadastram, em **+ Nova pessoa** (Pessoas
ou Área), quem já aceitou Jesus e é membro de uma célula do seu escopo: nome, nascimento e
célula obrigatórios, com a autorização verbal da pessoa registrada (`respostas.origem =
'painel'` e `cadastrado_por`). Um cadastro com o mesmo nome e nascimento, ou o mesmo
WhatsApp, é bloqueado; se ele for de outra célula fora do escopo, o aviso não diz quem é.
Depois de salvar, a ficha abre para seguir a trilha.

**Nome curto** (Spec 011): nas listas, no mapa e nos cartões cada membro aparece pelo primeiro
nome e último sobrenome ("Felipe dos Santos Carneiro" → Felipe Carneiro). Com partícula antes do
último sobrenome, vale o anterior; nome composto conhecido fica sem sobrenome ("Ana Clara");
Filho/Júnior/Neto saem; nomes curtos repetidos ganham as iniciais do meio. A ficha mostra o
curto e o completo abaixo; busca, CSV e edição usam o nome completo. O cadastro não muda.

**Liderança sem célula** (Spec 013): o cadastro tem um papel: membro de célula, líder de setor
ou líder de área. Líderes de área e de setor não têm célula fixa: aparecem em Pessoas com a
etiqueta e o filtro Liderança, ficam fora das contagens de célula e dos indicadores, e
podem ser escolhidos como discipuladores (grupo Liderança no topo da lista). Só o líder de setor
tem jornada e entra em "precisam de cuidado". O cadastro do líder nasce em Ajustes, junto do login,
ou em Nova pessoa ("Quem é"), sempre por quem vê a área toda; o papel acompanha o perfil do login.

**Liderança no mapa** (Spec 014): líderes de área e de setor aparecem no mapa, e cada rosto ganha um
selo: estrela (líder de área), escudo (líder de setor), coroa (líder de célula, pelo login de célula
ligado ao cadastro) e casa (Casa da célula, definida em Estrutura, com anel grosso). O cartão do rosto
mostra o nome curto, a célula, os papéis e os ícones de WhatsApp e Ficha; o "x" tem 44 px e fecha com
animação e um som curto (botão "Sons" na barra lateral, por aparelho). Os ícones vêm do Phosphor
(ADR-0012), gerados por `scripts/icones/gerar.mjs` só com os usados.

**Ícones** (Spec 015): o painel e o formulário usam só o Phosphor em negrito (ADR-0012); a marca
"Área VEC" continua desenhada à mão. No HTML fixo, `<span class="ic-slot ic-18" data-ic="nome">`
reserva o espaço e é trocado pelo ícone ao carregar; no TS, `icone('nome', { classe: 'ic-18' })`.
Um teste impede ícone desenhado à mão ou caractere usado como ícone.

**Discipulado:** cada cadastro pode apontar para o cadastro do seu discipulador
(`respostas.discipulador_id`) e cada login para o cadastro da própria pessoa
(`usuarios.resposta_id`). Quem tem o login ligado a um cadastro enxerga, além do
que o perfil permite, todos os que o têm como discipulador, mesmo de outra célula.
O vínculo é feito ao editar o cadastro; o formulário público continua pedindo só o nome.
Na Área, o grupo **Discipulado** mostra quantos discípulos cada um
acompanha (marcando quem passa de 12), a cobertura por célula e quem fez o
Expresso 01 e ainda não discipula ninguém.

**Abas do painel** (Spec 009, identidade nova): **Área** (abre primeiro: o mapa com os rostos
de cada pessoa em áreas de ~300 m, lentes de cuidado, "Fale com eles esta semana", as
ferramentas Escolher anfitrião e Planejar multiplicação e, abaixo, os grupos de cuidado,
discipulado, quem quer servir, datas e cadastros para arrumar), **Pessoas** (tabela com busca,
filtros e paginação; ficha em gaveta com Resumo, Acompanhamento e Ficha completa),
**Indicadores** (números com tendência mensal, jornada por célula, cadastros, faixa etária,
treinamentos e "Onde agir") e **Ajustes** (Células e setores com cor e encontro; Usuários,
só para quem pode). Quem é só discipulador vê **Meus discípulos** e Pessoas. No celular,
o menu fica numa barra inferior.

**Rostos no mapa** (Spec 012): o círculo cresce com o zoom (40 a 60 px; 52 no celular) e a foto
preenche o círculo em qualquer proporção. Quem mora na mesma área de ~300 m se abre num leque em
volta do ponto (círculo até 8, espiral acima disso), por mouse ou clique no computador, toque no
celular ou Enter pelo teclado; tocar num rosto abre um cartão com Contato feito e Ficha. O leque
é só visual: nenhuma posição real de pessoa aparece.

**Contato e acompanhamento:** o formulário pede WhatsApp (opcional) e só grava o
envio com a autorização de uso dos dados marcada; a data do aceite fica em
`respostas.consentimento_em` (vazia para envios anteriores). No detalhe da pessoa,
quem a enxerga registra anotações de cada conversa (`anotacoes`); cada um apaga só
as suas. Cada contato tem tipo (ligação, WhatsApp, visita, encontro ou anotação), dia e um
lembrete de falar de novo (30 dias por padrão). Quem está sem contato há 60 dias, ou com o
lembrete vencido, aparece em "Precisam de cuidado".
A data em que cada etapa da jornada foi concluída fica em `jornada_eventos`: a do
envio do formulário, ou a da edição no painel. Para cadastros anteriores, a migração
usou a data do envio.

**Fotos de perfil:** quem pode editar a pessoa adiciona, troca ou remove a foto
pelo cabeçalho do cadastro. O navegador recorta um quadrado de 256 px e reduz para
JPEG antes de enviar; o servidor só aceita JPEG ou PNG de até 40 KB e 1024 px de lado
e guarda a imagem na tabela `fotos`. Sem foto, aparece um rosto ilustrado gerado no
navegador a partir do número do cadastro (sem nenhum dado da pessoa). Para exibir, o
`listar` devolve um endereço `/api/foto` assinado com o `SESSION_SECRET`, que vale até
o fim do dia seguinte: a imagem abre sem o token da sessão e só quem enxerga a pessoa
recebe o endereço. A foto é apagada junto com o cadastro.

**Células e setores** são cadastrados pelo líder de área em **Configurações › Células e setores**. O
formulário público busca as células ativas no servidor (e usa a lista escrita no
HTML se o servidor não responder). Renomear uma célula ou mudá-la de setor atualiza,
na mesma transação, os cadastros e os acessos que guardam o nome dela. Uma célula
inativa some do formulário, mas os cadastros dela continuam.

Cada líder também **edita e exclui cadastros** que enxerga, pelo detalhe da pessoa.
A exclusão só marca a linha no banco (`excluido_em`), então pode ser desfeita por
SQL. Cadastros com o mesmo nome e a mesma data de nascimento aparecem no filtro
**Possíveis duplicados**.

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
4. Teste o painel com os dados importados e crie os líderes em **Configurações › Usuários do painel**. As senhas antigas **não** migram (são guardadas de outro jeito): cada líder recebe uma senha nova.
5. Troque o link do formulário (ou aponte o Netlify para o novo servidor). A planilha e o Apps Script antigo continuam intactos como plano B.
6. Depois de alguns dias, importe de novo (é seguro repetir) para pegar quem respondeu no meio do caminho.

## Segurança — o que já tem e o que falta

Já tem: senhas com PBKDF2-SHA256 (600 mil iterações) e sal individual; sessões
assinadas que caem quando a senha muda ou o usuário é desativado; bloqueio de 15
minutos após 5 senhas erradas; limite de 10 tentativas de login por minuto no
processo; permissões aplicadas no servidor; textos validados e limitados;
proteção contra fórmulas em CSV; painel sem cache e fora do Google.

Ainda falta (ideias para as próximas etapas): paginação do painel quando passar de
alguns milhares de cadastros.

CSP: política estrita em todas as páginas (scripts, estilos e fontes só do próprio
app; tiles do OpenStreetMap e ViaCEP liberados), sem Google Fonts (Spec 008).

Formulário público: campo-armadilha, marca de tempo assinada pelo servidor (envio
pelo menos 3 s depois de abrir) e limite de 60 envios em 10 minutos por IP, sem
serviço externo nem cookie (Spec 007).

Backup: o workflow **Backup** gera todo dia uma cópia do banco de produção,
criptografada com `age` (só abre com a chave privada do responsável, fora do
repositório), guardada como artefato por 30 dias. Restauração em
`ops/backup/RESTAURAR.md`.

## Limitações conhecidas

- O painel baixa todos os cadastros do escopo de uma vez (sem paginação).
- `logout` não invalida o token no servidor (ele expira em 6 h); trocar a senha ou desativar o usuário derruba na hora.
- A hierarquia Área > Setor > Célula ainda não está ligada (a tabela `celulas` tem `setor_id` vazio): falta definir a qual setor cada célula pertence.
