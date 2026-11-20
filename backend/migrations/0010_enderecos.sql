-- Endereço residencial opcional por pessoa (Spec 002, ADR-0004/0008).
-- Fica fora de respostas para não aparecer em listas nem no CSV, e só é gravado
-- com consentimento registrado. A remoção é definitiva (DELETE), inclusive quando
-- o cadastro é excluído. Coordenadas ficam para a Spec 003.

CREATE TABLE enderecos (
  resposta_id       INTEGER PRIMARY KEY REFERENCES respostas(id),
  cep               TEXT NOT NULL CHECK (cep GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'),
  logradouro        TEXT NOT NULL,
  numero            TEXT NOT NULL,
  complemento       TEXT NOT NULL DEFAULT '',
  bairro            TEXT NOT NULL,
  cidade            TEXT NOT NULL,
  uf                TEXT NOT NULL CHECK (length(uf) = 2),
  consentimento_em  TEXT NOT NULL,
  consentimento_por TEXT NOT NULL,
  atualizado_em     TEXT NOT NULL,
  atualizado_por    TEXT NOT NULL
);
