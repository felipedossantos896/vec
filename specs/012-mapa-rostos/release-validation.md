# Validação de release — Spec 012, rostos maiores e grupos em leque no mapa

- Data: 2026-11-23
- Produção: v1.55.0, verificada pelo CI (`/version` e `/healthz`) e por `curl`:
  `mapa-regras.js` com o leque e `area.css` com os estilos novos, servidos com o CSP estrito.
- Entregas:
  - T002 #161 (v1.54.0) — foto e tamanho;
  - T003 #162 (v1.55.0) — leque e cartão.
- Sem migration e sem mudança na API.

## Cenários de aceite

Validação no `vec-dev`, com servidor real e CSP. Os dados eram pessoas fictícias com
endereço no meio do Atlântico, removidas ao fim:
- na T002, duas pessoas com fotos fora do quadrado (600×200 e 200×600) enviadas pela API;
- na T003, três áreas, com 3, 12 e 1 pessoa.

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Foto inteira, centralizada e preenchendo o círculo | Fotos deitada e em pé: a imagem tem o tamanho do círculo (menos o anel), `object-fit: cover`, centro a ≤ 1 px do centro do círculo, em 1440 e 390 px | ✅ |
| 2 | Círculos de 40 a 60 px conforme o zoom | Zoom 12: 40 px; zoom 16: 60 px (52 px no celular) | ✅ |
| 3 | Grupo de 3 abre em círculo e recolhe | Mouse (1440): 3 rostos à mesma distância do centro, com 3 linhas; tirar o mouse recolhe. Toque (390): toque abre, tocar no mapa recolhe | ✅ |
| 4 | Grupo de 12 vira espiral | 12 rostos, cada um mais longe do centro que o anterior | ✅ |
| 5 | Toque num rosto abre o cartão | Nome, célula, motivo de cuidado, Contato feito e Ficha, com o leque aberto; Ficha abre a ficha; pessoa sozinha abre o cartão direto | ✅ |
| 6 | Só teclado | Enter no grupo abre e foca o primeiro rosto; Tab percorre; Enter abre o cartão; Esc volta ao rosto e depois fecha o leque | ✅ |
| 7 | Movimento reduzido | Transição de 0 s nos rostos do leque | ✅ |
| 8 | 390, 1440 px e 4K, sem rolagem e sem CSP | 390 e 1440 px nesta rodada (o 4K do painel foi conferido na Spec 009 e o mapa não mudou de largura); zero violação de CSP; smoke de dev aprovado | ✅ |
| 9 | API do mapa sem coordenada nem endereço | A resposta traz só os centros da grade; nenhuma coordenada fictícia exata, rua, bairro ou nome | ✅ |

Regras puras com teste: tamanho por zoom (limites e celular) e leque (de 2 a 40 pessoas,
sem rostos sobrepostos nem em cima do centro, círculo equidistante, espiral crescente).

## Observações
- **Três causas da foto fora de escala, todas corrigidas:**
  - a regra do Leaflet para imagens de marcador;
  - a altura do grid do avatar, que deixava a foto em pé três vezes mais alta;
  - a regra `.av` de 36 px vencendo o tamanho do pino (o "40 px" do mapa nunca valia).

  A segunda correção vale também nas listas.
- O Leaflet desta versão (1.1.1), no Enter, só abre um popup ligado ao marcador. O marcador
  ganhou tratamento próprio de Enter e Espaço.
- **Primeira publicação da v1.55.0:** falhou por instabilidade do builder remoto do Fly.io
  (conexão encerrada no meio do build). Rodar de novo o job publicou normalmente.
- Produção: o painel por dentro não foi percorrido lá (exigiria criar um usuário).

## Rollback
Reverter #162 volta à pilha com o popup de lista; reverter #161 volta ao tamanho fixo.
Sem dados nem API envolvidos.
