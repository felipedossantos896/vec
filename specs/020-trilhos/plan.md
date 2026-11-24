# Plano técnico — Trilhos

1. Confirmar a matriz de requisitos e a equivalência dos campos da fotografia. Começar pelas relações já representadas nos cadastros. Se alguma conclusão exigir dado que o sistema não registra, tratar a alteração de persistência em tarefa revisada.
2. Apresentar trilhos na ficha com estados derivados dos campos disponíveis. Preservar a métrica de seis etapas também em Pessoas, filtros e Meus discípulos.
3. Aplicar a validação de batismo nos pontos de gravação definidos, considerando a transição do campo e os dados anteriores nas edições. O formulário público, o cadastro pelo painel, a edição e a importação precisam ter comportamento explícito.
4. Cobrir com testes a nova marcação, cada requisito ausente, dados legados e edição de outros campos. Validar com dados fictícios em desktop e celular.

Rollback: reverter o PR de implementação. A opção baseada somente nos campos atuais dispensa migrations.
