# Validação de release — Spec 004, recomendação de anfitriões

- Data: 2026-11-22
- Produção: v1.31.0, verificada pelo CI (`/version` e `/healthz`). `anfitriao.js`,
  `anfitriao-regras.js` e `anfitriao.css` respondem 200.
- Entregas: T002 #78, T003 #79, T004 #80, T005 #81. Migration `0012_anfitrioes.sql`
  em produção (deploy) e em `vec-dev` (aplicada com confirmação do responsável).

## Ponta a ponta em `vec-dev`
Servidor local contra o `vec-dev`, token de 1 dia com permissões mínimas, usuário
AREA temporário e uma célula **fictícia** (pessoas "E2E Pessoa", coordenadas no meio
do Atlântico, sem endereço real), tudo removido ao fim e conferido. Telas em
390×844 e 1440×900 com movimento reduzido. Confirmações feitas pela ficha; ranking
pelo painel do Mapa; remoções pela ficha.

## Cenários de aceite

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Casas ordenadas pela média, com explicação | Ponta a ponta: médias 0,7 → 1,0 km calculadas pelo servidor, explicação de cada casa na tela; testes do pacote `anfitriao` e da API | ✅ |
| 2 | Mesma média → menor distância máxima à frente | Testes do pacote `anfitriao` (desempate pela máxima e pelo nome) | ✅ (automatizado) |
| 3 | Capacidade menor que a célula → marcada e no fim | Ponta a ponta: capacidade 2 para 4 membros, "Não comporta o grupo" e no fim, mesmo com média menor | ✅ |
| 4 | Sem confirmação ou sem posição → fora, com aviso | Ponta a ponta: membro sem endereço fora do cálculo e interessados sem confirmação contados; confirmados sem posição em testes de API e regras | ✅ |
| 5 | CELULA pede outra célula, mesmo pela API → não encontrado | Ponta a ponta com o usuário rebaixado a CELULA de outra célula: ranking, leitura e gravação fora do escopo dão `nao_encontrado`; casas de fora não entram | ✅ |
| 6 | Resposta sem coordenada, rua, número, complemento ou CEP | Ponta a ponta: resposta real sem `lat`/`lng`, endereço nem nome; testes de API | ✅ |
| 7 | Remover a confirmação → sai do ranking e o registro é apagado | Ponta a ponta: remoção pela ficha apaga a linha; excluir o cadastro também; ranking atualizado | ✅ |
| 8 | 390 px e teclado; explicação lida por leitor de tela | Telas em 390 e 1440 sem rolagem horizontal; painel aberto pelo teclado; explicação ligada ao nome por `aria-describedby`; foco e erros no formulário | ✅ |

## Riscos residuais
- Linha reta subestima trajetos com barreiras; aviso fixo e decisão da liderança.
- Poucos dados no começo: a produção ainda não tem endereços nem confirmações. A
  tela explica quem ficou de fora.

## Rollback
Reverter os PRs #81, #80, #79 e #78 (nessa ordem). A tabela `anfitrioes` pode ficar;
a migration é aditiva e não é editada.
