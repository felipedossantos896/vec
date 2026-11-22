# Spec 006 — Backup periódico do banco de produção

- Status: **Aprovada** (2026-11-22)
- Data: 2026-11-22
- ADRs: [0008](../../docs/architecture/adr/0008-privacidade-autorizacao.md) (Aceito)
- Roteiro: Fase 4 de [`ROADMAP-REFATORACAO.md`](../../docs/ROADMAP-REFATORACAO.md)

## Problema e objetivo
O banco de produção (Turso, plano starter) guarda cadastros, endereços, fotos e
confirmações de anfitrião, mas não há cópia fora do Turso. Um erro de operação, uma
migration errada ou um problema na conta não teria volta garantida. O objetivo é ter
uma cópia diária, criptografada, fora do banco, com restauração testada.

## Escopo
### Incluído
- Comando `backup` em Go (sem dependência nova) que lê todas as tabelas do banco
  com um token **só de leitura** e gera um dump SQL restaurável com `sqlite3` ou
  `turso db create --from-dump`, mais um manifesto com a contagem de linhas.
- Workflow agendado diário que gera o dump, confere que ele carrega num SQLite
  descartável com as mesmas contagens e `integrity_check` ok, criptografa com `age`
  (chave pública no repositório) e guarda como artefato por 30 dias.
- Guia de restauração e um ensaio real de restauração.

### Fora de escopo
- Restauração automática ou contínua (o Turso já tem a sua própria).
- Backup do `vec-dev`.
- Outros destinos (S3/R2).

## Requisitos
1. O backup nunca sai sem criptografia: o repositório é público e os artefatos podem
   ser baixados por qualquer conta do GitHub.
2. Os logs do workflow não mostram dados, contagens, nomes de tabelas com valores,
   URL nem token: só "ok" ou a etapa que falhou.
3. O token do workflow só lê (`all:data_read`); a chave privada do `age` fica só com
   o responsável, nunca no repositório nem nos segredos.
4. Uma falha (token revogado, dump que não carrega, contagens diferentes) faz o
   workflow falhar, e o GitHub avisa por e-mail.
5. O dump inclui esquema, dados (inclusive fotos em BLOB), índices e
   `schema_migrations`, para restaurar um banco idêntico.

## Cenários de aceite
1. **Dado** o workflow agendado, **então** há um artefato `.age` por dia, apagado
   após 30 dias.
2. **Dado** o artefato e a chave privada, **quando** o responsável seguir o guia,
   **então** obtém um banco com as mesmas tabelas e contagens do momento do backup.
3. **Dado** um dump que não carrega ou com contagem diferente, **então** o workflow
   falha antes de publicar o artefato.
4. **Dado** os logs públicos do workflow, **então** não há dado pessoal, contagem,
   URL nem token.

## Decisões do responsável (2026-11-22)
1. **Destino:** artefato do GitHub Actions, criptografado com `age`.
2. **Frequência e retenção:** diário, 30 dias.
3. **Chave:** gerada pelo responsável; só a chave pública vem para o repositório.
4. **Token:** só leitura do `vec-prod`, sem expiração, no segredo
   `TURSO_BACKUP_TOKEN` (URL em `TURSO_BACKUP_URL`). Criado em 2026-11-22.
