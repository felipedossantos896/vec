-- Contato estruturado (Spec 009): cada anotação ganha o tipo do contato, o dia em que
-- aconteceu e quando falar de novo. Anotações antigas viram 'nota', com a data do registro.
-- lembrar_em: dia (AAAA-MM-DD) a partir do qual a pessoa volta para "Precisam de cuidado".

ALTER TABLE anotacoes ADD COLUMN tipo TEXT NOT NULL DEFAULT 'nota'
  CHECK (tipo IN ('nota', 'ligacao', 'whatsapp', 'visita', 'encontro'));
ALTER TABLE anotacoes ADD COLUMN contato_em TEXT NOT NULL DEFAULT ''
  CHECK (contato_em = '' OR contato_em GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
ALTER TABLE anotacoes ADD COLUMN lembrar_em TEXT NOT NULL DEFAULT ''
  CHECK (lembrar_em = '' OR lembrar_em GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');
