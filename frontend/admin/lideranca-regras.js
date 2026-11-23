"use strict";
// ══════ LIDERANÇA SEM CÉLULA (Spec 013): REGRAS PURAS ══════
// Papel do cadastro: membro de célula, líder de setor ou líder de área. Líderes não têm
// célula, não contam nas células nem nos indicadores; só o líder de setor tem trilha.
// Sem DOM, para serem testadas em Node.
const regrasLideranca = {
    PAPEIS: [['membro', 'Membro de célula'], ['lider_setor', 'Líder de setor'], ['lider_area', 'Líder de área']],
    papel(p) {
        return p.papel === 'lider_setor' || p.papel === 'lider_area' ? p.papel : 'membro';
    },
    ehMembro(p) { return regrasLideranca.papel(p) === 'membro'; },
    ehLider(p) { return !regrasLideranca.ehMembro(p); },
    // Jornada, cuidado e discipulador: membros e líder de setor (que pode vir a ser de área)
    temTrilha(p) { return regrasLideranca.papel(p) !== 'lider_area'; },
    // "Líder de área", "Líder do setor Fogo no Altar" ou "" para membro
    rotulo(p) {
        const x = regrasLideranca.papel(p);
        if (x === 'lider_area')
            return 'Líder de área';
        if (x === 'lider_setor')
            return p.setor ? `Líder do setor ${p.setor}` : 'Líder de setor';
        return '';
    },
    rotuloCurto(p) {
        const x = regrasLideranca.papel(p);
        return x === 'lider_area' ? 'Líder de área' : x === 'lider_setor' ? 'Líder de setor' : '';
    },
    // Lista de discipuladores: liderança primeiro (área, depois setor), depois os membros
    ordemDiscipuladores(lista) {
        const peso = (p) => regrasLideranca.papel(p) === 'lider_area' ? 0 : 1;
        const lideranca = lista.filter(regrasLideranca.ehLider).sort((a, b) => peso(a) - peso(b) || a.nome.localeCompare(b.nome, 'pt-BR'));
        return { lideranca, membros: lista.filter(regrasLideranca.ehMembro) };
    }
};
