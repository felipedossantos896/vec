# Spec 020 — Trilhos de membro, discipulador e líder de célula

- Status: **Em implementação** · [Issue #220](https://github.com/felipedossantos896/vec/issues/220)
- Referências: ADR-0003, Specs 001, 009, 013 e 019.

## Objetivo

Mostrar três trilhos distintos na ficha. A fotografia da trajetória é referência de conteúdo. A numeração orienta a apresentação, enquanto os requisitos dependem das regras pastorais confirmadas.

## Mapeamento dos marcos

| Marco da referência | Campo existente ou decisão |
| --- | --- |
| Culto de celebração e novo nascimento | `recebeuJesus` registra o novo nascimento. Confirmar se é necessário comprovar participação no culto separadamente. |
| Café com o Pastor | `cafePastor` |
| Estação DNA | `estacaoDNA` |
| Servir em ministério | `serveMinisterio` |
| Ser membro de uma célula | Célula vinculada ao cadastro de membro. A filiação atual não informa a data de ingresso. |
| Nova Criatura | `novaCriatura` |
| Livro de Discipulado do Acompanhamento Inicial | `acompInicial`. Confirmar se a resposta atual é suficiente para comprovar conclusão do livro. |
| Batismo nas águas | `batismo` |
| Trilho do Discipulador | `expresso01` identifica treinamento de discipuladores. Confirmar se equivale à conclusão do trilho e se o trilho é obrigatório para todo membro. |
| Trilho do Líder de Célula | Opcional na referência. `expresso02` identifica treinamento de líderes. Confirmar se equivale à conclusão do trilho. |

## Regras e compatibilidade

- Conversão e vínculo à célula podem ocorrer em qualquer ordem. As demais etapas são independentes salvo pré-requisitos confirmados.
- Café com o Pastor e Nova Criatura são os pré-requisitos aplicados nesta entrega para marcar Batismo nas Águas no formulário e no painel. A importação histórica permanece compatível.
- Preservar batismos antigos, inclusive cadastros incompletos. Uma edição pode completar requisitos faltantes, mas não pode retirar um requisito já cumprido enquanto mantiver o batismo marcado.
- Exibir os dados de novo nascimento, Acompanhamento Inicial e treinamentos conforme registrados, sem inferir presença em culto, conclusão do livro ou conclusão dos trilhos de formação. A obrigatoriedade do trilho de discipulador e outros requisitos ficam para confirmação pastoral.
- Treinamento, conclusão de trilho e função de liderança são conceitos distintos. Nenhum marco concede acesso ou altera permissões.
- Manter o cálculo de seis etapas dos Indicadores, filtros e retratos mensais nesta entrega. O Batismo no Espírito continua no registro e nas métricas atuais.

## Aceite

- Ficha mostra os três trilhos e diferencia o opcional. Um membro com célula antes da conversão tem os respectivos marcos exibidos de forma independente.
- Nova marcação de batismo sem qualquer pré-requisito confirmado é recusada com indicação do que falta. Validar todos os fluxos de gravação cobertos, no servidor e na interface.
- Um batismo histórico sem dados completos continua visível e o cadastro aceita edições alheias à jornada.
- Em desktop e celular, verificar ficha, edição, formulário público, Meus discípulos, Indicadores e filtros. Usar dados fictícios e conferir que contagens existentes, datas registradas e escopos são preservados.
