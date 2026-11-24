# Spec 018 — Mapa de inteligência pastoral

- Status: **Proposta** — requer aprovação explícita antes da implementação.
- Data: 2026-11-24
- ADRs: 0005, 0006, 0007, 0008, 0009, 0010, 0011 e [0013 (proposto)](../../docs/architecture/adr/0013-camadas-mapa-pastoral.md).
- Relacionadas: Specs 003, 004, 005, 009, 012, 014, 016 e 017.

## Objetivo
Evoluir a Área para central visual de acompanhamento pastoral, com mapa legível, busca, ações rápidas e planejamento territorial, preservando a identidade, privacidade e recursos já entregues.

## Escopo e prioridades
### P0 — experiência principal
- Mapa ocupa o espaço disponível (Spec 016). Barra superior única com busca, setor, célula e limpar filtros; painel flutuante compacto com KPIs, lentes e ferramentas. Superfícies claras de alto contraste sobre o mapa, mantendo menu grafite e tokens da identidade; validar preview antes de codificar. Menu compacto opcional, sem perder nomes acessíveis.
- Enquadrar pontos filtrados considerando overlays, gaveta e viewport; botão reenquadrar. Evitar centralizar no oceano quando há pontos visíveis.
- Marcadores com foto/avatar e cor da célula; indicador de atenção prioritário único. Papéis e anfitrião continuam disponíveis no cartão e em ferramentas. Grupos por zoom agregam exclusivamente centros aproximados já autorizados; áreas coincidentes nunca são desagregadas abaixo da precisão original.
- Card da Spec 017 é baseline, não reimplementação: manter hover, clique fixo, toque, ações com texto, foco, motivo real e fallback sem telefone. Acrescentar, se dados existentes permitirem, seis etapas independentes identificadas por nome/estado; não inferir sequência. Exibir progressivamente para evitar cobrir o mapa.

### P1 — acompanhamento
- Busca por nome ou célula no conjunto já autorizado, com resultados acessíveis inclusive sem localização; escolher resultado localiza o centro aproximado quando disponível ou abre ficha.
- Evoluir gaveta existente para Central de cuidado: resumo, filtros por situação, lista com motivo real, localizar, contato, registro de contato e ficha. Manter ordenação de urgência existente; não confundir abrir WhatsApp com contato registrado.
- Modos Pessoas e Cuidado, com legenda textual e filtros persistentes durante a sessão. Cuidado realça a lente existente, sem inventar classificação. Separar modo (representação) de filtro (conjunto).
- Avaliar mapa base de baixo contraste e modo escuro; manter estilo atual como fallback e atribuição visível. Não trocar provedor automaticamente.

### P2 — inteligência territorial (condicionada a revisão)
- Territórios: agrupamentos aproximados por célula, não limites oficiais nem polígonos de residências. Calor: densidade de pessoas ou cuidado somente agregada, com limiar e proteção de inferência aprovados; caso insuficiente, não renderizar.
- Anfitrião: aprimorar comparação visual da solução já existente por distância em linha reta; distinguir distância de tempo. Rotas/isochronas dependem de aprovação específica de provedor, custo, privacidade e ADR próprio.
- Multiplicação: aprimorar leitura dos dois grupos simulados, legenda, comparação e ajuste manual; nenhuma alteração cadastral automática.

## Regras transversais
- Escopos AREA/SETOR/CELULA/DISCIPULADOR conforme permissões já existentes; não ampliar acesso nem habilitar mapa para perfil sem autorização.
- Somente centros aproximados de ~300 m no mapa; não buscar/reconstruir coordenadas exatas. Endereço só na ficha autorizada. Busca não consulta geocodificador com nomes.
- Contagens derivam do mesmo universo autorizado; grupos de cuidado podem se sobrepor; contar cada pessoa uma vez por universo. Separar total de pessoas de total com localização.
- Manter controles atuais, escopo, som e comportamento de gaveta/cartão; nada inline (CSP), usar tokens e ícones existentes. Não enviar nomes, fotos, endereços ou status pastoral a provedor cartográfico.
- Sem novas migrations, serviços pagos, histórico presumido de contato ou mudança de stack nesta proposta.

## Aceite
1. Em 390×844 e 1440×900, filtros, painel, gaveta, card e atribuição ficam acessíveis sem rolagem lateral; gesto do mapa não move gaveta.
2. Alterar setor/célula/lente atualiza contagens, lista, grupos e enquadramento sem incluir pessoas fora do escopo; zero resultados têm estado vazio.
3. Busca com acentos e nomes semelhantes seleciona pessoa correta; sem localização oferece ficha e não inventa ponto; limpar restaura conjunto.
4. Zoom distante agrega grupos; zoom próximo preserva áreas originais e leque de co-localizados, sem exposição de precisão adicional.
5. Foto ausente usa avatar; atenção corresponde à regra atual; papéis continuam acessíveis; hover/toque/teclado, WhatsApp e ficha mantêm comportamento da Spec 017.
6. Jornada, quando exibida, conta seis etapas independentes; dados ausentes não viram etapa concluída.
7. Central permite localizar e contatar; registro exige ação explícita e atualiza dados pelo fluxo atual; sem telefone continua atendível.
8. Modo cuidado e modo pessoas respeitam os mesmos filtros e legenda; mudança não altera dados.
9. Agregações P2 não exibem grupos abaixo do limiar aprovado nem permitem inferência por diferenças de filtros; até revisão positiva permanecem desabilitadas.
10. Anfitrião distingue Haversine de tempo de rota; multiplicação continua simulação reversível sem escrita.
11. Testes negativos por perfil, sessão expirada, erro de tiles/API, zero violação CSP, foco visível, contraste AA, movimento reduzido e alternativa em lista.
12. Medir baseline e resultado com fixtures sintéticas de 14, 100 e 1000 pessoas; registrar tempos de renderização/interação e investigar regressão superior a 20% em ambiente equivalente antes de release.

## Questões para aprovação
Preview claro versus painel escuro atual; menu compacto opcional; apresentação das etapas; limiar/estratégia de supressão do P2; necessidade real de novo provedor. Nenhuma decisão pendente autoriza implementação dessa parte.
