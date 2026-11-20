# Plano técnico — Endereço do membro

- Status: **Proposto**

## Referências e premissas verificadas
- `respostas` guarda o cadastro; a exclusão é lógica (`excluido_em`, migration 0005).
- A foto (`0009_fotos.sql`, `store/fotos.go`, `api/fotos.go`) é o precedente: uma
  tabela por pessoa com `resposta_id` como chave, e leitura e escrita filtradas por
  `escopoSQL(sc)` junto com `excluido_em IS NULL`.
- As ações do painel passam por `handleAPI` (`acao` no JSON), com a sessão e o
  escopo resolvidos em `adminReq`.
- O telefone fica em `respostas` e entra no CSV; o endereço **não** seguirá esse
  caminho.

## Componentes e arquivos existentes
- `backend/internal/store/{fotos.go,escopo.go,respostas.go}`
- `backend/internal/api/{fotos.go,registros.go,server.go,panel.go}`
- `frontend/src/admin/{detalhe.ts,editar.ts,admin.ts}`, CSS em `frontend/admin/`

## Alterações propostas no backend e contratos
- `store/enderecos.go`, no mesmo formato de `fotos.go`:
  - `Endereco(ctx, sc, id)`: leitura com escopo;
  - `SalvarEndereco(ctx, sc, id, e, por, now)`: gravação com escopo, devolve `(bool, error)`;
  - `ExcluirEndereco(ctx, sc, id)`: remoção com escopo.
- Ao excluir o cadastro (`registroExcluir`), o endereço é apagado na mesma transação.
- `api/enderecos.go`, com as ações `endereco_ler`, `endereco_salvar` e
  `endereco_excluir`, e validação de CEP, UF, campos obrigatórios, tamanho máximo,
  consentimento e "s/n".
- Códigos de erro novos: `cep_invalido`, `uf_invalida`, `endereco_incompleto` e
  `consentimento_endereco`. Cadastro inexistente ou fora do escopo devolve o
  `nao_encontrado` já existente.
- `listar` e o CSV não mudam.

## Dados e migrations
`0010_enderecos.sql`, aditiva:
```sql
CREATE TABLE enderecos (
  resposta_id     INTEGER PRIMARY KEY REFERENCES respostas(id),
  cep             TEXT NOT NULL CHECK (cep GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
  logradouro      TEXT NOT NULL,
  numero          TEXT NOT NULL,
  complemento     TEXT NOT NULL DEFAULT '',
  bairro          TEXT NOT NULL,
  cidade          TEXT NOT NULL,
  uf              TEXT NOT NULL CHECK (length(uf) = 2),
  consentimento_em  TEXT NOT NULL,
  consentimento_por TEXT NOT NULL,
  atualizado_em   TEXT NOT NULL,
  atualizado_por  TEXT NOT NULL
);
```
Não precisa migrar dados: começa vazia. Coordenadas entram na Spec 003, com
migration própria.

## Alterações propostas no frontend
- Seção "Endereço" em `detalhe.ts`, com formulário em `editar.ts` (campos com
  `autocomplete`, checkbox de consentimento, erros por campo) e ação de remover
  com confirmação.
- O endereço é carregado sob demanda (`endereco_ler`) ao abrir a ficha. Não vem
  no `listar`.
- JS compilado regenerado e versionado.

## Segurança e autorização
- Todo acesso passa por `escopoSQL` na mesma consulta. Nenhum endpoint aceita
  escopo vindo do cliente.
- O conteúdo do endereço nunca entra em `s.Log` nem nos erros internos.
- O token do smoke E2E já pode escrever só em `usuarios`, `usuario_escopos` e
  `login_falhas`; o teste de tela do endereço usará resposta simulada ou um
  cadastro fictício criado e apagado pelo próprio teste.

## Estratégia de testes
- Store, com SQLite local: escopo AREA/SETOR/CELULA em ler, salvar e remover;
  cadastro excluído; remoção junto com a exclusão do cadastro.
- API: validações (CEP, UF, obrigatórios, tamanhos, consentimento) e fora de
  escopo tratado como `nao_encontrado`.
- Contrato: o `listar` e o CSV continuam sem chaves de endereço.
- Frontend: testes de renderização e validação no padrão de `frontend/test`.
- Tela: smoke em 390×844 e 1440×900 (estados vazio, edição, erro e removido).

## Implantação, compatibilidade e rollback
- A migration aplica no deploy (`AUTO_MIGRATE`). Ela é aditiva e não afeta quem não
  usa a função.
- Rollback: reverter o código. A tabela pode ficar (vazia ou com dados consentidos);
  se for preciso apagar, isso é uma migration nova e explícita, nunca uma edição da 0010.

## Riscos, dependências e decisões pendentes
- As decisões de privacidade estão na spec. Falta só a retenção, para a T006. A
  geocodificação do ADR-0004 continua adiada para a Spec 003.
- Risco: endereço é dado sensível na prática. A mitigação é escopo no SQL, ausência
  em listas e CSV, consentimento registrado e remoção definitiva.
