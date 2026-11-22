-- Identidade das células (Spec 009, ADR-0009): cor no mapa e nos selos, dia e horário
-- do encontro e a casa anfitriã. Tudo opcional ('' ou NULL = não definido). A casa é o
-- cadastro de quem recebe; o formulário público nunca a mostra.

ALTER TABLE celulas ADD COLUMN cor TEXT NOT NULL DEFAULT ''
  CHECK (cor = '' OR (length(cor) = 7 AND cor GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'));
ALTER TABLE celulas ADD COLUMN dia_semana TEXT NOT NULL DEFAULT ''
  CHECK (dia_semana IN ('', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'));
ALTER TABLE celulas ADD COLUMN horario TEXT NOT NULL DEFAULT ''
  CHECK (horario = '' OR (length(horario) = 5 AND horario GLOB '[0-2][0-9]:[0-5][0-9]'));
ALTER TABLE celulas ADD COLUMN anfitriao_id INTEGER REFERENCES respostas(id);
