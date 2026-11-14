# Diagnóstico e roteiro de refatoração

Este documento é o ponto de partida para futuras sessões de manutenção. A ideia
é corrigir primeiro problemas de dados e disponibilidade, criar testes nos
limites importantes e só então refatorar. Não é uma proposta para trocar a
stack nem para reescrever o sistema.

## O que o projeto faz e escala considerada

O VEC é um sistema pequeno de cadastro: um formulário público e um painel de
liderança são servidos pelo mesmo binário Go. A API grava e consulta dados no
Turso por um cliente HTTP próprio; o painel aplica filtros no navegador.

Esta revisão considera poucos líderes usando o painel e até alguns milhares de
cadastros, conforme a escala descrita no README. Não houve medição de carga nem
teste contra um banco de produção.

## Como o sistema está organizado

- `frontend/index.html`: formulário público, com HTML, CSS e JavaScript no mesmo
  arquivo.
- `frontend/admin/index.html`: login, painel, exportação CSV e gestão de
  usuários; também é um arquivo único.
- `backend/internal/api`: rotas, validação, autenticação e protocolo JSON.
- `backend/internal/store`: consultas SQL, gravações, escopos e mapeamento dos
  dados.
- `backend/internal/turso`: cliente HTTP para Hrana e executor de migrations.
- `backend/migrations`: esquema e listas iniciais versionados.
- `backend/cmd`: servidor, importador, migrations, gestão de usuários e geração
  do segredo de sessão.
- `.github/workflows/ci.yml`: formatação Go, `go vet`, testes Go, versão e build.

## Boas práticas já presentes

- O servidor valida os dados recebidos; não depende da validação visual do
  navegador para proteger gravações ou escopos.
- As consultas usam parâmetros SQL. Escritas relacionadas de usuários e escopos
  usam transação.
- Migrations aplicadas não devem ser editadas; o histórico fica versionado no
  Git.
- Senhas usam PBKDF2-SHA256 com 600 mil iterações. Tokens são assinados e o
  servidor relê o usuário ao autenticar.
- O filtro de acesso aos cadastros é feito no servidor e na consulta SQL.
- O frontend usa HTML semântico, rótulos, foco de teclado, layout móvel e
  preferência por movimento reduzido. Valores dinâmicos são escapados antes de
  entrar em templates HTML ou inseridos por `textContent`.
- A stack não tem dependências Go externas, e o CI já executa testes, análise
  estática e build.

## Achados

### Corrigir primeiro

1. **Um cadastro legítimo pode ser descartado como duplicado**
   (`backend/migrations/0001_inicial.sql:88`,
   `backend/migrations/0003_respostas_chaves_idempotencia.sql`,
   `backend/internal/store/store.go:295-379`).
   - **O que é:** O índice único identifica uma resposta pela combinação de nome
     e horário de criação.
   - **Problema:** O horário gravado tem precisão de segundos. Se duas pessoas
     com o mesmo nome enviarem o formulário no mesmo segundo, a segunda gravação
     viola o índice e `InsertResposta` trata a violação como sucesso. A pessoa
     vê confirmação, mas a resposta não foi salva.
   - **Correção:** Corrigido nesta branch. Envios do formulário usam um ID
     aleatório estável durante as tentativas; importações usam hash da linha e
     distinguem cópias idênticas pelo número da ocorrência. A migration remove
     o índice antigo e associa linhas antigas idênticas antes de reimportar.
     A migration foi aplicada em `vec-dev`; versão, colunas e índices foram
     verificados. Os cenários de idempotência foram testados em SQLite local,
     mas não foi feita uma importação de teste com dados no Turso.
   - **Se deixarmos:** Respostas válidas podem sumir sem aviso.

2. **O servidor aceitava nascimento no dia seguinte**
   (`backend/internal/api/formulario.go:89-96`).
   - **O que é:** O navegador só aceita hoje ou datas anteriores, mas o servidor
     é a validação final.
   - **Problema:** O servidor compara a data com “agora + 24 horas”. Como
     nascimento é uma data sem horário, isso permite a data do próximo dia
     local. Uma chamada direta à API não passa pela validação do navegador.
   - **Correção:** Corrigido nesta branch. O servidor compara o dia local de
     Fortaleza, com testes para amanhã e para a virada da meia-noite local.
   - **Se deixarmos:** O banco pode guardar data de nascimento futura.

3. **Tentativas de login sem limite compartilhado entre instâncias**
   (`backend/internal/api/server.go:25-26,104-125,283-323`).
   - **O que é:** O login tem bloqueio por conta e agora também limita a dez
     tentativas por minuto no processo; nomes inexistentes compartilham um
     único registro de falha.
   - **Problema:** O limite é local ao processo. Se o servidor passar a rodar em
     várias instâncias, cada uma terá seu próprio limite.
   - **Correção:** Mitigado nesta branch para a implantação atual de uma
     instância. Antes de escalar horizontalmente, mover o limite para um
     ingresso compartilhado confiável.
   - **Se deixarmos:** Em várias instâncias, o limite efetivo cresce com o
     número de processos.

### Corrigir antes de mudanças maiores

4. **As regras críticas de persistência e autorização não têm testes diretos**
   (`backend/internal/store/store.go:350-389`,
   `backend/internal/api/server.go:326-354`).
   - **O que é:** Esta branch adiciona testes para formulário, data, IDs de
     reenvio, limite de login e SQL de importação. Ainda não há testes para
     escopos de `ListRespostas` nem para a autorização das rotas do painel.
   - **Problema:** Uma alteração futura no SQL de escopo pode devolver registros
     de outro setor; uma alteração de gravação pode quebrar a transação sem
     falhar no CI.
   - **Correção:** Próximo passo: adicionar testes pequenos com um `turso.DB`
     falso para `ListRespostas` (área, setor, célula e escopo vazio) e para
     autenticação/autorização do painel. Não é necessário criar infraestrutura
     de teste ou banco novo.
   - **Se deixarmos:** Refatorações futuras podem mudar comportamento de acesso
     ou gravação sem que o CI detecte.

5. **O contrato do formulário existe em mais de um lugar**
   (`frontend/index.html`, `frontend/admin/index.html`,
   `backend/internal/store/store.go:250-279`).
   - **O que é:** Chaves e listas de campos estão distribuídas entre o HTML,
     JavaScript e `store.Campos`; setores e células também aparecem nas
     migrations e em listas fixas do frontend.
   - **Problema:** Se um campo for adicionado apenas ao HTML/JavaScript, o
     backend percorre `store.Campos` e ignora esse valor desconhecido. Se uma
     célula for adicionada só ao banco, ela não aparece nas opções do formulário
     público.
   - **Correção:** Primeiro adicionar um teste de contrato que compare as chaves
     enviadas com os campos aceitos. Para as listas, preferir uma fonte servida
     pelo backend quando houver necessidade real de alterá-las; manter as
     migrations como histórico dos dados.
   - **Se deixarmos:** Uma mudança incompleta pode parecer funcionar, mas perder
     o campo ou deixar uma opção indisponível para quem preenche.

6. **O JavaScript não tem verificação automatizada no CI**
   (`frontend/index.html:430-664`, `frontend/admin/index.html:429-1037`,
   `.github/workflows/ci.yml`).
   - **O que é:** O frontend é JavaScript puro embutido nos HTMLs; o workflow
     verifica somente o código Go e o script de versão.
   - **Problema:** Uma alteração pode quebrar envio, filtros, acessibilidade ou
     a proteção contra fórmulas no CSV sem falhar nos testes do CI.
   - **Correção:** Antes de reorganizar o frontend, automatizar ao menos os
     casos de contrato e CSV e documentar uma verificação manual curta em
     navegador móvel e desktop. Adicionar ferramenta ou dependência só se esses
     testes não puderem ser feitos com o que já existe.
   - **Se deixarmos:** Erros de interface chegam ao deploy sem sinal do CI.

### Adiar até a escala justificar

7. **O painel carrega todos os cadastros em cada consulta**
   (`backend/internal/store/store.go:350-389`,
   `backend/internal/api/server.go:312-340`,
   `frontend/admin/index.html:600-735`).
   - **O que é:** O servidor devolve a lista inteira; busca, filtros, resumo e
     renderização são feitos no navegador.
   - **Problema:** Conforme a tabela cresce, a resposta de rede, o uso de memória
     e o trabalho de renderização crescem junto. A própria documentação já
     registra a falta de paginação.
   - **Correção:** Medir com dados representativos. Quando a lista se aproximar
     do limite operacional de alguns milhares, mover filtros e paginação para o
     servidor, com ordenação estável e testes de escopo.
   - **Se deixarmos:** Com o volume atual esperado, nada muda; em volume maior o
     painel pode ficar lento ou exceder memória/rede do aparelho.

## Ordem sugerida das fases

### Fase 0 — Proteger dados e login

- [x] Resolver os achados 1, 2 e 3 no código e adicionar testes focados.
- [x] Preservar o JSON existente; o ID de envio é opcional para clientes antigos.
- [x] Aplicar a migration `0003_respostas_chaves_idempotencia.sql` em `vec-dev`
  e verificar o registro, as colunas e os índices criados.
- Idempotência/reimportação testada em SQLite local; não foi executada uma
  importação de teste com dados no Turso nem aplicada a produção.

### Fase 1 — Testar contratos do backend

- [x] Cobrir validação de data, IDs de reenvio/importação e limite de login.
- Cobrir escopos SQL, autorização do painel, gravação transacional e erros.
- Acrescentar um teste de contrato para chaves do formulário.
- Manter SQL em `store`, validação/autorização em `api` e mudanças de esquema em
  migrations novas.
- Só extrair helpers ou dividir arquivos quando isso remover duplicação real ou
  permitir testar uma regra; não dividir apenas por tamanho.

### Fase 2 — Tornar o frontend seguro para mudar

- Automatizar os casos críticos do JavaScript antes de editar sua estrutura.
- Resolver a fonte única das listas de setor/célula se elas forem mudar com
  frequência.
- Manter HTML semântico, navegação por teclado, movimento reduzido e
  compatibilidade móvel.
- Não migrar para framework nem adicionar pipeline de build sem uma necessidade
  observada.

### Fase 3 — Escalar o painel por medição

- Acompanhar `Server-Timing`, tamanho da resposta e tempo de renderização.
- Quando alguns milhares de registros tornarem a tela lenta, implementar
  paginação e filtros no servidor; revisar índices com consultas medidas.
- Não adicionar paginação, cache ou índices “por precaução” antes de confirmar
  o gargalo.

### Fase 4 — Operação e proteção adicional

- A proteção contra robôs no formulário público, CSP e backup periódico já
  aparecem como itens pendentes no README. Planejar sua implantação conforme
  risco, sem assumir que CSP é apenas um cabeçalho: os scripts e estilos inline
  atuais precisam ser tratados.
- Conferir deploy real, alertas, recuperação de backup e limites da plataforma;
  a documentação de deploy informa que ainda não houve deploy real validado.

## Regras para futuras sessões

1. Ler este roteiro e a documentação diretamente relacionada antes de editar.
2. Trabalhar em uma fase por vez; não misturar reestruturação ampla com correção
   de dados ou segurança.
3. Preservar o protocolo JSON, permissões no servidor e migrations já aplicadas.
4. Fazer a menor mudança que resolva o caso e adicionar um teste para cada regra
   não trivial alterada.
5. Rodar `go test ./...`, `go vet ./...` e a checagem de formatação Go para
   mudanças no backend. Para frontend, executar os testes que forem adicionados
   e o roteiro manual de navegador.
6. Atualizar este documento quando um achado for corrigido ou uma fase mudar;
   não tratar itens adiados como defeitos atuais sem evidência de que a escala
   ou o risco já os tornou urgentes.

## Limites desta revisão

Foram lidos README, guias de notebook e deploy, configuração do CI/Docker/Fly,
HTMLs do formulário e painel, comandos Go, API, autenticação, configuração,
store, cliente Turso, migrations e testes existentes. Não foram verificados um
banco real, deploy de produção, carga real, comportamento em uma matriz de
navegadores nem conteúdo ou política da conta Fly/Turso.
