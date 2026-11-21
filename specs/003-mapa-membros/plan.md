# Plano técnico — Mapa de membros

- Status: **Proposto**

## Referências e premissas verificadas
- `enderecos` (migration 0010) tem um endereço por pessoa e é lido sempre com
  `escopoSQL` (Spec 002).
- Políticas de uso consultadas em 2026-11-21: Nominatim (1 req/s, User-Agent
  próprio, cache, sem autocompletar no cliente, desligável, sem dados pessoais, carga
  pontual a 4/min) e tiles do OSM (atribuição, Referer, sem offline nem pré-carga,
  sem SLA). A T001 reconfere.
- O servidor roda numa única máquina no Fly (`--ha=false`), então um limitador em
  memória basta para o limite de 1 req/s.

## Backend
- `0011_endereco_coordenadas.sql`: `ALTER TABLE enderecos ADD COLUMN lat REAL`,
  `lng REAL`, `geo_fonte TEXT`, `geo_precisao TEXT` e `geo_em TEXT` (todas anuláveis).
- `store`: `SalvarEndereco` zera as colunas `geo_*` quando o endereço muda;
  `GravarCoordenada(id, lat, lng, fonte, precisao)` grava só se o endereço não
  mudou desde a consulta; `PendentesGeo(limite)` lista para a carga única;
  `PontosMapa(sc)` devolve, com escopo, `linha`, `nome`, `setor`, `celula`, `lat`,
  `lng` e `precisao`.
- `internal/geo`, pacote novo:
  - cliente Nominatim com `net/http` e User-Agent `VEC-AreaVEC/<versão> (<contato>)`;
  - limitador global de 1 req/s, timeout de 10 s e cache em memória por consulta;
  - fallback de rua para bairro e depois cidade;
  - `GEOCODER=off` desliga.
- Disparo: depois do `endereco_salvar` bem-sucedido, uma goroutine com contexto
  próprio e prazo. Uma falha só gera log, sem o conteúdo do endereço.
- `cmd/geocodificar`: carga única dos pendentes, num só processo, a ≤ 4/min,
  idempotente.
- API: ação `mapa` que agrupa no servidor em células de ~0,003° (≈ 330 m) e
  devolve `{grupos: [{lat, lng, linhas: [ids]}], semPosicao: [ids]}`. O centro de
  cada grupo é o centro da célula da grade, nunca a coordenada de uma pessoa. Os
  nomes vêm do `listar` que o navegador já tem, pelo id.

## Frontend
- `frontend/admin/vendor/leaflet/` com JS, CSS e imagens da versão fixa, servidos
  pelo próprio VEC (embed) e com licença incluída.
- `mapa.ts`: aba "Mapa", camada de tiles OSM com atribuição, um marcador por grupo
  (`divIcon` com a contagem, focável), um painel com os nomes do grupo e uma lista
  equivalente. Os filtros de setor e célula são os compartilhados.
- Erro ao carregar tiles ou o Leaflet: mostra só a lista.

## Segurança e privacidade
- O escopo vai no SQL, e a coordenada exata nunca sai do servidor.
- Para o Nominatim seguem só rua, bairro, cidade, UF e CEP, por HTTPS.
- Logs da geocodificação: só `linha` e o resultado (precisão), sem endereço nem
  coordenada.

## Estratégia de testes
- `geo`: Nominatim falso (`httptest`) para sucesso, fallback, não encontrado,
  timeout, User-Agent, ausência de número e complemento na consulta, limitador e
  `GEOCODER=off`.
- `store`: escopo em `PontosMapa`, invalidação ao mudar o endereço e
  `GravarCoordenada` ignorada se o endereço mudou no meio.
- API `mapa`: agrupamento na grade, nenhuma coordenada exata, sem número ou
  complemento, e fora do escopo ausente.
- Frontend: regras puras de agrupamento e listas; tela em 390 e 1440 px com os
  tiles simulados.

## Implantação e rollback
- A migration aplica no deploy. `GEOCODER` vem ligado em produção só depois da
  T001 (contato do User-Agent). A carga única roda manualmente uma vez.
- Rollback: `GEOCODER=off` imediato, e depois reverter os PRs. As colunas novas
  podem ficar.

## Riscos
- O Nominatim pode bloquear ou mudar a política sem aviso. Mitigação: interruptor,
  cache e o painel funcionando sem mapa.
- A precisão no Brasil varia. Mitigação: precisão registrada, fallback e lista
  "sem posição".
