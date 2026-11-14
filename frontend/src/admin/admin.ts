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
