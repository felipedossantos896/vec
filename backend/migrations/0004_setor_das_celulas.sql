-- 0004_setor_das_celulas.sql
-- A que setor cada célula (life group) pertence. Pode rodar de novo sem efeito colateral.

UPDATE celulas SET setor_id = (SELECT id FROM setores WHERE nome = 'Fogo no Altar')
 WHERE nome IN ('Hope', 'Ramos da Videira', 'Ashrei');
UPDATE celulas SET setor_id = (SELECT id FROM setores WHERE nome = 'Tabernáculo de Deus')
 WHERE nome IN ('Betânia', 'Despertar', 'Pi-Hairote', 'Vencedores em Cristo');
