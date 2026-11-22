"use strict";
// ══════ INDICADORES ══════
// Monta a aba Indicadores e seus gráficos de colunas. Os blocos sobre pessoas ficam na aba Acompanhar (acompanhamento.ts).
// A aba usa os mesmos filtros de setor e célula da aba Cadastros.
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const FAIXAS = [['até 17', 0, 17], ['18–24', 18, 24], ['25–34', 25, 34], ['35–44', 35, 44], ['45–59', 45, 59], ['60+', 60, 200]];
const VIDA = [
    ['Recebeu Jesus', r => r.recebeuJesus === 'S'],
    ['Congrega com frequência', r => r.frequentaCultos === 'S'],
    ['Serve em ministério', r => r.serveMinisterio === 'S'],
    ['Tem discipulador', r => !!r.discipulador]
];
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
// Colunas com o valor no topo; a mais alta ocupa toda a altura do gráfico
function colunas(itens, rotulo) {
    const max = Math.max(1, ...itens.map(i => i.n));
    return `<div class="chart-scroll" role="region" aria-label="${esc(rotulo)}" tabindex="0"><ol class="cols">${itens.map(i => `
    <li tabindex="0" data-tip="${esc(i.titulo)}" aria-label="${esc(i.titulo)}">
      <span class="col-plot" aria-hidden="true"><span class="col-v">${i.n || ''}</span><i data-h="${i.n / max}"></i></span>
      <span class="col-x" aria-hidden="true">${i.rotulo}<small>${i.sub || ''}</small></span>
    </li>`).join('')}</ol></div>`;
}
function painel(titulo, sub, corpo) {
    return `<section class="panel ui-card"><header class="panel-head"><h2>${titulo}</h2><p>${sub}</p></header>${corpo}</section>`;
}
function kpi(label, valor, nota, destaque = false) {
    return `<div class="stat kpi ui-kpi${destaque ? ' stat-primary' : ''}"><span>${label}</span><b>${valor}</b><small>${nota}</small></div>`;
}
function centralAtencao(base) {
    const itens = [
        ['jornadaIncompleta', 'Jornada incompleta', 'Pessoas que ainda não concluíram as seis etapas.'],
        ['semDiscipulador', 'Sem discipulador', 'Pessoas sem um discipulador informado.']
    ];
    return `<section class="attention" aria-labelledby="centralAtencao">
    <header class="indicator-heading"><div><p class="eyebrow">Ação</p><h2 id="centralAtencao">Central de atenção</h2></div><p>Os grupos podem se sobrepor e seguem o escopo selecionado.</p></header>
    <div class="attention-grid">${itens.map(([situacao, titulo, nota]) => {
        const n = base.filter(SITUACOES[situacao].f).length;
        return `<button type="button" class="attention-card" data-sit="${situacao}"${n ? '' : ' disabled'}><b>${n}</b><span>${titulo}</span><small>${nota}</small><em>${n ? 'Ver em Pessoas →' : 'Tudo em dia'}</em></button>`;
    }).join('')}</div></section>`;
}
// Cadastros recebidos em cada um dos últimos 12 meses, incluindo os meses sem nenhum
function porMes(base) {
    const hoje = new Date();
    return Array.from({ length: 12 }, (_, i) => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - 11 + i, 1);
        const n = base.filter(r => { const e = parseData(r.dataHora); return !!e && e.getFullYear() === d.getFullYear() && e.getMonth() === d.getMonth(); }).length;
        const mes = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return { rotulo: MESES[d.getMonth()], sub: i === 0 || d.getMonth() === 0 ? String(d.getFullYear()) : '', titulo: `${mes}: ${plural(n, 'cadastro', 'cadastros')}`, n };
    });
}
// Etapas da jornada marcadas como concluídas em cada um dos últimos 12 meses
function jornadaPorMes(base) {
    return porMes(base).map((col, i) => {
        const hoje = new Date();
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - 11 + i, 1);
        const cont = JORNADA.map(([k, etapa]) => [etapa, base.filter(r => {
                const e = r[k] === 'S' ? parseData(r.jornadaDatas?.[k]) : null;
                return !!e && e.getFullYear() === d.getFullYear() && e.getMonth() === d.getMonth();
            }).length]);
        const n = cont.reduce((a, [, c]) => a + c, 0);
        const detalhe = cont.filter(([, c]) => c).map(([etapa, c]) => `${c} ${etapa}`).join(', ');
        const mes = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return { ...col, n, titulo: `${mes}: ${plural(n, 'etapa concluída', 'etapas concluídas')}${detalhe ? ` (${detalhe})` : ''}` };
    });
}
function renderIndicadores() {
    const base = baseIndicadores();
    const resumo = metricasIndicadores.resumir(base);
    const total = resumo.total;
    if (!total) {
        $('gConteudo').innerHTML = `<div class="empty">${estado.regs.length ? 'Nenhum cadastro nesse setor ou célula.' : 'Ainda não há cadastros para mostrar.'}</div>`;
        return;
    }
    const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const novos = base.filter(r => (parseData(r.dataHora)?.getTime() ?? 0) >= limite).length;
    const idades = base.map(r => r._idade).filter((i) => i != null);
    const media = idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : null;
    const completa = resumo.jornadaCompleta;
    const etapas = resumo.mediaEtapas.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    const faixas = FAIXAS.map(([rotulo, min, max]) => {
        const n = idades.filter(i => i >= min && i <= max).length;
        return { rotulo, titulo: `${rotulo} anos: ${plural(n, 'pessoa', 'pessoas')} (${idades.length ? Math.round((n / idades.length) * 100) : 0}%)`, n };
    });
    const semIdade = total - idades.length;
    const lista = (itens) => `<ol class="meters">${itens.map(([l, n]) => medidor(l, n, total)).join('')}</ol>`;
    const sim = (grupo) => lista(grupo.map(([k, l]) => [l, base.filter(r => r[k] === 'S').length]));
    $('gConteudo').innerHTML =
        `<section class="indicator-section" aria-labelledby="indicadoresResumo">
    <header class="indicator-heading"><div><p class="eyebrow">Visão geral</p><h2 id="indicadoresResumo">Retrato atual</h2></div><p>Os números acompanham os filtros selecionados acima.</p></header>
    <div class="stats">${kpi('Total de pessoas', String(total), 'no escopo selecionado', true) +
            kpi('Novos em 30 dias', String(novos), `${Math.round((novos / total) * 100)}% dos cadastros`) +
            kpi('Idade média', media != null ? `${media}` : '—', media != null ? 'anos' : 'sem datas de nascimento') +
            kpi('Jornada completa', String(completa), `${Math.round((completa / total) * 100)}% concluíram as ${JORNADA.length} etapas`) +
            kpi('Etapas por pessoa', etapas, `em média, de ${JORNADA.length}`)}</div></section>
    ${centralAtencao(base)}
    <section class="indicator-section" aria-labelledby="indicadoresJornada">
    <header class="indicator-heading"><div><p class="eyebrow">Jornada</p><h2 id="indicadoresJornada">Caminho de desenvolvimento</h2></div><p>Cada etapa é contada de forma independente.</p></header>
    <div class="panels">${mapaJornada(base) + painel('Jornada mês a mês', 'Etapas marcadas como concluídas em cada mês, no formulário ou no painel.', colunas(jornadaPorMes(base), 'Jornada concluída por mês'))}</div></section>
    <section class="indicator-section" aria-labelledby="indicadoresPerfil">
    <header class="indicator-heading"><div><p class="eyebrow">Perfil</p><h2 id="indicadoresPerfil">Retrato da área</h2></div><p>Distribuição e participação das pessoas do escopo.</p></header>
    <div class="panels">${painel('Novos cadastros', 'Formulários recebidos por mês, nos últimos 12 meses.', colunas(porMes(base), 'Novos cadastros por mês')) +
            painel('Faixa etária', semIdade ? `Idade de ${idades.length} pessoas; ${plural(semIdade, 'cadastro', 'cadastros')} sem data válida.` : 'Idade de quem está cadastrado.', colunas(faixas, 'Distribuição por faixa etária')) +
            painel('Vida na igreja', 'Quem já vive cada prática.', lista(VIDA.map(([l, f]) => [l, base.filter(f).length]))) +
            painel('Treinamentos', 'Quem já fez ou participa.', sim(TREINOS))}</div></section>`;
}
// ── Dica ao passar o mouse ou focar uma coluna ──
function mostrarDica(e) {
    const alvo = e.target instanceof Element ? e.target.closest('[data-tip]') : null;
    const tip = $('tip');
    if (!alvo) {
        tip.classList.add('hidden');
        return;
    }
    tip.textContent = alvo.dataset.tip || '';
    tip.classList.remove('hidden');
    const r = alvo.getBoundingClientRect();
    const meio = Math.min(Math.max(r.left + r.width / 2, tip.offsetWidth / 2 + 8), window.innerWidth - tip.offsetWidth / 2 - 8);
    tip.style.left = `${meio}px`;
    tip.style.top = `${r.top - 8}px`;
}
['gConteudo', 'aConteudo'].forEach(id => {
    ['pointerover', 'focusin'].forEach(ev => $(id).addEventListener(ev, mostrarDica));
    ['pointerleave', 'focusout'].forEach(ev => $(id).addEventListener(ev, () => $('tip').classList.add('hidden')));
});
window.addEventListener('scroll', () => $('tip').classList.add('hidden'), { passive: true });
