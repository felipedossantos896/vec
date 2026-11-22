# Spec 001 — Indicadores V2

- Status: **Entregue** (v1.17.1, 2026-11-19). Ver [release-validation.md](release-validation.md)
- Data: 2026-11-18
- ADRs: [0001](../../docs/architecture/adr/0001-modernizacao-incremental.md), [0002](../../docs/architecture/adr/0002-design-system.md), [0003](../../docs/architecture/adr/0003-indicadores-acompanhamento.md)

## Objetivo
Modernizar a tela de Indicadores da liderança para responder: como está a área, quem necessita de acompanhamento e onde atuar; preservar comportamentos existentes e evitar migração tecnológica.

## Incluído
- Layout responsivo, aproveitamento horizontal e hierarquia de KPIs.
- Filtros existentes por setor e célula preservados.
- Cards de total de pessoas, novos cadastros, jornada completa e média de etapas concluídas por pessoa.
- Jornada de seis etapas apresentada como conclusão **independente** de cada etapa (não como funil sequencial).
- Gráficos e seções atuais de evolução mensal, faixa etária, vida na igreja e treinamentos preservados.
- Central de atenção: pessoas com jornada incompleta e sem discipulador, com acesso à lista filtrada e escopo autorizado.
- Estados de carregamento, vazio e erro; navegação por teclado e dispositivos móveis.

## Fora de escopo
- Histórico de contatos recentes (não há fonte confiável validada).
- Novo cadastro de endereços, mapas e recomendação de anfitriões.
- Migração para React, Next.js ou substituição de backend.
- Paginação ou novas APIs sem evidência de necessidade.

## Regras de negócio
- Jornada completa: seis etapas concluídas, independente da ordem.
- Média de etapas: soma de etapas concluídas / quantidade de pessoas do escopo; com zero pessoas, mostrar estado vazio, não NaN.
- Novos cadastros: criados dentro do intervalo temporal selecionado.
- Indicadores de situação atual não devem ser incorretamente restringidos pelo período de novos cadastros.
- 'Sem discipulador': campo de discipulador ausente/vazio; validar tratamento de espaços.
- Contagem da central de atenção não implica que grupos sejam disjuntos.
- Filtros e drill-down devem respeitar autorização no servidor; UI não é barreira de segurança.

## Cenários de aceite
1. **Dado** um usuário de célula, **quando** abrir Indicadores, **então** só verá dados do escopo autorizado.
2. **Dado** um conjunto de 12 pessoas e 6 com seis etapas, **quando** consultar jornada completa, **então** verá 6 (50%).
3. **Dado** uma pessoa que concluiu a etapa 4 mas não a 3, **quando** consultar o gráfico, **então** a etapa 4 será contada sem supor progressão sequencial.
4. **Dado** um filtro de setor/célula, **quando** alterá-lo, **então** cards, gráficos e central usarão o mesmo escopo.
5. **Dado** um período, **quando** alterá-lo, **então** novos cadastros e séries temporais mudam, mas o total atual permanece identificado como situação atual.
6. **Dado** o alerta 'sem discipulador', **quando** selecioná-lo, **então** a lista de pessoas abre filtrada no escopo permitido.
7. **Dado** nenhum registro, **quando** renderizar, **então** não haverá divisão por zero e haverá mensagem apropriada.
8. **Dado** viewport móvel ou navegação por teclado, **quando** usar o painel, **então** controles permanecem acessíveis.

## Questões em aberto
- Validar nomenclatura e definição exata dos KPIs com a liderança.
- Confirmar mecanismo atual de navegação/estado de filtros antes de codificar drill-down.
- Definir período inicial e se haverá comparação temporal nesta primeira entrega.
