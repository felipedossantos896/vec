# ADR-0014 — Design Studio isolado da aplicação

- Status: **Aceito** para o Studio pelo responsável. A identidade de produção segue o ADR-0009.

O Studio permanece em `design-system/`, com HTML, CSS e JavaScript locais, fixtures fictícias e inventário de frames estáveis. A identidade candidata usa cloud, navy e azul como proporção visual 60/30/10. A janela de preview usa o tamanho CSS real de cada viewport e escala o conteúdo para caber no catálogo.

As telas precisam ser validadas no navegador, com movimento reduzido e dados fictícios. O servidor de produção oferece `/design-system` como redirecionamento para a hospedagem privada do catálogo, que controla o acesso e serve os arquivos do Studio.
