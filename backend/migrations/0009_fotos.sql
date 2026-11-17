-- Foto de perfil de cada cadastro, enviada pelo painel por quem pode editar a pessoa.
-- Fica pequena (o navegador reduz antes de enviar), então cabe no próprio banco.

CREATE TABLE fotos (
  resposta_id    INTEGER PRIMARY KEY REFERENCES respostas(id),
  imagem         BLOB NOT NULL,
  tipo           TEXT NOT NULL,
  atualizado_em  TEXT NOT NULL,
  atualizado_por TEXT NOT NULL
);
