# Validação de release — Spec 016, mapa em tela cheia com gaveta suspensa

- Data: 2026-11-24
- Produção: v1.61.0, verificada pelo CI (`/version` e `/healthz`). `area-layout.js` e
  `gaveta-regras.js` servidos com 200 sob o CSP estrito; o painel não tem mais o botão
  "Sons". Sem migration e sem mudança no servidor.
- Entrega: T002 #191 (v1.61.0).

## Cenários de aceite

Validação no `vec-dev`, com servidor real, CSP e tiles simulados. Dados: três membros
fictícios com endereço e um usuário temporário de área com gerência; tudo removido ao fim.
Rodou em 1440 × 900, 390 × 844, 844 × 390 (celular deitado) e 390 × 844 com "reduzir
movimento". Resultado: **82 verificações aprovadas**.

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Mapa em tela cheia | O palco vai do fim do topo (ou da borda, no computador) até o começo das abas (ou o fim da tela), medido; sem rolagem da página nem lateral | ✅ |
| 2 | Gaveta recolhida e aberta | Recolhida com 64 px, resumo "Fale com eles · N precisam de cuidado" e conteúdo `inert`; ao tocar, abre com 85% do mapa e mostra "Fale com eles" e os blocos; rola por dentro sem rolar a página | ✅ |
| 3 | Arrastar e Esc | Com o mouse, a gaveta acompanha o arrasto; solta acima da metade e abre, perto de baixo e recolhe; Esc recolhe e o foco volta para a alça | ✅ |
| 4 | Painel escuro | Flutuando à esquerda no computador; dentro da gaveta no celular e na tela baixa; escolher uma lente na gaveta filtra o mapa | ✅ |
| 5 | Enquadramento | Todos os rostos ficaram abaixo da barra de filtros, acima da gaveta e fora do painel; zoom e atribuição do OpenStreetMap acima da gaveta | ✅ |
| 6 | Ferramenta | Escolher anfitrião abre no painel da direita, acima da gaveta (computador), ou dentro da gaveta, que abre sozinha (celular e tela baixa) | ✅ |
| 7 | Sem botão de som | O botão "Sons" não existe; fechar o cartão tocou o som (espião no `AudioContext`) | ✅ |
| 8 | Reduzir movimento | A gaveta sem transição (`0s`) | ✅ |
| 9 | Outras abas | Pessoas sem a classe da Área, com o espaçamento e o título de sempre; voltar à Área mantém o mapa em tela cheia | ✅ |
| 10 | CSP | Zero violação nas quatro rodadas | ✅ |

## Observações
- **Telas baixas:** no celular deitado (844 × 390), o painel escuro cobria quase metade do
  mapa. Por isso, com até 500 px de altura, o painel vai para a gaveta como no celular em pé.
  Está registrado na spec.
- **Camadas:** a primeira rodada achou o cartão do mapa atrás da barra de filtros no celular
  deitado. Agora a ordem é rostos, depois painel, filtros e ferramenta, depois o cartão e por
  fim a gaveta. O cartão desvia dessas partes e fecha quando a gaveta abre.
- **Primeira entrada:** a Área é a tela inicial, então a classe da tela cheia é aplicada pelo
  estado na carga, e não só na troca de aba. A primeira rodada pegou isso.
- **Arrasto por toque:** foi validado com o mouse, que usa os mesmos eventos de ponteiro do
  toque. No celular de verdade vale a pena conferir o gesto.
- Produção: o painel por dentro não foi percorrido lá (exigiria criar um usuário).

## Rollback
Reverter #191 volta o mapa em caixa, o conteúdo empilhado e o botão "Sons". Nada muda nos
dados.
