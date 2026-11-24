# Plano técnico — Nitidez, zoom e escala do mapa da Área

## Implementação

- Em `frontend/src/admin/mapa.ts`, separar o teto do enquadramento automático, o teto manual e o teto configurado na camada. Começar o ensaio com teto automático 14 e manual 16. Preservar os recuos de `folgasMapa()` e o estado sem pontos.
- Experimentar `detectRetina` no Leaflet 1.9.4. O ensaio isolado confirmou que configurá-lo com teto de camada 16 deixa o zoom 16 sem tiles em 2×. Testar teto de camada 17 para compensar o ajuste do Leaflet e verificar os níveis solicitados. Comparar a legibilidade e registrar o aumento de requisições antes de adotar a variante.
- Usar o controle métrico do Leaflet e posicioná-lo no CSS da Área. Acrescentar a indicação de posição aproximada junto à legenda. Manter o JavaScript compilado sincronizado.

## Verificação e rollback

Executar typecheck, build e testes de frontend. Repetir os cenários da spec com dados fictícios no painel completo e conferir a cobertura de tiles, a régua, os recuos e o cartão. Se o ganho de legibilidade não compensar o aumento de requisições, registrar o resultado e rever a variante de tiles.

O rollback é a reversão do PR de implementação. A entrega é restrita ao frontend.
