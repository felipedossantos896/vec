# ADR-0007 — Planejamento de novas células

- Status: **Aceito** em 2026-11-22 pelo responsável. A Spec 005 implementa a primeira versão: multiplicação de uma célula em dois grupos, só como simulação (nada é gravado nem muda de célula), no escopo de cada líder, com ajuste à mão e anfitriões por grupo. Planos salvos, mais grupos e concentrações no setor ficam para depois.
- Data: 2026-11-18

## Contexto
Há demanda para detectar concentrações territoriais e planejar multiplicação ou novas células entre membros de uma ou mais células/setores.

## Decisão proposta
Adicionar fluxo de planejamento separado da criação definitiva: selecionar membros autorizados, identificar agrupamentos, comparar anfitriões, revisar proposta e confirmar manualmente. Permitir cenários dentro de uma célula e entre células/setores apenas conforme permissões da liderança.

## Alternativas
Criar automaticamente novas células; restringir toda análise à célula atual.

## Consequências
Requer regras organizacionais e confirmação da liderança; não mover membros ou alterar células existentes automaticamente.

## Validação
Permissões entre setores, revisão antes de gravar, cancelamento de simulação e ausência de efeitos sobre dados de produção.
