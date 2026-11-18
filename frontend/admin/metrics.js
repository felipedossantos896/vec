"use strict";
const metricasIndicadores = {
    etapasConcluidas(registro) {
        return JORNADA.filter(([chave]) => registro[chave] === 'S').length;
    },
    semDiscipulador(registro) {
        return !String(registro.discipulador || '').trim();
    },
    filtrar(registros, setor, celula) {
        return registros.filter(r => (!setor || r.setor === setor) && (!celula || r.celula === celula));
    },
    resumir(registros) {
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
