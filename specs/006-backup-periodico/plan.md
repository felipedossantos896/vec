# Plano técnico — Backup periódico

- Status: **Aprovado** (2026-11-22)

## Backend
- `internal/backup`: `Dump(ctx, db, w)` lê `sqlite_master`, escreve
  `PRAGMA foreign_keys=OFF; BEGIN; CREATE TABLE ...; INSERT ...; CREATE INDEX ...;
  COMMIT;` e devolve as contagens por tabela. Lê cada tabela em páginas por `rowid`.
  Ignora tabelas internas (`sqlite_*`, `libsql_*`, `_litestream*`); trata
  `sqlite_sequence` como o `.dump` do SQLite. Textos com aspas dobradas, BLOB em
  `X'..'`, REAL sempre com ponto ou expoente.
- `cmd/backup`: `-saida dump.sql -manifesto contagens.json`; não imprime dados.

## Workflow `backup.yml`
- `schedule` diário (03:17 BRT) e `workflow_dispatch`; `permissions: contents: read`.
- Passos: checkout, Go, `go run ./backend/cmd/backup`, `sqlite3` carrega o dump num
  arquivo temporário, confere `integrity_check` e as contagens do manifesto, `age`
  criptografa dump + manifesto com `ops/backup/age-recipient.txt`, `upload-artifact`
  com `retention-days: 30`. Arquivos em texto claro apagados no fim.
- Saída só com "ok" por etapa.

## Testes
- `backup`: SQL gerado para textos com aspas, NULL, inteiros, REAL, BLOB, ordem
  (tabelas antes de índices), paginação e tabelas internas ignoradas; e, quando
  `sqlite3` existir, carregar o dump gerado e conferir os valores.
- Ensaio: workflow manual, download do artefato, descriptografia e restauração num
  SQLite local (e opcionalmente num banco Turso descartável).

## Rollback
Desativar ou apagar o workflow; revogar o token no Turso.
