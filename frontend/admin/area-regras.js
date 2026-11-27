"use strict";
// ══════ ÁREA: REGRAS PURAS (Spec 009, ADR-0010) ══════
// Ordem de urgência de "Fale com eles", texto do motivo, rótulo de cada ponto do mapa e
// link do WhatsApp. Sem DOM, para serem testadas em Node.
const regrasArea = {
    LENTES: [['todos', 'Todos'], ['semDisc', 'Sem discipulador'], ['servir', 'Prontos para servir']],
    DIAS_ALERTA: 60,
    // Quanto maior, mais urgente: tempo sem contato pesa mais; sem contato nenhum conta
    // como o mais longo; sem discipulador, sem célula e sem batismo somam.
    prioridade(p) {
        const dias = p.diasSemContato === null ? 365 : Math.min(p.diasSemContato, 365);
        return dias + (p.semDiscipulador ? 40 : 0) + (p.semCelula ? 30 : 0) + (p.naoBatizado ? 20 : 0);
    },
    // Até `n` pessoas, da mais urgente para a menos; empate pelo nome.
    urgentes(lista, n) {
        return [...lista].sort((a, b) => regrasArea.prioridade(b) - regrasArea.prioridade(a) || a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, n);
    },
    // A frase do motivo principal (uma linha, sem quebrar).
    motivo(p) {
        if (p.diasSemContato === null)
            return 'Nenhum contato registrado';
        if (p.diasSemContato >= regrasArea.DIAS_ALERTA)
            return `${p.diasSemContato} dias sem contato`;
        if (p.semDiscipulador)
            return 'Sem discipulador';
        if (p.semCelula)
            return 'Sem célula';
        if (p.naoBatizado)
            return 'Sem batismo';
        return `${p.diasSemContato} dias sem contato`;
    },
    // Rótulo do ponto no mapa: o primeiro nome se for uma pessoa, senão a contagem.
    rotulo(nomes) {
        if (!nomes.length)
            return '';
        return nomes.length === 1 ? nomes[0].split(/\s+/)[0] : `${nomes.length} pessoas`;
    },
    // Link do WhatsApp para um telefone brasileiro com DDD (10 ou 11 dígitos); '' se inválido.
    whatsapp(tel) {
        const d = String(tel || '').replace(/\D/g, '');
        return d.length === 10 || d.length === 11 ? `https://wa.me/55${d}` : '';
    }
};
