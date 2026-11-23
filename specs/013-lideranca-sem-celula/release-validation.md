# Validação de release — Spec 013, líderes de área e de setor sem célula fixa

- Data: 2026-11-23
- Produção: v1.57.0, verificada pelo CI (`/version` e `/healthz`). Migration 0017 aplicada
  no `vec-prod` (conferida em `schema_migrations`, só o esquema); `lideranca-regras.js`
  servido com o CSP estrito.
- Entregas:
  - T002 #169 (v1.56.0) — servidor;
  - T003 #170 (v1.57.0) — painel.

## Cenários de aceite

Validação no `vec-dev`, com servidor real e CSP. Os dados:
- uma célula fictícia com dois membros;
- um usuário temporário de área (com gerência);
- um login de líder de setor criado pela própria tela.

Tudo foi removido ao fim. Resultado: 20 verificações aprovadas. O servidor também tem
testes Go para cada regra (criação, permissão, sincronização, retrato e mapa).

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Cadastro do líder de setor criado em Ajustes | Novo login de setor com "Criar o cadastro desta pessoa": no banco, `lider_setor`, com o setor, sem célula e ligado ao login | ✅ |
| 2 | Nova pessoa com Liderança | "Quem é: Líder de área": cadastro `lider_area` sem célula nem setor | ✅ |
| 3 | Discipulador com o grupo Liderança | Na edição do membro, o grupo Liderança vem no topo com o papel; o vínculo ao líder de setor foi salvo | ✅ |
| 4 | O líder de setor vê os discípulos | Login do líder (390 px): o discípulo aparece; a ficha dele tem jornada e "Discípulos" | ✅ |
| 5 | Etiqueta e filtro em Pessoas | Etiquetas Líder de área/setor; o filtro Liderança mostra os dois; nenhum em "Sem célula" | ✅ |
| 6 | Indicadores e mapa só com membros | KPI de pessoas do setor = membros do setor; o mapa e o retrato filtram `papel = 'membro'` no servidor (testes Go) | ✅ |
| 7 | Trilha | Líder de área sem jornada, fora do cuidado e neutro na tabela; líder de setor em "precisam de cuidado" | ✅ |
| 8 | Login de setor vira de área | O cadastro ligado passou a `lider_area`, sem setor | ✅ |
| 9 | 390 e 1440 px | Sem rolagem lateral; zero violação de CSP; smoke de dev aprovado | ✅ |

## Observações
- **Dados de produção:** nenhum cadastro existente mudou sozinho; todos ficaram como
  `membro`. O papel só muda quando alguém salva um login de área ou setor ligado a um
  cadastro em Ajustes, e aí o cadastro perde a célula, como diz a spec. Vale revisar os
  logins de liderança que já tenham cadastro ligado antes de salvá-los.
- A busca de Pessoas inclui o nome do discipulador. Procurar o nome de um líder também
  mostra os discípulos dele, como já acontecia com qualquer discipulador.
- Produção: o painel por dentro não foi percorrido lá (exigiria criar um usuário).

## Rollback
Reverter #170 volta a tela de antes. Os cadastros de líder continuam válidos e passariam a
aparecer como pessoas sem célula. Reverter #169 tira a ação e a sincronização; a coluna
`papel` é aditiva e pode ficar.
