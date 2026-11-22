# Spec 005 — Planejar a multiplicação de uma célula

- Status: **Entregue** (v1.34.0, 2026-11-22). Ver [release-validation.md](release-validation.md)
- Data: 2026-11-22
- ADRs: [0007](../../docs/architecture/adr/0007-planejamento-novas-celulas.md) (Aceito), [0006](../../docs/architecture/adr/0006-recomendacao-anfitrioes.md) (Aceito), [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md) (Aceito)
- Depende de: Specs [002](../002-endereco-membro/spec.md), [003](../003-mapa-membros/spec.md) e [004](../004-recomendacao-anfitrioes/spec.md) (entregues)

## Problema e objetivo
Quando uma célula cresce, a liderança precisa decidir como dividi-la em duas e em
que casas cada parte vai se reunir. Hoje isso é feito de cabeça. O objetivo é, para
uma célula, propor uma divisão em dois grupos pela proximidade dos membros, sugerir
os anfitriões de cada grupo e deixar o líder ajustar à mão. É **só simulação**: nada
é gravado e ninguém muda de célula.

## Escopo
### Incluído
- **Proposta de divisão:** o líder escolhe uma célula do seu escopo e o sistema
  propõe dois grupos de tamanho equilibrado, separando os membros pela direção em
  que a célula está mais espalhada.
- **Anfitriões por grupo:** para cada grupo, as casas confirmadas do escopo
  ordenadas como na Spec 004 (média e maior distância até os membros do grupo,
  capacidade comparada com o tamanho do grupo).
- **Ajuste à mão:** o líder move qualquer pessoa de um grupo para o outro, inclusive
  quem não tem posição; os números e os anfitriões são recalculados.
- **Resumo de cada grupo:** quantas pessoas, quantas com posição e a melhor casa.
- Voltar à proposta original a qualquer momento.

### Fora de escopo
- Gravar planos, criar célula nova ou mudar a célula de alguém (fica para uma
  próxima versão, se a liderança pedir).
- Mais de dois grupos, juntar células ou concentrações no setor.
- Tempo de trajeto (continua linha reta, como na Spec 004).
- Mostrar os grupos no mapa.

## Usuários e permissões
- Todo o escopo, como a ficha, o mapa e o ranking: cada líder planeja só com
  células e casas do seu escopo; a autorização vai no SQL.
- A resposta traz só números de cadastro, contagens e distâncias arredondadas
  (0,1 km). Nenhuma coordenada ou endereço sai do servidor.

## Requisitos funcionais
1. A aba **Mapa** ganha o painel **Planejar multiplicação**, com a mesma escolha de
   célula do painel de anfitriões.
2. A proposta divide os membros com posição em dois grupos que diferem em no máximo
   uma pessoa, cortando ao meio na direção de maior espalhamento. É determinística:
   os mesmos dados dão a mesma proposta.
3. Membros sem posição entram no grupo menor (ou no 1, em empate) com a marca
   "sem posição — confira o grupo".
4. Para cada grupo: as casas como no ranking da Spec 004, com as 3 primeiras em
   destaque e "não comporta o grupo" quando a capacidade é menor que o grupo. Se a
   mesma casa for a primeira dos dois grupos, a tela avisa.
5. Mover uma pessoa recalcula os dois grupos no servidor. A divisão ajustada vale
   até o líder sair da tela ou trocar de célula.
6. Com menos de 4 membros com posição, não há proposta automática: a tela explica e
   permite montar os grupos à mão.
7. Aviso fixo: "Simulação: nada é gravado e ninguém muda de célula."

## Cenários de aceite
1. **Dado** uma célula com 10 membros com posição em duas regiões, **quando** o
   líder abrir o planejamento, **então** recebe dois grupos de 5, cada um com os
   membros da mesma região.
2. **Dado** a mesma célula aberta duas vezes, **então** a proposta é igual.
3. **Dado** um membro sem posição, **então** ele aparece no grupo menor, marcado.
4. **Dado** o líder mover uma pessoa do grupo 1 para o 2, **então** os tamanhos, as
   distâncias e os anfitriões dos dois grupos mudam de acordo.
5. **Dado** uma casa com capacidade 4 e um grupo de 6, **então** ela aparece
   marcada "não comporta o grupo" e no fim daquele grupo.
6. **Dado** um líder CELULA, **quando** pedir o planejamento de outra célula ou
   enviar uma pessoa de fora da célula, mesmo pela API, **então** recebe "não
   encontrado" ou "dados inválidos", sem dados de terceiros.
7. **Dado** qualquer resposta, **então** ela não tem coordenada, rua, número,
   complemento, CEP nem nome; e nada é gravado no banco.
8. **Dado** 390 px ou teclado, **então** é possível mover pessoas e ler o resultado
   de cada grupo, com o anúncio da mudança para leitor de tela.

## Requisitos não funcionais
- Nenhuma dependência nova; o cálculo fica no servidor, em Go, e reaproveita o
  ranking da Spec 004.
- Nenhuma migration: a simulação não grava nada.
- Testes só com dados fictícios.

## Decisões do responsável (2026-11-22)
1. **Foco:** multiplicar uma célula em dois grupos.
2. **Guardar:** só simulação, sem gravar nada.
3. **Acesso:** todo o escopo.
4. **Ajuste:** o líder move pessoas à mão e o resultado é recalculado.
5. **Sem posição:** começam no grupo menor, marcados "sem posição — confira o grupo".
6. **Mínimo para a proposta automática:** 4 membros com posição (2 por grupo).
7. **Nomes:** "Grupo 1" e "Grupo 2", sem campo para renomear.
