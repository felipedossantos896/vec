# Spec 013 — Líderes de área e de setor como discipuladores, sem célula fixa

- Status: **Entregue** (v1.57.0, 2026-11-23) · [validação](release-validation.md)
- Data: 2026-11-23
- ADRs: [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md) (privacidade e autorização) e [0010](../../docs/architecture/adr/0010-navegacao-centrada-no-mapa.md). Sem ADR nova.
- Relacionadas: Spec 010 (Nova pessoa) e a regra do discipulado (o discipulador pode ser
  líder de setor ou de área).

## Contexto
O discipulador de um membro precisa ser um **cadastro de pessoa**. A lista de escolha
mostra só cadastros. Líderes de área e de setor normalmente existem apenas como **usuários
do painel** (login), sem cadastro, e por isso não aparecem para vincular.

Criar um cadastro para eles também não serve hoje:
- a Nova pessoa exige célula;
- quem é cadastrado numa célula conta como membro dela em listas, mapa e indicadores.

Só que o líder de área ou de setor **não tem célula fixa**: ele supervisiona todas.

## Objetivo
Dar a cada líder de área e de setor um cadastro de pessoa **sem célula**, com o papel
dele, para poder ser escolhido como discipulador. Ele não deve contar como membro de
nenhuma célula.

## Escopo
1. **Papel do cadastro:** membro de célula (como hoje), **líder de setor** (com o setor) ou
   **líder de área**. Líder de área e de setor ficam sempre **sem célula**.
2. **De onde nasce o cadastro do líder:**
   - **Ajustes > Usuários:** ao criar ou editar um login de área ou de setor sem cadastro
     ligado, o painel oferece **Criar o cadastro desta pessoa**, já ligado ao login. Pede o
     nascimento e o WhatsApp opcional; o nome vem do login.
   - **Nova pessoa:** a opção **Liderança (sem célula)** troca a célula por papel e setor.
3. **Escolher o discipulador:** a lista ganha o grupo **Liderança** no topo, com o papel
   ("Marcos Vieira · Líder do setor Fogo no Altar"), seguido dos membros.
4. **Pessoas:**
   - os líderes aparecem com a etiqueta **Líder de área** ou **Líder de setor**;
   - o filtro de situação ganha **Liderança**;
   - ficam **fora** das contagens de célula e do mapa das células.
5. **Trilha:**
   - o **líder de setor** tem jornada, discipulador e acompanhamento, como qualquer
     pessoa, porque pode vir a ser líder de área;
   - o **líder de área** não tem jornada: a ficha dele mostra contato, discipulado e os
     discípulos, sem a jornada.

### Fora de escopo
- Célula "que costuma frequentar" para líderes (decisão: líder de área ou setor não tem
  célula).
- Mudar o formulário público, que continua só para membros de célula.
- Mudar quem pode ver o quê (escopos).

## Requisitos funcionais
1. **Quem cadastra líderes:** só quem vê a área toda (perfil Área). A Nova pessoa do líder de
   setor e de célula continua só para membros de célula.
2. **Papel acompanha o login:** se o login ligado passa de Setor para Área (ou o contrário),
   o papel do cadastro acompanha. Para o líder de setor, o setor do cadastro é o primeiro
   setor do login.
3. **Sem célula não é pendência:** líderes não entram em "Sem célula" nem em "Arrumar
   cadastros".
4. **Líder de área fora da trilha:** não entra em jornada, "precisam de cuidado", "Fale com
   eles" nem "sem discipulador".
5. **Indicadores e mapa:** contam só membros de célula. O retrato mensal também.
6. **Visibilidade:** quem vê o cadastro do líder segue as regras de hoje. O líder de setor
   aparece para o próprio setor e para a área; o líder de área, para a área. Quem tem o
   líder como discipulador continua vendo os próprios discípulos.
7. **Duplicado e autorização:** os mesmos da Spec 010 também para o cadastro do líder.

## Cenários de aceite
1. **Dado** um login de líder de setor sem cadastro, **quando** a área cria o cadastro em
   Ajustes, **então** nasce um cadastro "Líder de setor", sem célula, ligado ao login.
2. **Dado** Nova pessoa com "Liderança (sem célula)", **então** o cadastro nasce com o papel
   escolhido e sem célula.
3. **Dado** a edição de um membro, **então** a lista de discipuladores mostra o grupo
   Liderança com o líder de setor e o de área, e o vínculo é salvo.
4. **Dado** o líder de setor logado, **então** ele vê os discípulos vinculados, de qualquer
   célula, em Meus discípulos ou Pessoas.
5. **Dado** a tabela de Pessoas, **então** os líderes aparecem com a etiqueta e o filtro
   Liderança, e não aparecem em "Sem célula".
6. **Dado** os indicadores e o mapa de uma célula, **então** os líderes não entram nas contas.
7. **Dado** o líder de área, **então** a ficha não mostra jornada e ele não entra em
   "precisam de cuidado"; o líder de setor mostra jornada e entra.
8. **Dado** um login de setor que vira área, **então** o cadastro passa a "Líder de área".
9. **Dado** 390 e 1440 px, **então** sem rolagem lateral e zero violação de CSP.

## Requisitos não funcionais
- Migration nova e aditiva; dados fictícios nos testes; sem dependência nova.

## Decisões do responsável (2026-11-23)
1. O cadastro do líder nasce em Ajustes e em Nova pessoa.
2. Líder de área ou de setor não tem célula fixa; só o líder de célula tem.
3. Os líderes aparecem em Pessoas com etiqueta.
4. Só o líder de setor tem jornada (pode vir a ser líder de área); o de área, não.

## Pontos confirmados (2026-11-23)
5. O líder de setor entra em "precisam de cuidado" e "Fale com eles", como os membros.
6. Os indicadores (e o retrato mensal) contam só membros de célula.
7. Só o perfil Área cria cadastros de liderança.
