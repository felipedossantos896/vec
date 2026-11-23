# Plano técnico — Líderes de área e de setor sem célula fixa

- Status: **Aprovado** (2026-11-23)

## Dados
- `0017_papel_lideranca.sql` (aditiva): `respostas.papel TEXT NOT NULL DEFAULT 'membro'
  CHECK (papel IN ('membro', 'lider_setor', 'lider_area'))`. Os cadastros de hoje ficam
  como `membro`.

## Servidor
- `listar`, `pessoas` e `registro_criar` passam a trazer o `papel`.
- `registro_criar` (Spec 010) aceita `papel` `lider_setor` (com setor) ou `lider_area`, sem
  célula, só para o perfil Área; o membro continua exigindo célula.
- `usuario_salvar`:
  - com `criarCadastro` (nascimento e WhatsApp), cria o cadastro do líder com a mesma
    validação, duplicado e autorização, e liga ao login;
  - ao salvar um login de área ou de setor com cadastro ligado, sincroniza o `papel` e o
    setor.
- `registro_salvar`: um líder continua sem célula (a edição não exige nem atribui célula a
  quem tem papel de liderança).
- Retrato mensal (Spec 009): conta só `papel = 'membro'`.
- O mapa (`PontosMapa`) traz só membros.

## Painel
- `papel` em `Registro` e em `Pessoa`; regras puras em `lideranca-regras.ts`:
  - rótulo do papel;
  - "conta como membro";
  - "tem jornada";
  - grupo da lista de discipuladores.
- **Pessoas:** etiqueta na tabela e na ficha; situação **Liderança**; `semCelula`, jornada,
  cuidado e "sem discipulador" filtram por papel.
- **Indicadores e Área:** a base usa só membros.
- **Ficha do líder de área:** sem jornada no Resumo nem na Ficha completa.
- **Nova pessoa:** opção Liderança (papel e setor) para quem vê a área toda.
- **Ajustes > Usuários:** em logins de área ou setor sem cadastro, **Criar o cadastro desta
  pessoa** com nascimento, WhatsApp e a autorização.
- **Discipulador:** `opcoesPessoas` agrupa Liderança no topo, com o papel.

## Testes
- **Go:**
  - migration num SQLite real (padrão e CHECK);
  - criação de líder (só Área, sem célula);
  - sincronização do papel em `usuario_salvar`;
  - retrato só com membros; mapa só com membros.
- **Node:** regras da liderança.
- **Tela** (`vec-dev`, dados fictícios): cenários 1 a 9 em 390 e 1440 px.

## Rollback
Reverter as PRs volta à lista de hoje. A coluna `papel` é aditiva; os cadastros de líder
continuam válidos e passariam a aparecer como pessoas sem célula.
