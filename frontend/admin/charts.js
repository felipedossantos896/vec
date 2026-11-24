"use strict";
// ══════ INDICADORES ══════
// Monta a aba Indicadores e seus gráficos de colunas. Os blocos sobre pessoas ficam na aba Acompanhar (acompanhamento.ts).
// A aba usa os mesmos filtros de setor e célula da aba Cadastros.
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
// Colunas com o valor no topo; a mais alta ocupa toda a altura do gráfico
function colunas(itens, rotulo) {
    const max = Math.max(1, ...itens.map(i => i.n));
    return `<div class="chart-scroll" role="region" aria-label="${esc(rotulo)}" tabindex="0"><ol class="cols${itens.length <= 6 ? ' curtas' : ''}">${itens.map(i => `
    <li tabindex="0" data-tip="${esc(i.titulo)}" aria-label="${esc(i.titulo)}"${i.destaque ? ' class="destaque"' : ''}>
      <span class="col-plot" aria-hidden="true"><span class="col-v">${i.n || ''}</span><i data-h="${i.n / max}"></i></span>
      <span class="col-x" aria-hidden="true">${i.rotulo}<small>${i.sub || ''}</small></span>
    </li>`).join('')}</ol></div>`;
}
function painel(titulo, sub, corpo) {
    return `<section class="panel ui-card"><header class="panel-head"><h2>${titulo}</h2><p>${sub}</p></header>${corpo}</section>`;
}
// Cadastros recebidos em cada um dos últimos 12 meses, incluindo os meses sem nenhum
function porMes(base, qtd = 12) {
    const hoje = new Date();
    return Array.from({ length: qtd }, (_, i) => {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - qtd + 1 + i, 1);
        const n = base.filter(r => { const e = parseData(r.dataHora); return !!e && e.getFullYear() === d.getFullYear() && e.getMonth() === d.getMonth(); }).length;
        const mes = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        return { rotulo: MESES[d.getMonth()], sub: i === 0 || d.getMonth() === 0 ? String(d.getFullYear()) : '', titulo: `${mes}: ${plural(n, 'cadastro', 'cadastros')}`, n };
    });
}
// ── Retrato mensal (tendências) ──
let retratos = null;
let pedindoRetratos = false;
let periodoInd = 12;
async function carregarRetratos() {
    const s = lerSessao();
    if (!s || pedindoRetratos)
        return;
    pedindoRetratos = true;
    try {
        const r = await api({ acao: 'indicadores_tendencia', token: s.token });
        retratos = r.ok ? r.retratos : [];
    }
    catch {
        retratos = [];
    }
    finally {
        pedindoRetratos = false;
    }
    if (estado.aba === 'indicadores')
        renderIndicadores();
}
function minilinha(valores, cor) {
    const pts = regrasIndicadores.minilinha(valores);
    if (!pts)
        return '';
    const ult = pts.split(' ').pop().split(',');
    return `<svg class="spark ${cor}" viewBox="-3 0 106 32" aria-hidden="true" focusable="false"><polyline points="${pts}"/><circle cx="${ult[0]}" cy="${ult[1]}" r="2.6"/></svg>`;
}
function cartao(rotulo, valor, nota, valores, cor, notaClasse = '') {
    return `<div class="ind-kpi"><p class="ind-k">${rotulo}</p><div class="ind-kv"><b>${valor}</b>${minilinha(valores, cor)}</div><p class="ind-kt ${notaClasse}">${nota || '&nbsp;'}</p></div>`;
}
// Barras deitadas: rótulo, barra e valor
function barras(itens, total, cor, comTotal) {
    const max = Math.max(1, ...itens.map(([, n]) => n));
    return `<ul class="hbars ${cor}">${itens.map(([l, n]) => `<li><span class="hb-l">${esc(l)}</span><span class="hb-b"><i data-w="${Math.round((n / (comTotal ? Math.max(total, 1) : max)) * 100)}"></i></span><span class="hb-v"><b>${n}</b>${comTotal ? `<small>/${total}</small>` : ''}</span></li>`).join('')}</ul>`;
}
function renderIndicadores() {
    const base = baseMembros(); // indicadores contam só membros de célula (Spec 013)
    const total = base.length;
    if (retratos === null && estado.aba === 'indicadores')
        carregarRetratos();
    document.querySelectorAll('[data-periodo]').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.periodo) === periodoInd)));
    $('indSub').textContent = `Como a área está caminhando · últimos ${periodoInd} meses`;
    if (!total) {
        $('gConteudo').innerHTML = regrasEstados.html(estado.regs.length ? { tipo: 'busca', titulo: 'Ninguém nesse setor ou célula', texto: 'Escolha outro filtro acima para ver os números.' } : regrasEstados.listaVazia(0, '', false));
        return;
    }
    const agora = new Date();
    const meses = regrasIndicadores.meses(agora, periodoInd);
    const alvo = regrasIndicadores.alvo(estado.escopo, estado.setor, estado.celula);
    const serie = (k) => regrasIndicadores.serie(retratos || [], k, alvo, meses);
    const comVivo = (k, vivo) => [...serie(k).slice(0, -1), vivo]; // o mês atual é o valor de agora
    const tend = (k, vivo) => regrasIndicadores.textoTendencia(regrasIndicadores.tendencia(vivo, serie(k)));
    const completa = base.filter(r => r._jornada === JORNADA.length).length;
    const comDisc = base.filter(r => !SITUACOES.semDiscipulador.f(r)).length;
    const cadastros = porMes(base, periodoInd);
    const novos = cadastros[cadastros.length - 1].n;
    const nomeMes = agora.toLocaleDateString('pt-BR', { month: 'long' });
    const idades = base.map(r => r._idade).filter((i) => i != null);
    const maior = cadastros.reduce((m, c, i) => c.n > cadastros[m].n ? i : m, 0);
    const subCad = `${plural(novos, 'cadastro', 'cadastros')} em ${nomeMes}${novos && maior === cadastros.length - 1 ? ', o maior número do período' : ''}.`;
    const semDisc = base.filter(SITUACOES.semDiscipulador.f).length;
    const batizar = base.filter(SITUACOES.batizar.f).length;
    const agir = [
        [semDisc, semDisc === 1 ? 'pessoa sem discipulador vinculado' : 'pessoas sem discipulador vinculado', 'Vincular', 'data-sit="semDiscipulador"'],
        [batizar, batizar === 1 ? 'recebeu Jesus e não foi batizada' : 'receberam Jesus e não foram batizadas', 'Ver pessoas', 'data-sit="batizar"']
    ].filter(([n]) => n);
    $('gConteudo').innerHTML =
        `<div class="ind-kpis">${cartao(estado.celula || estado.setor ? 'Pessoas no filtro' : 'Pessoas na área', total, tend('pessoas', total), comVivo('pessoas', total), 'grafite') +
            cartao('Novos cadastros', novos, `em ${nomeMes}`, cadastros.map(c => c.n), 'grafite') +
            cartao('Jornada completa', completa, `${regrasIndicadores.pct(completa, total)}% ${estado.celula || estado.setor ? 'do filtro' : 'da área'}`, comVivo('jornada_completa', completa), 'verde', 'verde') +
            cartao('Com discipulador', comDisc, `${regrasIndicadores.pct(comDisc, total)}% ${estado.celula || estado.setor ? 'do filtro' : 'da área'}`, comVivo('com_discipulador', comDisc), 'ouro', 'ouro')}</div>
    <div class="ind-grid">
      ${mapaJornada(base)}
      ${painel('Cadastros por mês', subCad, colunas(cadastros.map((c, i) => ({ ...c, destaque: i === cadastros.length - 1 })), 'Novos cadastros por mês'))}
      ${painel('Faixa etária', idades.length < total ? `Idade de ${idades.length} de ${plural(total, 'pessoa', 'pessoas')}.` : 'Idade de quem está cadastrado.', barras(regrasIndicadores.faixas(idades), idades.length, 'grafite', false))}
      ${painel('Treinamentos', 'Quantos já fizeram cada um.', barras(TREINOS.map(([k, l]) => [l.split(' · ')[0], base.filter(r => r[k] === 'S').length]), total, 'verde', true))}
      <section class="ind-agir" aria-labelledby="indAgir"><h2 id="indAgir">Onde agir</h2><p>Os pontos que mais pesam agora.</p>
        ${agir.length ? `<ul>${agir.map(([n, t, acao, attrs]) => `<li><b>${n}</b><span>${t}</span><button type="button" ${attrs}>${acao} ${icone('seguir', { classe: 'ic-14' })}</button></li>`).join('')}</ul>` : '<p class="ind-ok">Nada pendente por aqui. 🙌</p>'}
      </section>
    </div>`;
}
// Período dos indicadores
document.addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('[data-periodo]') : null;
    if (!b)
        return;
    periodoInd = Number(b.dataset.periodo) || 12;
    renderIndicadores();
});
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
