# Spec 010 — Cadastrar nova pessoa pelo painel

- Status: **Entregue** (v1.52.0, 2026-11-23) · [validação](release-validation.md)
- Data: 2026-11-23
- ADRs: [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md) (privacidade e autorização), [0009](../../docs/architecture/adr/0009-identidade-visual.md) e [0010](../../docs/architecture/adr/0010-navegacao-centrada-no-mapa.md) (padrão de telas). Sem ADR nova.

## Contexto
Hoje uma pessoa só entra na aplicação pelo formulário público, preenchido por ela mesma.
Quando o líder está com a pessoa, precisa abrir o formulário no próprio celular e
preencher as 5 etapas como se fosse ela, inclusive a autorização.

Quem chega à aplicação **já passou pela fase de convidado**: aceitou Jesus como Senhor e
Salvador e agora é membro de uma célula. O cadastro marca o começo da **trilha do membro**
(a jornada de seis etapas, o discipulador e o acompanhamento), que a plataforma já tem.
Não há cadastro de visitante.

## Objetivo
O líder cadastra a pessoa direto no painel, em poucos campos, e cai na ficha dela pronto
para seguir a trilha.

## Escopo
1. **+ Nova pessoa** em Pessoas e um atalho na Área, abrindo um diálogo no padrão da Spec 009.
2. Campos:
   - **obrigatórios:** nome completo, data de nascimento e célula;
   - **opcionais:** WhatsApp e discipulador (um cadastro da área);
   - "Recebeu Jesus" já vem como **Sim**.
3. **Autorização verbal:** a caixa "A pessoa autorizou o uso dos dados para ser acompanhada"
   é obrigatória. O cadastro guarda quando e por quem foi feito.
4. **Cadastro duplicado é bloqueado:** se já existe alguém com o mesmo nome e a mesma data
   de nascimento, ou com o mesmo WhatsApp, o painel avisa e não deixa cadastrar de novo.
5. Depois de salvar, a **ficha abre na trilha**: o Resumo com a jornada e o próximo passo,
   o discipulador e o botão de registrar contato. Não há tela nova.

### Fora de escopo
- Link ou QR de convite, modo recepção e importação de planilha.
- Status de visitante, contato de boas-vindas automático e "Chegaram esta semana".
- Mudanças no formulário público.

## Requisitos funcionais
1. Só líderes cadastram, dentro do próprio escopo:
   - **Área:** qualquer célula ativa;
   - **Setor:** as células ativas dos seus setores;
   - **Célula:** as suas células (com uma só, ela já vem escolhida).
   O discipulador não cadastra. O servidor confere tudo; esconder o botão não basta.
2. A célula precisa estar **ativa**. O setor vem da célula, como no formulário público.
3. Nome, nascimento e WhatsApp seguem as **mesmas regras do formulário público** (mesma
   validação no servidor).
4. Sem a caixa de autorização marcada, o servidor recusa. Com ela, grava `consentimento_em`
   (o momento do cadastro), a origem "painel" e o usuário que cadastrou.
5. **Duplicado**, conferido no servidor com toda a área (não só o escopo) e sem contar
   cadastros excluídos:
   - mesmo nome (sem acento, maiúsculas nem espaços extras) e mesma data de nascimento; ou
   - mesmo WhatsApp (só os dígitos), quando informado.
   Se o cadastro existente **está no escopo** de quem pede, o aviso mostra o nome e a célula
   e oferece **Abrir cadastro**. Se **está fora do escopo**, o aviso diz só que a pessoa já
   tem cadastro em outra célula e para falar com a liderança da área, sem mostrar nome,
   célula ou qualquer dado dela.
6. Clique duplo ou reenvio após falha de rede não criam dois cadastros (id do envio).
7. A nova pessoa aparece na lista, no mapa (quando tiver endereço) e nos indicadores como
   qualquer outra; o retrato mensal não muda de regra.

## Cenários de aceite
1. **Dado** um líder de CÉLULA, **quando** abrir Nova pessoa, **então** a célula dele já
   vem escolhida e não há como escolher outra.
2. **Dado** nome, nascimento, célula e a autorização marcada, **quando** salvar, **então**
   a ficha abre no Resumo com "Recebeu Jesus: Sim", a jornada e o próximo passo
   (Café com Pastor), e a pessoa aparece em Pessoas.
3. **Dado** a autorização desmarcada, **então** não salva e o campo é apontado.
4. **Dado** alguém com o mesmo nome e nascimento **no escopo**, **então** o painel avisa,
   mostra **Abrir cadastro** e não cria outro.
5. **Dado** o mesmo WhatsApp de alguém **fora do escopo**, **então** o aviso não revela
   nome nem célula e não cria outro.
6. **Dado** um pedido forjado para uma célula fora do escopo ou inativa, **então** o
   servidor recusa.
7. **Dado** um discipulador, **então** não vê o botão e o servidor recusa o pedido.
8. **Dado** 390 e 1440 px, **então** o diálogo funciona pelo teclado, sem rolagem lateral
   e sem violação de CSP.

## Requisitos não funcionais
- Migration nova e aditiva; dados fictícios nos testes.
- Mesmo CSP, sem dependência nova; textos no padrão da Spec 009.
- A resposta de duplicado fora do escopo não vaza dado pessoal (teste explícito).

## Decisões do responsável (2026-11-23)
1. Entrada: só **Nova pessoa no painel** (sem convite, recepção ou planilha por enquanto).
2. Autorização: **verbal**, registrada pelo líder.
3. **Cadastro único**, sem status de visitante: quem entra já é membro e começa a trilha.
4. Obrigatórios: **nome, célula e nascimento**.
5. Quem cadastra: **líderes no escopo**; o discipulador não.
6. Duplicado: **avisa e bloqueia**.

7. Duplicado **fora do escopo**: bloqueia sem mostrar quem é ("Esta pessoa já tem cadastro
   em outra célula. Fale com a liderança da área."), para não expor dados de outra célula.
