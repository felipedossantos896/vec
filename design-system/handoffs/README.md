# Design Handoffs
Fonte compartilhada de referências de UX/UI para Codex e Claude Code. Não substitui ADRs, Specs, Issues ou autorização de implementação. Status: proposta, aprovado para implementação, implementado (com evidências). A aprovação da convenção não aprova automaticamente cada redesign.
## Índice
- [001 — Marcadores do mapa](001-map-markers/decisions.md) — proposta; A02–A04.
- [002 — Ficha individual](002-member-profile/decisions.md) — proposta; A08.
## Fluxo
1. Criar pasta numerada usando template.md; registrar origem, escopo, decisões, referências, estados e critérios.
2. Usar apenas dados sintéticos; SVG/PNG locais e HTML/CSS/JS sem dependências externas. Não publicar capturas reais, telefones, endereços ou fotos de membros.
3. Aprovar proposta e reconciliar ADR/Spec vigente; vincular Issue e tarefa do grafo antes de implementar.
4. Agente lê AGENTS.md, handoff e código atual; não inventa regras. Referências são conceituais, não screenshots de implementação.
5. Validar com Playwright nos quatro viewports do Studio, teclado e movimento reduzido; anexar evidências ao PR e atualizar handoff da Spec.
