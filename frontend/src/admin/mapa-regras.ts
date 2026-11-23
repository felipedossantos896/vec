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
  LEQUE_CIRCULO: 8, // até 8 rostos em círculo; acima disso, espiral (Spec 012)

  // Posições do leque em pixels, em volta do centro da área (só visual: nenhuma posição real).
  // Círculo começando no alto, com folga entre os rostos; acima de 8, espiral de Arquimedes.
  leque(n: number, rosto: number): { x: number; y: number }[] {
    if (n <= 1) return n === 1 ? [{ x: 0, y: -Math.round(rosto * 1.2) }] : [];
    const passo = rosto + 8; // distância entre centros vizinhos
    if (n <= regrasMapa.LEQUE_CIRCULO) {
      const r = Math.max(rosto * 1.2, passo / (2 * Math.sin(Math.PI / n)));
      return Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
        return { x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) };
      });
    }
    const out: { x: number; y: number }[] = [];
    let a = -Math.PI / 2, r = rosto * 1.3;
    const abre = (passo * 1.05) / (2 * Math.PI); // a espiral cresce uma "fileira" a cada volta
    for (let i = 0; i < n; i++) {
      out.push({ x: Math.round(r * Math.cos(a)), y: Math.round(r * Math.sin(a)) });
      const da = passo / r;
      a += da;
      r += abre * da;
    }
    return out;
  },

  // Tamanho do rosto no mapa (Spec 012): 40 px com o mapa afastado (zoom 12 ou menos) até
  // 60 px de perto (zoom 16); no celular, no máximo 52 px.
  tamanhoRosto(zoom: number, celular: boolean): number {
    const t = Math.round(40 + Math.min(Math.max(zoom - 12, 0), 4) * 5);
    return celular ? Math.min(t, 52) : t;
  },

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
