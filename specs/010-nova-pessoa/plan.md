# Plano técnico — Cadastrar nova pessoa pelo painel

- Status: **Entregue** (v1.52.0)

## Dados
- `0016_cadastro_painel.sql` (aditiva):
  - `respostas.origem TEXT NOT NULL DEFAULT 'formulario' CHECK (origem IN ('formulario', 'painel'))`;
  - `respostas.cadastrado_por TEXT` (usuário do painel; nulo no formulário).
  - Cadastros existentes ficam como `formulario`.

## Servidor
- Ação nova **`registro_criar`**:
  - autentica e recusa quem só discipula (`sem_permissao`);
  - lê `dados` com a mesma `validar(..., exigeNascimento=true)` do formulário público;
  - confere que a célula está ativa e dentro do escopo (`celula_invalida`);
  - deriva o setor; exige `autorizou=true` (`consentimento`);
  - confere duplicado e grava com `InsertResposta`, com `request_id` vindo do painel
    (idempotente), `consentimento_em = agora`, `origem = 'painel'` e `cadastrado_por`;
  - `recebeuJesus` padrão `S`; discipulador opcional, com as mesmas regras de `registro_salvar`;
  - devolve o cadastro no mesmo formato de `listar`, para entrar na lista sem recarregar.
- **Duplicado** (`store`):
  - busca candidatos ativos pela mesma data de nascimento ou pelo mesmo telefone;
  - compara o nome normalizado em Go (sem acento, minúsculas, espaços simples);
  - devolve `duplicado` com `{linha, nome, celula}` **só** se o cadastro está no escopo,
    e `duplicado_fora` sem nenhum dado se não está.
- Log: "cadastro criado pelo painel", com o número do cadastro e o usuário (sem nome da pessoa).

## Painel
- `frontend/src/admin/nova-pessoa.ts`:
  - diálogo com nome, nascimento, WhatsApp (máscara), célula (só as do escopo, já escolhida
    quando há uma), discipulador opcional, "Recebeu Jesus" (Sim por padrão) e a caixa de
    autorização;
  - erros por campo; aviso de duplicado com **Abrir cadastro**;
  - depois de salvar: adiciona a `estado.regs`, `derivar`, `renderTudo` e `abrirDetalhe`
    no Resumo.
- Regras puras em `nova-pessoa-regras.ts`:
  - células permitidas pelo escopo, normalização do nome, validação igual à do servidor
    e texto do aviso de duplicado. Com teste em Node.
- Botão **+ Nova pessoa** no cabeçalho de Pessoas e atalho no painel da Área; escondidos
  para quem só discipula.
- `index.html`, `embed.go` e as duas listas do `ci.yml` com os arquivos novos.

## Testes
- **Go:**
  - escopo (célula fora, inativa, discipulador) e autorização obrigatória;
  - nascimento obrigatório; `recebeuJesus` padrão; origem e quem cadastrou gravados;
  - idempotência por `request_id`;
  - duplicado no escopo com dados e fora do escopo **sem** nome nem célula na resposta.
- **Node:** regras do diálogo.
- **Tela** (`vec-dev`, dados fictícios, 390 e 1440 px): cenários 1 a 8.

## Rollback
Reverter a PR do painel esconde o botão. A ação nova e a migration são aditivas: os
cadastros criados continuam válidos (origem `painel`).
