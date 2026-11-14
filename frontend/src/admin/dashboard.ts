// O servidor Go atende /api no mesmo endereço desta página.

// ── Dados ──
async function carregar() {
  const s = lerSessao();
  if (!s) return mostrarLogin('Sua sessão expirou. Entre novamente.');
  $('loading').classList.remove('hidden');
  $('content').classList.add('hidden');
  $<HTMLButtonElement>('btnRefresh').disabled = true;
  try {
    const r = await api<ListaResult>({ acao: 'listar', token: s.token });
    if (!r.ok) {
      if (r.erro === 'sessao') { limparSessao(); return mostrarLogin('Sua sessão expirou. Entre novamente.'); }
      if (r.erro === 'sem_escopo') { limparSessao(); return mostrarLogin('Seu acesso ainda não foi configurado. Fale com a liderança da área.'); }
      throw new Error(r.erro);
    }
    estado.escopo = r.escopo || { todos: true, setores: [], celulas: [] };
    estado.gerencia = !!r.gerencia;
    $('tabs').classList.toggle('hidden', !estado.gerencia);
    if (!estado.gerencia && estado.aba === 'usuarios') mostrarAba('cadastros');
    $('whoami').textContent = `Olá, ${r.nome || s.nome} · ${rotulo(estado.escopo)}`;
    estado.regs = r.registros.map(o => {
      const x: Registro = { ...o };
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
  } catch (err) {
    $('loading').innerHTML = '<span>Não foi possível carregar os dados.</span><button class="btn-sec" type="button" onclick="carregar()">Tentar novamente</button>';
  } finally {
    $<HTMLButtonElement>('btnRefresh').disabled = false;
  }
}
$('btnRefresh').addEventListener('click', () => {
  if (estado.aba === 'usuarios') return carregarUsuarios();
  $('loading').innerHTML = '<span class="spinner"></span>Carregando cadastros...';
  carregar();
});

function distintos(chave: string, base: string[]): string[] {
  const set = new Set(base);
  estado.regs.forEach(r => {
    const valor = r[chave];
    if (typeof valor === 'string' && valor) set.add(valor);
  });
  return [...set];
}

function montarFiltros() {
  $<HTMLSelectElement>('fSetor').innerHTML = '<option value="">Todos os setores</option>' + distintos('setor', baseSetores()).map(v => `<option>${esc(v)}</option>`).join('');
  $<HTMLSelectElement>('fCelula').innerHTML = '<option value="">Todas as células</option>' + distintos('celula', baseCelulas()).map(v => `<option>${esc(v)}</option>`).join('');
  $<HTMLSelectElement>('fSituacao').innerHTML = Object.entries(SITUACOES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');
  $<HTMLSelectElement>('fSetor').value = estado.setor;
  $<HTMLSelectElement>('fCelula').value = estado.celula;
  $<HTMLSelectElement>('fSituacao').value = estado.situacao;
  $<HTMLSelectElement>('fSetor').classList.toggle('hidden', $<HTMLSelectElement>('fSetor').options.length <= 2);
  $<HTMLSelectElement>('fCelula').classList.toggle('hidden', $<HTMLSelectElement>('fCelula').options.length <= 2);
}

function filtrados() {
  const b = norm(estado.busca);
  const sit = SITUACOES[estado.situacao].f;
  return estado.regs.filter(r =>
    (!b || r._busca.includes(b)) &&
    (!estado.setor || r.setor === estado.setor) &&
    (!estado.celula || r.celula === estado.celula) &&
    sit(r)
  );
}

// ── Render ──
function renderTudo() { renderResumo(); renderJornada(); renderCelulas(); renderLista(); }

const pips = (r: Registro): string => `<span class="dots" aria-hidden="true">${JORNADA.map(([k]) => `<i class="${r[k] === 'S' ? 'on' : ''}"></i>`).join('')}</span>`;
// Resumo e jornada consideram o setor e a célula escolhidos, mas não a busca nem a situação
const baseIndicadores = () => estado.regs.filter(r => (!estado.setor || r.setor === estado.setor) && (!estado.celula || r.celula === estado.celula));

function renderResumo() {
  const base = baseIndicadores();
  $('stats').innerHTML = RESUMO.map(([k, label, fn]) => {
    const n = fn ? fn(base) : base.filter(SITUACOES[k].f).length;
    const nota = fn ? 'na sua visão' : base.length ? `${Math.round((n / base.length) * 100)}% dos cadastros` : 'sem cadastros';
    return `<button type="button" class="stat ${estado.situacao === k ? 'active' : ''}" data-sit="${k}" aria-pressed="${estado.situacao === k}"><span>${label}</span><b>${n}</b><small>${nota}</small></button>`;
  }).join('');
  $('stats').querySelectorAll<HTMLButtonElement>('.stat').forEach(b => b.addEventListener('click', () => {
    const situacao = b.dataset.sit || 'todos';
    estado.situacao = estado.situacao === situacao ? 'todos' : situacao;
    $<HTMLSelectElement>('fSituacao').value = estado.situacao;
    renderTudo();
  }));
}

function renderJornada() {
  const base = baseIndicadores();
  $('journey').innerHTML = JORNADA.map(([k, label]) => {
    const n = base.filter(r => r[k] === 'S').length;
    const pct = base.length ? Math.round((n / base.length) * 100) : 0;
    return `<li><span class="j-name">${label}</span><span class="j-val"><b>${n}</b> · ${pct}%</span><span class="cell-bar"><i style="width:${pct}%"></i></span></li>`;
  }).join('');
}

function renderCelulas() {
  const base = estado.regs.filter(r => !estado.setor || r.setor === estado.setor);
  const cont: Record<string, number> = {};
  base.forEach(r => { const c = r.celula || 'Sem célula'; cont[c] = (cont[c] || 0) + 1; });
  const nomes = distintos('celula', baseCelulas()).filter(c => !estado.setor || cont[c]);
  if (cont['Sem célula']) nomes.push('Sem célula');
  const poucas = nomes.length <= 1;
  $('cellsSection').classList.toggle('hidden', poucas);
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
  $('cells').querySelectorAll<HTMLButtonElement>('.cell-row').forEach(b => b.addEventListener('click', () => {
    const nomeCelula = b.dataset.cel || '';
    const c = nomeCelula === 'Sem célula' ? '' : nomeCelula;
    estado.celula = estado.celula === c ? '' : c;
    $<HTMLSelectElement>('fCelula').value = estado.celula;
    renderTudo();
  }));
}

function renderLista() {
  const lista = filtrados();
  const total = estado.regs.length;
  const filtrando = estado.busca || estado.setor || estado.celula || estado.situacao !== 'todos';
  $('countTxt').innerHTML = filtrando ? `Mostrando <b>${lista.length}</b> de ${total}` : `<b>${total}</b> ${total === 1 ? 'pessoa' : 'pessoas'} na sua visão`;
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
        ${pips(r)}
        <span class="jlabel">${r._jornada} de ${JORNADA.length}<span class="lbl"> etapas</span></span>
      </span>
      <span class="it-date">${esc((r.dataHora || '').split(/[ ,]/)[0])}</span>
    </button>`).join('');
  $('list').querySelectorAll<HTMLButtonElement>('.item').forEach(b => b.addEventListener('click', () => {
    const registro = estado.regs[Number(b.dataset.i)];
    if (registro) abrirDetalhe(registro);
  }));
}

// ── Filtros ──
let tBusca: ReturnType<typeof setTimeout>;
$<HTMLInputElement>('fBusca').addEventListener('input', e => { clearTimeout(tBusca); tBusca = setTimeout(() => { estado.busca = (e.target as HTMLInputElement).value; renderLista(); }, 150); });
$<HTMLSelectElement>('fSetor').addEventListener('change', e => { estado.setor = (e.target as HTMLSelectElement).value; renderTudo(); });
$<HTMLSelectElement>('fCelula').addEventListener('change', e => { estado.celula = (e.target as HTMLSelectElement).value; renderTudo(); });
$<HTMLSelectElement>('fSituacao').addEventListener('change', e => { estado.situacao = (e.target as HTMLSelectElement).value; renderTudo(); });
$('btnClear').addEventListener('click', () => {
  Object.assign(estado, { busca: '', setor: '', celula: '', situacao: 'todos' });
  $<HTMLInputElement>('fBusca').value = '';
  montarFiltros();
  renderTudo();
});

// ── Detalhe ──
function secao(titulo: string, linhas: [string, string][]): string {
  return `<div class="det-sec"><h4>${titulo}</h4><dl>${linhas.map(([l, v]) => `<div class="det-row"><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
}

function abrirDetalhe(r: Registro) {
  $('detNome').textContent = r.nome;
  $('detSub').textContent = [r.celula, r.setor].filter(Boolean).join(' · ') || 'Sem célula informada';
  const txt = (v: unknown): string => v ? esc(v) : '<span class="pill x">—</span>';
  $('detBody').innerHTML =
    `<p class="det-journey">${pips(r)}<span><b>${r._jornada} de ${JORNADA.length}</b> etapas da jornada</span></p>` +
    secao('Dados pessoais', [
      ['Nascimento', r._nasc ? `${fmtData(r._nasc)}${r._idade != null ? ` · ${r._idade} anos` : ''}` : txt(r.nascimento)],
      ['Recebeu Jesus', pill(r.recebeuJesus)]
    ]) +
    secao('Etapas da jornada', JORNADA.map(([k, l]): [string, string] => [l, pill(r[k])])) +
    secao('Célula e serviço', [
      ['Setor', txt(r.setor)], ['Célula', txt(r.celula)],
      ['Congrega com frequência', pill(r.frequentaCultos)],
      ['Serve em ministério', pill(r.serveMinisterio)],
      ...(r.serveMinisterio === 'S' ? ([['Ministério', txt(r.ministerioNome)]] as [string, string][]) : [])
    ]) +
    secao('Treinamentos', TREINOS.map(([k, l]): [string, string] => [l, pill(r[k])])) +
    secao('Discipulado e interesses', [['Discipulador', txt(r.discipulador)], ...INTERESSES.map(([k, l]): [string, string] => ['Interesse: ' + l.toLowerCase(), pill(r[k])])]) +
    (r.sugestao ? `<div class="det-sec"><h4>Sugestão para as células</h4><div class="det-text">${esc(r.sugestao)}</div></div>` : '') +
    secao('Registro', [['Enviado em', txt(r.dataHora)], ['Nº do cadastro', String(r.linha)]]);
  const d = $<HTMLDialogElement>('det');
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  $('detBody').scrollTop = 0;
  d.scrollTop = 0;
}
$('detClose').addEventListener('click', () => $<HTMLDialogElement>('det').close());
$<HTMLDialogElement>('det').addEventListener('click', e => { if (e.target === $<HTMLDialogElement>('det')) $<HTMLDialogElement>('det').close(); });

// ── Exportar CSV (respeita os filtros) ──
$('btnCsv').addEventListener('click', () => {
  const lista = filtrados();
  if (!lista.length) return;
  const cel = (v: unknown): string => {
    let s = v === 'S' ? 'Sim' : v === 'N' ? 'Não' : String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // evita que o Excel execute o texto como fórmula
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
