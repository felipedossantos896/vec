-- Líderes de área e de setor sem célula fixa (Spec 013): o papel do cadastro. Membro de
-- célula (como até agora), líder de setor (com o setor e sem célula) ou líder de área (sem
-- célula nem setor). Só membros entram nas contagens de célula, no mapa e nos indicadores.

ALTER TABLE respostas ADD COLUMN papel TEXT NOT NULL DEFAULT 'membro'
  CHECK (papel IN ('membro', 'lider_setor', 'lider_area'));
