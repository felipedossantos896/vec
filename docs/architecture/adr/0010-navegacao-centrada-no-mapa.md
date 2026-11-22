# ADR-0010 — Navegação centrada no mapa

- Status: **Proposto**
- Data: 2026-11-22
- Relacionados: [ADR-0005](./0005-mapa-membros.md), [ADR-0006](./0006-recomendacao-anfitrioes.md), [ADR-0007](./0007-planejamento-novas-celulas.md), [ADR-0009](./0009-identidade-visual.md)

## Contexto
Hoje o painel tem cinco abas (Acompanhar, Pessoas, Indicadores, Mapa, Configurações), e
as funções de mapa (anfitrião, multiplicação) ficam num painel recolhível. O líder pensa
nas pessoas pelo lugar onde estão e pela célula, e quer agir a partir daí.

## Decisão proposta
- A tela inicial passa a ser **Área**: o mapa com as pessoas (rosto e nome) agrupadas
  por célula, com **lentes** (Todos, Precisam de cuidado, Sem discipulador, Prontos para
  servir) e, abaixo, "Fale com eles esta semana", Discipulado e Prontos para servir.
  Substitui as abas **Acompanhar** e **Mapa**.
- **Escolher anfitrião** e **Planejar multiplicação** viram ferramentas da Área, que
  focam o mapa na célula escolhida.
- Menu final: **Área · Pessoas · Indicadores · Ajustes** (barra inferior no celular).
- **Pessoas** abre a ficha numa gaveta lateral, sem sair da lista, com as abas Resumo,
  Acompanhamento e Ficha completa.
- **Discipulador** vê uma versão simples: "Meus discípulos" e Pessoas.
- Quem não tem endereço continua acessível pela lista e pelas lentes; o mapa vazio
  explica como preencher.

## Alternativas
Manter as abas atuais e só reestilizar; mapa como aba separada com a identidade nova.

## Consequências
Muda o hábito de quem usa o painel; a lista continua a um toque. O mapa precisa carregar
rápido e funcionar sem endereços. Remove código duplicado entre Acompanhar e Mapa.

## Validação
Todas as ações de hoje continuam alcançáveis em até dois toques; escopos AREA, SETOR,
CELULA e DISCIPULADOR conferidos; telas em 390 e 1440 px; teclado e leitor de tela.
