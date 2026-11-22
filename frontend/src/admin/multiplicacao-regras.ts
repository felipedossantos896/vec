// ══════ MULTIPLICAÇÃO: REGRAS PURAS (Spec 005) ══════
// Mover pessoas entre os dois grupos e montar os textos do painel, sem tocar no
// DOM, para poderem ser testados em Node. Os cálculos ficam no servidor.

type GrupoMult = { linhas: number[]; semPosicao: number[]; membros: number; casas: CasaRanking[] };
type Multiplicacao = {
  celula: string; automatica: boolean; ajustada: boolean; mesmaPrimeira: boolean; minimo: number;
  grupos: GrupoMult[];
  foraDoRanking: { interessadosSemConfirmacao: number; confirmadosSemPosicao: number };
};

const regrasMult = {
  AVISO_SIMULACAO: 'Simulação: nada é gravado e ninguém muda de célula.',

  // Leva a pessoa para o grupo de destino (0 ou 1); devolve novas listas.
  mover(grupos: number[][], linha: number, destino: number): number[][] {
    const novos = grupos.map(g => g.filter(l => l !== linha));
    novos[destino].push(linha);
    return novos;
  },

  pessoas(n: number): string {
    return `${n} ${n === 1 ? 'pessoa' : 'pessoas'}`;
  },

  titulo(g: GrupoMult, i: number): string {
    return `Grupo ${i + 1} · ${regrasMult.pessoas(g.linhas.length)}`;
  },

  // Frase anunciada depois de mover alguém.
  anuncio(nome: string, destino: number, grupos: number[][]): string {
    return `${nome} foi para o grupo ${destino + 1}. Grupo 1 com ${regrasMult.pessoas(grupos[0].length)}; grupo 2 com ${regrasMult.pessoas(grupos[1].length)}.`;
  },

  avisos(m: Multiplicacao): string[] {
    const out: string[] = [];
    if (!m.automatica && !m.ajustada) {
      out.push(`Menos de ${m.minimo} membros com endereço localizado: não há proposta automática. Monte os grupos movendo as pessoas.`);
    }
    const sem = m.grupos.reduce((n, g) => n + g.semPosicao.length, 0);
    if (sem) out.push(`${regrasMult.pessoas(sem)} sem posição ${sem === 1 ? 'foi posta' : 'foram postas'} num grupo sem cálculo; confira.`);
    if (m.mesmaPrimeira) out.push('A mesma casa é a primeira dos dois grupos; escolha casas diferentes para cada um.');
    if (m.grupos.some(g => !g.linhas.length)) out.push('Um dos grupos está vazio.');
    return out;
  }
};
