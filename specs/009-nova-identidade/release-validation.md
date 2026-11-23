# Validação de release — Spec 009, nova identidade e telas centradas no mapa

- Data: 2026-11-23
- Produção: v1.50.0, verificada pelo CI (`/version` e `/healthz`) e por `curl`.
- Migrations em produção: 0013 (cor e encontro da célula), 0014 (contato com tipo e
  lembrete) e 0015 (retrato mensal agregado), conferidas em `schema_migrations` do
  `vec-prod` (só o esquema, sem ler dados de pessoas).
- Entregas:
  - T002 #133 (v1.40.0) — base visual;
  - T003 #134 (v1.41.0) — cor e encontro da célula;
  - T004 #135 (v1.42.0) — Área;
  - T005 #136 (v1.43.0) — ferramentas no mapa;
  - T006 #137 (v1.44.0) — contato com tipo e lembrete;
  - T007 #138 (v1.45.0) — Pessoas e ficha;
  - T008 #139 (v1.46.0) — Indicadores;
  - T009 #140 (v1.47.0) — Ajustes;
  - T010 #141 (v1.48.0) — formulário público e login;
  - T011 #142 (v1.49.0) — visão do discipulador;
  - T012 #143 (v1.50.0) — estados de tela e barra inferior.

## Cenários de aceite

Validação no `vec-dev` com servidor real e CSP. Os dados eram fictícios:
- a célula "E2E …", também cadastrada em Ajustes;
- 6 pessoas com endereço no meio do Atlântico, das quais 2 anfitriãs;
- dois usuários temporários, um líder de CÉLULA e um líder de ÁREA.

Tudo foi removido ao fim. Resultado: 39 verificações aprovadas.

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Líder de célula vê só a sua célula, com rostos, lentes e "Fale com eles" | Login do líder de CÉLULA: todos os cadastros da lista são da célula dele; mapa com os 6 rostos, 4 lentes e "Fale com eles esta semana" | ✅ |
| 2 | Duas pessoas na mesma área de ~300 m aparecem empilhadas | Marcador com 2 rostos e o rótulo "2 pessoas" | ✅ |
| 3 | Pessoa sem foto tem avatar ilustrado, sempre igual | Mesmo SVG em duas gerações e no mapa; sem nome nem `style` | ✅ |
| 4 | Contato por ligação com lembrete de 30 dias | Diálogo "Contato feito" (30 dias por padrão); a pessoa sai de "Precisam de cuidado" e da lente de cuidado; com 29 dias continua fora, com 31 dias volta; aparece no histórico com "Falar de novo em" | ✅ |
| 5 | Escolher anfitrião foca a célula, numera e explica | Casas numeradas no mapa (a primeira com "1") e explicação da ordem no painel | ✅ |
| 6 | Planejar multiplicação mostra os grupos e recalcula sem gravar | Dois grupos no painel e marcadores A/B no mapa; mover alguém recalcula; células, anfitriões e endereços no banco iguais antes e depois (o servidor não tinha permissão de escrita nessas tabelas) | ✅ |
| 7 | Cor trocada em Ajustes muda no mapa, nos selos e no formulário | Líder de ÁREA troca a cor da célula fictícia; a nova cor aparece no selo da lista de Pessoas, no pino do mapa e na barra da opção do formulário público | ✅ |
| 8 | 390 px, 1440 px e 4K sem rolagem lateral, com foco visível, movimento reduzido e sem violação de CSP | Formulário, login, Área, Pessoas, ficha, Indicadores e Ajustes nas três larguras (21 verificações). Smoke de dev (`npm run test:e2e:dev`) aprovado 5 vezes seguidas | ✅ |
| 9 | A resposta da API do mapa não tem coordenada nem endereço | Só centros da grade de ~300 m e números de cadastro; nenhuma das 6 coordenadas exatas, rua, bairro, CEP ou nome | ✅ |

### Produção (só leitura)
- `curl -I` em `/` e `/admin/`: CSP estrito igual ao da Spec 008.
- Navegador em 390 e 1440 px, sem enviar nada e sem entrar no painel:
  - formulário novo (lado das etapas no computador, barra no celular), até a última etapa;
  - células com a cor, sem casa nem bairro, com a opção "Ainda não tenho célula";
  - nenhum envio feito;
  - login novo com os rostos;
  - sem rolagem lateral e zero violação de CSP.

## Observações
- O painel por dentro não foi percorrido em produção (exigiria criar um usuário lá). Foi
  validado com o mesmo código no `vec-dev`, tarefa a tarefa e nesta rodada final.
- **4K:** o conteúdo do painel tem largura máxima de 1320 px. Não há rolagem lateral, mas
  sobra bastante margem. Ampliar o layout para telas muito grandes fica como melhoria.
- **Tendências:** o retrato mensal começou em novembro de 2026. Neste mês a tendência
  compara com o próprio começo do mês; a minilinha ganha pontos a partir de dezembro.
- **Smoke de dev:**
  - os seletores dos Indicadores foram atualizados para os da Spec 009 (os cinco números continuam);
  - o login do smoke espera o painel terminar de iniciar antes de digitar. Antes, de vez em quando ele clicava em Entrar e o painel lia os campos vazios ("Informe usuário e senha.").
- **Fora do escopo e não entregue** (ver `spec.md`):
  - configurações do formulário público e backup dentro do app (preview 10);
  - "Ainda não sei", interesses em caixas de marcar e endereço no formulário público, por mudarem o que é gravado.

## Rollback
Cada entrega reverte pela própria PR. As migrations 0013–0015 são aditivas: o código anterior
ignora as colunas e a tabela novas. Para voltar à identidade anterior, basta reverter
#133–#143 em ordem inversa. Os dados de contato (tipo e lembrete) e o retrato mensal ficam
guardados.
