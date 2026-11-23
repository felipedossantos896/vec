# Plano técnico — Nome curto dos membros

- Status: **Aprovado** (2026-11-23)

## Regras (`frontend/src/admin/nomes-regras.ts`, puras, com teste em Node)
- `regrasNomes.curto(nome)`: a regra da spec. Partículas: de, da, do, das, dos, e.
  Sufixos: filho, júnior/junior, neto, sobrinho. Lista de segundos nomes compostos
  (sem os que também são sobrenomes comuns). Normaliza espaços e maiúsculas.
- `regrasNomes.semColisao(nomes)`: recebe os nomes completos visíveis e devolve o mapa
  nome completo → nome de exibição. Desempata com as iniciais do meio, depois com o último
  sobrenome (compostos), por fim com o nome completo.

## Painel
- Depois de `listar` (e ao criar, editar ou excluir), `derivar` guarda `_curto` em cada
  registro e um mapa por id para o discipulador (`estado.pessoas`). As telas passam a usar
  `nomeDe(r)` / `nomePorId(id)` no lugar de `r.nome`, `curto()` e `curtoNome()`.
- Onde o nome aparece curto: `title` e rótulo acessível com o nome completo.
- Cabeçalho da ficha: `#detNome` com o curto e um `#detNomeCompleto` abaixo (escondido
  quando o curto já é o nome completo).
- A busca (`_busca`) e o CSV continuam com o nome completo.

## Testes
- Node: casos da spec e bordas (uma palavra, só partículas, acentos, maiúsculas, Júnior
  com e sem acento, composto repetido, empate total).
- Tela (`vec-dev`, pessoas fictícias): cenários 1 a 8 em 390 e 1440 px.

## Rollback
Reverter a PR: as telas voltam a usar o nome gravado. Nada muda nos dados.
