# Mapa da Área com o estilo Positron

Aprovada pelo responsável em 27/11/2026, depois de comparar OpenStreetMap, CARTO Voyager/Positron, OpenFreeMap Positron/Liberty e VersaTiles Colorful no mesmo trecho com pessoas fictícias. Issue #294.

- O fundo do mapa da Área passa a ser o estilo **Positron do OpenFreeMap**: vetorial, gratuito, sem chave e sem conta.
- Os marcadores, cartões, modos (Pessoas, Grupos, Casas), filtros e o ajuste de nomes continuam no Leaflet, sem mudança.
- Se o MapLibre não carregar, não houver WebGL ou o estilo falhar antes do primeiro desenho, o mapa volta ao OpenStreetMap atual.
- A atribuição "OpenFreeMap © OpenMapTiles © OpenStreetMap contributors" fica sempre visível.
- Só o painel e o worker local do MapLibre podem falar com `https://tiles.openfreemap.org`. As demais páginas mantêm a política da Spec 008.

Fora do escopo: zoom contínuo com MapLibre puro e tema escuro.

Contexto: o CARTO passou a exigir chave em 2026, e a integração com o MapTiler (#257) foi revertida no #261 a pedido do responsável.
