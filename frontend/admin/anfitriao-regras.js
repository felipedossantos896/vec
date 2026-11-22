"use strict";
// ══════ ANFITRIÃO: REGRAS PURAS (Spec 004) ══════
// Validação da confirmação e textos do ranking, sem tocar no DOM, para poderem ser
// testados em Node. As mesmas regras de validação são conferidas no servidor.
const regrasAnfitriao = {
    DIAS: [['seg', 'Segunda'], ['ter', 'Terça'], ['qua', 'Quarta'], ['qui', 'Quinta'], ['sex', 'Sexta'], ['sab', 'Sábado'], ['dom', 'Domingo']],
    MIN: 2,
    MAX: 50,
    MAX_OBS: 200,
    DESTAQUES: 3,
    // Erros por campo (vazio = válido), com as mesmas regras do servidor.
    validar(f, confirmacao) {
        const erros = {};
        const cap = f.capacidade.trim();
        if (!/^\d+$/.test(cap) || Number(cap) < regrasAnfitriao.MIN || Number(cap) > regrasAnfitriao.MAX) {
            erros.capacidade = `Informe quantas pessoas cabem, de ${regrasAnfitriao.MIN} a ${regrasAnfitriao.MAX}.`;
        }
        if (!regrasAnfitriao.ordenarDias(f.dias).length)
            erros.dias = 'Marque ao menos um dia possível.';
        if ([...f.observacao.trim()].length > regrasAnfitriao.MAX_OBS)
            erros.observacao = `Use no máximo ${regrasAnfitriao.MAX_OBS} caracteres.`;
        if (!confirmacao)
            erros.confirmacao = 'Marque a confirmação da pessoa para salvar.';
        return erros;
    },
    // Dias válidos, sem repetição e na ordem da semana.
    ordenarDias(dias) {
        const set = new Set(dias);
        return regrasAnfitriao.DIAS.map(([k]) => k).filter(k => set.has(k));
    },
    // "Terça e quinta", "Segunda, quarta e sexta", "Todos os dias".
    fmtDias(dias) {
        const ds = regrasAnfitriao.ordenarDias(dias);
        if (ds.length === 7)
            return 'Todos os dias';
        const nomes = ds.map(k => regrasAnfitriao.DIAS.find(([d]) => d === k)[1].toLowerCase());
        const txt = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : (nomes[0] || '');
        return txt.charAt(0).toUpperCase() + txt.slice(1);
    },
    km(n) {
        return `${n.toFixed(1).replace('.', ',')} km`;
    },
    membros(n) {
        return `${n} ${n === 1 ? 'membro' : 'membros'}`;
    },
    // A explicação de uma casa, em frases completas (é o que o leitor de tela lê).
    explicar(c, membrosCelula) {
        const linhas = [
            `Média de ${regrasAnfitriao.km(c.mediaKm)} até os membros; o mais longe fica a ${regrasAnfitriao.km(c.maxKm)}.`,
            `${c.considerados} de ${regrasAnfitriao.membros(membrosCelula)} no cálculo.`,
            c.comporta ? `Cabem ${c.capacidade} pessoas.` : `Não comporta o grupo: cabem ${c.capacidade} pessoas e a célula tem ${regrasAnfitriao.membros(membrosCelula)}.`,
            `Dias: ${regrasAnfitriao.fmtDias(c.dias).toLowerCase()}.`
        ];
        if (c.peloBairro)
            linhas.push('Casa localizada só pelo bairro: distância menos precisa.');
        return linhas;
    },
    destaque(i, c) {
        return i < regrasAnfitriao.DESTAQUES && c.comporta;
    },
    // Quem ficou de fora do ranking e por quê.
    avisos(r) {
        const out = [];
        const n = (v, um, varios) => `${v} ${v === 1 ? um : varios}`;
        if (r.semPosicao)
            out.push(`${n(r.semPosicao, 'membro sem posição ficou', 'membros sem posição ficaram')} fora do cálculo.`);
        const f = r.foraDoRanking;
        if (f.interessadosSemConfirmacao)
            out.push(`${n(f.interessadosSemConfirmacao, 'pessoa marcou', 'pessoas marcaram')} interesse em ser anfitrião e ainda não ${f.interessadosSemConfirmacao === 1 ? 'tem' : 'têm'} confirmação.`);
        if (f.confirmadosSemPosicao)
            out.push(`${n(f.confirmadosSemPosicao, 'anfitrião confirmado não tem', 'anfitriões confirmados não têm')} endereço localizado pela rua ou pelo bairro.`);
        return out;
    },
    // Célula do ranking: a do filtro ou, se o escopo só tem uma, essa.
    celulaAlvo(filtro, celulas) {
        return filtro || (celulas.length === 1 ? celulas[0] : '');
    }
};
