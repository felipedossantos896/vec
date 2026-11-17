"use strict";
// ══════ ACOMPANHAMENTO ══════
// Blocos da aba Indicadores que levam do número às pessoas: cada linha abre a lista ou o cadastro.
const PASSOS = [
    ['semDiscipulador', 'Sem discipulador'],
    ['batizar', 'Receberam Jesus e ainda não foram batizados'],
    ['quaseLa', 'Falta uma etapa para concluir a jornada'],
    ['naoFrequenta', 'Não congregam com frequência'],
    ['semCelula', 'Sem célula'],
    ['semVinculo', 'Informaram um discipulador que ainda não foi vinculado'],
    ['duplicados', 'Cadastros possivelmente duplicados']
];
// Interesse, título, treinamento que prepara para ele e nome curto do treinamento
const POTENCIAL = [
    ['querLiderar', 'Querem liderar célula', 'expresso02', 'Expresso 02'],
    ['querCuidar', 'Querem cuidar de pessoas', 'expresso01', 'Expresso 01'],
    ['querAnfitriao', 'Querem ser anfitriões', '', '']
];
const TONS = [8, 24, 40, 72, 100]; // cinco passos do claro ao escuro; o texto fica branco a partir do quarto
const sitEtapa = (k) => k === 'batismo' ? 'naoBatizados' : 'sem_' + k;
const curto = (nome) => nome.split(/\s+/).slice(0, 2).join(' ');
function nomes(rs) {
    const tres = rs.slice(0, 3).map(r => esc(curto(r.nome)));
    return rs.length > 3 ? `${tres.join(', ')} e mais ${rs.length - 3}` : tres.join(', ');
}
function pessoa(r, nota, tag = '', classe = '') {
    return `<li><button type="button" class="pessoa ${classe}" data-reg="${estado.regs.indexOf(r)}"><b>${esc(r.nome)}</b><span>${nota}</span>${tag}</button></li>`;
}
function proximosPassos(base) {
    const linhas = PASSOS.map(([k, titulo]) => {
        const g = base.filter(SITUACOES[k].f);
        return g.length ? `<li><button type="button" class="passo" data-sit="${k}"><b>${g.length}</b><span class="passo-t">${titulo}</span><span class="passo-n">${nomes(g)}</span></button></li>` : '';
    }).join('');
    return painel('Próximos passos', 'Quem precisa de um cuidado agora. Toque para abrir a lista.', linhas ? `<ul class="passos">${linhas}</ul>` : '<p class="vazio">Nenhuma pendência por aqui.</p>');
}
// Grade de setores e células pelas seis etapas. Uma célula fora da lista conhecida fica no
// setor mais citado pelos cadastros dela.
function mapaJornada(base) {
    const linha = (nome, rs, classe, alvo) => `<tr class="${classe}"><th scope="row">${esc(nome)} <small>${rs.length}</small></th>${JORNADA.map(([k, etapa]) => {
        const n = rs.filter(r => r[k] === 'S').length;
        const tom = TONS[Math.min(4, Math.floor((rs.length ? n / rs.length : 0) * 5))];
        const dica = esc(`${nome} · ${etapa}: ${n} de ${rs.length} concluíram`);
        const attrs = `class="mc${tom >= 72 ? ' hi' : ''}" style="--t:${tom}%" data-tip="${dica}" aria-label="${dica}"`;
        return `<td>${alvo === null ? `<span ${attrs}>${n}</span>` : `<button type="button" ${attrs} data-sit="${sitEtapa(k)}" ${alvo}>${n}</button>`}</td>`;
    }).join('')}</tr>`;
    const porCelula = {};
    base.forEach(r => { var _a; if (r.celula)
        (porCelula[_a = r.celula] || (porCelula[_a] = [])).push(r); });
    const setorDe = (c) => {
        if (SETOR_DA_CELULA[c])
            return SETOR_DA_CELULA[c];
        const rs = porCelula[c];
        const cont = {};
        rs.forEach(r => { if (r.setor)
            cont[r.setor] = (cont[r.setor] || 0) + 1; });
        return Object.keys(cont).sort((a, b) => cont[b] - cont[a])[0] || '';
    };
    const celulas = distintos('celula', CELULAS).filter(c => porCelula[c]);
    const setores = distintos('setor', SETORES).filter(s => base.some(r => r.setor === s) || celulas.some(c => setorDe(c) === s));
    let linhas = linha(estado.celula || estado.setor || 'Total', base, 'total', '');
    if (celulas.length > 1) {
        const grupos = setores.length > 1 ? [...setores, ''] : [''];
        grupos.forEach(s => {
            const dentro = celulas.filter(c => setores.length < 2 || setorDe(c) === s);
            if (s)
                linhas += linha(s, base.filter(r => r.setor === s), 'setor', `data-setor="${esc(s)}"`);
            linhas += dentro.map(c => linha(c, porCelula[c], 'cel', `data-cel="${esc(c)}"`)).join('');
        });
        const sem = base.filter(r => !r.celula);
        if (sem.length)
            linhas += linha('Sem célula', sem, 'setor', null);
    }
    return painel('Mapa da jornada', 'Quantos concluíram cada etapa. Toque num número para ver quem ainda falta.', `<table class="mapa"><thead><tr><td></td>${JORNADA.map(([, etapa], i) => `<th scope="col" aria-label="${etapa}">${i + 1}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table>
     <ol class="mapa-leg">${JORNADA.map(([, etapa]) => `<li>${etapa}</li>`).join('')}</ol>
     <p class="escala" aria-hidden="true">menos${TONS.map(t => `<i style="--t:${t}%"></i>`).join('')}mais gente concluiu</p>`);
}
function potencial(base) {
    return POTENCIAL.map(([sit, titulo, treino, nomeTreino]) => {
        const pronto = (r) => !treino || r[treino] === 'S';
        const g = base.filter(SITUACOES[sit].f).sort((a, b) => Number(pronto(b)) - Number(pronto(a)) || a.nome.localeCompare(b.nome, 'pt-BR'));
        const sub = !g.length ? 'Ninguém marcou esse interesse.' : treino ? `${g.filter(pronto).length} de ${g.length} já fizeram o ${nomeTreino}.` : `${plural(g.length, 'pessoa disposta', 'pessoas dispostas')} a abrir a casa.`;
        const lista = g.slice(0, 6).map(r => pessoa(r, esc(r.celula || 'Sem célula'), treino ? `<em class="tag ${pronto(r) ? 'ok' : ''}">${pronto(r) ? 'Fez o' : 'Falta o'} ${nomeTreino}</em>` : '')).join('');
        const todos = g.length > 6 ? `<button type="button" class="btn-link" data-sit="${sit}">Ver todas as ${g.length} pessoas</button>` : '';
        return painel(titulo, sub, g.length ? `<ul class="pessoas">${lista}</ul>${todos}` : '');
    }).join('');
}
function aniversarios(base) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const proximos = base.map(r => {
        if (!r._nasc)
            return null;
        let d = new Date(hoje.getFullYear(), r._nasc.getMonth(), r._nasc.getDate());
        if (d < hoje)
            d = new Date(hoje.getFullYear() + 1, r._nasc.getMonth(), r._nasc.getDate());
        return { r, d, dias: Math.round((d.getTime() - hoje.getTime()) / 864e5), anos: d.getFullYear() - r._nasc.getFullYear() };
    }).filter((a) => !!a && a.dias <= 30).sort((a, b) => a.dias - b.dias);
    const quando = (a) => a.dias === 0 ? 'Hoje' : a.dias === 1 ? 'Amanhã' : a.d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '');
    const lista = proximos.map(a => pessoa(a.r, `faz ${a.anos} anos · ${esc(a.r.celula || 'Sem célula')}`, `<em class="tag ${a.dias === 0 ? 'ok' : ''}">${quando(a)}</em>`)).join('');
    return painel('Aniversariantes', 'Quem faz aniversário nos próximos 30 dias.', lista ? `<ul class="pessoas rolar">${lista}</ul>` : '<p class="vazio">Nenhum aniversário nos próximos 30 dias.</p>');
}
function sugestoes(base) {
    const g = base.filter(r => r.sugestao);
    const lista = g.map(r => `<li><button type="button" class="pessoa sug" data-reg="${estado.regs.indexOf(r)}"><b>“${esc(r.sugestao)}”</b><span>${esc(curto(r.nome))} · ${esc(r.celula || 'Sem célula')}</span></button></li>`).join('');
    return painel('Sugestões para as células', g.length ? `${plural(g.length, 'sugestão recebida', 'sugestões recebidas')}, da mais recente para a mais antiga.` : 'O que as pessoas escreveram no formulário.', lista ? `<ul class="pessoas rolar">${lista}</ul>` : '<p class="vazio">Ninguém deixou sugestão ainda.</p>');
}
// Um toque num número leva à aba Cadastros já filtrada; num nome, abre o cadastro
$('gConteudo').addEventListener('click', e => {
    const alvo = e.target instanceof Element ? e.target.closest('[data-sit], [data-reg]') : null;
    if (!alvo)
        return;
    if (alvo.dataset.reg) {
        const r = estado.regs[Number(alvo.dataset.reg)];
        if (r)
            abrirDetalhe(r);
        return;
    }
    estado.situacao = alvo.dataset.sit || 'todos';
    if (alvo.dataset.setor) {
        estado.setor = alvo.dataset.setor;
        estado.celula = '';
    }
    if (alvo.dataset.cel)
        estado.celula = alvo.dataset.cel;
    estado.busca = '';
    $('fBusca').value = '';
    $('tip').classList.add('hidden');
    mostrarAba('cadastros');
    renderTudo();
    $('registrationsTitle').scrollIntoView({ block: 'start' });
});
