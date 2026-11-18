# Baseline técnico — Indicadores V2

- Data: 2026-11-18
- Issue: [#13](https://github.com/felipedossantos896/vec/issues/13)
- Status: Inventário estático concluído; validação visual e execução local pendentes.

## Fontes inspecionadas
- `frontend/src/admin/charts.ts`
- `frontend/src/admin/dashboard.ts`
- `frontend/src/admin/admin.ts`
- `frontend/admin/index.html`
- `frontend/tsconfig.json`
- `docs/architecture/adr/0003-indicadores-acompanhamento.md`

## Fluxo de dados
1. `carregar()` em `dashboard.ts` chama `/api` com `acao: 'listar'` e token da sessão.
2. A resposta contém `registros`, `escopo`, `pessoas` e `estrutura`; o backend é responsável pelo recorte autorizado.
3. Cada registro é normalizado e enriquecido por `derivar()`: `_idade`, `_jornada`, `_contato` e `_busca`.
4. `renderTudo()` sincroniza filtros, renderiza Pessoas, Acompanhar e Indicadores.
5. `baseIndicadores()` aplica somente `estado.setor` e `estado.celula`; busca e situação não afetam os KPIs.
6. `renderIndicadores()` monta HTML dos cards e gráficos em `#gConteudo`.

## Componentes e contratos existentes
- `frontend/src/admin/charts.ts`: `renderIndicadores`, `porMes`, `jornadaPorMes`, `colunas`, `painel`, `kpi`.
- `frontend/src/admin/dashboard.ts`: `carregar`, `derivar`, `baseIndicadores`, `renderTudo`, `renderLista`, `filtrados`, `medidor`.
- `frontend/src/admin/admin.ts`: `Registro`, `EstadoPainel`, `JORNADA`, `TREINOS`, `SITUACOES`.
- IDs observados: `gConteudo`, `tabIndicadores`, `fSetor`, `gSetor`, `aSetor` e equivalentes de célula.
- A interface possui estados de login, carregamento e falha de listagem, mas não foi validado visualmente o comportamento de todos os estados dos Indicadores.

## Métricas atuais — baseline de comportamento
| Métrica | Regra observada | Observação para V2 |
|---|---|---|
| Novos em 30 dias | `dataHora >= Date.now() - 30*24h` | Janela móvel, não mês calendário; manter até decisão explícita |
| Idade média | Média de `_idade` válida, arredondada | Cadastros sem nascimento válido ficam fora do denominador |
| Jornada completa | `_jornada === JORNADA.length` | `_jornada` conta as seis etapas com valor `S`, independente da ordem |
| Etapas por pessoa | Soma de `_jornada` / total | Formatação pt-BR com até uma casa |
| Faixa etária | Seis faixas, percentuais sobre idades válidas | Sem idade é informado separadamente |
| Novos cadastros | Últimos 12 meses, inclusive meses vazios | Série temporal de `dataHora` |
| Jornada mês a mês | Soma de etapas concluídas por `jornadaDatas[k]` | Não equivale ao número de pessoas que concluíram a jornada |
| Vida na igreja | Quatro condições `S` ou discipulador preenchido | `!!r.discipulador` é aplicado após trim no carregamento |
| Treinamentos | Contagem por campo `S` | Usa `TREINOS` do estado global |

## Descobertas que ajustam o plano
1. A aba **Acompanhar** já contém blocos operacionais sobre pessoas; avaliar reutilização antes de introduzir nova central de atenção em Indicadores, evitando duplicidade.
2. `SITUACOES` já oferece `semDiscipulador`, `quaseLa`, `semContato`, `semCelula` e situações por etapa; preferir reaproveitar filtros existentes.
3. `semContato` utiliza `ultimoContato` e limiar de 60 dias; a informação deriva de anotações recentes. Validar semântica e cobertura antes de transformá-la em KPI novo.
4. A interface oculta Indicadores para perfil `DISCIPULADOR`; preservar regra existente.
5. Filtros de setor/célula compartilham estado entre abas; a busca textual e o filtro de situação só afetam a lista de Pessoas.
6. Não é necessário novo endpoint nem migration para a primeira melhoria visual.

## Riscos e pontos de atenção
- O código usa scripts TypeScript compilados e HTML injetado; preservar ordem de scripts, IDs e listeners.
- `parseData` aceita prefixos de datas; testes devem cobrir dados inválidos e limites de período antes de alterar cálculos.
- `jornadaPorMes` depende de `jornadaDatas`; campos históricos sem data não aparecem no gráfico temporal.
- `colunas` usa `tabindex=0` e tooltip no foco; preservar acessibilidade.
- O CSS atual e o comportamento completo de `mapaJornada` ainda precisam de revisão visual antes da alteração de layout.

## Exemplos determinísticos para testes futuros
- 12 pessoas; 6 com seis etapas: jornada completa = 6 e percentual = 50%.
- Uma pessoa com etapa 4 marcada e etapa 3 não marcada: `_jornada` conta a etapa 4, sem supor sequência.
- Zero pessoas: mostrar estado vazio; não calcular média ou percentual com denominador zero.
- Idades válidas 20 e 30 mais uma pessoa sem nascimento: idade média = 25.

## Próximos passos
- #14: introduzir testes para regras atuais e autorização, sem alterar resultado.
- #15: revisar tokens e CSS existentes, definir componentes mínimos.
- #16: implementar layout preservando IDs, métricas e filtros.
- #17: decidir como integrar a central de atenção à aba Acompanhar existente, evitando duplicação.
- #18: verificar execução, acessibilidade, build e regressão.

## Critério de conclusão deste inventário
Mapeados fluxo de dados, principais arquivos, funções, métricas, filtros, permissões e riscos. **Não foram executados testes ou inspeção visual nesta etapa.**
