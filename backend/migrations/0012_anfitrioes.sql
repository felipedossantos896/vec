-- Confirmação de anfitrião (Spec 004, ADR-0006). O líder registra que a pessoa
-- confirmou que pode receber a célula em casa, com capacidade, dias possíveis e
-- observação curta. A remoção é definitiva (DELETE), inclusive quando o cadastro é
-- excluído. dias: siglas seg,ter,qua,qui,sex,sab,dom separadas por vírgula, na
-- ordem da semana (a API valida e ordena).

CREATE TABLE anfitrioes (
  resposta_id    INTEGER PRIMARY KEY REFERENCES respostas(id),
  capacidade     INTEGER NOT NULL CHECK (capacidade BETWEEN 2 AND 50),
  dias           TEXT NOT NULL CHECK (length(dias) BETWEEN 3 AND 27 AND dias NOT GLOB '*[^a-z,]*'),
  observacao     TEXT NOT NULL DEFAULT '' CHECK (length(observacao) <= 200),
  confirmado_em  TEXT NOT NULL,
  confirmado_por TEXT NOT NULL
);
