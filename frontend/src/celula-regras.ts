// ══════ CÉLULA: REGRAS PURAS (Spec 009) ══════
// Cor, dia e horário do encontro de cada célula, usados no painel e no formulário
// público. Sem DOM, para serem testadas em Node. A cor chega ao elemento por data-cor
// (o CSP não permite style inline) e vira a variável --cel.

const regrasCelula = {
  // Cores sugeridas, na ordem em que as células aparecem quando ainda não têm cor.
  PALETA: ['#0e8a8c', '#d99a00', '#e2552b', '#7450d0', '#2f6fde', '#c23c7e', '#5c8a2e', '#15171c'],
  DIAS: [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo']] as [string, string][],
  SEM_COR: '#b7b3a8',

  corValida(c: unknown): c is string {
    return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  },

  // Cor definida em Ajustes ou, sem ela, a da paleta pela posição da célula.
  cor(definida: string, posicao: number): string {
    if (regrasCelula.corValida(definida)) return definida.toLowerCase();
    return posicao >= 0 ? regrasCelula.PALETA[posicao % regrasCelula.PALETA.length] : regrasCelula.SEM_COR;
  },

  // "20:00" → "20h", "19:30" → "19h30"; vazio fica vazio.
  hora(h: string): string {
    const m = /^(\d{2}):(\d{2})$/.exec(h || '');
    if (!m) return '';
    return `${Number(m[1])}h${m[2] === '00' ? '' : m[2]}`;
  },

  // Curto para o painel ("Ter · 20h") e por extenso para o formulário ("Terças, 20h").
  encontro(dia: string, horario: string, extenso = false): string {
    const d = regrasCelula.DIAS.find(([k]) => k === dia);
    const h = regrasCelula.hora(horario);
    if (!d) return h;
    const nome = extenso ? `${d[1]}s` : d[1].slice(0, 3);
    return h ? `${nome}${extenso ? ',' : ' ·'} ${h}` : nome;
  }
};
