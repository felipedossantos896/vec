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
    estado.meuCadastro = r.meuCadastro || 0;
    estado.pessoas = r.pessoas || [];
    aplicarEstrutura(r.estrutura);
    const soDiscipulos = estado.escopo.perfil === 'DISCIPULADOR';
    $('visaoTitulo').textContent = soDiscipulos ? 'Meus discípulos' : 'Pessoas';
    // Quem é só discipulador fica com Acompanhar e Pessoas
    $('tabIndicadores').classList.toggle('hidden', soDiscipulos);
    if (soDiscipulos && estado.aba === 'indicadores') mostrarAba('acompanhar');
    $('tabUsuarios').classList.toggle('hidden', !estado.gerencia);
    if (!estado.gerencia && estado.aba === 'usuarios') mostrarAba('acompanhar');
    $('whoami').textContent = `Olá, ${r.nome || s.nome} · ${rotulo(estado.escopo)}`;
    estado.regs = r.registros.map(o => {
      const x: Registro = { ...o };
      Object.keys(o).forEach(k => { x[k] = typeof o[k] === 'string' ? o[k].trim() : o[k]; });
      return derivar(x);
    }).sort((a, b) => b.linha - a.linha);
    marcarDuplicados();
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

// Campos calculados a partir das respostas; refeitos quando o cadastro é editado
function derivar(x: Registro): Registro {
  x._nasc = parseData(x.nascimento);
  x._idade = idade(x._nasc);
  x._jornada = metricasIndicadores.etapasConcluidas(x);
  x._contato = parseData(x.ultimoContato);
  x._lembrete = parseData(x.proximoContato);
  x._busca = norm([x.nome, x.discipulador, x.ministerioNome, x.celula].join(' '));
  return x;
}

function distintos(chave: string, base: string[]): string[] {
  const set = new Set(base);
  estado.regs.forEach(r => {
    const valor = r[chave];
    if (typeof valor === 'string' && valor) set.add(valor);
  });
  return [...set];
}

// Setor e célula valem para Pessoas, Indicadores e Acompanhar: cada aba tem seus seletores (f…, g… e a…), com o mesmo estado
const SELETORES: [string, 'setor' | 'celula', string][] = ['f', 'g', 'a'].flatMap((p): [string, 'setor' | 'celula', string][] => [[p + 'Setor', 'setor', 'Todos os setores'], [p + 'Celula', 'celula', 'Todas as células']]);

function montarFiltros() {
  SELETORES.forEach(([id, chave, todos]) => {
    const sel = $<HTMLSelectElement>(id);
    sel.innerHTML = `<option value="">${todos}</option>` + distintos(chave, chave === 'setor' ? baseSetores() : baseCelulas()).map(v => `<option>${esc(v)}</option>`).join('');
    sel.classList.toggle('hidden', sel.options.length <= 2);
  });
  const opcao = (k: string): string => situacaoVisivel(k) ? `<option value="${k}">${esc(rotuloSituacao(k, SITUACOES[k].label))}</option>` : '';
  const agrupadas = new Set(GRUPOS_SITUACAO.flatMap(([, ks]) => ks));
  const grupos: [string, string[]][] = [...GRUPOS_SITUACAO, ['Outras', Object.keys(SITUACOES).filter(k => k !== 'todos' && !agrupadas.has(k))]];
  $<HTMLSelectElement>('fSituacao').innerHTML = opcao('todos') + grupos.map(([g, ks]) => { const o = ks.filter(k => SITUACOES[k]).map(opcao).join(''); return o ? `<optgroup label="${g}">${o}</optgroup>` : ''; }).join('');
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
function renderTudo() {
  SELETORES.forEach(([id, chave]) => { $<HTMLSelectElement>(id).value = estado[chave]; });
  $<HTMLSelectElement>('fSituacao').value = estado.situacao;
  renderMeus(); renderLista(); renderAcompanhar(); renderIndicadores(); renderMapa();
  if (estado.aba === 'estrutura') renderEstrutura(); // depois dos cadastros, para contar as pessoas
}

// Uma linha de medidor: nome, quantidade, percentual e barra
function medidor(label: string, n: number, total: number): string {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return `<li><span class="j-name">${label}</span><span class="j-val"><b>${n}</b> · ${pct}%</span><span class="cell-bar"><i data-w="${pct}"></i></span></li>`;
}

const pips = (r: Registro): string => `<span class="dots" aria-hidden="true">${JORNADA.map(([k]) => `<i class="${r[k] === 'S' ? 'on' : ''}"></i>`).join('')}</span>`;
// Resumo e jornada consideram o setor e a célula escolhidos, mas não a busca nem a situação
const baseIndicadores = () => metricasIndicadores.filtrar(estado.regs, estado.setor, estado.celula);

// Etiquetas dos filtros ativos; o × de cada uma tira só aquele filtro
function renderChips() {
  const chips: [string, string][] = [];
  if (estado.busca) chips.push(['busca', `“${estado.busca}”`]);
  if (estado.setor) chips.push(['setor', estado.setor]);
  if (estado.celula) chips.push(['celula', estado.celula]);
  if (estado.situacao !== 'todos') chips.push(['situacao', rotuloSituacao(estado.situacao, SITUACOES[estado.situacao].label)]);
  $('chipLista').innerHTML = chips.map(([k, t]) => `<button type="button" class="chip" data-tirar="${k}" aria-label="Tirar o filtro ${esc(t)}">${esc(t)}<span aria-hidden="true">×</span></button>`).join('');
  $('btnClear').classList.toggle('hidden', chips.length < 2);
  $('chips').querySelector('.chips-lbl')!.classList.toggle('hidden', !chips.length);
  $('chips').classList.toggle('hidden', !chips.length && $('btnMeus').classList.contains('hidden'));
}
$('chipLista').addEventListener('click', e => {
  const k = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-tirar]')?.dataset.tirar : '';
  if (!k) return;
  if (k === 'busca') { estado.busca = ''; $<HTMLInputElement>('fBusca').value = ''; }
  if (k === 'setor' || k === 'celula') estado[k] = '';
  if (k === 'situacao') estado.situacao = 'todos';
  renderTudo();
});

// Paginação: volta à primeira página quando os filtros mudam
let limiteLista = regrasPessoas.PAGINA, chaveLista = '';
const precisaCuidado = (r: Registro): boolean => regrasContato.semContato(r._contato, r._lembrete || null, new Date());

// Coluna Discipulador: rosto e nome, ou a etiqueta de quem ainda não tem
function colunaDiscipulador(r: Registro): string {
  if (r.discipuladorId) {
    const nome = String(r.discipulador || estado.pessoas.find(p => p.id === r.discipuladorId)?.nome || '');
    return `<span class="it-disc">${avatarDe(Number(r.discipuladorId), nome, 'av-p')}<span>${esc(curto(nome))}</span></span>`;
  }
  if (r.discipulador) return `<span class="it-disc"><span>${esc(curto(String(r.discipulador)))}</span><em class="tag">sem vínculo</em></span>`;
  return '<span class="tag-c">Sem discipulador</span>';
}

function renderLista() {
  const lista = filtrados();
  const total = estado.regs.length;
  const filtrando = estado.busca || estado.setor || estado.celula || estado.situacao !== 'todos';
  const chave = [estado.busca, estado.setor, estado.celula, estado.situacao].join('|');
  if (chave !== chaveLista) { chaveLista = chave; limiteLista = regrasPessoas.PAGINA; }
  const cuidado = estado.regs.filter(precisaCuidado).length;
  $('countTxt').innerHTML = filtrando ? `Mostrando <b>${lista.length}</b> de ${total}`
    : `<b>${total}</b> no seu escopo${cuidado ? ` · <button type="button" class="btn-link cuidado-link" data-cuidado>${cuidado} ${cuidado === 1 ? 'precisa' : 'precisam'} de cuidado</button>` : ''}`;
  renderChips();

  if (!lista.length) {
    $('list').innerHTML = `<div class="empty">${total ? 'Ninguém encontrado com esses filtros.' : 'Ainda não há cadastros. Assim que alguém enviar o formulário, ele aparece aqui.'}</div>`;
    return;
  }

  const { mostra, resta } = regrasPessoas.visiveis(lista.length, limiteLista);
  const aberto = $<HTMLDialogElement>('det').open ? $('det').dataset.linha : '';
  const head = '<div class="thead" aria-hidden="true"><span>Pessoa</span><span>Célula</span><span>Discipulador</span><span>Jornada</span><span>Contato</span></div>';
  $('list').innerHTML = head + lista.slice(0, mostra).map(r => `
    <button type="button" class="item${String(r.linha) === aberto ? ' sel' : ''}" data-i="${estado.regs.indexOf(r)}" data-linha="${r.linha}"${String(r.linha) === aberto ? ' aria-current="true"' : ''}>
      <span class="it-name">${avatar(r)}<span class="it-nt"><span class="it-n">${esc(r.nome)}</span>${r._idade != null ? `<small>${r._idade} anos</small>` : ''}<span class="it-cel-m">${celulaChip(r.celula)}</span></span></span>
      <span class="it-cell">${celulaChip(r.celula)}</span>
      <span class="it-dsc">${colunaDiscipulador(r)}</span>
      <span class="it-jornada">${pips(r)}<span class="jlabel">${r._jornada}/${JORNADA.length}<span class="sr-only"> etapas da jornada</span></span></span>
      <span class="it-contato${precisaCuidado(r) ? ' alerta' : ''}"><span class="sr-only">Último contato: </span>${regrasPessoas.haQuanto(r._contato, new Date())}</span>
      <span class="it-seta" aria-hidden="true">›</span>
    </button>`).join('') +
    `<div class="lista-pe"><span>Mostrando ${mostra} de ${lista.length}</span>${resta ? `<button type="button" class="btn-link" data-mais>Carregar mais ${Math.min(resta, regrasPessoas.PAGINA)}</button>` : ''}</div>`;
}
// Abre a ficha, mostra mais linhas ou filtra quem precisa de cuidado
$('list').addEventListener('click', e => {
  const alvo = e.target instanceof Element ? e.target : null;
  if (alvo?.closest('[data-mais]')) {
    const foco = $('list').querySelectorAll('.item').length;
    limiteLista += regrasPessoas.PAGINA;
    renderLista();
    $('list').querySelectorAll<HTMLButtonElement>('.item')[foco]?.focus();
    return;
  }
  const b = alvo?.closest<HTMLButtonElement>('.item');
  const registro = b ? estado.regs[Number(b.dataset.i)] : undefined;
  if (registro) abrirDetalhe(registro);
});
$('countTxt').addEventListener('click', e => {
  if (!(e.target instanceof Element) || !e.target.closest('[data-cuidado]')) return;
  estado.situacao = 'semContato';
  renderTudo();
});
// Linha da pessoa aberta na ficha fica marcada
function marcarSelecionado() {
  const d = $<HTMLDialogElement>('det');
  const l = d.open ? d.dataset.linha : '';
  $('list').querySelectorAll<HTMLElement>('.item').forEach(i => {
    const sel = i.dataset.linha === l;
    i.classList.toggle('sel', sel);
    if (sel) i.setAttribute('aria-current', 'true'); else i.removeAttribute('aria-current');
  });
}
$('det').addEventListener('close', marcarSelecionado);

// ── Filtros ──
let tBusca: ReturnType<typeof setTimeout>;
$<HTMLInputElement>('fBusca').addEventListener('input', e => { clearTimeout(tBusca); tBusca = setTimeout(() => { estado.busca = (e.target as HTMLInputElement).value; renderLista(); }, 150); });
SELETORES.forEach(([id, chave]) => $<HTMLSelectElement>(id).addEventListener('change', e => { estado[chave] = (e.target as HTMLSelectElement).value; renderTudo(); }));
$<HTMLSelectElement>('fSituacao').addEventListener('change', e => { estado.situacao = (e.target as HTMLSelectElement).value; renderTudo(); });
$('btnClear').addEventListener('click', () => {
  Object.assign(estado, { busca: '', setor: '', celula: '', situacao: 'todos' });
  $<HTMLInputElement>('fBusca').value = '';
  montarFiltros();
  renderTudo();
});

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
