-- Setores e células passam a ser cadastrados pelo painel. Uma célula que fechou ou
-- multiplicou fica inativa: some do formulário, mas o histórico dos cadastros continua.

ALTER TABLE celulas ADD COLUMN ativa INTEGER NOT NULL DEFAULT 1 CHECK (ativa IN (0, 1));
