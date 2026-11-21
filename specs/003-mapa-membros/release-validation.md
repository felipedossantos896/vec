# Validação de release — Spec 003, mapa de membros

- Data: 2026-11-21
- Produção: v1.27.0, verificada pelo CI (`/version` e `/healthz`). Os arquivos do
  mapa respondem 200, e o `leaflet.js` servido tem o hash do pacote conferido.
- Entregas: T002 #66, T003 #67, T004 #68, T005 #69. Migration
  `0011_endereco_coordenadas.sql` em produção (deploy) e em `vec-dev`.

## Carga inicial em produção
Rodada em 2026-11-21, com confirmação do responsável e token de 1 dia restrito a
`all:data_read` + `enderecos:data_update`. `-simular` encontrou **0 pendentes**: a
produção ainda não tem endereços (contagem agregada: 0). Nada foi enviado ao
Nominatim. Daqui em diante, cada endereço salvo é geocodificado na hora. O comando
`geocodificar` fica para recuperar períodos com `GEOCODER=off`.

## Cenários de aceite

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Endereço com rua existente → precisão de rua e área de ~300 m no mapa | Ponta a ponta em `vec-dev` com Nominatim real (endereço público, Praça da Sé/SP): pessoa no mapa, área no centro de SP | ✅ |
| 2 | Rua não encontrada → bairro/cidade; nada → "sem posição" | Testes do `geo` com Nominatim falso; a API separa `soCidade` e `naoLocalizados` | ✅ (automatizado) |
| 3 | CELULA vê só a sua célula, mesmo pela API | Testes de store e API (escopo no SQL) | ✅ (automatizado) |
| 4 | Resposta do mapa sem coordenada exata, número ou complemento | Ponta a ponta (resposta real só com centros de 4 casas, sem rua, número ou CEP) + testes de API | ✅ |
| 5 | `GEOCODER=off` ou Nominatim fora → endereço salvo e pendente | Testes de API e `geo` (falha não afeta o salvamento; interruptor) | ✅ (automatizado) |
| 6 | Endereço alterado invalida a coordenada | SQLite real com o SQL do código + ponta a ponta (trocar só o número mantém a posição) | ✅ |
| 7 | Filtro de setor muda mapa, contagens e listas juntos | Tela: filtro compartilhado com as quatro visões; regras puras testadas | ✅ |
| 8 | 390 px e teclado, alternativa em lista, atribuição visível | Tela em 390×844, 1440×900 e sem Leaflet | ✅ |

## Política de uso (Nominatim e tiles OSM)
1 req/s global (4/min em lote), User-Agent com a URL do repositório, cache,
`GEOCODER=off`, consulta sem nome, número, complemento ou CEP, atribuição visível,
Referer enviado, zoom máximo 16, sem pré-carga nem offline. Os testes de tela usam
tiles simulados.

## Decisões
- Retenção: mantida sem prazo (confirmada na aprovação da spec).

## Riscos residuais
- O Nominatim e os tiles do OSM não têm SLA e podem mudar a política. Mitigação:
  interruptor, cache, painel independente do mapa e lista equivalente.
- Num grupo com uma pessoa só, a posição dela fica revelada dentro de ~300 m, como
  aceito na decisão de precisão.

## Rollback
`fly secrets set GEOCODER=off` desliga a geocodificação na hora. Depois, reverter os
PRs #69 → #66 na ordem inversa. As colunas da 0011 podem ficar.
