# Plano técnico — Nova identidade e telas centradas no mapa

- Status: **Proposto**

## Princípios
- Entregas pequenas, cada uma em produção e utilizável; a navegação antiga só sai
  quando a nova cobre tudo.
- Mesma stack: Go, TypeScript estrito compilado para arquivos globais, Tailwind 3,
  Leaflet já versionado. Sem dependência de runtime nova.
- CSP estrito: nada inline; medidas dinâmicas por `data-*` + CSSOM (Spec 008).

## Base visual
- `frontend/fonts/`: Bricolage Grotesque e Instrument Sans (woff2, latin e latin-ext,
  OFL, `VERSAO.txt` com hashes), substituindo Fraunces e Source Sans 3.
- `design-tokens.css`: cores, escala de tipos, raios, sombras; `tailwind.config.js` lê
  os tokens. Componentes em CSS próprio (`ui.css`): botão, campo, seletor, selo, chip
  de célula, card, abas, gaveta, diálogo, toast, estados.
- Avatar: `avatar.ts` gera o SVG a partir de um número (sem nome), cacheado por pessoa.

## Dados (migrations novas)
- `0013_celulas_identidade.sql`: `celulas.cor` (hex validado), `celulas.dia_semana`,
  `celulas.horario`, `celulas.anfitriao_id` (referência a `respostas`).
- `0014_contatos.sql`: `anotacoes.tipo` (`ligacao`, `whatsapp`, `visita`, `encontro`,
  `nota`; padrão `nota` para as antigas) e `anotacoes.lembrar_em`.
- `0015_retrato_mensal.sql`: `retrato_mensal(mes, escopo_tipo, escopo_nome, indicador,
  valor)` — só contagens.

## API (aditiva)
- `listar`: inclui a cor de cada célula e `foto`/`avatar` por pessoa (o avatar é só a
  semente numérica).
- `mapa`: inclui, por área, as linhas (já existe) e a cor da célula; nunca coordenada.
- `anotacao_salvar`: aceita `tipo` e `lembrarEm`; "Precisam de cuidado" considera o
  lembrete.
- `indicadores_tendencia`: devolve o retrato dos últimos 12 meses do escopo.
- `estrutura_salvar`: aceita cor, dia, horário e anfitrião da célula.

## Frontend
- `admin/area.ts` (novo) substitui `acompanhamento.ts` e `mapa.ts`, reaproveitando as
  regras puras (`mapa-regras`, `anfitriao-regras`, `multiplicacao-regras`).
- Gaveta da ficha em `detalhe.ts`; diálogo de contato em `contato.ts`.
- Barra inferior no celular; menu de 4 itens no computador.

## Testes
- Regras puras (avatar determinístico, empilhamento, lentes, lembrete, tendência).
- Go: migrations, validação de cor/dia/horário, contato com tipo e lembrete, escopo do
  retrato mensal, API do mapa sem coordenada.
- Tela: cada entrega em 390, 1440 e 2560 px, teclado, movimento reduzido e zero
  violação de CSP; comparação visual com os previews.

## Rollback
Cada entrega reverte por PR; migrations são aditivas. A navegação antiga fica atrás de
um interruptor até a entrega da Área estar validada.
