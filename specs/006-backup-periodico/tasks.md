# Tarefas — Backup periódico

Issues #94 a #97; dependências em [`graph.json`](graph.json).

- [x] **T001 (#94) — Decisões**: spec com as decisões do responsável e segredos criados.
- [x] **T002 (#95) — Comando `backup`**: dump SQL restaurável e manifesto, com testes.
  - Dependências: T001.
- [x] **T003 (#96) — Workflow diário**: verificação, criptografia e artefato de 30 dias;
  chave pública e guia de restauração.
  - Dependências: T002.
- [x] **T004 (#97) — Ensaio de restauração**: execução manual, restauração conferida e
  registro.
  - Dependências: T003.
