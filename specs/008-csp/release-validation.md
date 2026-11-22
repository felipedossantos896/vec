# Validação de release — Spec 008, CSP

- Data: 2026-11-22
- Produção: v1.39.0, verificada pelo CI (`/version` e `/healthz`).
- Entregas: T002 #115 (fontes locais), T003 #116 (sem estilos inline), T004 #117
  (cabeçalho). Sem migration.

## Cenários de aceite

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Painel e formulário em produção com o CSP | `curl -I` em `/`, `/admin/` e `/app.js`: política estrita, sem `unsafe-*`; teste Go das diretivas e da política própria da foto | ✅ |
| 2 | Nenhuma violação em nenhuma aba | Servidor real com CSP contra o `vec-dev` (célula fictícia, removida), 390 e 1440 px: formulário, login, Acompanhar, Pessoas, ficha (anotações, ficha completa, endereço com ViaCEP, anfitrião, editar), Indicadores, Mapa (tiles, ranking, multiplicação), Células e setores, Usuários. Produção: formulário (5 etapas, sem enviar) e login. Nenhuma violação; smoke de dev aprovado com o vigia novo | ✅ |
| 3 | Script injetado não executa | `<img onerror>` e `<script>` injetados no painel: bloqueados (`script-src-attr`, `script-src-elem`) | ✅ |
| 4 | Nenhum pedido ao Google | Produção e `vec-dev`: nenhum pedido externo além de tiles do OSM e ViaCEP (estes só no painel); teste Go confere que as páginas não citam `googleapis`/`gstatic` | ✅ |
| 5 | Telas iguais em 390 e 1440 px | Fontes Fraunces e Source Sans 3 carregadas localmente (prints comparados); 95 medidas dinâmicas (barras, tons, colunas) aplicadas com o mesmo valor | ✅ |

## Observações
- O painel por dentro não foi percorrido em produção (exigiria criar um usuário lá);
  foi validado com o mesmo código no `vec-dev` e o smoke de dev passa a reprovar
  qualquer violação.
- Privacidade: o IP de quem abre o formulário ou o painel deixou de ir para o Google.

## Rollback
Reverter #117 (o cabeçalho). Fontes locais e estilos sem inline podem ficar.
