// ══════ GAVETA DA ÁREA: REGRAS PURAS (Spec 016) ══════
// Alturas da gaveta suspensa sobre o mapa, o estado ao soltar o arrasto e a linha de
// resumo. Sem DOM, para serem testadas em Node.

type EstadoGaveta = 'recolhida' | 'aberta';

const regrasGaveta = {
  MIN: 64,          // recolhida: só a alça e o resumo
  FRACAO: 0.85,     // aberta: 85% da altura do mapa
  ARREMESSO: 0.5,   // px/ms: acima disso, vale a direção do gesto

  aberta(palco: number): number {
    return Math.max(regrasGaveta.MIN, Math.round(palco * regrasGaveta.FRACAO));
  },
  limitar(h: number, palco: number): number {
    return Math.min(Math.max(h, regrasGaveta.MIN), regrasGaveta.aberta(palco));
  },
  altura(estado: EstadoGaveta, palco: number): number {
    return estado === 'aberta' ? regrasGaveta.aberta(palco) : regrasGaveta.MIN;
  },

  // Ao soltar: um gesto rápido vale pela direção (velocidade > 0 = subindo); devagar, vai
  // para o estado mais próximo.
  soltar(h: number, velocidade: number, palco: number): EstadoGaveta {
    if (Math.abs(velocidade) >= regrasGaveta.ARREMESSO) return velocidade > 0 ? 'aberta' : 'recolhida';
    return h >= (regrasGaveta.MIN + regrasGaveta.aberta(palco)) / 2 ? 'aberta' : 'recolhida';
  },

  // "Fale com eles · 3 precisam de cuidado"
  resumo(cuidado: number, pessoas: number): string {
    if (cuidado) return `Fale com eles · ${cuidado} ${cuidado === 1 ? 'precisa' : 'precisam'} de cuidado`;
    return pessoas ? 'Fale com eles · ninguém precisando de cuidado' : 'Mais da Área';
  }
};
