# Handoff — Spec 003, mapa de membros

Estado verificável entre agentes. Não substitui `graph.json`, Issues, CI nem revisão.

### T002 / Issue #61 — 2026-11-21
- Agente: Claude Code. Branch `feat/issue-61-coordenadas`.
- Feito: migration aditiva `0011_endereco_coordenadas.sql` (`lat`, `lng`,
  `geo_fonte`, `geo_precisao`, `geo_em`). `SalvarEndereco` invalida a coordenada só
  quando muda CEP, rua, bairro, cidade ou UF; número e complemento não invalidam,
  porque não vão ao Nominatim. `GravarCoordenada` grava só se o endereço ainda é o
  consultado. `PendentesGeo` lista cadastros ativos sem tentativa, e `PontosMapa`
  devolve coordenadas com escopo no SQL.
- Testes: `go test ./...`, `go vet ./...`, `gofmt`. No SQLite real, com o SQL do
  código: trocar o número mantém a coordenada, trocar a rua invalida, e gravar um
  endereço antigo não afeta nenhuma linha.
- Próximo: T003 / #62 (geocodificação) e T004 / #63 (API do mapa), que podem seguir
  em paralelo.

### T003 / Issue #62 — 2026-11-21
- Agente: Claude Code. Branch `feat/issue-62-geocodificacao`.
- Feito: pacote `internal/geo` com cliente Nominatim. User-Agent
  `VEC-AreaVEC/<versão> (+https://github.com/felipedossantos896/vec)`, limitador
  global de 1 req/s (4/min na carga única), cache em memória, tentativas
  rua → bairro → cidade → `nao_encontrado` e `GEOCODER=off`. A consulta leva rua,
  bairro, cidade e UF, sem número, complemento nem CEP. Os erros nunca levam a URL,
  para o endereço não ir ao log. `endereco_salvar` dispara a geocodificação em
  segundo plano, e uma falha deixa o endereço pendente. Comando
  `backend/cmd/geocodificar` para a carga única, idempotente, com saída só em
  contagens.
- Testes: `go test -race` em `api` e `geo`, com Nominatim falso: consulta sem dados
  pessoais, User-Agent, recuo de precisão, erro de serviço que não vira "não
  encontrado", limitador entre goroutines, cache, interruptor, gravação do endereço
  consultado, salvamento não afetado por falha e log sem endereço. Uma consulta real
  com endereço público (Praça da Sé, SP) retornou precisão `rua` dentro de São Paulo.
- Pendente: a carga única em produção fica para a T006.
- Próximo: T004 / #63, a API do mapa.

### T004 / Issue #63 — 2026-11-21
- Agente: Claude Code. Branch `feat/issue-63-api-mapa`.
- Feito: ação `mapa`, sempre no escopo do usuário. Agrupa no servidor numa grade
  de 0,003° (~330 m) e devolve só o centro da célula, com 4 casas decimais, mais os
  ids do grupo e quantos foram localizados só pelo bairro. Posições só pela cidade
  vão para `soCidade` (não entram no mapa, para não empilhar todos no centro da
  cidade); `naoLocalizados` e `pendentes` vêm separados. `PontosMapa` agora devolve
  todos os endereços do escopo com a situação da geocodificação.
- Testes: agrupamento e classificação, centro diferente de qualquer coordenada real
  e a no máximo meio passo dos membros, escopo no SQL, JSON sem coordenada exata
  nem número, complemento, rua ou CEP, e listas vazias como `[]`.
- Próximo: T005 / #64, a visão Mapa.

### T005 / Issue #64 — 2026-11-21
- Agente: Claude Code. Branch `feat/issue-64-visao-mapa`.
- Feito: aba **Mapa** com Leaflet 1.9.4 versionado em `frontend/admin/vendor/leaflet`
  (integridade do npm conferida, hashes em `VERSAO.txt`, licença BSD-2) e tiles do
  OSM com atribuição e link "Reportar erro no mapa". Marcadores por área (~300 m)
  com contagem são focáveis e têm rótulo; a janela do marcador lista os nomes, que
  abrem a ficha. Há uma lista equivalente (áreas, só pela cidade, não localizados,
  aguardando, sem endereço), e os filtros `mSetor`/`mCelula` são compartilhados.
  Zoom máximo 16. Com movimento reduzido, o Leaflet fica sem animações. Se o Leaflet
  não carregar, a página avisa e mostra só a lista.
- Testes: `npm run test:frontend` com 26 testes (4 novos). Tela em 390×844, em
  1440×900 e sem Leaflet, com login real em `vec-dev` e ação `mapa` e tiles
  simulados: marcadores dentro da área visível, atribuição, tiles com Referer,
  foco e Enter abrindo os nomes, nome abrindo a ficha, lista equivalente, filtro
  compartilhado, sem overflow e console limpo.
- Próximo: T006 / #65, a carga única em produção e a validação.

### T006 / Issue #65 — 2026-11-21
- Agente: Claude Code. Branch `docs/issue-65-validacao-mapa`.
- Feito: carga inicial em produção (0 pendentes, porque a produção não tem
  endereços), `release-validation.md` com os 8 cenários, e spec marcada como Entregue.
- Testes: ponta a ponta em `vec-dev` com Nominatim real e endereço público (Praça
  da Sé/SP). A pessoa entrou no mapa no centro de SP; a resposta só tinha centros
  de 4 casas, sem rua, número nem CEP; trocar o número manteve a posição; remover o
  endereço tirou a pessoa do mapa. `vec-dev` terminou com 0 endereços.
- Pendente: nada na Spec 003.
