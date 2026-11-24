# Spec 014 — Liderança e casa da célula no mapa, card enxuto e pacote de ícones

- Status: **Entregue** (v1.59.0, 2026-11-24) · [validação](release-validation.md)
- Data: 2026-11-24
- ADRs: [0011](../../docs/architecture/adr/0011-rostos-no-mapa.md) (rostos no mapa),
  [0009](../../docs/architecture/adr/0009-identidade-visual.md) (identidade visual) e a
  nova [0012](../../docs/architecture/adr/0012-pacote-de-icones.md) (pacote de ícones),
  aceita.
- Relacionadas: Spec 012 (rostos e leque no mapa) e Spec 013 (liderança sem célula).

## Contexto
- O mapa mostra só membros de célula. A Spec 013 deixou os líderes de área e de setor de
  fora porque eles não têm célula.
- Nada no mapa diz quem lidera ou onde a célula se reúne. A "Casa da célula" já existe em
  Ajustes > Estrutura, mas não aparece no mapa.
- O card que abre ao tocar num rosto traz WhatsApp, **Contato feito** e **Ficha** como
  botões com texto, e o motivo de cuidado. Para quem só quer saber quem é, é informação
  demais.
- O "x" de fechar é pequeno, principalmente no celular.
- O painel não tem um conjunto de ícones: cada ícone é um SVG desenhado à mão.

## Objetivo
Mostrar no mapa quem lidera e onde cada célula acontece, deixar o card mais enxuto e
fácil de fechar, e adotar um pacote de ícones para reutilizar no resto do painel.

## Escopo
1. **Líderes no mapa:** os líderes de área e de setor que têm endereço aparecem no mapa,
   com o rosto, como os membros.
2. **Selo de papel:** um selo redondo no canto do rosto, com ícone e cor por papel:

   | Papel | Ícone (Phosphor, *fill*) | Cor |
   |---|---|---|
   | Líder de área | `star` (estrela) | dourado |
   | Líder de setor | `shield-star` (escudo) | roxo |
   | Líder de célula | `crown-simple` (coroa) | cor da célula |
   | Anfitrião (casa da célula) | `house-line` (casa) | verde |

   - **Líder de célula** é quem tem um login de célula ligado ao seu cadastro. O selo vale
     para cada célula desse login.
   - **Anfitrião** é o cadastro escolhido como **Casa da célula** em Estrutura.
3. **Local da célula:** o rosto do anfitrião ganha também um **anel mais grosso** na cor da
   célula, para marcar onde a célula se reúne.
4. **Card enxuto** (ao tocar ou clicar no rosto), só com:
   - o rosto e o **nome curto**;
   - a **célula** (selo com a cor dela). Para o líder de área ou de setor, o papel no lugar
     da célula;
   - os **papéis**, por exemplo "Líder da célula Hope", "Anfitrião da célula Hope", "Líder
     do setor Fogo no Altar" ou "Líder de área";
   - dois **botões-ícone**: **WhatsApp** (só quando tem telefone) e **Ficha**.

   Sai o botão **Contato feito**. Sai também o motivo de cuidado; a lente de cuidado continua
   marcando os rostos.
5. **Fechar o card:**
   - um "x" com área de toque de **44 × 44 px**, no PC e no celular;
   - uma animação curta (cerca de 180 ms): o card encolhe e some em direção ao rosto;
   - um **som curto e suave**, gerado pelo próprio navegador, sem arquivo de áudio.
6. **Pacote de ícones:** o painel adota o **Phosphor Icons** (MIT), com só os ícones usados,
   copiados para dentro do repositório. Esta spec usa o pacote no mapa e no card. Os ícones
   antigos são trocados em outra spec.

### Fora de escopo
- Selo para anfitriões só confirmados (que podem receber no futuro). Decisão: só a casa da
  célula.
- Campo "Líder da célula" em Estrutura. Decisão: o líder vem do login.
- Trocar os outros ícones do painel (formulário, abas, botões).
- Mudar quem vê quem (escopos) e a precisão do ponto no mapa (área de ~300 m).

## Requisitos funcionais
1. **Escopo de sempre:** o líder aparece no mapa só para quem já o vê em Pessoas, que são
   as regras da Spec 013. O servidor continua mandando só o centro da área de ~300 m.
2. **Contagens:** líderes no mapa **não** entram nas contas das células nem nos indicadores
   (Spec 013). O resumo do mapa separa: "N membros · M líderes".
3. **Cor:** o rosto do líder de área ou de setor não tem a cor de uma célula. O anel fica
   neutro e o selo diz o papel.
4. **Mais de um papel:** cabem até dois selos por rosto. O selo de liderança fica no
   canto de cima e o da casa, no canto de baixo. No card, todos os papéis aparecem em
   lista.
5. **Leque (Spec 012):** os selos e o anel também aparecem nos rostos abertos em leque.
6. **Acessibilidade:**
   - cada selo tem nome acessível (por exemplo "Líder de setor");
   - os botões-ícone têm `aria-label` e dica ("WhatsApp", "Abrir ficha");
   - o "x" fecha com Enter, Espaço e Esc, e o foco volta ao rosto.
7. **Movimento e som:**
   - com "reduzir movimento" ligado no aparelho, o card fecha sem animação;
   - o som toca só quando a pessoa fecha o card, com volume baixo;
   - o botão **Sons** (ligado por padrão), na barra lateral ao lado de Atualizar e Sair, vale
     para aquele aparelho. Fica na barra, e não em Ajustes, porque Ajustes só aparece para a
     gerência e o som vale para todos;
   - se o navegador não tiver áudio, o card fecha normalmente, sem som.
8. **CSP:** nada de `style` ou `onclick` inline. Os ícones são SVG embutidos, sem fonte
   nem script de outro domínio.

## Cenários de aceite
1. **Dado** um líder de setor com endereço, **então** ele aparece no mapa com o selo de
   escudo, e o resumo o conta em "líderes".
2. **Dado** um login de célula ligado a um cadastro, **então** esse rosto tem a coroa e o
   card diz "Líder da célula …".
3. **Dado** uma célula com Casa definida, **então** o rosto do anfitrião tem o anel grosso e
   o selo de casa, e o card diz "Anfitrião da célula …".
4. **Dado** alguém que é líder e anfitrião da mesma célula, **então** os dois selos aparecem
   sem se sobrepor.
5. **Dado** o card aberto, **então** mostra só o nome curto, a célula ou o papel, os
   papéis, o ícone da Ficha e o do WhatsApp (se houver telefone), e não mostra "Contato
   feito".
6. **Dado** o "x", **então** a área de toque tem pelo menos 44 × 44 px, a animação roda e o
   som toca. Com "reduzir movimento", não há animação; com "Sons" desligado, não há som.
7. **Dado** um líder de setor logado, **então** ele não vê o líder de área no mapa se não o
   vê em Pessoas.
8. **Dado** 390 e 1440 px, **então** sem rolagem lateral e zero violação de CSP.

## Requisitos não funcionais
- **Ícones:** copiados do `@phosphor-icons/core` 2.1.1 (MIT), com a licença no repositório.
  Sem dependência em tempo de execução.
- **Dados:** sem migration; tudo já existe (`usuarios.resposta_id` e
  `celulas.anfitriao_id`).
- **Testes:** com dados fictícios.

## Decisões do responsável (2026-11-24)
1. O líder de célula é identificado pelo login de célula ligado ao cadastro.
2. O anfitrião destacado é só a Casa da célula (Estrutura).
3. Ícones de um pacote bonito e reutilizável no sistema (proposta: Phosphor, ADR-0012).
4. O card mantém o WhatsApp como ícone, ao lado da Ficha.

## Pontos confirmados (2026-11-24)
5. Cores e ícones dos selos da tabela acima.
6. O resumo do mapa separa membros e líderes.
7. A opção "Sons do painel", ligada por padrão (na implementação, botão "Sons" na barra
   lateral, visível para todos os perfis).
8. O motivo de cuidado sai do card (a lente de cuidado continua no mapa).
