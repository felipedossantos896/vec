# Handoff — Spec 020

- T001 / Issue #220, branch `codex/spec-020-trilhos`.
- A ficha separa os três trilhos, reutilizando campos existentes. Expresso 01 e 02 aparecem como treinamentos. A jornada de seis etapas permanece na ficha completa e nas métricas.
- Novos batismos exigem Café com o Pastor e Nova Criatura. Edições preservam batismos históricos incompletos, sem permitir retirar requisitos já cumpridos. Importação histórica, schema e escopos preservados.
- Typecheck, build, 93 testes frontend, gofmt, go vet, go test e go build passaram. Testes Go cobrem recusa de cada requisito ausente e respostas de edição histórica e fora do escopo.
- Chrome com dados fictícios, 1440 × 900 e 390 × 844, perfis Área e Discipulador: três trilhos, aviso de requisitos, vínculo à célula, WhatsApp e quatro KPIs. A gravação não foi reproduzida no navegador.
- Ajustes da primeira revisão: mensagens específicas por requisito, identificação do alvo visível na mesma transação e teste da guarda SQL em SQLite. O teste preserva cada combinação histórica, rejeita retirar cada requisito e valida uma nova marcação com e sem os requisitos. Suítes Go e frontend passaram novamente.
- Ajustes da segunda revisão: reenvio público de batismo histórico retorna sucesso sem regravar. O teste SQLite executa também as instruções de discípulos e eventos da jornada e verifica que uma edição recusada no mesmo segundo não altera esses dados.
- Próximo passo: CI e revisão independente, merge e verificação do deploy. Rollback por reversão do PR.
