# Validação de release — Spec 007, proteção contra robôs

- Data: 2026-11-22
- Produção: v1.36.0, verificada pelo CI (`/version` e `/healthz`).
- Entregas: T002 e T003 juntas em #107 (servidor e página precisavam entrar juntos
  para o formulário no ar não ser recusado). Sem migration.

## Verificação em produção
Sem gravar nada: página servida com a armadilha, `app.js` pedindo a marca,
`formulario_marca` respondendo, e quatro recusas (`envio_expirado` sem marca e com
marca alterada, `envio_recusado` com armadilha, `envio_rapido` logo após a marca),
sem nenhum cadastro gravado.

Com autorização do responsável: um envio real pela página de produção (390 px), com
nome fictício "Teste Robo Ficticio", esperando o tempo mínimo — concluído e gravado
(uma linha, sem nada ligado a ela). A linha foi **apagada** em seguida, só ela
(`id` e nome conferidos), e a contagem voltou a zero.

## Cenários de aceite

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Envio normal pela página é gravado | Envio real em produção, gravado e depois removido; testes de API e de tela | ✅ |
| 2 | Armadilha preenchida → nada gravado, mensagem | Produção (`envio_recusado`, nada gravado); testes de API (sem consulta ao banco) e de tela | ✅ |
| 3 | Envio em 1 s → recusado por rapidez | Produção (`envio_rapido`); testes de marca e de tela | ✅ |
| 4 | Marca alterada ou velha → expirado | Produção (marca alterada e sem marca); testes de marca (velha, futura, outra chave) | ✅ |
| 5 | 61 envios do mesmo IP em 10 min → 429; outro IP passa | Teste pelo handler HTTP com `Fly-Client-IP`; testes do limite (reenvio não conta, nova janela). Não forçado em produção para não gravar 60 cadastros | ✅ (automatizado) |
| 6 | Armadilha invisível para leitor de tela e teclado | Tela em 390 e 1440 px: fora da tela, `tabindex=-1`, `aria-hidden`, fora da árvore de acessibilidade e Tab nunca chega nela | ✅ |

## Riscos residuais
- O limite é por processo: com mais de uma instância, cresce com o número delas
  (registrado no roteiro, como o do login).
- Robôs que executam JavaScript e esperam 3 s passam pela marca; o limite por IP e
  a armadilha continuam valendo. Se aparecer spam assim, reavaliar um desafio.

## Rollback
Reverter #107. Sem migration nem dados a desfazer.
