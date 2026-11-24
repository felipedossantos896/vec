# Spec 016 — Mapa em tela cheia com gaveta suspensa

- Status: **Entregue** (v1.61.0, 2026-11-24) · [validação](release-validation.md)
- Data: 2026-11-24
- ADRs: [0010](../../docs/architecture/adr/0010-navegacao-centrada-no-mapa.md) (navegação
  centrada no mapa) e [0009](../../docs/architecture/adr/0009-identidade-visual.md). Sem ADR
  nova.
- Relacionadas: Spec 009 (Área com o mapa), Spec 012 (leque) e Spec 014 (cartão e som).

## Contexto
- Na Área, o mapa é uma caixa de altura fixa (no máximo 640 px no computador e 420 px no
  celular), abaixo do título e dos filtros. A região das pessoas fica espremida.
- No celular, o painel escuro (números, lentes e ferramentas), "Fale com eles", "Cuidar das
  pessoas" e as listas ficam empilhados abaixo do mapa; para chegar a eles, o mapa sai da
  tela.
- A Spec 014 pôs um botão "Sons" na barra lateral. O responsável não quer esse botão: o som
  das animações fica sempre ligado.

## Objetivo
O mapa ocupa todo o espaço livre da tela, e o conteúdo que hoje fica abaixo dele vive numa
gaveta suspensa, colada na parte de baixo, no computador e no celular.

## Escopo
1. **Mapa em tela cheia (só na Área):**
   - no computador, ocupa toda a área à direita do menu lateral;
   - no celular, ocupa tudo entre a barra do topo e as abas de baixo;
   - a página da Área deixa de rolar: quem rola é a gaveta.
2. **Topo flutuante:**
   - o título "Área" e a frase saem da tela; o título continua para leitor de tela;
   - os filtros de setor e de célula viram uma barra fina por cima do mapa, no alto;
   - o zoom (+ −) desce para o canto de baixo à direita, acima da gaveta.
3. **Painel escuro:**
   - no computador, continua flutuando à esquerda, por cima do mapa, sem invadir a gaveta;
   - no celular, entra na gaveta, no topo do conteúdo. O mesmo vale para telas baixas (até
     500 px de altura, como o celular deitado), em que o painel cobriria quase todo o mapa.
4. **Gaveta suspensa:**
   - **recolhida:** só a alça e uma linha de resumo (por exemplo, "Fale com eles · 3
     precisam de cuidado"), colada embaixo, por cima do mapa. Um pedaço da borda aparece, para
     a pessoa saber que tem mais conteúdo;
   - **aberta:** sobe até cerca de 85% da altura do mapa, com rolagem própria;
   - **como abre e fecha:**
     - tocar ou clicar na alça ou no resumo abre e fecha;
     - arrastar a alça acompanha o dedo ou o mouse; ao soltar, vai para o estado mais
       próximo;
     - Esc fecha;
   - **o que tem dentro**, na ordem de hoje: situação do mapa e avisos, "Fale com eles esta
     semana", os blocos da Área ("Cuidar das pessoas" e os demais) e a lista das áreas do
     mapa;
   - **ferramentas:**
     - no celular, ao abrir Escolher anfitrião ou Planejar multiplicação, a gaveta abre
       mostrando a ferramenta;
     - no computador, a ferramenta continua no painel da direita, que para acima da gaveta.
5. **Enquadramento:** ao carregar ou filtrar, o mapa enquadra todas as pessoas no espaço que
   sobra entre a barra de filtros, o painel escuro (no computador) e a gaveta recolhida.
6. **Som sem botão:**
   - sai o botão "Sons" da barra lateral e do topo do celular;
   - o som de fechar o cartão toca sempre, sem preferência guardada.
7. **Detalhe:** o "← Voltar ao mapa" das ferramentas ganha o ícone de seta do Phosphor no
   lugar do caractere.

### Fora de escopo
- As outras telas (Pessoas, Indicadores, Ajustes e Meus discípulos) continuam como estão.
- Som novo na gaveta (o pedido é manter o som que já existe).
- Mudar o que aparece no mapa ou no cartão.

## Requisitos funcionais
1. **Sem rolagem dupla:** na Área, a página não rola; a gaveta aberta rola por dentro. O mapa
   continua arrastável por fora da gaveta.
2. **Gestos:**
   - arrastar a alça não move o mapa;
   - arrastar o mapa não move a gaveta;
   - a rolagem dentro da gaveta não puxa a página.
3. **Acessibilidade:**
   - a alça é um botão com `aria-expanded` e o nome "Mostrar mais da Área" ou "Recolher";
   - Enter e Espaço alternam; Esc fecha e devolve o foco para a alça;
   - recolhida, a gaveta tira o conteúdo da ordem de Tab.
4. **Movimento:** com "reduzir movimento", a gaveta muda de estado sem animação.
5. **Tamanho da tela:**
   - o mapa se ajusta ao virar o celular, ao redimensionar a janela e quando a barra do
     navegador aparece ou some (`dvh`);
   - em telas baixas (altura menor que 560 px), a gaveta recolhida continua visível.
6. **CSP:** nada inline; alturas e posições pelo CSS ou pelo CSSOM.

## Cenários de aceite
1. **Dado** a Área no computador (1440 × 900) e no celular (390 × 844), **então** o mapa
   ocupa todo o espaço livre, sem rolagem da página nem rolagem lateral.
2. **Dado** a gaveta recolhida, **então** aparecem a alça e o resumo, colados embaixo; ao
   tocar, ela abre com "Fale com eles" e os blocos da Área, e rola por dentro.
3. **Dado** arrastar a alça até a metade e soltar, **então** a gaveta vai para o estado mais
   próximo; Esc fecha e o foco volta para a alça.
4. **Dado** o celular, **então** o painel escuro (números e lentes) está dentro da gaveta, e
   escolher uma lente filtra o mapa.
5. **Dado** os filtros na barra do alto, **então** filtrar enquadra o mapa sem esconder
   pessoas atrás da barra, do painel ou da gaveta.
6. **Dado** Escolher anfitrião, **então** a ferramenta abre na gaveta (celular) ou no painel
   da direita (computador), acima da gaveta.
7. **Dado** o menu, **então** não existe mais o botão "Sons", e fechar o cartão toca o som.
8. **Dado** "reduzir movimento", **então** a gaveta muda sem animação.
9. **Dado** as outras abas, **então** continuam como estavam.
10. **Dado** as duas larguras, **então** zero violação de CSP.

## Requisitos não funcionais
- Sem migration e sem mudança no servidor.
- Testes com dados fictícios.

## Decisões do responsável (2026-11-24)
1. O conteúdo de baixo vira uma gaveta suspensa por cima do mapa.
2. O título e os filtros flutuam sobre o mapa.
3. No computador, o painel escuro continua flutuando à esquerda; no celular, entra na gaveta.
4. Sem botão de som: o som das animações fica sempre ligado.
