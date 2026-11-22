# Validação de release — Spec 005, planejar a multiplicação de uma célula

- Data: 2026-11-22
- Produção: v1.34.0, verificada pelo CI (`/version` e `/healthz`).
  `multiplicacao.js` e `multiplicacao-regras.js` respondem 200.
- Entregas: T002 #90, T003 #91, T004 #92. Sem migration.

## Ponta a ponta em `vec-dev`
Servidor local contra o `vec-dev` com token de 1 dia **sem permissão de escrita**
em `respostas`, `enderecos` e `anfitrioes` (só leitura geral e as tabelas de login
do usuário temporário): se a simulação tentasse gravar, falharia. Duas células
**fictícias** (pessoas "E2E Pessoa", coordenadas no meio do Atlântico, duas regiões a
~5 km), um membro sem endereço e duas casas confirmadas, tudo removido ao fim e
conferido. Telas em 390×844 e 1440×900 com movimento reduzido.

## Cenários de aceite

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Duas regiões → dois grupos, cada um com uma região | Ponta a ponta nas duas larguras; testes de `Dividir` | ✅ |
| 2 | A mesma célula duas vezes → mesma proposta | Ponta a ponta (segundo pedido igual); teste com 20 ordens de entrada | ✅ |
| 3 | Sem posição → grupo menor, marcado | Ponta a ponta: no grupo 1 (empate) com "Sem posição — confira o grupo" | ✅ |
| 4 | Mover uma pessoa → tamanhos, distâncias e anfitriões recalculados | Ponta a ponta pelo teclado: grupo passa a 4, casas recalculadas, anúncio e foco | ✅ |
| 5 | Casa de capacidade menor que o grupo → marcada e no fim | Ponta a ponta: capacidade 3 com grupo de 4 passa a "não comporta" e vai para o fim | ✅ |
| 6 | CELULA pede outra célula ou envia pessoa de fora → recusado | Ponta a ponta com o usuário rebaixado a CELULA: `nao_encontrado` para outra célula (com e sem ajuste), `dados_invalidos` para pessoa de fora; casas de fora não entram | ✅ |
| 7 | Resposta sem coordenada, endereço ou nome; nada gravado | Ponta a ponta: resposta limpa; contagens de cadastros, células, anfitriões e endereços iguais antes e depois, com token sem escrita | ✅ |
| 8 | 390 px e teclado, mudança anunciada | Painel aberto pelo teclado, mover pelo teclado, `role="status"` com o anúncio, foco na pessoa movida e no Grupo 1 ao voltar, sem rolagem horizontal | ✅ |

## Riscos residuais
- O corte pela reta ignora vínculos (famílias, discipulado): o líder ajusta à mão.
- A produção ainda não tem endereços nem anfitriões confirmados; até lá, o painel
  explica que não há proposta automática.

## Rollback
Reverter os PRs #92, #91 e #90 (nessa ordem). Não há migration nem dados a desfazer.
