# Handoff

T001 / #289, branch `claude/redesign-ficha-trilhos`.

## O que mudou
- `trilhos-regras.ts`: os trilhos do membro, do discipulador e do líder de célula, o estado de cada etapa, o progresso e a pendência do batismo. Coberto por `frontend/test/trilhos.test.js`.
- Abas da ficha: Visão geral, Jornada e Ficha completa.
  - Na Visão geral, cada trilho tem uma linha com a contagem e a barra; o clique abre a aba Jornada no trilho escolhido.
  - A aba Jornada mostra uma linha do tempo por trilho, com ícone, texto e data.
  - Saíram o passo a passo de 6 etapas e os cartões de trilho repetidos.
- Batismo no Espírito e Encontro com Deus aparecem em "Outras etapas", na Ficha completa.

## Verificação
- typecheck, build, test:frontend (98/98), go vet e go test passaram.
- Playwright em 1440×900 e 390×844, com dados fictícios. Conferidos: abas, setas entre as abas, Escape, clique no trilho e datas em dd/mm/aaaa.

## Pendências
- Confirmar se o trilho do líder continua "opcional", como dizia o rótulo antigo.

## Correção pós-merge (27/11/2026)
- O `trilhos-regras.js` não estava no `go:embed`. Em produção, o arquivo dava 404 e a ficha não abria. Agora ele está embutido e listado no CI, e o novo `TestPageAssetsAreEmbedded` falha se alguma página pedir um script ou CSS fora do `go:embed`.
- Por decisão do responsável, Batismo no Espírito e Encontro com Deus entraram no trilho do membro, depois do Batismo nas Águas. A seção "Outras etapas" saiu.
- Continua pendente confirmar se o trilho do líder é "opcional".
