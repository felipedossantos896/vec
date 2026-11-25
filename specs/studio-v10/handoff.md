# Handoff — V1.0

T001 / #232 em `codex/studio-v10`. O catálogo apresenta as duas galerias de referência e os 21 frames navegáveis. O ADR-0014 rege o isolamento, e o README explica como reproduzir as verificações. Adoção pela aplicação fica sujeita a uma decisão de produto independente.

O teste de inventário identifica cada frame por título e estado, e a galeria verifica contraste de texto, foco visível, retorno de foco e altura dos controles.

As suítes de Pessoas, Inventário, Movimento e Biblioteca passaram com Playwright e Chrome em Full HD, QHD, 4K e mobile. A suíte visual gravou e comparou as 92 capturas da V1.0. O PR registra os gates de CI e revisão, e as capturas acompanham o relatório de entrega.
