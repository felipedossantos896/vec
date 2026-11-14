"use strict";
// O servidor Go atende /api no mesmo endereço desta página.
// ── Dados ──
async function carregar() {
    const s = lerSessao();
    if (!s)
        return mostrarLogin('Sua sessão expirou. Entre novamente.');
    $('loading').classList.remove('hidden');
    $('content').classList.add('hidden');
    $('btnRefresh').disabled = true;
    try {
        const r = await api({ acao: 'listar', token: s.token });
        if (!r.ok) {
            if (r.erro === 'sessao') {
                limparSessao();
                return mostrarLogin('Sua sessão expirou. Entre novamente.');
            }
            if (r.erro === 'sem_escopo') {
                limparSessao();
                return mostrarLogin('Seu acesso ainda não foi configurado. Fale com a liderança da área.');
            }
            throw new Error(r.erro);
        }
        estado.escopo = r.escopo || { todos: true, setores: [], celulas: [] };
        estado.gerencia = !!r.gerencia;
        $('tabs').classList.toggle('hidden', !estado.gerencia);
        if (!estado.gerencia && estado.aba === 'usuarios')
            mostrarAba('cadastros');
        $('whoami').textContent = `Olá, ${r.nome || s.nome} · ${rotulo(estado.escopo)}`;
        estado.regs = r.registros.map(o => {
            const x = { ...o };
            Object.keys(o).forEach(k => { x[k] = typeof o[k] === 'string' ? o[k].trim() : o[k]; });
            x._nasc = parseData(x.nascimento);
            x._idade = idade(x._nasc);
            x._jornada = JORNADA.filter(([k]) => x[k] === 'S').length;
            x._busca = norm([x.nome, x.discipulador, x.ministerioNome, x.celula].join(' '));
            return x;
        }).sort((a, b) => b.linha - a.linha);
        montarFiltros();
        renderTudo();
        $('loading').classList.add('hidden');
        $('content').classList.remove('hidden');
    }
    catch (err) {
        $('loading').innerHTML = 'Não foi possível carregar os dados. <button class="btn-sec" type="button" onclick="carregar()">Tentar novamente</button>';
    }
    finally {
        $('btnRefresh').disabled = false;
    }
}
$('btnRefresh').addEventListener('click', () => {
    if (estado.aba === 'usuarios')
        return carregarUsuarios();
    $('loading').innerHTML = '<span class="spinner"></span>Carregando cadastros...';
    carregar();
});
function distintos(chave, base) {
    const set = new Set(base);
    estado.regs.forEach(r => {
        const valor = r[chave];
        if (typeof valor === 'string' && valor)
            set.add(valor);
    });
    return [...set];
}
function montarFiltros() {
    $('fSetor').innerHTML = '<option value="">Todos os setores</option>' + distintos('setor', baseSetores()).map(v => `<option>${esc(v)}</option>`).join('');
    $('fCelula').innerHTML = '<option value="">Todas as células</option>' + distintos('celula', baseCelulas()).map(v => `<option>${esc(v)}</option>`).join('');
    $('fSituacao').innerHTML = Object.entries(SITUACOES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
    $('fSetor').value = estado.setor;
    $('fCelula').value = estado.celula;
    $('fSituacao').value = estado.situacao;
    $('fSetor').classList.toggle('hidden', $('fSetor').options.length <= 2);
    $('fCelula').classList.toggle('hidden', $('fCelula').options.length <= 2);
}
function filtrados() {
    const b = norm(estado.busca);
    const sit = SITUACOES[estado.situacao].f;
    return estado.regs.filter(r => (!b || r._busca.includes(b)) &&
        (!estado.setor || r.setor === estado.setor) &&
        (!estado.celula || r.celula === estado.celula) &&
        sit(r));
}
// ── Render ──
function renderTudo() { renderResumo(); renderCelulas(); renderLista(); }
function renderResumo() {
    const base = estado.regs.filter(r => (!estado.setor || r.setor === estado.setor) && (!estado.celula || r.celula === estado.celula));
    $('stats').innerHTML = RESUMO.map(([k, label, fn]) => {
        const n = fn ? fn(base) : base.filter(SITUACOES[k].f).length;
        return `<button type="button" class="stat ${estado.situacao === k ? 'active' : ''}" data-sit="${k}" aria-pressed="${estado.situacao === k}"><b>${n}</b><span>${label}</span></button>`;
    }).join('');
    $('stats').querySelectorAll('.stat').forEach(b => b.addEventListener('click', () => {
        const situacao = b.dataset.sit || 'todos';
        estado.situacao = estado.situacao === situacao ? 'todos' : situacao;
        $('fSituacao').value = estado.situacao;
        renderTudo();
    }));
}
function renderCelulas() {
    const base = estado.regs.filter(r => !estado.setor || r.setor === estado.setor);
    const cont = {};
    base.forEach(r => { const c = r.celula || 'Sem célula'; cont[c] = (cont[c] || 0) + 1; });
    const nomes = distintos('celula', baseCelulas()).filter(c => !estado.setor || cont[c]);
    if (cont['Sem célula'])
        nomes.push('Sem célula');
    const poucas = nomes.length <= 1;
    $('cellsTitle').classList.toggle('hidden', poucas);
    $('cells').classList.toggle('hidden', poucas);
    const max = Math.max(1, ...Object.values(cont));
    $('cells').innerHTML = nomes.map(c => {
        const n = cont[c] || 0;
        const ativo = estado.celula === c;
        return `<button type="button" class="cell-row ${ativo ? 'active' : ''}" data-cel="${esc(c)}" aria-pressed="${ativo}">
      <span class="cell-name">${esc(c)}</span>
      <span class="cell-bar"><i style="width:${(n / max) * 100}%"></i></span>
      <span class="cell-n">${n}</span>
    </button>`;
    }).join('') || '<p class="empty">Nenhum cadastro ainda.</p>';
    $('cells').querySelectorAll('.cell-row').forEach(b => b.addEventListener('click', () => {
        const nomeCelula = b.dataset.cel || '';
        const c = nomeCelula === 'Sem célula' ? '' : nomeCelula;
        estado.celula = estado.celula === c ? '' : c;
        $('fCelula').value = estado.celula;
        renderTudo();
    }));
}
function renderLista() {
    const lista = filtrados();
    const total = estado.regs.length;
    const filtrando = estado.busca || estado.setor || estado.celula || estado.situacao !== 'todos';
    $('countTxt').innerHTML = filtrando ? `<b>${lista.length}</b> de ${total} cadastros` : `<b>${total}</b> cadastros`;
    $('btnClear').classList.toggle('hidden', !filtrando);
    if (!lista.length) {
        $('list').innerHTML = `<div class="empty">${total ? 'Nenhum cadastro encontrado com esses filtros.' : 'Ainda não há cadastros. Assim que alguém enviar o formulário, ele aparece aqui.'}</div>`;
        return;
    }
    const head = '<div class="thead" aria-hidden="true"><span>Nome</span><span>Idade</span><span>Célula</span><span>Setor</span><span>Jornada</span><span>Enviado em</span></div>';
    $('list').innerHTML = head + lista.map((r, i) => `
    <button type="button" class="item" data-i="${estado.regs.indexOf(r)}">
      <span class="it-name">${esc(r.nome)}</span>
      <span class="it-age">${r._idade != null ? `${r._idade}<span class="lbl"> anos</span>` : '—'}</span>
      <span class="it-cell"><span class="lbl">Célula </span><b>${esc(r.celula || '—')}</b></span>
      <span class="it-setor">${esc(r.setor || '—')}</span>
      <span class="it-jornada">
        <span class="dots" aria-hidden="true">${JORNADA.map(([k]) => `<i class="${r[k] === 'S' ? 'on' : ''}"></i>`).join('')}</span>
        <span class="jlabel">${r._jornada} de ${JORNADA.length} etapas</span>
      </span>
      <span class="it-date">${esc((r.dataHora || '').split(/[ ,]/)[0])}</span>
    </button>`).join('');
    $('list').querySelectorAll('.item').forEach(b => b.addEventListener('click', () => {
        const registro = estado.regs[Number(b.dataset.i)];
        if (registro)
            abrirDetalhe(registro);
    }));
}
// ── Filtros ──
let tBusca;
$('fBusca').addEventListener('input', e => { clearTimeout(tBusca); tBusca = setTimeout(() => { estado.busca = e.target.value; renderLista(); }, 150); });
$('fSetor').addEventListener('change', e => { estado.setor = e.target.value; renderTudo(); });
$('fCelula').addEventListener('change', e => { estado.celula = e.target.value; renderTudo(); });
$('fSituacao').addEventListener('change', e => { estado.situacao = e.target.value; renderTudo(); });
$('btnClear').addEventListener('click', () => {
    Object.assign(estado, { busca: '', setor: '', celula: '', situacao: 'todos' });
    $('fBusca').value = '';
    montarFiltros();
    renderTudo();
});
// ── Detalhe ──
function secao(titulo, linhas) {
    return `<div class="det-sec"><h4>${titulo}</h4><dl>${linhas.map(([l, v]) => `<div class="det-row"><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
}
function abrirDetalhe(r) {
    $('detNome').textContent = r.nome;
    $('detSub').textContent = [r.celula, r.setor].filter(Boolean).join(' · ') || 'Sem célula informada';
    const txt = (v) => v ? esc(v) : '<span class="pill x">—</span>';
    $('detBody').innerHTML =
        secao('Dados pessoais', [
            ['Nascimento', r._nasc ? `${fmtData(r._nasc)}${r._idade != null ? ` · ${r._idade} anos` : ''}` : txt(r.nascimento)],
            ['Recebeu Jesus', pill(r.recebeuJesus)]
        ]) +
            secao('Etapas da jornada', JORNADA.map(([k, l]) => [l, pill(r[k])])) +
            secao('Célula e serviço', [
                ['Setor', txt(r.setor)], ['Célula', txt(r.celula)],
                ['Congrega com frequência', pill(r.frequentaCultos)],
                ['Serve em ministério', pill(r.serveMinisterio)],
                ...(r.serveMinisterio === 'S' ? [['Ministério', txt(r.ministerioNome)]] : [])
            ]) +
            secao('Treinamentos', TREINOS.map(([k, l]) => [l, pill(r[k])])) +
            secao('Discipulado e interesses', [['Discipulador', txt(r.discipulador)], ...INTERESSES.map(([k, l]) => ['Interesse: ' + l.toLowerCase(), pill(r[k])])]) +
            (r.sugestao ? `<div class="det-sec"><h4>Sugestão para as células</h4><div class="det-text">${esc(r.sugestao)}</div></div>` : '') +
            secao('Registro', [['Enviado em', txt(r.dataHora)], ['Nº do cadastro', String(r.linha)]]);
    const d = $('det');
    if (typeof d.showModal === 'function')
        d.showModal();
    else
        d.setAttribute('open', '');
    $('detBody').scrollTop = 0;
    d.scrollTop = 0;
}
$('detClose').addEventListener('click', () => $('det').close());
$('det').addEventListener('click', e => { if (e.target === $('det'))
    $('det').close(); });
// ── Exportar CSV (respeita os filtros) ──
$('btnCsv').addEventListener('click', () => {
    const lista = filtrados();
    if (!lista.length)
        return;
    const cel = (v) => {
        let s = v === 'S' ? 'Sim' : v === 'N' ? 'Não' : String(v ?? '');
        if (/^[=+\-@\t\r]/.test(s))
            s = "'" + s; // evita que o Excel execute o texto como fórmula
        return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const linhas = [CSV_COLS.map(c => cel(c[1])).join(';'), ...lista.map(r => CSV_COLS.map(([k]) => cel(r[k])).join(';'))];
    const blob = new Blob(['\uFEFF' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `membros-vec-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
});
