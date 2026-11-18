# ADR-0004 — Endereços e geocodificação de membros

- Status: **Proposto**
- Data: 2026-11-18

## Contexto
O esquema inicial armazena respostas do formulário em `respostas` e não inclui endereço geográfico. O projeto usa Turso/SQLite e migrations versionadas.

## Decisão proposta
Adicionar cadastro de endereço opcional por membro, com CEP, logradouro, número, complemento, bairro, cidade, UF e coordenadas obtidas por geocodificação. Permitir confirmação/correção do ponto e armazenar qualidade/fonte da geocodificação. Separar o endereço da resposta pública quando necessário para aplicar permissões específicas. Criar migrations novas e migração compatível com registros antigos.

## Alternativas
Guardar apenas bairro/CEP; usar coordenadas digitadas; geocodificar somente em memória.

## Consequências
Exige escolha de provedor, avaliação de custo, limites, retenção e precisão. Endereço não deve ser obrigatório para continuar usando o sistema.

## Validação
Casos de CEP incompleto, endereço ambíguo, correção manual, ausência de coordenadas e migração sem perda de dados.
