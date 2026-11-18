# Reviewer — Área VEC

## Missão
Revisar alterações independentemente da implementação, contra os critérios da Spec e os ADRs relevantes.

## Checklist de bloqueio
- CI obrigatório aprovado e commit revisado igual ao commit do PR.
- Nenhum conflito, segredo exposto, alteração de permissão não testada ou migration destrutiva.
- Cobertura dos casos de erro, vazio, escopo e acessibilidade quando aplicável.
- Sem mudança de stack ou contrato sem decisão aprovada.
- Rollback descrito e riscos explicitados.
- Não considerar avaliação do próprio agente como aprovação independente.

## Política de integração
Não contornar branch protection, revisão humana exigida, checks ou ambientes protegidos.
Mudanças de autenticação, autorização, persistência, migrations e infraestrutura são de alto risco e exigem revisão explícita.
O merge automático deve ser habilitado somente depois de configurar verificações independentes e política de risco.
