// ══════ INDICADORES: REGRAS PURAS (Spec 009) ══════
// Escolha do escopo no retrato mensal, a série de cada indicador, a tendência do mês e o
// desenho das minilinhas. Sem DOM, para serem testadas em Node. Meses em AAAA-MM.

type RetratoItem = { mes: string; tipo: string; nome: string; indicador: string; valor: number };
type AlvoRetrato = { tipo: string; nomes: string[] };

const regrasIndicadores = {
  FAIXAS: [['Até 17', 0, 17], ['18–24', 18, 24], ['25–34', 25, 34], ['35–49', 35, 49], ['50+', 50, 200]] as [string, number, number][],

  mes(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },

  // Os últimos n meses, do mais antigo ao atual
  meses(agora: Date, n: number): string[] {
    return Array.from({ length: n }, (_, i) => regrasIndicadores.mes(new Date(agora.getFullYear(), agora.getMonth() - n + 1 + i, 1)));
  },

  // Que linhas do retrato somar: a célula ou o setor do filtro; sem filtro, a área (quem vê
  // tudo), os setores ou as células de quem lidera
  alvo(escopo: { todos?: boolean; setores?: string[]; celulas?: string[] }, setor: string, celula: string): AlvoRetrato {
    if (celula) return { tipo: 'celula', nomes: [celula] };
    if (setor) return { tipo: 'setor', nomes: [setor] };
    if (escopo.todos) return { tipo: 'area', nomes: [''] };
    if (escopo.setores?.length) return { tipo: 'setor', nomes: escopo.setores };
    return { tipo: 'celula', nomes: escopo.celulas || [] };
  },

  // Valor de cada mês (soma das linhas do alvo) ou null quando o mês não tem retrato
  serie(retratos: RetratoItem[], indicador: string, alvo: AlvoRetrato, meses: string[]): (number | null)[] {
    return meses.map(m => {
      const linhas = retratos.filter(r => r.mes === m && r.indicador === indicador && r.tipo === alvo.tipo && alvo.nomes.includes(r.nome));
      return linhas.length ? linhas.reduce((s, r) => s + r.valor, 0) : null;
    });
  },

  // Quanto mudou desde o retrato do mês atual (o último da série)
  tendencia(vivo: number, serie: (number | null)[]): number | null {
    const base = serie[serie.length - 1];
    return base == null ? null : vivo - base;
  },
  textoTendencia(d: number | null): string {
    if (d == null) return '';
    return d === 0 ? 'igual no mês' : `${d > 0 ? '+' : '−'}${Math.abs(d)} no mês`;
  },

  pct(n: number, total: number): number {
    return total ? Math.round((n / total) * 100) : 0;
  },

  // Pontos da minilinha (viewBox 100 × 32), ignorando meses sem retrato. Menos de dois
  // pontos não formam linha: devolve ''.
  minilinha(valores: (number | null)[]): string {
    const v = valores.map((n, i) => [i, n] as [number, number | null]).filter((p): p is [number, number] => p[1] != null);
    if (v.length < 2) return '';
    const min = Math.min(...v.map(p => p[1])), max = Math.max(...v.map(p => p[1]));
    const x0 = v[0][0], x1 = v[v.length - 1][0];
    const y = (n: number): number => max === min ? 16 : 28 - ((n - min) / (max - min)) * 24;
    return v.map(([i, n]) => `${(((i - x0) / (x1 - x0)) * 100).toFixed(1)},${y(n).toFixed(1)}`).join(' ');
  },

  faixas(idades: number[]): [string, number][] {
    return regrasIndicadores.FAIXAS.map(([l, min, max]): [string, number] => [l, idades.filter(i => i >= min && i <= max).length]);
  }
};
