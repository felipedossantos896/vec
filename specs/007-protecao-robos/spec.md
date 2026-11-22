# Spec 007 — Proteção do formulário público contra robôs

- Status: **Aprovada** (2026-11-22)
- Data: 2026-11-22
- ADRs: [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md) (Aceito)
- Roteiro: Fase 4 de [`ROADMAP-REFATORACAO.md`](../../docs/ROADMAP-REFATORACAO.md)

## Problema e objetivo
O formulário público aceita qualquer envio bem formado: não tem limite por origem,
nem armadilha, nem tempo mínimo. Um robô pode encher o banco de cadastros falsos,
poluir indicadores e consumir a cota do Turso. O volume real é baixo, então a meta é
**preventiva**: barrar spam automático comum **sem serviço externo**, sem cookie e
sem mudar nada para quem preenche de verdade.

## Escopo
### Incluído
- **Campo-armadilha:** um campo invisível para pessoas (fora da tela, sem foco pelo
  teclado, oculto para leitor de tela) que robôs costumam preencher.
- **Tempo mínimo:** ao abrir, a página pede ao servidor uma marca assinada (HMAC com
  a chave do servidor) com o horário; o envio precisa trazer a marca, com assinatura
  válida, pelo menos 3 s depois e no máximo 24 h depois.
- **Limite por IP:** no máximo 60 envios a cada 10 minutos por IP (`Fly-Client-IP`),
  na memória do processo, como o limite do login.
- Recusa sempre **visível**: quem foi barrado vê uma mensagem e não perde o que
  preencheu. Nada é descartado em silêncio.
- Log com o motivo e sem dados do envio nem IP completo.

### Fora de escopo
- Captcha ou serviço externo (Turnstile, reCAPTCHA).
- Limite compartilhado entre várias instâncias (hoje há uma; o roteiro já registra).
- Proteção do painel (já tem login, bloqueio e limite).

## Requisitos funcionais
1. Armadilha preenchida → `envio_recusado`, com a mensagem "Não foi possível enviar.
   Recarregue a página e tente de novo." Nada é gravado.
2. Marca ausente, inválida ou com mais de 24 h → `envio_expirado`, com "A página
   ficou aberta por muito tempo. Recarregue e envie de novo." (os dados preenchidos
   continuam na tela).
3. Envio com menos de 3 s desde a marca → `envio_rapido`, com "Envio rápido demais.
   Confira os dados e envie de novo."
4. Mais de 60 envios em 10 minutos do mesmo IP → `muitos_envios`, com "Muitos envios
   desta rede agora. Aguarde alguns minutos e tente de novo." (HTTP 429).
5. A reenvio do mesmo cadastro (mesmo `_requestId`) continua idempotente e não conta
   duas vezes contra o limite.
6. A marca não identifica a pessoa: só horário e assinatura.

## Cenários de aceite
1. **Dado** um envio normal pela página, **então** é gravado como hoje.
2. **Dado** a armadilha preenchida, **então** nada é gravado e a mensagem aparece.
3. **Dado** um envio em 1 s, **então** é recusado com a mensagem de rapidez.
4. **Dado** uma marca alterada ou de ontem, **então** é recusado como expirado.
5. **Dado** 61 envios do mesmo IP em 10 minutos, **então** o 61º recebe 429; outro
   IP continua enviando.
6. **Dado** leitor de tela e teclado, **então** a armadilha não aparece nem recebe
   foco.

## Requisitos não funcionais
- Nenhuma dependência nova; nenhuma migration; nenhum cookie.
- Testes com relógio controlado e dados fictícios.

## Decisões do responsável (2026-11-22)
1. **Abordagem:** proteção própria, sem serviço externo.
2. **Limite por IP:** 60 envios em 10 minutos.
3. **Tempo mínimo:** 3 s entre abrir a página e enviar.
4. **Validade da marca:** 24 h.
