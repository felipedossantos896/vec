# VEC Design Studio
Catálogo local de propostas V2. Não é aplicação de produção nem fonte de dados reais.

## Executar
Na raiz: `python3 -m http.server 4173 --bind 127.0.0.1 --directory design-system`
Abra http://127.0.0.1:4173. Sem instalação npm, login ou API. O preview usa iframe com viewport CSS real e escala visual; 4K não implica DPR 4.

## Escopo
Inventário inicial de 21 frames, seis protótipos (login, mapa, membro, cuidado, pessoas, ficha), foundations e componentes. Demais frames explicitamente planejados. Mapa esquemático fictício, sem tiles externos. Ações internas são demonstrativas, não persistem dados.

## Governança
Tokens V2 são candidatos isolados; não substituem frontend/design-tokens.css nem ADRs aceitos. Aprovar identidade e telas antes de migrar produção. Registrar estados, acessibilidade, comportamento e screenshots sintéticos por PR. Nunca copiar dados reais. Não incluir Studio em rotas ou embed do servidor. CI atual pode disparar deploy em merge de documentação; não alterar pipeline neste PR.

## Próximas entregas
Completar frames e estados; validar visualmente os quatro viewports e escala do SO; adicionar regressão Playwright; aprovar ADR de identidade e reconciliar Specs existentes antes da migração. Reutilizar Phosphor e fontes locais do projeto na integração; protótipo inicial usa fonte de sistema e ícones textuais.
