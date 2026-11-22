# Restaurar o backup do banco (Spec 006)

O workflow **Backup** guarda, todo dia, um arquivo `vec-prod-<data>.tar.gz.age` como
artefato por 30 dias. Ele só abre com a **chave privada** `vec-backup.key`, que fica
com o responsável (gerenciador de senhas), nunca no repositório.

## 1. Baixar
GitHub → Actions → **Backup** → a execução da data desejada → **Artifacts**. Ou:

```bash
gh run list --workflow backup.yml --limit 5
gh run download <id-da-execução> --dir ~/vec-restauracao
```

## 2. Abrir (numa pasta só sua; os dados são pessoais)

```bash
cd ~/vec-restauracao/vec-prod-*
age -d -i /caminho/para/vec-backup.key vec-prod-*.tar.gz.age | tar -xzf -
# gera dump.sql e contagens.json
```

## 3. Conferir num SQLite local

```bash
sqlite3 conferencia.db < dump.sql
python3 <repo>/ops/backup/verificar.py conferencia.db contagens.json   # "verificação: ok"
```

## 4. Restaurar no Turso
**Nunca sobrescreva o `vec-prod` direto.** Crie um banco novo, confira e só então
aponte o app para ele (ou copie o que faltou):

```bash
turso db create vec-restaurado --from-dump dump.sql
turso db shell vec-restaurado "SELECT count(*) FROM respostas"
```

Para trocar a produção para o banco restaurado: gerar um token do novo banco e
atualizar `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN` com `fly secrets set` (o app
reinicia). Depois de confirmar, apagar o banco antigo só com decisão do responsável.

## 5. Limpar
Apagar `dump.sql`, `contagens.json`, `conferencia.db` e a pasta baixada ao terminar.

## Se a chave privada se perder
Os backups existentes ficam ilegíveis. Gere um novo par (`age-keygen -o
vec-backup.key`), troque a linha de `ops/backup/age-recipient.txt` por uma PR e rode
o workflow manualmente para ter um backup novo.

## Token
`TURSO_BACKUP_TOKEN` é só de leitura do `vec-prod` e não expira. Para revogar:
`turso db tokens invalidate vec-prod` (invalida **todos** os tokens do banco,
inclusive o do app: gere novos e atualize os segredos do Fly e do GitHub).
