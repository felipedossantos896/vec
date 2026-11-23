-- Cadastro pelo painel (Spec 010): de onde veio o cadastro e, quando veio do painel, quem
-- cadastrou (a autorização verbal da pessoa fica registrada em consentimento_em por esse
-- usuário). Cadastros existentes ficam como vindos do formulário.

ALTER TABLE respostas ADD COLUMN origem TEXT NOT NULL DEFAULT 'formulario'
  CHECK (origem IN ('formulario', 'painel'));
ALTER TABLE respostas ADD COLUMN cadastrado_por TEXT;
