# Spec-Driven Development — Área VEC

As especificações são a fonte versionada de requisitos para cada evolução. ADRs registram **por que**, specs registram **o que**, plans registram **como** e tasks registram **o trabalho verificável**.

## Fluxo
1. Consultar ADRs em `docs/architecture/adr/` e o roadmap existente.
2. Escrever/revisar `spec.md` com critérios observáveis e dúvidas explícitas.
3. Elaborar `plan.md` alinhado ao código existente; não inventar novas camadas.
4. Dividir `tasks.md` em tarefas pequenas com testes e referências a Issues.
5. Implementar em PR separado; atualizar especificação quando requisitos mudarem.
6. Validar comportamento, autorização, acessibilidade e compatibilidade com produção.

## Regras
- Specs propostas não autorizam automaticamente deploy ou alteração de dados.
- Nunca editar migrations aplicadas; usar novas migrations.
- Não duplicar tarefas para cada ADR: uma spec pode referenciar vários ADRs.
- Não adicionar framework ou dependência de runtime sem justificativa e revisão.
- O status de cada spec deve refletir seu estágio: Proposta, Aprovada, Em implementação, Entregue.
- Não armazenar dados reais de membros ou credenciais em specs.
