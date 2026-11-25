# Spec 021 — Alfinete e correção manual no mapa

- Status: **Em implementação**, regra de acesso aprovada pelo responsável. [Issue #222](https://github.com/felipedossantos896/vec/issues/222).
- Relacionadas: Specs 002, 003, 012, 017 e 018, ADRs 0005, 0008 e 0011.

## Objetivo

Corrigir a localização no editor de endereço e mostrar o ponto confirmado no mapa da Área. Os círculos ficam conectados visualmente ao alfinete ancorado na coordenada.

## Requisitos

- Usar a localização derivada do endereço como ponto inicial, quando disponível. Permitir arrastar o alfinete, tocar ou clicar para posicionar e ajustar por teclado.
- A ficha e o mapa da Área exibem a posição exata após confirmação manual, para pessoas e perfis autorizados. A Área oferece ação de ajuste que abre o editor da ficha.
- Diferenciar pontos aproximados de pontos confirmados. Endereços antigos continuam com agrupamento aproximado até confirmação. O gesto de mover altera uma prévia e requer confirmação explícita para gravar.
- Ao mudar um endereço já confirmado, pedir nova confirmação do ponto. Uma resposta atrasada da geocodificação não pode substituir um ajuste manual.
- Manter zoom, régua, filtros, leque, cartões e ferramentas. Em pontos coincidentes, manter um alfinete e permitir abrir o leque sem deslocar a coordenada.

## Decisão de privacidade

O [ADR-0013](../../docs/architecture/adr/0013-alfinete-confirmado.md) complementa o ADR-0011. Quem pode editar o endereço no escopo pode ver e alterar o ponto confirmado nos dois lugares, com autorização específica da pessoa. A retirada da autorização volta à geocodificação aproximada, sem remover o endereço.

## Aceite

- CEP ou endereço impreciso: mover, cancelar sem gravar, confirmar e reabrir. O ponto confirmado coincide na ficha e na Área.
- Geocodificação atrasada, endereço alterado, ponto fora dos limites e edição concorrente têm resposta previsível.
- Sem autorização para o ponto exato, a API não o entrega. Fora do escopo, a leitura e a escrita são recusadas.
- Validar desktop, toque e teclado com dados fictícios, incluindo dois registros no mesmo ponto e a convivência com pontos aproximados.
