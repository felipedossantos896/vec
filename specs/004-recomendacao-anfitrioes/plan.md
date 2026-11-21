# Plano técnico — Recomendação de anfitriões

- Status: **Aprovado** (2026-11-21)

## Referências e premissas verificadas
- `respostas.interesse_anfitriao` ('S'/'N'/'') já existe e vem do formulário.
- `enderecos` tem `lat`/`lng`/`geo_precisao` em nível de rua (Spec 003), lidos sempre
  com `escopoSQL`.
- A célula da pessoa está em `respostas.celula`; o escopo por célula ou setor vem de
  `escopoSQL`.

## Backend
- `0012_anfitrioes.sql`: tabela `anfitrioes` com `resposta_id` (PK, referência a
  `respostas`), `capacidade` (INTEGER, CHECK de 2 a 50), `dias` (TEXT com siglas
  `seg,ter,...` e CHECK de formato), `observacao` (TEXT, padrão ''),
  `confirmado_em` e `confirmado_por`. `DeleteResposta` apaga a linha junto.
- `store/anfitrioes.go`, no padrão da foto e do endereço:
  - `Anfitriao`, `SalvarAnfitriao` e `ExcluirAnfitriao`, com escopo;
  - `CandidatosAnfitriao(sc)`: confirmados no escopo, com coordenada de rua ou
    bairro, mais nome, capacidade e dias;
  - `MembrosCelula(sc, celula)`: ids e coordenadas dos membros da célula no escopo,
    com `visivel=false` se a célula estiver fora do escopo.
- `internal/anfitriao`, puro: `Ranking(candidatos, membros)` com Haversine, média,
  máximo, capacidade, ordenação e desempate. Testável sem banco.
- API:
  - `anfitriao_ler`, `anfitriao_salvar` (exige `confirmacao: true`) e
    `anfitriao_excluir`;
  - `anfitrioes_ranking` com `celula`, que devolve
    `{membros, semPosicao, casas: [{linha, mediaKm, maxKm, considerados, comporta, capacidade, dias, peloBairro}], foraDoRanking: {interessadosSemConfirmacao, confirmadosSemPosicao}}`,
    com distâncias arredondadas a 0,1 km e sem coordenadas.

## Frontend
- `anfitriao.ts`: seção "Anfitrião" na ficha (ver, confirmar, editar, remover), no
  padrão de `enderecos.ts`, com regras puras em `anfitriao-regras.ts`.
- Na aba **Mapa**, um painel "Escolher anfitrião" com seletor de célula, ranking em
  lista (3 primeiras em destaque), explicações e avisos. O nome abre a ficha.

## Segurança e privacidade
- O escopo vai no SQL em todas as leituras. O ranking só considera casas e membros
  do escopo.
- Saem só distâncias arredondadas. Com escopo, o líder já vê os endereços na ficha,
  então a distância não revela nada novo.
- O log registra a linha e o autor, nunca observação nem endereço.

## Estratégia de testes
- `anfitriao`: ordem, desempate, capacidade, membros sem posição, anfitrião membro
  com distância 0, lista vazia e valores conhecidos de Haversine.
- `store`: escopo, remoção junto com a exclusão do cadastro e filtro de precisão.
- API: validações, confirmação obrigatória, célula fora do escopo e resposta sem
  coordenada nem endereço.
- Frontend: regras puras e tela em 390 e 1440 px.

## Implantação e rollback
A migration é aditiva e aplicada no deploy. Rollback: reverter os PRs; a tabela
pode ficar.

## Riscos
- A linha reta subestima trajetos com barreiras, como rios e vias expressas.
  Mitigação: o aviso fixo e a decisão final do líder.
- Dados escassos no começo (poucas confirmações e endereços): a tela explica quem
  ficou de fora.
