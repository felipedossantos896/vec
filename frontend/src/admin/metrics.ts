type ResumoIndicadores = {
  total: number;
  jornadaCompleta: number;
  mediaEtapas: number | null;
};

const metricasIndicadores = {
  etapasConcluidas(registro: Registro): number {
    return JORNADA.filter(([chave]) => registro[chave] === 'S').length;
  },

  semDiscipulador(registro: Registro): boolean {
    return !String(registro.discipulador || '').trim();
  },

  filtrar(registros: Registro[], setor: string, celula: string): Registro[] {
    return registros.filter(r => (!setor || r.setor === setor) && (!celula || r.celula === celula));
  },

  resumir(registros: Registro[]): ResumoIndicadores {
    const total = registros.length;
    const etapas = registros.reduce((soma, r) => soma + r._jornada, 0);
    const jornadaCompleta = registros.filter(r => r._jornada === JORNADA.length).length;
    return {
      total,
      jornadaCompleta,
      mediaEtapas: total ? etapas / total : null
    };
  }
};
