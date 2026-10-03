-- 0002_listas_iniciais.sql
-- Setores e células existentes hoje. INSERT OR IGNORE: pode rodar de novo sem duplicar.

INSERT OR IGNORE INTO setores (nome, ordem) VALUES ('Fogo no Altar', 1);
INSERT OR IGNORE INTO setores (nome, ordem) VALUES ('Tabernáculo de Deus', 2);

INSERT OR IGNORE INTO celulas (nome, ordem) VALUES ('Hope', 1);
INSERT OR IGNORE INTO celulas (nome, ordem) VALUES ('Ramos da Videira', 2);
INSERT OR IGNORE INTO celulas (nome, ordem) VALUES ('Ashrei', 3);
INSERT OR IGNORE INTO celulas (nome, ordem) VALUES ('Betânia', 4);
INSERT OR IGNORE INTO celulas (nome, ordem) VALUES ('Vencedores em Cristo', 5);
INSERT OR IGNORE INTO celulas (nome, ordem) VALUES ('Despertar', 6);
INSERT OR IGNORE INTO celulas (nome, ordem) VALUES ('Pi-Hairote', 7);
