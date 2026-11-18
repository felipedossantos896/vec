# ADR-0003 — Indicadores e central de acompanhamento

- Status: **Proposto**
- Data: 2026-11-18

## Contexto
O painel apresenta cadastros, jornada de seis etapas, faixa etária, vida na igreja e treinamentos. O roadmap registra que filtros e resumos são processados no navegador e recomenda medir antes de mover consultas para o servidor.

## Decisão proposta
Preservar todos os indicadores existentes, melhorar visualização e adicionar uma central de atenção com navegação para listas filtradas. Calcular jornada completa apenas quando as seis etapas estiverem concluídas; exibir cada etapa individualmente, sem presumir conclusão sequencial. Diferenciar métricas de período das métricas de situação atual. Reutilizar escopos de autorização no backend.

## Alternativas
Substituir o painel por dashboard inteiramente novo; adicionar paginação/infraestrutura antecipadamente.

## Consequências
Maior utilidade operacional; definições de métricas e eventuais campos de contato recente exigem validação antes de implementar.

## Validação
Testes dos cálculos, filtros por escopo, casos sem dados e navegação para pessoas correspondentes. Não exibir alertas de contato recente sem histórico confiável.
