# Spec 012 — Rostos maiores e grupos que se abrem no mapa

- Status: **Aprovada** (2026-11-23)
- Data: 2026-11-23
- ADRs: [0011](../../docs/architecture/adr/0011-rostos-no-mapa.md) (rostos no mapa, áreas de ~300 m), [0010](../../docs/architecture/adr/0010-navegacao-centrada-no-mapa.md) e [0009](../../docs/architecture/adr/0009-identidade-visual.md). Sem ADR nova.

## Contexto
No mapa da Área:
- **Fotos:** aparecem fora de escala e descentralizadas. O cadastro guarda a foto em
  quadrado de 256 px, mas uma regra do CSS do Leaflet para imagens de marcador
  (`.leaflet-marker-pane img { width: auto; max-width: none !important }`) vence a regra do
  avatar. A foto fica no tamanho natural e o círculo mostra só um canto dela. Os rostos
  ilustrados (SVG) não sofrem.
- **Tamanho:** os círculos têm 40 px e ficam pequenos.
- **Grupos:** quem mora na mesma área aparece empilhado (até 3 rostos e "+N"). Para ver cada
  um, é preciso abrir uma lista.

## Objetivo
Rostos nítidos e maiores no mapa, e grupos que se abrem num leque para ver cada pessoa.

## Escopo
1. **Foto no círculo:** preenche o círculo, centralizada e um pouco acima do centro (onde
   costuma estar o rosto), sem esticar. Vale para fotos de qualquer proporção.
2. **Tamanho que acompanha o zoom:** os círculos crescem com a aproximação, de **40 px** com
   o mapa afastado a **60 px** de perto (no celular, até 52 px). O anel na cor da célula e
   o "!" de cuidado crescem junto.
3. **Grupo que se abre em leque:**
   - **gatilho:** no celular, um toque; no computador, passar o mouse ou clicar. Aberto por
     clique, o grupo fica aberto até tocar fora, apertar Esc ou fechar;
   - **desenho:** os rostos se abrem num **círculo** em volta do ponto, com uma linha fina
     até o centro; acima de 8 pessoas, viram uma **espiral**. Cada rosto mantém o anel da
     célula e o "!" de cuidado, e o nome aparece ao passar o mouse ou focar;
   - **animação** de abrir e fechar curta (cerca de 250 ms), com efeito de mola. Com
     "movimento reduzido", os rostos aparecem e somem sem animação;
   - um grupo aberto por vez; abrir outro fecha o anterior.
4. **Cartão pequeno** ao tocar num rosto (com o grupo aberto ou numa pessoa sozinha):
   - nome curto, célula e, se precisa de cuidado, o motivo;
   - **Contato feito** e **Ficha**, e o WhatsApp quando houver.
   - Ele substitui o popup de lista atual.

### Fora de escopo
- Mudar a grade de ~300 m, o servidor ou a API do mapa.
- Agrupar áreas vizinhas em níveis de zoom afastados.
- Plugin ou biblioteca nova (o leque é feito com o Leaflet atual e CSS).

## Requisitos funcionais
1. **Privacidade (ADR-0011):** o leque é só visual, desenhado em pixels em volta do centro da
   área de ~300 m. Nenhuma posição real de pessoa é usada ou mostrada.
2. **Teclado:**
   - o grupo recebe foco e abre com Enter ou Espaço;
   - Tab percorre os rostos e Enter abre o cartão;
   - Esc fecha o cartão e depois o grupo.
   - Cada rosto tem o nome no rótulo acessível.
3. As lentes (cuidado, sem discipulador, servir), o grupo A/B da multiplicação e as casas do
   anfitrião continuam funcionando com o leque e os rostos maiores.
4. Com o leque aberto, arrastar ou dar zoom no mapa fecha o leque.

## Cenários de aceite
1. **Dado** um membro com foto, **então** o rosto aparece inteiro, centralizado e
   preenchendo o círculo no mapa.
2. **Dado** o mapa afastado e depois aproximado, **então** os círculos vão de 40 px a 60 px
   (52 px no celular).
3. **Dado** um grupo de 3 pessoas, **quando** passar o mouse (computador) ou tocar (celular),
   **então** os 3 rostos se abrem em círculo com linhas até o centro; ao sair o mouse ou
   tocar fora, recolhem.
4. **Dado** um grupo de 12 pessoas, **então** o leque vira espiral e todos aparecem.
5. **Dado** um rosto do leque, **quando** tocado, **então** abre o cartão com nome, célula,
   motivo de cuidado, Contato feito e Ficha.
6. **Dado** só o teclado, **então** dá para abrir o grupo, percorrer os rostos, abrir o
   cartão e fechar tudo com Esc.
7. **Dado** "movimento reduzido", **então** o leque abre sem animação.
8. **Dado** 390 px, 1440 px e 4K, **então** sem rolagem lateral e zero violação de CSP.
9. **Dado** a resposta da API do mapa, **então** continua sem coordenada exata nem endereço.

## Requisitos não funcionais
- Sem dependência nova; CSP estrito (posições do leque por CSSOM, nunca `style` no HTML).
- Regras puras com teste: tamanho por zoom e posições do leque e da espiral.

## Decisões do responsável (2026-11-23)
1. Gatilho: toque no celular; mouse ou clique no computador.
2. Desenho: leque em círculo (espiral acima de 8).
3. Tamanho: acompanha o zoom.
4. Toque num rosto: cartão pequeno.
