# Spec 017 — Cartão do mapa: abre ao passar o mouse e visual novo

- Status: **Entregue** (v1.62.0, 2026-11-24) · [validação](release-validation.md)
- Data: 2026-11-24
- ADRs: [0011](../../docs/architecture/adr/0011-rostos-no-mapa.md) (rostos no mapa) e
  [0009](../../docs/architecture/adr/0009-identidade-visual.md). Sem ADR nova.
- Relacionadas:
  - Spec 012 (leque e cartão);
  - Spec 014 (cartão enxuto, selos e som). Esta spec revê duas decisões dela: o motivo de
    cuidado volta e os botões voltam a ter texto;
  - Spec 016 (mapa em tela cheia).

## Contexto
- **Hoje:** no computador, o cartão de uma pessoa só abre com um clique. Passar o mouse
  abre o leque de um grupo, mas não o cartão.
- **Visual de hoje:** rosto pequeno, nome, célula, papéis e dois botões só com ícone.
- **Referência:** o responsável mandou um modelo ("02 — Acompanhamento pastoral") com:
  - rosto grande e o nome em destaque;
  - "célula · papel";
  - uma faixa "Precisa de atenção" com o motivo;
  - dois botões com texto: **Entrar em contato** (principal) e **Ver perfil →**.

  A ideia é transformar o alerta do mapa numa informação útil para o líder.

## Objetivo
O cartão aparece ao passar o mouse e mostra, num relance, quem é a pessoa, se ela precisa de
atenção e o próximo passo.

## Escopo
1. **Abrir ao passar o mouse** (só em aparelhos com mouse):
   - passar no rosto de quem está sozinho na área abre o cartão;
   - num grupo, passar abre o leque (como hoje), e passar em cada rosto do leque abre o cartão
     daquela pessoa;
   - o cartão fecha cerca de 300 ms depois que o mouse sai do rosto **e** do cartão, para dar
     tempo de levar o mouse até os botões;
   - **clicar fixa** o cartão, que só fecha no "x", no Esc, em outro rosto ou no mapa;
   - no celular, nada muda: abre pelo toque.
   - num grupo, o cartão abre **acima do leque inteiro**, para não cobrir os outros rostos, e o
     rosto da pessoa fica destacado com um anel. Isso apareceu na validação: abrindo sobre o
     rosto, o cartão tapava os vizinhos e não dava para passar o mouse neles.
2. **Visual novo do cartão** (organização do print, cores do painel):
   - **cabeça:**
     - rosto grande (foto ou avatar ilustrado, com o anel na cor da célula);
     - nome curto em destaque;
     - abaixo, "célula · papel" (por exemplo, "Pi-Hairote · Membro", "Hope · Líder da célula"
       ou "Líder do setor Fogo no Altar");
     - os outros papéis (como "Anfitrião da célula Hope") em selos pequenos com ícone;
   - **faixa "Precisa de atenção"** (âmbar, com o ícone de alerta):
     - aparece só para quem precisa de cuidado, com o motivo, por exemplo "48 dias sem
       contato" ou "Sem discipulador";
     - não aparece para quem está em dia nem para o líder de área, que não tem trilha;
   - **botões:**
     - **Entrar em contato** (principal, verde do WhatsApp) abre a conversa no WhatsApp;
       sem telefone, vira **Registrar contato** e abre o registro de contato do painel;
     - **Ver perfil →** abre a ficha;
   - o "x" continua com 44 px, a animação e o som da Spec 014.
3. **Fechar sozinho** (pelo mouse que sai): usa a mesma animação de saída, **sem som**. O som
   fica para quando a pessoa fecha de propósito (x ou Esc).

### Fora de escopo
- Mudar o leque, os selos no rosto ou o que aparece no mapa.
- Mudar a gaveta (Spec 016) e o "Fale com eles".
- Tooltip só com o nome, sem cartão.

## Requisitos funcionais
1. **Um cartão por vez:** passar em outro rosto troca o cartão. Um cartão fixado não é
   trocado por um simples passar de mouse; só por um clique.
2. **Sem piscar:** ir do rosto para o cartão (e voltar) não fecha o cartão. O espaço entre
   eles conta como "dentro" durante a espera.
3. **Teclado:**
   - Enter e Espaço no rosto abrem e fixam o cartão, como hoje;
   - o foco vai para o primeiro botão;
   - Esc fecha e devolve o foco ao rosto.
4. **Acessibilidade:**
   - a faixa de atenção é texto (o leitor lê "Precisa de atenção: 48 dias sem contato");
   - os botões têm o nome da pessoa no `aria-label` ("Entrar em contato com Caio Araújo pelo
     WhatsApp", "Ver o perfil de Caio Araújo").
5. **Movimento:** com "reduzir movimento", o cartão abre e fecha sem animação.
6. **Gaveta:** o cartão continua desviando da barra de filtros, do painel e da gaveta (Spec
   016) e fecha quando a gaveta abre.
7. **CSP:** nada inline.

## Cenários de aceite
1. **Dado** o computador, **quando** o mouse passa num rosto sozinho, **então** o cartão abre
   sem clique; **quando** sai do rosto e do cartão, **então** fecha sozinho, sem som.
2. **Dado** o mouse indo do rosto até "Ver perfil", **então** o cartão não fecha no caminho e
   o clique abre a ficha.
3. **Dado** um grupo, **então** passar abre o leque e passar num rosto do leque abre o cartão
   daquela pessoa.
4. **Dado** um clique no rosto, **então** o cartão fica fixo: sair com o mouse não fecha; o
   "x" fecha com som.
5. **Dado** alguém que precisa de cuidado, **então** aparece a faixa "Precisa de atenção" com
   o motivo; para quem está em dia e para o líder de área, não aparece.
6. **Dado** alguém com telefone, **então** "Entrar em contato" abre o WhatsApp; sem
   telefone, o botão é "Registrar contato" e abre o registro.
7. **Dado** o celular, **então** o cartão abre pelo toque, com o visual novo, sem sobrar para
   fora da tela.
8. **Dado** 390 e 1440 px, **então** zero violação de CSP.

## Requisitos não funcionais
- Sem migration e sem mudança no servidor.
- Testes com dados fictícios.

## Correção após a entrega (T004, 2026-11-24)
O responsável apontou que o cartão da v1.62.0 não se parecia com o modelo (fontes e informações
diferentes). O cartão passou a seguir o modelo de perto, sempre com a foto ou o avatar da pessoa:
- **Fonte:** sem serifa neutra do sistema (SF no Apple, Segoe no Windows, Roboto no Android), em
  vez da fonte de títulos do painel.
- **Rosto:** 52 px, sem anel.
- **Faixa:** o ícone e "Precisa de atenção" na mesma linha, e o motivo embaixo.
- **Botões:** mesma largura; "Entrar em contato" em verde-escuro, sem ícone; "Ver perfil →"
  com borda clara.
- **"x":** traço fino.

O mapa do Leaflet se move com `transform`, então o cartão fica abaixo do painel e dos filtros,
que flutuam por cima. Por isso o cartão aberto pelo mouse desliza para o lado até sair de baixo
deles, com a ponta ainda no rosto.

## Decisões do responsável (2026-11-24)
1. Passar o mouse abre e sair fecha (com uma pequena espera); clicar fixa; no celular, pelo
   toque.
2. "Entrar em contato" abre o WhatsApp; sem telefone, registra o contato.
3. A faixa "Precisa de atenção" volta, só para quem precisa.
4. Layout do print com as cores do painel, a foto ou o avatar de cada pessoa e os selos de
   papel.
