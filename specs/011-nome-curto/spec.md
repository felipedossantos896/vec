# Spec 011 — Nome curto dos membros nas listas

- Status: **Aprovada** (2026-11-23)
- Data: 2026-11-23
- ADRs: [0009](../../docs/architecture/adr/0009-identidade-visual.md) (identidade e escala de texto) e [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md). Sem ADR nova.

## Contexto
Nomes completos como "Felipe dos Santos Carneiro" ocupam espaço nas listas, cartões e no
mapa e quebram a leitura. A Spec 009 pede que nomes não quebrem linha. Hoje cada tela
encurta de um jeito: algumas mostram o nome completo, outras só o primeiro nome.

## Objetivo
Mostrar cada membro por um **nome curto**, igual em toda a aplicação, e manter o nome
completo no cadastro e na ficha.

## Regra do nome curto
1. **Primeiro nome e último sobrenome**: "Felipe dos Santos Carneiro" → **Felipe Carneiro**.
2. **Partícula antes do último sobrenome** (de, da, do, das, dos, e): usa o sobrenome anterior.
   "Roberta Rodrigues de Paulo" → **Roberta Rodrigues**. Sem sobrenome antes, fica como
   está: "Ana de Paula" → **Ana de Paula**.
3. **Filho, Júnior, Neto e Sobrinho** no fim saem, e a regra segue com o que sobra:
   "José Almeida Filho" → **José Almeida**.
4. **Nome composto** reconhecido (lista de segundos nomes comuns, como Clara, Eduarda, Paula,
   Pedro, Arthur e Henrique): fica o nome composto, sem sobrenome. "Ana Clara Souza" →
   **Ana Clara**; "Pedro Arthur Lima" → **Pedro Arthur**.
5. **Uma ou duas palavras**: ficam como estão ("Felipe Carneiro", "Ana Clara").
6. **Maiúsculas**: cada palavra começa com maiúscula e as partículas ficam em minúscula
   ("FELIPE DOS SANTOS" → "Felipe dos Santos"). O cadastro não muda; é só a exibição.

## Nomes curtos repetidos
Quando duas ou mais pessoas que aparecem para o mesmo líder ficam com o mesmo nome curto,
só essas ganham as **iniciais do meio** (sem partículas): "Ana Maria Souza" e
"Ana Rita Souza" → **Ana M. Souza** e **Ana R. Souza**. No nome composto repetido entra o
último sobrenome ("Ana Clara Souza" e "Ana Clara Lima"). Se ainda assim empatar, volta o
nome completo.

## Onde vale
- **Nome curto:**
  - tabela de Pessoas e os cartões (Fale com eles, Meus discípulos);
  - rótulos e popup do mapa;
  - discipulador (coluna, campo e lista de escolha);
  - grupos da Área (cuidado, discipulado, aniversários, quem quer servir);
  - Indicadores, anfitriões e multiplicação;
  - avisos rápidos, aviso de duplicado e confirmação de exclusão.
- **Ficha:** o nome curto em destaque no cabeçalho e o **nome completo logo abaixo**.
  Ficha completa, edição e Nova pessoa usam o nome completo.
- **Continua completo:**
  - exportação CSV;
  - busca, que acha por qualquer parte do nome;
  - rótulo acessível e dica ao passar o mouse, nos lugares onde o nome aparece curto.

### Fora de escopo
- Mudar o nome gravado no cadastro ou no formulário público.
- Nomes dos usuários do painel (Ajustes > Usuários), que não são membros.
- Campo "Como é chamado(a)" para corrigir exceções à mão.

## Cenários de aceite
1. "Felipe dos Santos Carneiro" aparece como **Felipe Carneiro** na lista, no mapa e nos
   cartões, e a ficha mostra o nome completo abaixo do curto.
2. "Roberta Rodrigues de Paulo" aparece como **Roberta Rodrigues**.
3. "José Almeida Filho" aparece como **José Almeida**.
4. "Ana Clara Souza" aparece como **Ana Clara**.
5. Com "Ana Maria Souza" e "Ana Rita Souza" no mesmo escopo, aparecem **Ana M. Souza** e
   **Ana R. Souza**; sem a outra, só **Ana Souza**.
6. A busca por "Santos" continua achando "Felipe dos Santos Carneiro".
7. O CSV exportado traz o nome completo.
8. 390 e 1440 px sem quebra de nome nas listas, e zero violação de CSP.

## Requisitos não funcionais
- Só exibição, no navegador: sem migration e sem mudança na API.
- Regras puras com testes, incluindo acentos, maiúsculas, espaços extras e nomes curtos.

## Decisões do responsável (2026-11-23)
1. Primeiro nome e último sobrenome; com partícula antes do último sobrenome, vale o
   sobrenome anterior.
2. Nome composto reconhecido: o composto, sem sobrenome ("Ana Clara", "Pedro Arthur").
3. Filho, Júnior, Neto e Sobrinho: saem ("José Almeida").
4. Nome curto repetido: iniciais do meio ("Ana M. Souza").
5. Ficha: o curto em destaque e o completo abaixo.
6. Iniciais do meio = todas as iniciais dos nomes do meio, sem partículas ("Ana M. R. Souza").
7. Lista fixa de compostos, sem os segundos nomes que também são sobrenomes comuns.

## Risco conhecido
A lista de nomes compostos é fixa. Um segundo nome que também é sobrenome comum (Rosa,
Cruz, Vitória) fica fora dela para não encurtar errado. Algum composto menos comum vai
aparecer como primeiro nome e sobrenome. O campo "Como é chamado(a)" resolveria isso e
fica para depois, se fizer falta.
