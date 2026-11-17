-- Edição e exclusão de cadastros pelo painel: guarda quem mexeu e quando.
-- A exclusão só marca a linha (excluido_em); o cadastro some do painel, mas continua no banco.

ALTER TABLE respostas ADD COLUMN atualizado_em TEXT;
ALTER TABLE respostas ADD COLUMN atualizado_por TEXT;
ALTER TABLE respostas ADD COLUMN excluido_em TEXT;
ALTER TABLE respostas ADD COLUMN excluido_por TEXT;
