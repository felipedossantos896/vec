# ADR-0002 — Design system incremental

- Status: **Substituído** em 2026-11-22 pelo [ADR-0009](./0009-identidade-visual.md) (nova identidade visual). Os princípios daqui — tokens, componentes, acessibilidade e mesma stack — continuam valendo dentro do 0009.
- Data: 2026-11-18

## Contexto
O painel já utiliza identidade azul-marinho, dourado e bege, com HTML semântico, Tailwind e TypeScript estrito.

## Decisão proposta
Padronizar tokens de cor, tipografia, espaçamento, estados e componentes de cards, tabelas, filtros, navegação e formulários. Preservar navegação por teclado, layout móvel e preferência por movimento reduzido. Implementar com a stack atual, sem dependências de runtime desnecessárias.

## Alternativas
Adotar biblioteca visual completa; redesenhar telas isoladamente.

## Consequências
Consistência e manutenção melhores; requer migração progressiva dos componentes existentes.

## Validação
Contraste, foco, estados vazios/erro/carregamento, desktop e mobile; inspeção visual e testes de interação.
