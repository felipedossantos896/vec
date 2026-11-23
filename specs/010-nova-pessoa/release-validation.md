# Validação de release — Spec 010, cadastrar nova pessoa pelo painel

- Data: 2026-11-23
- Produção: v1.52.0, verificada pelo CI (`/version` e `/healthz`) e por `curl`.
- Migration em produção: 0016 (origem e quem cadastrou), conferida em `schema_migrations`
  do `vec-prod` (só o esquema).
- Entregas: T002 #146 (v1.51.0, servidor) e T003 #147 (v1.52.0, painel).

## Cenários de aceite

Validação no `vec-dev`, com servidor real e CSP, em 1440 e 390 px:
- três células fictícias: uma ativa no escopo, uma de outro setor e uma inativa no escopo;
- duas pessoas fictícias já cadastradas;
- um líder de CÉLULA e um discipulador temporários.

Tudo foi removido ao fim, inclusive os cadastros criados. Resultado: 35 verificações
aprovadas. Os mesmos cenários também têm testes Go do lado do servidor.

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Líder de célula com a célula já escolhida | A única opção é a célula ativa dele; a inativa não aparece e o campo vem travado | ✅ |
| 2 | Salvar abre a ficha na trilha | Ficha no Resumo com "Jornada · 0 de 6"; "Recebeu Jesus" = Sim; no banco, origem `painel`, quem cadastrou e a autorização; a pessoa aparece em Pessoas | ✅ |
| 3 | Sem autorização não salva | O campo é apontado e nada é gravado | ✅ |
| 4 | Duplicado no escopo | Mesmo nascimento e o nome com outra grafia: o aviso mostra quem é, não cria e "Abrir cadastro" abre a ficha existente | ✅ |
| 5 | Duplicado fora do escopo | Mesmo WhatsApp de alguém de outra célula: bloqueia; a resposta é só `duplicado_fora` e a mensagem não tem nome nem célula | ✅ |
| 6 | Pedido forjado | Célula de outro setor e célula inativa: `celula_invalida`; o mesmo id de envio duas vezes cria um cadastro só | ✅ |
| 7 | Discipulador | Não vê o botão; o servidor responde `sem_permissao` | ✅ |
| 8 | 390 e 1440 px | Abre pelo teclado com o foco no nome; Esc fecha; sem rolagem lateral; zero violação de CSP. Smoke de dev aprovado | ✅ |

### Produção (só leitura)
- `/admin/nova-pessoa.js` e `/admin/nova-pessoa-regras.js` servidos pelo app, com o mesmo CSP estrito.
- Nenhum cadastro foi criado em produção: isso grava dados reais e não foi pedido. O fluxo foi
  validado com o mesmo código no `vec-dev`.

## Observações
- O diálogo lista como discipulador qualquer pessoa da área, com nome e célula, como a edição
  de cadastro já faz. O bloqueio de duplicado fora do escopo não revela quem é.
- **Fora do escopo, para uma próxima spec:** link ou QR de convite, modo recepção,
  importação de planilha e "Chegaram esta semana".

## Rollback
Reverter #147 esconde o botão. A ação `registro_criar` (#146) e a migration 0016 são
aditivas; os cadastros criados pelo painel continuam válidos.
