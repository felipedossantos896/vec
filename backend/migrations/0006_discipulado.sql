-- Discipulado: liga cada cadastro ao cadastro do seu discipulador e cada login do
-- painel ao cadastro da própria pessoa. Com isso o discipulador enxerga os seus discípulos.
--
-- Quem é só discipulador (não lidera célula, setor nem área) fica em usuarios com
-- perfil 'CELULA', sem nenhum escopo e com resposta_id preenchido; o painel mostra
-- esse caso como "Discipulador".

ALTER TABLE respostas ADD COLUMN discipulador_id INTEGER REFERENCES respostas(id);
ALTER TABLE usuarios ADD COLUMN resposta_id INTEGER REFERENCES respostas(id);
CREATE INDEX respostas_discipulador ON respostas (discipulador_id);
