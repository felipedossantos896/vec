# Plano

- Criar `trilhos-regras.ts`, puro e testável, com a definição dos trilhos, o estado de cada etapa, o progresso e a pendência do batismo.
- Em `detalhe.ts`:
  - abas Visão geral, Jornada e Ficha completa;
  - a aba Jornada só aparece para quem tem trilha;
  - sai o passo a passo de 6 etapas.
- Em `pessoas.css`, os novos componentes:
  - cartão de trilho com barra de progresso;
  - linha do tempo vertical;
  - resumo clicável.
- Movimento curto, desligado com `prefers-reduced-motion`.
- Verificar com Playwright em 1440×900 e 390×844, usando dados fictícios.
