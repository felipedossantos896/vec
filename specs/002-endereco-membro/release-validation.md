# Validação de release — Spec 002, endereço do membro

- Data: 2026-11-21
- Produção: v1.23.0, verificada pelo CI (`/version` e `/healthz`).
- Entregas: T002 #54, T003 #55, T004 #56, T005 #57. Migration `0010_enderecos.sql`
  aplicada em produção pelo deploy e em `vec-dev` em 2026-11-21.

## Cenários de aceite

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Cadastro com consentimento mostra data e autor | Ponta a ponta em `vec-dev` (interface + API real) | ✅ |
| 2 | Sem consentimento nada é gravado | Ponta a ponta (API real) + testes de API | ✅ |
| 3 | Fora do escopo: "não encontrado" e nada gravado | Testes de store (escopo no SQL, 3 mutações detectadas) e de API | ✅ (automatizado; sem usuário SETOR real no teste de tela) |
| 4 | CEP com máscara normalizado; CEP de 7 dígitos ou UF `XX` recusados | Ponta a ponta (API real) + testes de API e frontend | ✅ |
| 5 | Remoção apaga a linha | Ponta a ponta (`endereco_ler` volta `null`) + teste de store | ✅ |
| 6 | Exclusão do cadastro apaga o endereço | Teste de store (mesma transação) | ✅ (automatizado; nenhum cadastro de `vec-dev` foi excluído) |
| 7 | Lista e CSV sem endereço | Ponta a ponta (resposta do `listar` e `CSV_COLS`) + teste de contrato | ✅ |
| 8 | 390 px e teclado | Tela em 390×844 e 1440×900: rótulos, erros por campo, foco, sem overflow | ✅ |

A busca por CEP (T005) foi validada em tela com o ViaCEP simulado. A requisição
leva só o CEP, não envia referrer, e uma falha não bloqueia o preenchimento.

## Decisões
- Retenção: sem prazo por enquanto. O endereço fica enquanto a pessoa estiver
  cadastrada e não pedir a remoção. Revisão periódica será reavaliada na Spec 003
  (mapa), quando o endereço passar a ser usado.

## Riscos residuais
- Endereço é dado pessoal sensível na prática. Mitigações: escopo no SQL,
  ausência em listas e CSV, consentimento a cada gravação, remoção definitiva e
  logs sem o conteúdo.
- O ViaCEP é serviço externo de conveniência. Se cair, o preenchimento é manual.

## Rollback
Reverter os PRs #57 → #54 na ordem inversa. A tabela `enderecos` pode permanecer;
apagá-la exige migration nova e explícita, nunca editar a 0010.
