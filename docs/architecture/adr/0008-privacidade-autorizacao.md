# ADR-0008 — Privacidade e autorização de localização

- Status: **Aceito** em 2026-11-20 pelo responsável. Decisões de aplicação ao endereço registradas na Spec 002.
- Data: 2026-11-18

## Contexto
Endereços residenciais e coordenadas identificáveis exigem proteção adicional. O VEC já implementa escopos por área, setor e célula no servidor.

## Decisão proposta
Aplicar minimização de dados, finalidade explícita, transparência, base legal adequada e retenção definida. Exigir confirmação do anfitrião para uso da casa. Separar permissões para visualizar localização aproximada e endereço exato; validar autorização no servidor em cada endpoint, exportação e consulta de rotas. Registrar acesso administrativo relevante e permitir atualização/correção e exclusão quando cabível. Avaliar termos e fluxo de dados do provedor cartográfico.

## Alternativas
Exibir endereços para todos os usuários autenticados; confiar apenas na interface; compartilhar dados com provedor sem avaliação.

## Consequências
Maior esforço de autorização e governança, reduzindo risco de exposição. Base legal, política de retenção e eventual consentimento devem ser revisados antes de coletar dados.

## Validação
Testes negativos de autorização, exportações, logs sem endereço sensível e análise LGPD antes de ativação.
