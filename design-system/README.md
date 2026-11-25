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

## V0.2 — Map Experience
Frames A02–A04 agora usam o mesmo protótipo interativo: busca por nome/célula, filtro de célula e cuidado, contagens derivadas, seleção, grupo demonstrativo, zoom esquemático e gaveta. Contato/perfil apenas mostram feedback local. Não é mapa geográfico: sem pan, tiles, geocodificação ou dados reais. Testar manualmente os quatro viewports, teclado, Escape, filtros vazios, pessoa sem localização e movimento reduzido. Testes de navegador ainda pendentes.

## V0.3 — People Management

Frames A07, A08, A14 e A15 compartilham busca e filtro, ficha em gaveta com três trilhos e formulários de cadastro e edição. Cadastros demonstrativos duram apenas enquanto o frame está aberto.

## V0.4 — Complete Inventory

Os 21 frames têm preview. As ferramentas da Área simulam resultados, Indicadores e Discípulos usam fixtures, e os fluxos de acesso e cadastro público demonstram as transições sem criar contas nem enviar dados.
