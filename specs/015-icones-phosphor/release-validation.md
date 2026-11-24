# Validação de release — Spec 015, ícones do painel e do formulário com o Phosphor

- Data: 2026-11-24
- Produção: v1.60.0, verificada pelo CI (`/version` e `/healthz`). O formulário público
  serve o espaço do cadeado (`data-ic="privado"`) e `admin/icones.js` responde 200 sob o CSP
  estrito. Sem migration e sem mudança no servidor.
- Entrega: T002 #185 (v1.60.0).

## Cenários de aceite

Validação no `vec-dev`, com servidor real e CSP. O **mesmo roteiro** rodou duas vezes: no
servidor de antes (`main` sem a troca) e no de depois. Cada rodada passou pelo formulário,
Área, Pessoas, ficha, Indicadores, Usuários e Estrutura, em 1440 e 390 px, e as capturas foram
comparadas. Dados: um cadastro fictício com duas etapas da jornada e um usuário temporário de
área com gerência; tudo removido ao fim. Resultado: **28 verificações aprovadas**.

| # | Cenário | Como foi verificado | Resultado |
|---|---|---|---|
| 1 | Painel com os ícones novos | 5 abas, 3 ações da barra (Sons, Atualizar, Sair) e as Ferramentas com `svg.ic`; CSV, lupa (medida dentro do campo), "+" de Nova pessoa, Novo usuário, Novo setor e Nova célula; setas das listas | ✅ |
| 2 | Ficha | "x", câmera da foto e ✓ das etapas feitas | ✅ |
| 3 | Formulário | Cadeado e ✓ de enviado do Phosphor; a marca continua desenhada à mão | ✅ |
| 4 | Leitor de tela | Todos os ícones são `aria-hidden`; os textos e `aria-label` dos botões não mudaram (diff) | ✅ |
| 5 | 390 e 1440 px | Nenhum espaço de ícone ficou vazio; sem rolagem lateral; zero violação de CSP | ✅ |

## Observações
- **"+" de texto a mais:** a captura achou mais três, além dos listados na spec: em "Nova
  pessoa" de Pessoas e em "Novo setor" e "Nova célula" de Estrutura. Também viraram ícone, e o
  teste de varredura agora pega esse padrão.
- **Fora de escopo, como combinado:** a marca, os avatares, os minigráficos, as linhas do leque,
  o "!" de cuidado e o "✓" das etapas do formulário desenhado pelo CSS.
- Produção: o painel por dentro não foi percorrido lá (exigiria criar um usuário).

## Rollback
Reverter #185 volta os ícones desenhados à mão. Nada muda nos dados.
