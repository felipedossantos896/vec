# Plano técnico — Proteção contra robôs

- Status: **Proposto**

## Backend
- `internal/api/robos.go`:
  - `marcaFormulario(now)`: `"<unix>.<hmac>"` com HMAC-SHA256 da chave derivada de
    `SESSION_SECRET` (rótulo próprio, para não servir como token de sessão).
  - `conferirMarca(marca, now)`: assinatura em tempo constante, idade de 3 s a 24 h.
  - Limite por IP: janela de 10 minutos, 60 envios, mapa em memória com limpeza
    periódica; IP de `Fly-Client-IP` (ou `RemoteAddr` fora do Fly).
- `GET` não muda; nova ação pública `formulario_marca` (sem login) devolve a marca.
- `formulario`: confere armadilha (`_site`), marca (`_marca`) e limite **antes** de
  validar e gravar; reenvio com `_requestId` já gravado não consome o limite.
- Log: `envio recusado` com o motivo; IP só com os dois primeiros octetos.

## Frontend
- `index.html`: campo-armadilha `_site` com `aria-hidden`, `tabindex="-1"`,
  `autocomplete="off"`, fora da tela por CSS.
- `app.ts`: pede a marca ao carregar (e de novo ao receber `envio_expirado`), envia
  `_marca` e `_site`; mensagens dos quatro códigos sem limpar o formulário.

## Testes
- Marca: válida, alterada, futura, velha, rápida.
- Limite: 60 passam, 61º barrado, outro IP passa, janela expira, reenvio não conta.
- Formulário: armadilha recusa sem gravar; envio normal grava.
- Tela: armadilha fora do foco e da árvore de acessibilidade; mensagens.

## Rollback
Reverter os PRs. Sem migration.
