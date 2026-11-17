-- Telefone com autorização de uso dos dados (LGPD), anotações de acompanhamento e
-- a data em que cada etapa da jornada foi marcada como concluída.

ALTER TABLE respostas ADD COLUMN telefone TEXT NOT NULL DEFAULT '';
-- Quando a pessoa autorizou o uso dos dados no formulário (NULL = envio anterior ao aceite)
ALTER TABLE respostas ADD COLUMN consentimento_em TEXT;

CREATE TABLE anotacoes (
  id          INTEGER PRIMARY KEY,
  resposta_id INTEGER NOT NULL REFERENCES respostas(id),
  autor       TEXT NOT NULL,
  autor_nome  TEXT NOT NULL,
  criado_em   TEXT NOT NULL,
  texto       TEXT NOT NULL
);
CREATE INDEX anotacoes_resposta ON anotacoes (resposta_id, criado_em);

-- Uma linha por etapa concluída. Para o que já existe, a data é a do envio do formulário.
CREATE TABLE jornada_eventos (
  resposta_id INTEGER NOT NULL REFERENCES respostas(id),
  etapa       TEXT NOT NULL,
  em          TEXT NOT NULL,
  origem      TEXT NOT NULL CHECK (origem IN ('formulario', 'painel')),
  por         TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (resposta_id, etapa)
);
INSERT OR IGNORE INTO jornada_eventos (resposta_id, etapa, em, origem) SELECT id, 'cafePastor', criado_em, 'formulario' FROM respostas WHERE cafe_pastor = 'S';
INSERT OR IGNORE INTO jornada_eventos (resposta_id, etapa, em, origem) SELECT id, 'estacaoDNA', criado_em, 'formulario' FROM respostas WHERE estacao_dna = 'S';
INSERT OR IGNORE INTO jornada_eventos (resposta_id, etapa, em, origem) SELECT id, 'acompInicial', criado_em, 'formulario' FROM respostas WHERE acomp_inicial = 'S';
INSERT OR IGNORE INTO jornada_eventos (resposta_id, etapa, em, origem) SELECT id, 'novaCriatura', criado_em, 'formulario' FROM respostas WHERE nova_criatura = 'S';
INSERT OR IGNORE INTO jornada_eventos (resposta_id, etapa, em, origem) SELECT id, 'batismo', criado_em, 'formulario' FROM respostas WHERE batismo = 'S';
INSERT OR IGNORE INTO jornada_eventos (resposta_id, etapa, em, origem) SELECT id, 'batismoEspirito', criado_em, 'formulario' FROM respostas WHERE batismo_espirito = 'S';
