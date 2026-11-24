# ADR-0013 — Camadas de representação e privacidade do mapa pastoral

- Status: **Proposto** (2026-11-24); requer aprovação.
- Complementa ADRs 0005, 0008, 0010 e 0011; não substitui decisões de localização aproximada.
- Spec: [018](../../../specs/018-mapa-inteligencia-pastoral/spec.md).

## Contexto
A Área já exibe centros aproximados por grupo, rostos, lentes e ferramentas. Busca e novas representações (cuidado, territórios, calor) podem melhorar leitura, mas também causar inferência de localização e duplicação de regras.

## Decisão proposta
- Manter Leaflet/OSM e a API de centros aproximados como base única; filtros e autorização independentes de representação visual.
- Agregar somente centros já autorizados no cliente; nunca desagregar áreas de origem ou elevar precisão. Lentes, lista e marcadores compartilham universo autorizado.
- Territórios/calor são opcionais, agregados e desativados até validação de privacidade, inclusive limiar mínimo e proteção contra inferência por combinação de filtros. Não representar fronteiras reais. Não enviar atributos pastorais ao provedor.
- Manter atribuição visível, cache HTTP normal, sem pré-carregamento/offline ou testes automatizados contra tiles públicos. Usar tiles simulados em E2E. Referência: https://operations.osmfoundation.org/policies/tiles/
- Alteração de provedor, serviço de rotas ou nova precisão depende de ADR separado e aprovação de custos, termos e privacidade. Manter distância Haversine explícita, sem transformar em ETA.
- Sem dependência de runtime nova por padrão. Preservar lista acessível quando mapa indisponível.

## Alternativas
Mapa único sem modos (menor complexidade, menor flexibilidade); migração para tiles vetoriais (mais controle visual, nova dependência/provedor); clusters com coordenadas exatas (rejeitado por privacidade).

## Consequências
Mais estados de UI e testes de coerência; menos poluição visual. P2 pode ser inviável em células pequenas; nesse caso não mostrar agregação. Não criar novas fontes de dados nem alterar permissões.

## Validação
Testes de escopo, precisão, grupos pequenos, ataques de diferença entre filtros, ausência de dados pessoais em requisições externas, fallback de tiles e lista, performance e acessibilidade.

## Recorte da primeira entrega

Escopo inicial aprovado em 24/11/2026 com Leaflet/OSM e centros aproximados existentes. P2 adiado. Territórios e calor exigem revisão específica de privacidade antes de serem replanejados, incluindo limiar de supressão e proteção contra inferência entre filtros. O status final deste ADR acompanha a conclusão da T001.
