# Validação de release — Spec 017, cartão do mapa ao passar o mouse e visual novo

- Data: 2026-11-24
- Produção: v1.62.0, verificada pelo CI (`/version` e `/healthz`). O `mapa.js` servido já tem
  o comportamento novo. Sem migration e sem mudança no servidor.
- Entrega: T002 #197 (v1.62.0).

## Cenários de aceite

Validação no `vec-dev`, com servidor real, CSP e tiles simulados. Dados fictícios:
- um membro sozinho, com telefone;
- dois membros na mesma área (leque), sem telefone; um deles com discipulador e contato
  registrado hoje;
- um líder de área;
- um usuário temporário de área com gerência.

Tudo foi removido ao fim. Resultado: **24 verificações aprovadas**, em 1440 px (mouse) e 390 px
(toque).

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Passar abre, sair fecha | Mouse no rosto abre o cartão sem clique; ao sair do rosto e do cartão, fecha sozinho e nenhum som toca (espião no `AudioContext`) | ✅ |
| 2 | Caminho até "Ver perfil" | Mouse do rosto até o botão em 15 passos: o cartão não fecha; o clique abre a ficha | ✅ |
| 3 | Grupo | Passar no grupo abre o leque; passar em cada rosto do leque abre o cartão daquela pessoa | ✅ |
| 4 | Clique fixa | Clicado, o cartão continua aberto com o mouse fora; o "x" fecha com som | ✅ |
| 5 | Faixa "Precisa de atenção" | Aparece exatamente quando a regra do painel diz que a pessoa precisa de cuidado; o líder de área nunca tem a faixa | ✅ |
| 6 | Contato | Com telefone, "Entrar em contato" é o link do WhatsApp; sem telefone, "Registrar contato" abre o registro | ✅ |
| 7 | Celular | O toque abre o cartão novo, inteiro dentro da tela (25 a 367 de 390 px), com botões de 48 px; o "x" fecha | ✅ |
| 8 | CSP | Zero violação e sem rolagem lateral nas duas larguras | ✅ |

Também passou o teclado: Enter no rosto abre e fixa o cartão, com o foco em "Entrar em contato";
Esc fecha e devolve o foco ao rosto.

## Observações
- **Cartão no grupo:** a primeira rodada mostrou que o cartão, aberto sobre um rosto do
  leque, cobria os vizinhos e não dava para passar o mouse neles. Agora ele abre acima do leque
  inteiro, e o rosto da pessoa ganha um anel. Está registrado na spec.
- **Visual:** a captura mostrou o texto de "Entrar em contato" na cor de link do Leaflet (azul
  sobre verde) e o rosto pequeno, porque o tamanho do avatar perdia para outra regra. Os dois
  foram corrigidos antes do merge.
- **"Em dia":** a pessoa fictícia com discipulador e contato de hoje ainda entrou em "precisa
  de cuidado" por outra regra da trilha. Por isso o teste compara a faixa com a regra do próprio
  painel, e o líder de área cobre o caso sem faixa.
- Produção: o painel por dentro não foi percorrido lá (exigiria criar um usuário).

## Rollback
Reverter #197 volta o cartão da Spec 014 (só pelo clique, com botões-ícone). Nada muda nos
dados.
