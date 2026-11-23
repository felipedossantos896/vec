-- Retrato mensal (Spec 009): só contagens agregadas, para as tendências dos Indicadores
-- ("+3 no mês"). Nenhum dado de pessoa: por mês e por escopo (a área, cada setor e cada
-- célula), quantas pessoas, quantas com a jornada completa, com discipulador e que
-- precisam de cuidado. Gravado no primeiro acesso aos Indicadores de cada mês.

CREATE TABLE retrato_mensal (
  mes         TEXT NOT NULL CHECK (mes GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
  escopo_tipo TEXT NOT NULL CHECK (escopo_tipo IN ('area', 'setor', 'celula')),
  escopo_nome TEXT NOT NULL DEFAULT '',
  indicador   TEXT NOT NULL CHECK (indicador IN ('pessoas', 'jornada_completa', 'com_discipulador', 'precisam_cuidado')),
  valor       INTEGER NOT NULL CHECK (valor >= 0),
  criado_em   TEXT NOT NULL,
  PRIMARY KEY (mes, escopo_tipo, escopo_nome, indicador)
);
