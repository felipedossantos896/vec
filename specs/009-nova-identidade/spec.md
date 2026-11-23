# Spec 009 — Nova identidade e telas centradas no mapa

- Status: **Entregue** (2026-11-23) · aprovada em 2026-11-22 · [validação](release-validation.md)
- Data: 2026-11-22
- ADRs: [0009](../../docs/architecture/adr/0009-identidade-visual.md), [0010](../../docs/architecture/adr/0010-navegacao-centrada-no-mapa.md) e [0011](../../docs/architecture/adr/0011-rostos-no-mapa.md) (Aceitos); [0005](../../docs/architecture/adr/0005-mapa-membros.md), [0006](../../docs/architecture/adr/0006-recomendacao-anfitrioes.md), [0007](../../docs/architecture/adr/0007-planejamento-novas-celulas.md) e [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md) (Aceitos)
- Previews (dados fictícios): [`previews/`](previews/)

## Problema e objetivo
As funções certas existem (cuidado, mapa, anfitriões, multiplicação, indicadores), mas
estão espalhadas em cinco abas com a mesma cara, e o líder precisa juntar as peças. O
objetivo é uma identidade própria e uma organização em que o líder **veja as pessoas
onde elas estão e aja ali mesmo**: o mapa com rostos vira a tela inicial, e cada ação
diária (falar com alguém, registrar o contato, achar a casa, dividir a célula) fica a
um ou dois toques.

## Escopo
### Incluído
1. **Base visual** (ADR-0009): fontes Bricolage Grotesque e Instrument Sans servidas
   pelo app, escala de tipos, cores, cor por célula e componentes base.
2. **Área** (ADR-0010, 0011) — [01](previews/01-area.jpg): mapa com rostos e nomes por
   célula, lentes, card da pessoa com ações, "Fale com eles esta semana", Discipulado e
   Prontos para servir. Substitui Acompanhar e Mapa.
3. **Ferramentas no mapa** — [02](previews/02-area-anfitriao.jpg), [03](previews/03-area-multiplicacao.jpg):
   Escolher anfitrião (casas numeradas, linhas até os membros, ranking explicado) e
   Planejar multiplicação (grupos A/B no mapa, mover pessoas), com as regras das Specs
   004 e 005.
4. **Pessoas e ficha** — [04](previews/04-pessoas.jpg), [05](previews/05-ficha.jpg), [06](previews/06-dialogos.jpg):
   tabela com filtros e ficha em gaveta (Resumo, Acompanhamento em linha do tempo, Ficha
   completa com foto, endereço e anfitrião), editar e excluir.
5. **Registrar contato estruturado** — [05](previews/05-ficha.jpg), [06](previews/06-dialogos.jpg):
   tipo (ligação, WhatsApp, visita, encontro), quando, anotação opcional e lembrete de
   falar de novo; aviso rápido com "Desfazer".
6. **Indicadores** — [07](previews/07-indicadores.jpg): números com tendência mensal,
   jornada por célula (mapa de calor), cadastros por mês, faixa etária, treinamentos e
   "Onde agir".
7. **Ajustes** — [08](previews/08-ajustes-celulas.jpg), [09](previews/09-ajustes-usuarios.jpg):
   células e setores (cor, dia e hora do encontro, casa anfitriã), usuários (perfil e
   escopo explicados, último acesso).
8. **Formulário público e login** — [12](previews/12-formulario.jpg), [13](previews/13-formulario-fim.jpg), [14](previews/14-login.jpg).
9. **Visão do discipulador** — [11](previews/11-discipulador.jpg).
10. **Estados de tela** — [15](previews/15-estados.jpg).

### Fora de escopo (próximas specs)
- Compartilhar plano de multiplicação e "Avisar a célula" sobre o anfitrião.
- Configurações do formulário público e painel de backup dentro do app
  ([10](previews/10-ajustes-formulario-backup.jpg) fica como referência).
- Rotas reais (tempo de trajeto) e coleta de foto pelo formulário público.

## Requisitos funcionais
1. Nenhuma função atual se perde: tudo que se faz hoje continua possível, em até dois
   toques a partir do menu novo (Área, Pessoas, Indicadores, Ajustes).
2. O mapa mostra só o escopo de quem pede, com posição no centro da área de ~300 m;
   pessoas da mesma área aparecem empilhadas com o número (ADR-0011).
3. Cada pessoa aparece com a foto da ficha ou, sem foto, um avatar ilustrado gerado de
   forma determinística, sem dado pessoal.
4. A cor da célula vem de Ajustes e é a mesma no mapa, nos selos, nos gráficos e no
   formulário público.
5. "Registrar contato" grava tipo, data, autor, anotação opcional e lembrete; a pessoa
   sai de "Precisam de cuidado" e volta quando o lembrete vencer.
6. Tendências ("+3 no mês") vêm de um retrato mensal **agregado** (contagens, sem dados
   de pessoas).
7. Textos seguem a escala: rótulos, nomes, botões e contagens não quebram linha
   (reticências quando não cabe); descrições até ~40 caracteres por linha.
8. Formulário público mostra só célula, setor e dia do encontro — nunca casa ou bairro.
9. O discipulador vê só os próprios discípulos, com a mesma ação de contato.

## Cenários de aceite
1. **Dado** um líder CELULA, **quando** abrir a Área, **então** vê só a sua célula, com
   rostos, lentes e a lista "Fale com eles".
2. **Dado** duas pessoas na mesma área de ~300 m, **então** aparecem empilhadas com "2".
3. **Dado** uma pessoa sem foto, **então** aparece o avatar ilustrado, sempre igual.
4. **Dado** o líder registrar um contato por ligação com lembrete de 30 dias, **então**
   a pessoa sai de "Precisam de cuidado", aparece no histórico e volta após 30 dias.
5. **Dado** Escolher anfitrião numa célula, **então** o mapa foca nela, numera as casas
   e explica a ordem como na Spec 004.
6. **Dado** Planejar multiplicação, **então** os grupos aparecem no mapa e mover alguém
   recalcula, sem gravar nada (Spec 005).
7. **Dado** a cor de uma célula trocada em Ajustes, **então** muda no mapa, nos selos e
   no formulário público.
8. **Dado** qualquer tela em 390 px, 1440 px e 4K, **então** sem rolagem horizontal,
   foco visível, movimento reduzido respeitado e nenhuma violação de CSP.
9. **Dado** a resposta da API do mapa, **então** não há coordenada nem endereço.

## Requisitos não funcionais
- Sem framework nem biblioteca de componentes; TypeScript estrito e Tailwind como hoje.
- Fontes e avatares servidos pelo app; CSP estrito mantido (Spec 008).
- Contraste AA; texto em coral só no tom `#c43a1f`.
- Migrations novas e aditivas; dados fictícios em testes.

## Decisões do responsável (2026-11-22)
1. **Fundo do mapa:** Leaflet com os tiles do OpenStreetMap e filtro de cor para combinar
   com a identidade; sem dependência nova. O cartograma dos previews é ilustrativo.
2. **Avatares:** gerados no navegador a partir de um identificador interno, no estilo dos
   previews, sem dado pessoal.
3. **Lembrete de contato:** 30 dias por padrão, ajustável por contato.
4. **Retrato mensal:** só contagens agregadas por escopo, gravadas no primeiro acesso de
   cada mês (ou por comando).
5. **Ordem das entregas:** base visual primeiro, depois a Área, depois o resto.
6. **Previews no repositório:** JPEGs comprimidos em `previews/`, só com dados fictícios.
7. **ADRs:** 0009, 0010 e 0011 aceitos; 0002 substituído pelo 0009; 0001 e 0003 aceitos.
