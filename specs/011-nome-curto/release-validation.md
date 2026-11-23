# Validação de release — Spec 011, nome curto dos membros

- Data: 2026-11-23
- Produção: v1.53.0, verificada pelo CI (`/version` e `/healthz`) e por `curl`
  (`/admin/nomes-regras.js` servido com o CSP estrito).
- Entrega: T002 #155 (v1.53.0). Sem migration e sem mudança na API: só exibição.

## Cenários de aceite

Validação no `vec-dev`, com servidor real e CSP, em 1440 e 390 px. Os dados eram 7 pessoas
fictícias numa célula fictícia (uma com endereço no meio do Atlântico), todas removidas ao
fim. A regra também tem testes em Node (6 grupos de casos, com bordas).

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Primeiro nome e último sobrenome; ficha com o completo abaixo | "Teodoro dos Santos Quaresma" → Teodoro Quaresma na lista, no mapa e em "Fale com eles"; a ficha mostra o curto e o completo abaixo; o completo fica no `title` | ✅ |
| 2 | Partícula antes do último sobrenome | "Roberta Rodrigues de Paulo" → Roberta Rodrigues | ✅ |
| 3 | Filho, Júnior, Neto e Sobrinho | "Josué Almeida Filho" → Josué Almeida | ✅ |
| 4 | Nome composto | "Ana Clara Vasconcelos" → Ana Clara | ✅ |
| 5 | Nomes curtos repetidos | "Lívia Marta Brandão" e "Lívia Rute Brandão" → Lívia M. Brandão e Lívia R. Brandão; sozinha, só o curto (teste em Node) | ✅ |
| 6 | Busca por parte do nome | "Santos Quaresma" acha Teodoro Quaresma | ✅ |
| 7 | CSV | O arquivo exportado traz "Teodoro dos Santos Quaresma" | ✅ |
| 8 | 390 e 1440 px | Nomes sem quebra de linha, sem rolagem lateral, zero violação de CSP; smoke de dev aprovado | ✅ |

Também conferido: nome em maiúsculas ("OTÁVIA DE SOUZA BRAGANÇA" → Otávia Bragança).

## Observações
- O desempate considera os nomes que o líder vê: os cadastros do escopo e a lista de
  discipuladores da área. Por isso, uma pessoa de outra célula com o mesmo nome curto
  também faz aparecer as iniciais do meio.
- A lista de compostos é fixa. Maria e Rita ficaram fora (são usadas como nome do meio no
  cenário 5), assim como segundos nomes que também são sobrenomes comuns (Rosa, Cruz,
  Vitória). O campo "Como é chamado(a)" fica para depois, se fizer falta.
- Produção: o painel por dentro não foi percorrido lá (exigiria criar um usuário).

## Rollback
Reverter #155: as telas voltam a usar o nome gravado. Nada muda nos dados.
