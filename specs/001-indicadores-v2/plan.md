# Plano técnico — Indicadores V2

- Status: **Proposto**; implementação requer PR separado.

## Base verificada
- `frontend/admin/index.html` contém abas Acompanhar, Pessoas, Indicadores e Configurações.
- `frontend/src/` contém TypeScript compilado para arquivos servidos pelo Go.
- `frontend/tsconfig.json` usa strict, target ES2020, module ESNext.
- `frontend/design-tokens.css`, `frontend/admin/dashboard.css` e `frontend/admin/admin.css` são referências visuais.
- `backend/internal/api` concentra rotas/autorização e `backend/internal/store` consultas e escopos.
- O roadmap registra agregação e filtros no navegador e recomenda medir antes de transferi-los ao servidor.

## Abordagem
1. Inventariar funções atuais de renderização dos indicadores e os IDs do DOM; registrar baseline antes de alterar.
2. Introduzir tokens/componentes CSS reutilizáveis com mudanças pequenas e compatíveis.
3. Reorganizar markup e estilos da aba de Indicadores sem modificar contratos de dados.
4. Extrair funções puras de cálculo e testar totais, médias, etapas independentes e escopo filtrado.
5. Implementar central de atenção a partir de campos existentes e navegação para Pessoas com filtro.
6. Validar acessibilidade, responsividade, carregamento/erro/vazio e consistência de filtros.
7. Medir tempo de renderização e tamanho do payload; não introduzir paginação prematuramente.

## Backend e dados
Nenhuma migration prevista. Preferir API existente. Qualquer mudança de endpoint exige testes de autorização para AREA/SETOR/CELULA e compatibilidade retroativa.

## Testes e verificação
- `npm run typecheck` e `npm run build`.
- `go test ./...` a partir do módulo Go correto; verificar CI existente.
- Casos de cálculo com zero registros, ordem não sequencial e dados incompletos.
- Testes de autorização/escopo antes de disponibilizar novos filtros ou endpoints.
- Inspeção manual desktop/mobile e navegação por teclado.

## Implantação e rollback
PR de implementação separado, revisão e CI antes do merge; evitar mudanças no banco. Reversão por commit/redeploy anterior caso necessário.

## Riscos
Markup e lógica do painel são acoplados; preservar IDs e contratos. Verificar seletor de aba e funções reais antes de modularizar.
