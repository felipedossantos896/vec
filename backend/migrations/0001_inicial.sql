-- 0001_inicial.sql
-- Estrutura inicial: espelha o que já existia na planilha (respostas do
-- formulário e usuários do painel) e prepara a hierarquia Área > Setor > Célula.
--
-- REGRAS PARA NOVAS MIGRATIONS
--  * Nunca edite uma migration já aplicada: crie uma nova (0003_..., 0004_...).
--  * Um comando por vez, terminado em ponto e vírgula.
--  * Não use CREATE TRIGGER (o executor não suporta).

-- Listas usadas pelo formulário e pelo painel -------------------------------
CREATE TABLE setores (
  id    INTEGER PRIMARY KEY,
  nome  TEXT NOT NULL UNIQUE COLLATE NOCASE,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE celulas (
  id       INTEGER PRIMARY KEY,
  nome     TEXT NOT NULL UNIQUE COLLATE NOCASE,
  -- Ainda não sabemos a qual setor cada célula pertence; preencher depois.
  setor_id INTEGER REFERENCES setores(id),
  ordem    INTEGER NOT NULL DEFAULT 0
);

-- Usuários do painel da liderança -------------------------------------------
CREATE TABLE usuarios (
  usuario       TEXT PRIMARY KEY,
  nome          TEXT NOT NULL,
  senha_hash    TEXT NOT NULL,
  perfil        TEXT NOT NULL CHECK (perfil IN ('AREA', 'SETOR', 'CELULA')),
  ativo         INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
  gerencia      INTEGER NOT NULL DEFAULT 0 CHECK (gerencia IN (0, 1)),
  criado_em     TEXT NOT NULL,
  ultimo_acesso TEXT
);

-- O que cada usuário SETOR/CELULA pode enxergar
CREATE TABLE usuario_escopos (
  usuario TEXT NOT NULL REFERENCES usuarios(usuario) ON DELETE CASCADE,
  tipo    TEXT NOT NULL CHECK (tipo IN ('SETOR', 'CELULA')),
  nome    TEXT NOT NULL COLLATE NOCASE,
  PRIMARY KEY (usuario, tipo, nome)
);

-- Bloqueio por tentativas de senha erradas
CREATE TABLE login_falhas (
  usuario       TEXT PRIMARY KEY,
  falhas        INTEGER NOT NULL DEFAULT 0,
  bloqueado_ate TEXT
);

-- Respostas do formulário ---------------------------------------------------
-- Campos S/N guardam 'S', 'N' ou '' (não respondeu).
CREATE TABLE respostas (
  id                    INTEGER PRIMARY KEY,
  criado_em             TEXT NOT NULL,                        -- ISO-8601, UTC
  nome                  TEXT NOT NULL,
  nascimento            TEXT NOT NULL DEFAULT ''
                        CHECK (nascimento = '' OR nascimento GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  recebeu_jesus         TEXT NOT NULL DEFAULT '' CHECK (recebeu_jesus IN ('S', 'N', '')),
  cafe_pastor           TEXT NOT NULL DEFAULT '' CHECK (cafe_pastor IN ('S', 'N', '')),
  estacao_dna           TEXT NOT NULL DEFAULT '' CHECK (estacao_dna IN ('S', 'N', '')),
  acomp_inicial         TEXT NOT NULL DEFAULT '' CHECK (acomp_inicial IN ('S', 'N', '')),
  nova_criatura         TEXT NOT NULL DEFAULT '' CHECK (nova_criatura IN ('S', 'N', '')),
  batismo               TEXT NOT NULL DEFAULT '' CHECK (batismo IN ('S', 'N', '')),
  batismo_espirito      TEXT NOT NULL DEFAULT '' CHECK (batismo_espirito IN ('S', 'N', '')),
  setor                 TEXT NOT NULL DEFAULT '' COLLATE NOCASE,
  celula                TEXT NOT NULL DEFAULT '' COLLATE NOCASE,
  frequenta_cultos      TEXT NOT NULL DEFAULT '' CHECK (frequenta_cultos IN ('S', 'N', '')),
  serve_ministerio      TEXT NOT NULL DEFAULT '' CHECK (serve_ministerio IN ('S', 'N', '')),
  ministerio_nome       TEXT NOT NULL DEFAULT '',
  expresso01            TEXT NOT NULL DEFAULT '' CHECK (expresso01 IN ('S', 'N', '')),
  expresso02            TEXT NOT NULL DEFAULT '' CHECK (expresso02 IN ('S', 'N', '')),
  tlc                   TEXT NOT NULL DEFAULT '' CHECK (tlc IN ('S', 'N', '')),
  encontro_deus         TEXT NOT NULL DEFAULT '' CHECK (encontro_deus IN ('S', 'N', '')),
  tadel                 TEXT NOT NULL DEFAULT '' CHECK (tadel IN ('S', 'N', '')),
  discipulador          TEXT NOT NULL DEFAULT '',
  interesse_discipulado TEXT NOT NULL DEFAULT '' CHECK (interesse_discipulado IN ('S', 'N', '')),
  interesse_cuidar      TEXT NOT NULL DEFAULT '' CHECK (interesse_cuidar IN ('S', 'N', '')),
  interesse_lider       TEXT NOT NULL DEFAULT '' CHECK (interesse_lider IN ('S', 'N', '')),
  interesse_anfitriao   TEXT NOT NULL DEFAULT '' CHECK (interesse_anfitriao IN ('S', 'N', '')),
  sugestao              TEXT NOT NULL DEFAULT ''
);

CREATE INDEX respostas_setor  ON respostas (setor);
CREATE INDEX respostas_celula ON respostas (celula);
CREATE INDEX respostas_nome   ON respostas (nome COLLATE NOCASE);
CREATE UNIQUE INDEX respostas_importacao ON respostas (nome, criado_em);
