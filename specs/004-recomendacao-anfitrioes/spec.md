# Spec 004 — Recomendação de anfitriões

- Status: **Entregue** (v1.31.0, 2026-11-22). Ver [release-validation.md](release-validation.md)
- Data: 2026-11-21
- ADRs: [0006](../../docs/architecture/adr/0006-recomendacao-anfitrioes.md) (Aceito), [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md) (Aceito)
- Depende de: [Spec 002](../002-endereco-membro/spec.md) e [Spec 003](../003-mapa-membros/spec.md) (entregues)

## Problema e objetivo
Escolher a casa que recebe uma célula hoje é tentativa e erro. A liderança quer, para
uma célula, ver as casas disponíveis ordenadas pelo esforço de deslocamento dos
membros, com a explicação de cada posição. A decisão final é sempre do líder.

## Escopo
### Incluído
- **Confirmação de anfitrião** na ficha da pessoa: o líder registra que a pessoa
  confirmou que pode receber, com capacidade (quantas pessoas cabem), dias possíveis
  e observação curta, e o sistema guarda quem registrou e quando. A remoção é
  definitiva.
- **Ranking por célula:** o líder escolhe uma célula do seu escopo e vê as casas
  confirmadas do seu escopo ordenadas pela distância média em linha reta até os
  membros, com a maior distância individual como segundo critério.
- Explicação de cada posição: distância média, maior distância, quantos membros
  entraram no cálculo, se a casa comporta o grupo, dias e a precisão da posição.
- Avisos para membros sem posição (fora do cálculo), casas localizadas só pelo
  bairro (menos precisas) e capacidade menor que o grupo.

### Fora de escopo
- Tempo real de trajeto e preferências de transporte (exigem serviço de rotas).
- Grupos montados à mão e planejamento de novas células (ADR-0007).
- Criação ou alteração automática de célula: a recomendação só informa.
- Confirmação pelo próprio anfitrião no formulário público.

## Usuários e permissões
- Todo o escopo, como a ficha e o mapa. Cada líder vê só as células e as casas do
  seu escopo; a autorização vai no SQL.
- A resposta traz só distâncias arredondadas (0,1 km). Coordenadas e endereços
  ficam no servidor; o endereço da casa continua visível apenas na ficha.

## Requisitos funcionais
1. A ficha ganha a seção **Anfitrião**. Ela aparece para quem marcou interesse no
   formulário e também pode ser aberta pelo líder para qualquer pessoa.
2. Para salvar a confirmação são obrigatórios: o checkbox "A pessoa confirmou que
   pode receber a célula em casa e pode desistir a qualquer momento", a capacidade
   (2 a 50) e ao menos um dia. A observação vai até 200 caracteres.
3. O ranking considera só anfitriões confirmados, com endereço geocodificado pela
   rua ou pelo bairro, dentro do escopo do líder. Pela cidade não entra.
4. Para cada casa: distância média e maior distância (Haversine) até os membros da
   célula que têm posição. A ordem é por média, depois pela maior distância, depois
   pelo nome.
5. Casas com capacidade menor que o número de membros continuam na lista, marcadas,
   e vão para o fim.
6. A tela mostra o número de membros sem posição e o aviso fixo "Distância em linha
   reta, não é tempo de trajeto".
7. Se o próprio anfitrião é membro da célula, ele entra com distância 0 no cálculo.

## Cenários de aceite
1. **Dado** 3 casas confirmadas com médias 1,2 / 0,8 / 2,0 km, **quando** o líder
   abrir o ranking, **então** a ordem é 0,8 → 1,2 → 2,0, cada uma com a explicação.
2. **Dado** duas casas com a mesma média, **então** fica à frente a de menor
   distância máxima.
3. **Dado** uma casa com capacidade 6 e a célula com 10 membros, **então** ela
   aparece marcada "não comporta o grupo" e no fim.
4. **Dado** um interessado sem confirmação, ou confirmado sem endereço
   geocodificado, **então** ele não entra no ranking e a tela informa quantos ficaram
   de fora e por quê.
5. **Dado** um líder CELULA, **quando** pedir o ranking de outra célula, mesmo pela
   API, **então** recebe "não encontrado".
6. **Dado** a resposta do ranking, **então** ela não tem coordenada, rua, número,
   complemento nem CEP.
7. **Dado** a remoção da confirmação, **então** a pessoa sai do ranking e o registro
   é apagado.
8. **Dado** 390 px ou teclado, **então** a seção na ficha e o ranking são utilizáveis
   e a explicação de cada casa é lida por leitor de tela.

## Requisitos não funcionais
- Nenhuma dependência nova; o cálculo fica no servidor, em Go.
- Testes só com dados fictícios. Migration nova e aditiva.

## Decisões do responsável (2026-11-21)
1. **Distância:** linha reta (Haversine), sem serviço de rotas.
2. **Elegíveis:** quem marcou interesse e teve a confirmação registrada pelo líder.
3. **Uso:** ranking para uma célula existente.
4. **Acesso:** todo o escopo, como a ficha e o mapa.
5. **Texto da confirmação:** "A pessoa confirmou que pode receber a célula em casa e
   pode desistir a qualquer momento."
6. **Dias:** seleção de segunda a domingo, sem horário. O horário vai na observação.
7. **Lista:** todas as casas elegíveis, com as 3 primeiras em destaque.
