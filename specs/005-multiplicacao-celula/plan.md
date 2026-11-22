# Plano técnico — Planejar a multiplicação de uma célula

- Status: **Aprovado** (2026-11-22)

## Referências e premissas verificadas
- `store.MembrosCelula(sc, celula)` já devolve os membros da célula no escopo, com
  coordenada só para precisão de rua ou bairro, e `visivel=false` fora do escopo.
- `store.CandidatosAnfitriao(sc)` já devolve as casas confirmadas do escopo.
- `anfitriao.Ranking(casas, membros)` já ordena casas para um conjunto de membros.
- Nenhuma tabela nova: a simulação não é gravada.

## Backend
- `internal/anfitriao/divisao.go`, puro:
  - `Dividir(membros) (g1, g2 []int64, automatica bool)`: escolhe o par de membros
    mais distante, projeta todos na reta entre eles e corta na mediana (grupos com
    diferença máxima de 1). Desempate por número do cadastro, para ser
    determinística. Com menos de 4 com posição, `automatica=false` e todos no grupo 1.
  - Membros sem posição vão para o grupo menor.
  - O(n²) no par mais distante: células têm dezenas de pessoas.
- API `multiplicacao` com `celula` e, opcionalmente, `grupos: [[linhas], [linhas]]`:
  - sem `grupos`, devolve a proposta;
  - com `grupos`, valida que as duas listas juntas são exatamente os membros da
    célula no escopo (sem repetição nem estranhos; senão `dados_invalidos`);
  - responde `{celula, automatica, grupos: [{linhas, semPosicao: [linhas], membros, casas: [...]}], mesmaPrimeira}` com as casas no mesmo formato de `anfitrioes_ranking`;
  - célula fora do escopo: `nao_encontrado`. Nenhuma escrita.

## Frontend
- `multiplicacao.ts` e `multiplicacao-regras.ts` (regras puras: mover pessoa,
  resumo, avisos).
- Painel recolhível "Planejar multiplicação" na aba Mapa, abaixo de "Escolher
  anfitrião": duas colunas (uma em 390 px) com os nomes, botão "Mover para o grupo
  N" em cada pessoa, resumo e 3 melhores casas por grupo, "Voltar à proposta" e o
  aviso de simulação. Resultado anunciado por `role="status"`.

## Segurança e privacidade
- Escopo no SQL em todas as leituras (funções de store já testadas).
- A resposta tem só números de cadastro, contagens e distâncias arredondadas.
- Nenhuma escrita: o teste de API confere que o banco falso não recebe INSERT,
  UPDATE ou DELETE.

## Estratégia de testes
- `divisao`: dois agrupamentos claros, determinismo, equilíbrio (ímpar e par),
  sem posição no menor, menos de 4, todos no mesmo ponto.
- API: proposta, ajuste válido, ajuste com pessoa de fora/repetida/faltando, fora
  do escopo, resposta sem coordenada e sem escrita.
- Frontend: regras puras e tela em 390 e 1440 px, com teclado.

## Implantação e rollback
Sem migration. Rollback: reverter os PRs.

## Riscos
- Corte pela reta ignora vínculos (famílias, discipulado): mitigado pelo ajuste à
  mão e pela decisão do líder.
- Poucos endereços cadastrados: a tela permite montar os grupos à mão.
