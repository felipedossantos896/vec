# Spec 008 — Política de segurança de conteúdo (CSP)

- Status: **Aprovada** (2026-11-22)
- Data: 2026-11-22
- ADRs: [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md) (Aceito)
- Roteiro: Fase 4 de [`ROADMAP-REFATORACAO.md`](../../docs/ROADMAP-REFATORACAO.md)

## Problema e objetivo
As páginas (formulário público e painel) não têm CSP: se um dia um texto vindo do
banco escapar da sanitização, o navegador executaria o script injetado. O painel
mostra dados pessoais, então o impacto seria alto. O objetivo é um CSP **estrito**
que só permite o que o app realmente usa, e tirar o Google Fonts para que o IP de
quem abre o formulário não vá para o Google.

## Escopo
### Incluído
- Fontes Fraunces e Source Sans 3 servidas pelo próprio app (licença OFL), sem
  Google Fonts.
- Fim dos estilos inline (atributos `style=` no HTML e nos trechos gerados em TS);
  valores dinâmicos, como a largura das barras, passam a ser aplicados por
  JavaScript depois de desenhar.
- Cabeçalho `Content-Security-Policy` em todas as páginas, bloqueando, com:
  `default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self';
  img-src 'self' data: blob: https://tile.openstreetmap.org; connect-src 'self'
  https://viacep.com.br; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
  object-src 'none'`.
- Teste de telas que percorre formulário, login e todas as abas do painel (mapa,
  ficha, fotos, CEP, anfitrião, multiplicação, indicadores, usuários) e **falha a
  qualquer violação** de CSP.

### Fora de escopo
- Endpoint de relatórios de violação e modo só-relatar.
- Nonces ou hashes (não há script inline).

## Requisitos
1. Nenhuma violação de CSP nos fluxos do painel e do formulário.
2. Nenhum pedido a `fonts.googleapis.com` ou `fonts.gstatic.com`.
3. Aparência igual: as fontes e as barras continuam como hoje.
4. O mapa continua com os tiles do OpenStreetMap; a busca de CEP continua no ViaCEP.

## Cenários de aceite
1. **Dado** o painel e o formulário em produção, **então** respondem com o CSP acima.
2. **Dado** o teste de telas, **então** nenhuma violação é registrada em nenhuma aba.
3. **Dado** um script injetado num texto (teste), **então** o navegador não o executa.
4. **Dado** a página aberta, **então** nenhum pedido vai para o Google.
5. **Dado** 390 e 1440 px, **então** as telas ficam iguais às de antes (fontes e barras).

## Decisões do responsável (2026-11-22)
1. **Estilos:** estrito, sem `'unsafe-inline'`.
2. **Implantação:** direto, bloqueando, com o teste de telas que falha a qualquer
   violação; reversão por PR.
3. **Fontes:** hospedadas no próprio app.
