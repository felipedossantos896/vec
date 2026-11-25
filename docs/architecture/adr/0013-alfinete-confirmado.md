# ADR-0013 — Alfinete residencial confirmado

- Status: **Aceito** pelo responsável. Implementação na Spec 021.

## Contexto

O CEP e a geocodificação de rua podem posicionar o marcador longe do local desejado. O ADR-0011 mantém coordenadas automáticas em uma grade aproximada.

## Decisão

O painel pode mostrar a coordenada confirmada manualmente no editor e na Área. A pessoa autoriza especificamente a exibição, e o servidor só entrega o ponto dentro do mesmo escopo utilizado para ler e editar o endereço. Sem confirmação específica, a grade aproximada continua valendo. O consentimento para armazenar endereço não autoriza o ponto exato.

Usar as colunas existentes de geocodificação. A precisão `manual` é reservada à gravação autorizada do painel. O endereço pode voltar ao modo aproximado sem ser removido. O formulário público e o CSV continuam fora desse fluxo.

## Consequências e validação

Uma coordenada confirmada fica identificável para quem pode editar o endereço. O HTTP da API deve continuar sem cache e a aplicação não deve registrar a coordenada em logs. O fundo OpenStreetMap recebe requisições de tiles correspondentes à área visualizada, sem nomes, endereço textual ou coordenada do alfinete como parâmetros.

Testar autorização negativa, revogação, escrita concorrente, geocodificação atrasada e agrupamento misto.
