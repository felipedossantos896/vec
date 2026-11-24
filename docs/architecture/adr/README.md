# Registros de Decisões Arquiteturais — Área VEC

Este diretório documenta propostas e decisões para a evolução incremental do VEC.

## Convenções
- **Proposto**: requer revisão e aprovação; não autoriza implementação.
- **Aceito**: aprovado para implementação.
- **Substituído**: decisão superada por outro ADR.
- Cada ADR registra contexto, decisão, alternativas, consequências e validação.
- Nunca editar migrations já aplicadas; criar novas migrations.
- Alterações de produção exigem testes, revisão e deploy independente.

## Índice
- [ADR-0001 — Modernização incremental](./0001-modernizacao-incremental.md)
- [ADR-0002 — Design system](./0002-design-system.md)
- [ADR-0003 — Indicadores e acompanhamento](./0003-indicadores-acompanhamento.md)
- [ADR-0004 — Endereços e geocodificação](./0004-enderecos-geocodificacao.md)
- [ADR-0005 — Mapa de membros](./0005-mapa-membros.md)
- [ADR-0006 — Recomendação de anfitriões](./0006-recomendacao-anfitrioes.md)
- [ADR-0007 — Planejamento de novas células](./0007-planejamento-novas-celulas.md)
- [ADR-0008 — Privacidade e autorização](./0008-privacidade-autorizacao.md)
- [ADR-0009 — Nova identidade visual](./0009-identidade-visual.md)
- [ADR-0010 — Navegação centrada no mapa](./0010-navegacao-centrada-no-mapa.md)
- [ADR-0011 — Rostos no mapa e privacidade](./0011-rostos-no-mapa.md)
- [ADR-0012 — Pacote de ícones do painel](./0012-pacote-de-icones.md)
- [ADR-0013 — Alfinete residencial confirmado](./0013-alfinete-confirmado.md)

## Contexto técnico observado
- Go serve o formulário público e o painel.
- TypeScript estrito e Tailwind CSS 3; compilação sem framework de runtime.
- Turso/SQLite; migrations em `backend/migrations`.
- Escopos de acesso por área, setor e célula.
- Consultar também `docs/ROADMAP-REFATORACAO.md` antes de executar mudanças.
