-- Coordenadas aproximadas do endereço (Spec 003, ADR-0005). Obtidas no servidor
-- pelo Nominatim em nível de rua (sem número nem complemento); nunca são enviadas
-- ao navegador, que recebe só o centro de uma grade de ~300 m.
-- geo_precisao: 'rua', 'bairro', 'cidade' ou 'nao_encontrado'. geo_em NULL =
-- pendente de geocodificação.

ALTER TABLE enderecos ADD COLUMN lat REAL;
ALTER TABLE enderecos ADD COLUMN lng REAL;
ALTER TABLE enderecos ADD COLUMN geo_fonte TEXT;
ALTER TABLE enderecos ADD COLUMN geo_precisao TEXT;
ALTER TABLE enderecos ADD COLUMN geo_em TEXT;
