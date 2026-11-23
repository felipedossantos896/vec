"use strict";
// ══════ PESSOAS: REGRAS PURAS (Spec 009) ══════
// Etiquetas de cuidado da ficha, o "há N dias" da tabela, a paginação da lista e o que
// a confirmação de exclusão avisa. Sem DOM, para serem testadas em Node.
const regrasPessoas = {
    PAGINA: 50,
    dias(de, agora) {
        return Math.max(0, Math.floor((agora.getTime() - de.getTime()) / 864e5));
    },
    // "hoje", "há 1 dia", "há N dias" ou "sem contato"
    haQuanto(contato, agora) {
        if (!contato)
            return 'sem contato';
        const d = regrasPessoas.dias(contato, agora);
        return d < 1 ? 'hoje' : d === 1 ? 'há 1 dia' : `há ${d} dias`;
    },
    // Etiquetas do topo da ficha, na ordem de prioridade do cuidado
    etiquetas(p, agora) {
        const t = [];
        if (regrasContato.semContato(p.contato, p.lembrete, agora))
            t.push(p.contato ? `${regrasPessoas.dias(p.contato, agora)} dias sem contato` : 'Sem contato registrado');
        if (p.semDiscipulador)
            t.push('Sem discipulador');
        if (!p.celula)
            t.push('Sem célula');
        if (p.duplicados > 1)
            t.push('Possível duplicado');
        return t;
    },
    // Quantas linhas mostrar: a página cresce de PAGINA em PAGINA
    visiveis(total, limite) {
        const mostra = Math.min(total, Math.max(limite, 0));
        return { mostra, resta: total - mostra };
    },
    // O que acontece ao excluir, para a confirmação
    consequencias(nome, anotacoes, discipulos) {
        const c = [];
        if (anotacoes)
            c.push(anotacoes === 1 ? '1 anotação de acompanhamento deixa de aparecer.' : `${anotacoes} anotações de acompanhamento deixam de aparecer.`);
        if (discipulos)
            c.push(discipulos === 1 ? `Quem tinha ${nome} como discipulador fica sem vínculo.` : `As ${discipulos} pessoas que tinham ${nome} como discipulador ficam sem vínculo.`);
        return c;
    }
};
