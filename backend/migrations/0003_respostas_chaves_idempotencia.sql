-- Mantém envios distintos e torna reenvios do mesmo formulário/importação seguros.
ALTER TABLE respostas ADD COLUMN request_id TEXT;
ALTER TABLE respostas ADD COLUMN import_key TEXT;
DROP INDEX respostas_importacao;
CREATE INDEX respostas_importacao_legada ON respostas (nome, criado_em);
CREATE UNIQUE INDEX respostas_request_id ON respostas (request_id);
CREATE UNIQUE INDEX respostas_import_key ON respostas (import_key);
