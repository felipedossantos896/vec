# Decisão arquitetural — Studio isolado
Status: proposta para revisão; não substitui ADR-0002/0009/0012.

Manter catálogo estático fora de frontend, servido apenas localmente, com HTML/CSS/JS sem dependências novas. Manifesto JSON e fixtures sintéticas; iframe isolado para simular viewport. Tokens candidatos separados até aprovação. Alternativas: Storybook (dependências adicionais), Figma (serviço externo), imagens estáticas (sem responsividade). Consequências: manutenção do catálogo e risco de divergência; mitigar com testes e revisão conjunta. Antes da integração, formalizar ADR numerada após verificar IDs e reconciliar specs. Não alterar deploy ou rotas.
