# Spec 018 — Nitidez, zoom e escala do mapa da Área

- Status: **Em implementação**. Escopo aprovado pelo responsável neste chat.
- ADRs: [0005](../../docs/architecture/adr/0005-mapa-membros.md), [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md), [0011](../../docs/architecture/adr/0011-rostos-no-mapa.md)
- Relacionadas: [Spec 016](../016-mapa-tela-cheia/spec.md) e [Spec 017](../017-cartao-mapa/spec.md)

## Problema e objetivo

Ruas e rótulos podem parecer pouco definidos em telas de alta densidade. O mesmo teto de zoom (16) limita a navegação manual, o enquadramento automático e os tiles. A Área também não oferece uma referência de distância no terreno.

## Requisitos

1. Melhorar a legibilidade do mapa-base em telas de alta densidade, com tiles visíveis até o último nível de zoom permitido.
2. Enquadrar os grupos visíveis ao abrir a Área ou mudar o filtro, com os recuos da barra, dos painéis e da gaveta. Com um único grupo, começar em vista de bairro e permitir aproximação manual.
3. Mostrar uma régua em metros ou quilômetros, atualizada conforme a navegação, acima da gaveta recolhida. Manter os controles e a atribuição legíveis.
4. Informar que os marcadores representam áreas de aproximadamente 300 m. Preservar os agrupamentos, os escopos e os dados retornados pela API.

## Cenários de aceite

- Em 1440 × 900 e 390 × 844, com densidade 1× e 2×, comparar a versão atual e a proposta no mesmo enquadramento. Em 2×, os nomes de vias devem ficar mais legíveis. Registrar capturas e quantidade de tiles carregados.
- Ao alternar entre Área inteira, célula e grupo único, os grupos visíveis cabem no espaço disponível. Um único grupo abre abaixo do teto manual.
- Ao chegar ao último nível com os controles de zoom ou a pinça, o mapa-base continua visível.
- Ao aproximar e afastar, a régua muda de distância e unidade conforme necessário. Com a gaveta recolhida, fica visível sem sobrepor os controles nem a atribuição.
- Com dados fictícios, conferir o estado sem grupos, a abertura do cartão por mouse e toque e a ausência de violações de CSP.

## Fora de escopo

Troca de provedor, alterações de API ou banco, maior precisão dos marcadores e redesenho de cartões, leques ou gaveta.
