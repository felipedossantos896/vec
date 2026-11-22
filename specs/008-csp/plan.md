# Plano técnico — CSP

- Status: **Entregue** (v1.39.0)

## Fontes
- Baixar os `woff2` (subconjuntos latin e latin-ext) de Fraunces (opsz, 500 e 600)
  e Source Sans 3 (400, 600, 700) para `frontend/fonts/`, com a licença OFL e um
  `VERSAO.txt` com a origem e os hashes. `@font-face` em `frontend/fonts/fonts.css`
  com `font-display: swap`. Tirar os `<link>` do Google das duas páginas.
- `embed.go` e o `.gitattributes` (`-text` para binários) incluem as fontes.

## Estilos inline
- Trocar os `style="…"` por classes; larguras e cores dinâmicas por
  `elemento.style.x = …` depois do `innerHTML` (CSSOM via JS não é bloqueado).

## Cabeçalho
- `middleware.Seguranca` passa a enviar o CSP em todas as respostas HTML (o da foto
  continua `default-src 'none'`).

## Testes
- Go: o cabeçalho sai nas páginas e não quebra `/api` nem `/api/foto`.
- Tela: script de Playwright que registra `securitypolicyviolation` e falha se houver
  qualquer uma, percorrendo formulário e painel em 390 e 1440 px; e confere que nada
  vai para o Google.
- Injeção: um `<img onerror>` num texto não executa.

## Rollback
Reverter o PR do cabeçalho; fontes e estilos podem ficar.
