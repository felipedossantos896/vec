# Validação de release — Spec 014, liderança e casa da célula no mapa, cartão enxuto e ícones

- Data: 2026-11-24
- Produção: v1.59.0, verificada pelo CI (`/version` e `/healthz`). `icones.js`, `sons.js` e a
  licença do Phosphor (`admin/vendor/phosphor/LICENSE`) servidos com 200 e o CSP estrito.
  Sem migration.
- Entregas:
  - T002 #177 (v1.58.0): servidor (líderes nos pontos do mapa e `destaques`);
  - T003 #178 (v1.59.0): painel (selos, cartão, som e pacote de ícones).

## Cenários de aceite

Validação no `vec-dev`, com servidor real, CSP e tiles simulados. Os dados fictícios:
- um setor e uma célula;
- dois membros na mesma área de ~300 m: um deles é líder da célula (login de célula
  ligado) e Casa da célula; o outro tem telefone;
- um líder de setor e um líder de área;
- um usuário temporário de área, que depois virou de setor para o cenário 7.

Tudo foi removido ao fim. Resultado: **45 verificações aprovadas**, em 1440 e 390 px (toque), com
"reduzir movimento" e com o login de setor. O servidor também tem testes Go do SQL real (escopo,
login inativo, célula inativa, várias células) e o painel tem testes em Node.

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Líder de setor no mapa | Rosto com o escudo; cartão "Líder do setor …"; resumo "2 membros · 1 líder no mapa" | ✅ |
| 2 | Líder de célula | Rosto com a coroa; cartão "Líder da célula …" | ✅ |
| 3 | Casa da célula | Anel grosso e selo de casa; cartão "Anfitrião da célula …" | ✅ |
| 4 | Líder e anfitrião ao mesmo tempo | Os dois selos, um em cima e outro embaixo, sem sobreposição (caixas medidas) | ✅ |
| 5 | Cartão enxuto | Nome curto, célula, papéis, ícone da Ficha e o do WhatsApp só com telefone; sem "Contato feito" nem o "x" do Leaflet | ✅ |
| 6 | Fechar | "x" com 44 × 44 px; classe de saída aplicada; som tocou uma vez (espião no `AudioContext`); foco voltou ao rosto; Esc e toque fecham; com "Sons" desligado, nenhum som; com "reduzir movimento", fecha na hora | ✅ |
| 7 | Escopo | O login de setor vê o líder do setor e não vê o líder de área | ✅ |
| 8 | 390 e 1440 px | Sem rolagem lateral; zero violação de CSP | ✅ |

O líder de área também apareceu no mapa com a estrela, sem filtro de setor.

## Observações
- **Botão "Sons":** fica na barra lateral, e não em Ajustes, porque Ajustes só aparece para a
  gerência. Está registrado na spec.
- **Nome curto:** "Davi" está na lista de nomes compostos da Spec 011, então "Fulano Davi
  Sobrenome" vira "Fulano Davi". Isso apareceu num nome fictício do teste; é a regra da Spec 011
  funcionando.
- **Cor da célula:** uma célula sem cor definida em Estrutura usa a cor da paleta pela posição;
  a coroa e o anel da casa seguem essa cor.
- **Dados de produção:** nada foi escrito. A coroa aparece para quem tem um login de célula
  **ativo** ligado ao cadastro; a casa, para o cadastro escolhido em Estrutura > Casa da célula.
  Para os destaques aparecerem, confira essas duas ligações em Ajustes.
- Produção: o painel por dentro não foi percorrido lá (exigiria criar um usuário).

## Rollback
Reverter #178 volta o mapa e o cartão de antes; o pacote de ícones sai junto. Reverter #177
tira os líderes e os destaques da resposta do mapa. Nada muda nos dados.
