// O servidor Go atende /api no mesmo endereço desta página.
const ADMIN_API_URL: string = '/api';

const CHAVE_SESSAO = 'vec_admin_sessao';

type Escopo = { todos: boolean; setores: string[]; celulas: string[] };
type Registro = {
  [key: string]: string | number | Date | null | undefined;
  nome: string;
  nascimento: string;
  dataHora: string;
  linha: number;
  _nasc: Date | null;
  _idade: number | null;
  _jornada: number;
  _busca: string;
  recebeuJesus?: string;
  cafePastor?: string;
  estacaoDNA?: string;
  acompInicial?: string;
  novaCriatura?: string;
  batismo?: string;
  batismoEspirito?: string;
  frequentaCultos?: string;
  serveMinisterio?: string;
  expresso01?: string;
  expresso02?: string;
  tlc?: string;
  encontroDeus?: string;
  tadel?: string;
  interesseDiscipulado?: string;
  interesseCuidar?: string;
  interesseLider?: string;
  interesseAnfitrao?: string;
  setor?: string;
  celula?: string;
  ministerioNome?: string;
  discipulador?: string;
  sugestao?: string;
};
type UsuarioPainel = {
  usuario: string;
  nome: string;
  ativo: boolean;
  perfil: string;
  setores: string[];
  celulas: string[];
  gerencia: boolean;
  acesso?: string;
};
type EstadoPainel = {
  regs: Registro[];
  busca: string;
  setor: string;
  celula: string;
  situacao: string;
  escopo: Escopo;
  gerencia: boolean;
  aba: string;
  usuarios: UsuarioPainel[];
  usuariosCarregados: boolean;
};
type ApiResult = { ok: boolean; erro?: string };
type LoginResult = ApiResult & { token: string; nome: string; usuario: string; expiraEm: number };
type ListaResult = ApiResult & { nome: string; gerencia: boolean; escopo: Escopo; registros: Registro[] };
type UsuariosResult = ApiResult & { usuarios: UsuarioPainel[] };
type SalvarUsuarioResult = ApiResult & { token?: string; expiraEm?: number };
type Sessao = { token: string; nome: string; usuario: string; expira: number };

const JORNADA: [string, string][] = [['cafePastor', 'Café com Pastor'], ['estacaoDNA', 'Estação DNA'], ['acompInicial', 'Acompanhamento Inicial'], ['novaCriatura', 'Nova Criatura'], ['batismo', 'Batismo'], ['batismoEspirito', 'Batismo no Espírito']];
const TREINOS: [string, string][] = [['expresso01', 'Expresso 01 · Discipuladores'], ['expresso02', 'Expresso 02 · Líderes de Célula'], ['tlc', 'TLC'], ['encontroDeus', 'Encontro com Deus'], ['tadel', 'Participa do TADEL']];
const INTERESSES: [string, string][] = [['interesseDiscipulado', 'Ser discipulado(a)'], ['interesseCuidar', 'Cuidar de pessoas'], ['interesseLider', 'Ser líder de célula'], ['interesseAnfitrao', 'Ser anfitrião']];
const SETORES = ['Fogo no Altar', 'Tabernáculo de Deus'];
const CELULAS = ['Hope', 'Ramos da Videira', 'Ashrei', 'Betânia', 'Vencedores em Cristo', 'Despertar', 'Pi-Hairote'];

const SITUACOES: Record<string, { label: string; f: (r: Registro) => boolean }> = {
  todos:          { label: 'Todas as situações', f: () => true },
  naoBatizados:   { label: 'Ainda não batizados', f: r => r.batismo !== 'S' },
  naoRecebeu:     { label: 'Ainda não receberam Jesus', f: r => r.recebeuJesus === 'N' },
  naoFrequenta:   { label: 'Não congregam com frequência', f: r => r.frequentaCultos === 'N' },
  semDiscipulador:{ label: 'Sem discipulador', f: r => !r.discipulador },
  querDiscipulado:{ label: 'Querem ser discipulados', f: r => r.interesseDiscipulado === 'S' },
  querCuidar:     { label: 'Querem cuidar de pessoas', f: r => r.interesseCuidar === 'S' },
  querLiderar:    { label: 'Querem liderar célula', f: r => r.interesseLider === 'S' },
  querAnfitriao:  { label: 'Querem ser anfitriões', f: r => r.interesseAnfitrao === 'S' },
  servem:         { label: 'Servem em ministério', f: r => r.serveMinisterio === 'S' },
};

const RESUMO: [string, string, ((rs: Registro[]) => number) | null][] = [
  ['todos', 'cadastros', rs => rs.length],
  ['naoBatizados', 'ainda não batizados', null],
  ['querDiscipulado', 'querem ser discipulados', null],
  ['querLiderar', 'querem liderar célula', null],
];

const CSV_COLS: [string, string][] = [
  ['dataHora', 'Enviado em'], ['nome', 'Nome'], ['nascimento', 'Nascimento'], ['recebeuJesus', 'Recebeu Jesus'],
  ...JORNADA, ['setor', 'Setor'], ['celula', 'Célula'], ['frequentaCultos', 'Frequenta cultos'],
  ['serveMinisterio', 'Serve ministério'], ['ministerioNome', 'Qual ministério'], ...TREINOS,
  ['discipulador', 'Discipulador'], ...INTERESSES, ['sugestao', 'Sugestão']
];

function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento não encontrado: #${id}`);
  return element as T;
}

const estado: EstadoPainel = {
  regs: [], busca: '', setor: '', celula: '', situacao: 'todos',
  escopo: { todos: true, setores: [], celulas: [] },
  gerencia: false, aba: 'cadastros', usuarios: [], usuariosCarregados: false
};

function rotulo(e: Escopo | null | undefined): string {
  if (!e || e.todos) return 'Líder de área';
  const p = [];
  if (e.setores.length) p.push((e.setores.length > 1 ? 'Setores ' : 'Setor ') + e.setores.join(', '));
  if (e.celulas.length) p.push((e.celulas.length > 1 ? 'Células ' : 'Célula ') + e.celulas.join(', '));
  return p.join(' · ');
}
// Líder de área vê a lista fixa; os demais só veem o que existe nos dados deles
const baseSetores = () => estado.escopo.todos ? SETORES : [];
const baseCelulas = () => estado.escopo.todos ? CELULAS : [];

// ── Utilidades ──
const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
const norm = (s: unknown): string => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function parseData(s: unknown): Date | null {
  const value = String(s || '').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(value);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}
function idade(d: Date | null): number | null {
  if (!d) return null;
  const h = new Date();
  let a = h.getFullYear() - d.getFullYear();
  if (h.getMonth() < d.getMonth() || (h.getMonth() === d.getMonth() && h.getDate() < d.getDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}
const fmtData = (d: Date | null): string => d ? d.toLocaleDateString('pt-BR') : '';
const pill = (v: unknown): string => v === 'S' ? '<span class="pill s">Sim</span>' : v === 'N' ? '<span class="pill n">Não</span>' : '<span class="pill x">—</span>';

// ── Sessão ──
function lerSessao(): Sessao | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || 'null');
    return s && s.expira > Date.now() ? s : null;
  } catch (e) { return null; }
}
function salvarSessao(s: Sessao) { try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)); } catch (e) {} }
function limparSessao() { try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) {} }

async function api<T extends ApiResult>(payload: object): Promise<T> {
  const r = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json() as Promise<T>;
}

// ── Login ──
$('passToggle').addEventListener('click', () => {
  const inp = $<HTMLInputElement>('senha');
  const mostrar = inp.type === 'password';
  inp.type = mostrar ? 'text' : 'password';
  $('passToggle').textContent = mostrar ? 'Ocultar' : 'Mostrar';
  $('passToggle').setAttribute('aria-pressed', String(mostrar));
});

$<HTMLInputElement>('usuario').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $<HTMLInputElement>('senha').focus(); } });

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('loginMsg');
  const usuario = $<HTMLInputElement>('usuario').value.trim();
  const senha = $<HTMLInputElement>('senha').value;
  msg.className = 'msg';
  if (!usuario || !senha) { msg.textContent = 'Informe usuário e senha.'; return; }

  const btn = $<HTMLButtonElement>('btnLogin');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Entrando...';
  msg.textContent = '';
  try {
    const r = await api<LoginResult>({ acao: 'login', usuario, senha });
    if (r.ok) {
      salvarSessao({ token: r.token, nome: r.nome, usuario: r.usuario || usuario.toLowerCase(), expira: Date.now() + (r.expiraEm - 60) * 1000 });
      $<HTMLInputElement>('senha').value = '';
      entrar();
    } else if (r.erro === 'sem_escopo') {
      msg.textContent = 'Seu acesso ainda não foi configurado. Fale com a liderança da área.';
    } else if (r.erro === 'bloqueado') {
      msg.textContent = 'Muitas tentativas. Aguarde 15 minutos e tente novamente.';
    } else if (r.erro === 'login_limitado') {
      msg.textContent = 'Muitas tentativas no painel. Aguarde um minuto e tente novamente.';
    } else {
      msg.textContent = 'Usuário ou senha incorretos.';
    }
  } catch (err) {
    msg.textContent = 'Não foi possível conectar. Verifique a internet.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

function mostrarLogin(aviso = '') {
  $('appView').classList.add('hidden');
  $('loginView').classList.remove('hidden');
  const msg = $('loginMsg');
  msg.className = aviso ? 'msg info' : 'msg';
  msg.textContent = aviso || '';
  setTimeout(() => $<HTMLInputElement>('usuario').focus(), 50);
}

function entrar() {
  const s = lerSessao();
  if (!s) return mostrarLogin();
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('whoami').textContent = 'Olá, ' + s.nome;
  carregar();
}

$('btnLogout').addEventListener('click', () => {
  const s = lerSessao();
  if (s) api({ acao: 'logout', token: s.token }).catch(() => {});
  limparSessao();
  estado.regs = [];
  estado.usuarios = [];
  estado.usuariosCarregados = false;
  mostrarAba('cadastros');
  mostrarLogin('Você saiu do painel.');
});

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
    $('loading').innerHTML = 'Não foi possível carregar os dados. <button class="btn-sec" type="button" onclick="carregar()">Tentar novamente</button>';
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
function renderTudo() { renderResumo(); renderCelulas(); renderLista(); }

function renderResumo() {
  const base = estado.regs.filter(r => (!estado.setor || r.setor === estado.setor) && (!estado.celula || r.celula === estado.celula));
  $('stats').innerHTML = RESUMO.map(([k, label, fn]) => {
    const n = fn ? fn(base) : base.filter(SITUACOES[k].f).length;
    return `<button type="button" class="stat ${estado.situacao === k ? 'active' : ''}" data-sit="${k}" aria-pressed="${estado.situacao === k}"><b>${n}</b><span>${label}</span></button>`;
  }).join('');
  $('stats').querySelectorAll<HTMLButtonElement>('.stat').forEach(b => b.addEventListener('click', () => {
    const situacao = b.dataset.sit || 'todos';
    estado.situacao = estado.situacao === situacao ? 'todos' : situacao;
    $<HTMLSelectElement>('fSituacao').value = estado.situacao;
    renderTudo();
  }));
}

function renderCelulas() {
  const base = estado.regs.filter(r => !estado.setor || r.setor === estado.setor);
  const cont: Record<string, number> = {};
  base.forEach(r => { const c = r.celula || 'Sem célula'; cont[c] = (cont[c] || 0) + 1; });
  const nomes = distintos('celula', baseCelulas()).filter(c => !estado.setor || cont[c]);
  if (cont['Sem célula']) nomes.push('Sem célula');
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
