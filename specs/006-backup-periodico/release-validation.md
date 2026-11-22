# Validação — Spec 006, backup periódico

- Data: 2026-11-22
- Entregas: T002 #99 (comando `backup`), T003 #100 (workflow diário, chave pública,
  verificador e guia). Segredos `TURSO_BACKUP_URL` e `TURSO_BACKUP_TOKEN` (só
  leitura do `vec-prod`, sem expiração) criados em 2026-11-22.
- Primeira execução: manual, run 44992431543, todas as etapas ok. Artefato
  `vec-prod-2026-11-22T0609Z` (4 KB criptografado), expira em 2026-12-22.

## Cenários de aceite

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Artefato `.age` diário, apagado após 30 dias | Agendamento diário 06:17 UTC; artefato da primeira execução com expiração em 30 dias | ✅ (o agendado será acompanhado nos próximos dias) |
| 2 | Com a chave privada, restaura com as mesmas tabelas e contagens | Ensaio com o artefato real de produção, autorizado pelo responsável: baixado, aberto com a chave privada, carregado num SQLite local, `verificar.py` ok (integrity_check, 12 tabelas com as contagens do manifesto, 12 migrations); pasta apagada | ✅ |
| 3 | Dump que não carrega ou com contagem diferente → falha antes de publicar | Verificador recusa contagem diferente e manifesto vazio (teste local); a etapa de conferência vem antes da criptografia e do upload | ✅ |
| 4 | Logs públicos sem dados, contagens, URL ou token | Log da primeira execução (292 linhas) sem URL do banco, token, SQL, nomes de tabelas ou chave; só "ok" por etapa | ✅ |

## Ensaios anteriores
- Comando `backup` contra o `vec-dev`: 12 tabelas, 12 migrations e 15 índices
  restaurados; `integrity_check` ok.
- Fluxo completo local com chave descartável: com outra chave o arquivo não abre.

## Pendências do responsável
- Guardar `vec-backup.key` no gerenciador de senhas e apagar a cópia em Downloads.
- Restauração no Turso (`turso db create --from-dump`) não foi ensaiada, para não
  copiar dados pessoais para outro banco; o guia descreve o passo.

## Rollback
Desativar ou apagar `.github/workflows/backup.yml`; revogar o token no Turso (ver
`ops/backup/RESTAURAR.md`).
