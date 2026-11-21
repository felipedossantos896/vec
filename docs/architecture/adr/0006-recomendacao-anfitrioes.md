# ADR-0006 — Recomendação de anfitriões

- Status: **Aceito** em 2026-11-21 pelo responsável. A Spec 004 implementa a primeira versão: distância em linha reta (Haversine) como aproximação, só anfitriões com confirmação registrada pelo líder, ranking por média e pela maior distância, e a decisão final com a liderança. Tempo de trajeto e preferências de transporte ficam para depois.
- Data: 2026-11-18

## Contexto
O objetivo é selecionar uma casa de membro voluntário que minimize o esforço de deslocamento de um grupo.

## Decisão proposta
Considerar apenas candidatos que confirmaram disponibilidade e capacidade para receber. Comparar tempo médio e pior tempo individual de deslocamento, preferências de transporte e restrições informadas. Exibir ranking explicável com alternativas; a liderança decide, sem criação automática de célula. Distância em linha reta pode ser aproximação preliminar, nunca equivalente a tempo real de rota.

## Alternativas
Centroide geográfico; menor média de distância; recomendação manual sem cálculo.

## Consequências
Rotas podem gerar custos e limites de API. Pesos e critério de desempate permanecem em aberto até validação com líderes.

## Validação
Cenários com candidatos indisponíveis, trajetos extremos, dados ausentes, empate e explicação do ranking.
