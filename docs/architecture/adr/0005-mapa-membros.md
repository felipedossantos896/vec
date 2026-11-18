# ADR-0005 — Mapa de membros e células

- Status: **Proposto**
- Data: 2026-11-18

## Contexto
A liderança deseja visualizar distribuição territorial de membros e células para apoiar planejamento.

## Decisão proposta
Criar visualização geográfica com filtros por setor/célula, agrupamento de marcadores e alternância mapa/lista. Mostrar localização aproximada por padrão; exibir endereço exato somente com autorização explícita. Respeitar os mesmos escopos do servidor, sem confiar apenas nos filtros do navegador.

## Alternativas
Mapa público com pontos exatos; relatórios apenas por bairro; mapas estáticos.

## Consequências
Novo fluxo de permissões, dados e integração cartográfica; membros sem coordenadas permanecem visíveis na lista, sem ponto no mapa.

## Validação
Testes de escopo AREA/SETOR/CELULA, não vazamento de coordenadas e comportamento com dados incompletos.
