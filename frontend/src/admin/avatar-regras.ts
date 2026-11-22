// ══════ AVATAR ILUSTRADO (Spec 009, ADR-0011) ══════
// Rosto desenhado em SVG para quem não tem foto. Sai só de um número (o do cadastro):
// nunca usa nome, idade ou qualquer dado pessoal, e o mesmo número dá sempre o mesmo
// rosto. Sem estilo inline nem ids (o CSP é estrito e o mesmo rosto pode repetir na
// página); o recorte redondo vem do CSS do .av.

const regrasAvatar = {
  PELES: ['#f2d3b8', '#e8b993', '#c98e64', '#a86b45', '#7a4a2e', '#f5dcc8'],
  CABELOS: ['#2b1d14', '#4a2f1f', '#1b1b1b', '#7b4a26', '#b9884f', '#6b6b6b', '#3a2418'],
  ROUPAS: ['#0e8a8c', '#d99a00', '#e2552b', '#7450d0', '#2f6fde', '#c23c7e', '#5c8a2e', '#15171c'],

  // Gerador pseudoaleatório pequeno e estável (mulberry32), semeado pelo número.
  sorteio(semente: number): () => number {
    let a = (Math.abs(Math.trunc(semente)) * 2654435761) >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  // Traços escolhidos pelo número: pele, cabelo, penteado, barba e cor da roupa.
  tracos(semente: number): { pele: string; cabelo: string; estilo: number; barba: boolean; roupa: string } {
    const r = regrasAvatar.sorteio(semente);
    const de = <T>(l: T[]): T => l[Math.floor(r() * l.length)];
    return { pele: de(regrasAvatar.PELES), cabelo: de(regrasAvatar.CABELOS), estilo: Math.floor(r() * 5), barba: r() < 0.25, roupa: de(regrasAvatar.ROUPAS) };
  },

  svg(semente: number, roupa?: string): string {
    const t = regrasAvatar.tracos(semente);
    const c = t.cabelo;
    const cabelo = [
      `<path d="M28 44Q30 22 50 21Q70 22 72 44Q66 32 50 31Q34 32 28 44Z" fill="${c}"/>`,
      `<path d="M26 66Q22 26 50 20Q78 26 74 66L70 66Q70 36 50 32Q30 36 30 66Z" fill="${c}"/>`,
      `<circle cx="50" cy="20" r="9" fill="${c}"/><path d="M29 44Q31 24 50 23Q69 24 71 44Q64 33 50 33Q36 33 29 44Z" fill="${c}"/>`,
      `<path d="M30 40Q34 26 50 26Q66 26 70 40Q60 34 50 35Q40 34 30 40Z" fill="${c}" opacity=".85"/>`,
      `<path d="M27 50Q24 24 50 20Q76 24 73 50Q70 40 64 37Q58 30 50 31Q38 31 33 40Q29 44 27 50Z" fill="${c}"/><circle cx="34" cy="34" r="9" fill="${c}"/><circle cx="66" cy="34" r="9" fill="${c}"/>`
    ][t.estilo];
    const atras = t.estilo === 1 || t.estilo === 4;
    const barba = t.barba ? `<path d="M38 56Q50 70 62 56Q60 64 50 66Q40 64 38 56Z" fill="${c}" opacity=".7"/>` : '';
    return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><rect width="100" height="100" fill="#f3efe7"/>` +
      `<path d="M14 104Q16 74 50 72Q84 74 86 104Z" fill="${roupa || t.roupa}"/><rect x="43" y="58" width="14" height="16" fill="${t.pele}"/>` +
      (atras ? cabelo : '') + `<ellipse cx="50" cy="45" rx="19" ry="22" fill="${t.pele}"/>${barba}` +
      `<circle cx="43" cy="45" r="2.1" fill="#2a1d15"/><circle cx="57" cy="45" r="2.1" fill="#2a1d15"/>` +
      `<path d="M44 55Q50 59 56 55" stroke="#8a4a3a" stroke-width="2" fill="none" stroke-linecap="round"/>` +
      (atras ? '' : cabelo) + `</svg>`;
  }
};
