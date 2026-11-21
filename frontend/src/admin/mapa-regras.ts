// ══════ MAPA: REGRAS PURAS ══════
// Recorte dos dados do mapa pelo filtro atual, sem tocar no DOM nem no Leaflet,
// para poder ser testado em Node. O servidor já entrega só o escopo do usuário e
// só o centro de cada área de ~300 m (nunca a coordenada de alguém).

type GrupoMapa = { lat: number; lng: number; linhas: number[]; peloBairro: number };
type DadosMapa = { grupos: GrupoMapa[]; soCidade: number[]; naoLocalizados: number[]; pendentes: number[] };
type MapaFiltrado = {
  grupos: GrupoMapa[]; soCidade: number[]; naoLocalizados: number[]; pendentes: number[];
  semEndereco: number[]; noMapa: number;
};

const regrasMapa = {
  // Mantém só quem está no filtro de setor/célula; grupos que ficam vazios somem.
  filtrar(d: DadosMapa, visiveis: Set<number>): MapaFiltrado {
    const so = (ids: number[]): number[] => ids.filter(id => visiveis.has(id));
    const grupos = d.grupos.map(g => ({ ...g, linhas: so(g.linhas) })).filter(g => g.linhas.length > 0);
    const comEndereco = new Set<number>([...d.grupos.flatMap(g => g.linhas), ...d.soCidade, ...d.naoLocalizados, ...d.pendentes]);
    return {
      grupos,
      soCidade: so(d.soCidade),
      naoLocalizados: so(d.naoLocalizados),
      pendentes: so(d.pendentes),
      semEndereco: [...visiveis].filter(id => !comEndereco.has(id)).sort((a, b) => a - b),
      noMapa: grupos.reduce((n, g) => n + g.linhas.length, 0)
    };
  },

  pessoas(n: number): string {
    return `${n} ${n === 1 ? 'pessoa' : 'pessoas'}`;
  },

  // Frase de situação acima do mapa.
  resumo(f: MapaFiltrado): string {
    const fora = f.soCidade.length + f.naoLocalizados.length + f.pendentes.length + f.semEndereco.length;
    if (!f.noMapa && !fora) return 'Ninguém neste filtro.';
    const areas = f.grupos.length === 1 ? '1 área' : `${f.grupos.length} áreas`;
    return `${regrasMapa.pessoas(f.noMapa)} no mapa, em ${areas}` + (fora ? `; ${regrasMapa.pessoas(fora)} sem posição (lista abaixo).` : '.');
  }
};
