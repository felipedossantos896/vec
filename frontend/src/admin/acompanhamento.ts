// ══════ ACOMPANHAMENTO ══════
// Aba Acompanhar: um resumo no topo e grupos que levam do número às pessoas; cada item abre a
// lista já filtrada ou o cadastro. O mapa da jornada fica nos Indicadores, mas também leva à lista.

// Cuidar das pessoas vem primeiro; arrumar os cadastros fica no fim da página
const CUIDAR: [string, string][] = [
  ['semDiscipulador', 'Sem discipulador'],
  ['batizar', 'Receberam Jesus e ainda não foram batizados'],
  ['quaseLa', 'Falta uma etapa para concluir a jornada'],
  ['naoFrequenta', 'Não congregam com frequência'],
  ['semCelula', 'Sem célula'],
  ['semContato', `Sem contato registrado há ${DIAS_SEM_CONTATO} dias`]
];
const ARRUMAR: [string, string][] = [
  ['semVinculo', 'Informaram um discipulador que ainda não foi vinculado'],
  ['duplicados', 'Cadastros possivelmente duplicados']
];
// Interesse, título, treinamento que prepara para ele e nome curto do treinamento
const POTENCIAL: [string, string, string, string][] = [
  ['querLiderar', 'Querem liderar célula', 'expresso02', 'Expresso 02'],
  ['querCuidar', 'Querem cuidar de pessoas', 'expresso01', 'Expresso 01'],
  ['querAnfitriao', 'Querem ser anfitriões', '', '']
];
const TONS = [8, 24, 40, 72, 100]; // cinco passos do claro ao escuro; o texto fica branco a partir do quarto
const sitEtapa = (k: string): string => k === 'batismo' ? 'naoBatizados' : 'sem_' + k;
const curto = (nome: string): string => nome.split(/\s+/).slice(0, 2).join(' ');
const algum = (pares: [string, ...string[]][]) => (r: Registro): boolean => pares.some(([k]) => SITUACOES[k].f(r));
const ICONE_OK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/></svg>';

function nomes(rs: Registro[]): string {
  const tres = rs.slice(0, 3).map(r => esc(curto(r.nome)));
  return rs.length > 3 ? `${tres.join(', ')} e mais ${rs.length - 3}` : tres.join(', ');
}

const rostos = (rs: Registro[]): string => `<span class="rostos" aria-hidden="true">${rs.slice(0, 3).map(r => avatar(r)).join('')}${rs.length > 3 ? `<i class="mais">+${rs.length - 3}</i>` : ''}</span>`;

function pessoa(r: Registro, nota: string, tag = '', classe = ''): string {
  return `<li><button type="button" class="pessoa av-l ${classe}" data-reg="${estado.regs.indexOf(r)}">${avatar(r)}<b>${esc(r.nome)}</b><span>${nota}</span>${tag}</button></li>`;
}

// Grupos recolhíveis: no celular começam fechados para a página não ficar comprida demais
const abertos: Record<string, boolean> = {};
function grupo(id: string, titulo: string, resumo: string, corpo: string, classe = ''): string {
  const aberto = abertos[id] ?? matchMedia('(min-width: 720px)').matches;
  return `<details class="grupo" id="ag-${id}"${aberto ? ' open' : ''}><summary><h2 class="group-title">${titulo}</h2><span class="grupo-n">${resumo}</span></summary><div class="panels ${classe}">${corpo}</div></details>`;
}

// Um toque num cuidado abre a lista ali mesmo, logo abaixo; outro toque fecha. Ir para Pessoas
// fica como opção, para quem quiser buscar e filtrar.
let verSit = '';
function notaCuidado(k: string, r: Registro): string {
  const cel = celulaChip(r.celula);
  if (k === 'semContato') return `${cel} · ${r._contato ? `último contato ${regrasPessoas.haQuanto(r._contato, new Date())}` : 'nenhum contato registrado'}`;
  if (k === 'quaseLa') return `${cel} · falta ${JORNADA.filter(([e]) => r[e] !== 'S').map(([, etapa]) => etapa.toLowerCase()).join(', ')}`;
  return cel;
}
function listaAberta(k: string, titulo: string, g: Registro[]): string {
  return `<li class="cuidado-aberto" id="cuidadoAberto"><div class="ca-head"><h3>${titulo}</h3>
    <button type="button" class="btn-link" data-sit="${k}">Abrir em Pessoas</button>
    <button type="button" class="icon-btn ca-fechar" data-ver="${k}" aria-label="Fechar a lista">×</button></div>
    <ul class="pessoas ca-lista">${g.map(r => pessoa(r, notaCuidado(k, r))).join('')}</ul></li>`;
}
const attrsVer = (k: string): string => `data-ver="${k}" aria-expanded="${verSit === k}"${verSit === k ? ' aria-controls="cuidadoAberto"' : ''}`;

function cuidar(base: Registro[]): string {
  const cards = CUIDAR.map(([k, titulo]) => {
    const g = base.filter(SITUACOES[k].f);
    return g.length ? `<li><button type="button" class="cuidado" ${attrsVer(k)}><b>${g.length}</b><span class="passo-t">${titulo}</span><span class="cuidado-pes">${rostos(g)}<span class="passo-n">${nomes(g)}</span></span></button></li>${verSit === k ? listaAberta(k, titulo, g) : ''}` : '';
  }).join('');
  return `<section class="cuidar" id="ag-cuidar"><header class="cuidar-head"><h2 class="group-title">Cuidar das pessoas</h2><p>Quem precisa de um cuidado agora. Toque para ver quem é.</p></header>${cards ? `<ul class="cuidados">${cards}</ul>` : `<p class="em-dia">${ICONE_OK}<span><b>Tudo em dia.</b> Ninguém precisando de cuidado agora.</span></p>`}</section>`;
}

function arrumar(base: Registro[]): string {
  const itens = ARRUMAR.map(([k, titulo]) => [k, titulo, base.filter(SITUACOES[k].f)] as const).filter(([, , g]) => g.length);
  if (!itens.length) return '';
  const linhas = itens.map(([k, titulo, g]) => `<li><button type="button" class="passo" ${attrsVer(k)}><b>${g.length}</b><span class="passo-t">${titulo}</span><span class="passo-n">${nomes(g)}</span></button></li>${verSit === k ? listaAberta(k, titulo, g) : ''}`).join('');
  const n = itens.reduce((s, [, , g]) => s + g.length, 0);
  return grupo('arrumar', 'Arrumar cadastros', plural(n, 'pendência', 'pendências'), painel('Dados para conferir', 'Não é cuidado com a pessoa: são ajustes no cadastro.', `<ul class="passos">${linhas}</ul>`));
}

// Grade de setores e células pelas seis etapas, usada nos Indicadores. Uma célula fora da lista
// conhecida fica no setor mais citado pelos cadastros dela.
function mapaJornada(base: Registro[]): string {
  const linha = (nome: string, rs: Registro[], classe: string, alvo: string | null): string =>
    `<tr class="${classe}"><th scope="row">${esc(nome)} <small>${rs.length}</small></th>${JORNADA.map(([k, etapa]) => {
      const n = rs.filter(r => r[k] === 'S').length;
      const tom = TONS[Math.min(4, Math.floor((rs.length ? n / rs.length : 0) * 5))];
      const dica = esc(`${nome} · ${etapa}: ${n} de ${rs.length} concluíram`);
      const attrs = `class="mc${tom >= 72 ? ' hi' : ''}" data-t="${tom}" data-tip="${dica}" aria-label="${dica}"`;
      const pct = `${rs.length ? Math.round((n / rs.length) * 100) : 0}%`;
      return `<td>${alvo === null ? `<span ${attrs}>${pct}</span>` : `<button type="button" ${attrs} data-sit="${sitEtapa(k)}" ${alvo}>${pct}</button>`}</td>`;
    }).join('')}</tr>`;

  const porCelula: Record<string, Registro[]> = {};
  base.forEach(r => { if (r.celula) (porCelula[r.celula] ||= []).push(r); });
  const setorDe = (c: string): string => {
    if (SETOR_DA_CELULA[c]) return SETOR_DA_CELULA[c];
    const cont: Record<string, number> = {};
    porCelula[c].forEach(r => { if (r.setor) cont[r.setor] = (cont[r.setor] || 0) + 1; });
    return Object.keys(cont).sort((a, b) => cont[b] - cont[a])[0] || '';
  };
  const celulas = distintos('celula', CELULAS).filter(c => porCelula[c]);
  const setores = distintos('setor', SETORES).filter(s => base.some(r => r.setor === s) || celulas.some(c => setorDe(c) === s));
  let linhas = linha(estado.celula || estado.setor || 'Total', base, 'total', '');
  if (celulas.length > 1) {
    const grupos = setores.length > 1 ? [...setores, ''] : [''];
    grupos.forEach(s => {
      const dentro = celulas.filter(c => setores.length < 2 || setorDe(c) === s);
      if (s) linhas += linha(s, base.filter(r => r.setor === s), 'setor', `data-setor="${esc(s)}"`);
      linhas += dentro.map(c => linha(c, porCelula[c], 'cel', `data-cel="${esc(c)}"`)).join('');
    });
    const sem = base.filter(r => !r.celula);
    if (sem.length) linhas += linha('Sem célula', sem, 'setor', null);
  }
  return painel('Jornada por célula', 'Quanto de cada célula já concluiu cada etapa. Quanto mais escuro, mais gente. Toque para ver quem falta.',
    `<table class="mapa"><thead><tr><td></td>${JORNADA.map(([, etapa], i) => `<th scope="col" aria-label="${etapa}">${i + 1}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table>
     <ol class="mapa-leg">${JORNADA.map(([, etapa]) => `<li>${etapa}</li>`).join('')}</ol>
     <p class="escala" aria-hidden="true">menos${TONS.map(t => `<i data-t="${t}"></i>`).join('')}mais gente concluiu</p>`);
}

// Quem falta fazer o treinamento aparece primeiro, com a etiqueta; quem já fez vem depois, sem ela
function potencial(base: Registro[]): string {
  return POTENCIAL.map(([sit, titulo, treino, nomeTreino]) => {
    const pronto = (r: Registro): boolean => !treino || r[treino] === 'S';
    const g = base.filter(SITUACOES[sit].f).sort((a, b) => Number(pronto(a)) - Number(pronto(b)) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const feitos = g.filter(pronto).length;
    const sub = !g.length ? 'Ninguém marcou esse interesse.' : treino ? `${feitos} de ${g.length} já fizeram o ${nomeTreino}.` : `${plural(g.length, 'pessoa disposta', 'pessoas dispostas')} a abrir a casa.`;
    const barra = treino && g.length ? `<span class="cell-bar progresso" aria-hidden="true"><i data-w="${(feitos / g.length) * 100}"></i></span>` : '';
    const vis = g.slice(0, 6);
    const lista = vis.map((r, i) => (treino && pronto(r) && i > 0 && !pronto(vis[i - 1]) ? `<li class="lista-sep">Já fizeram o ${nomeTreino}</li>` : '') +
      pessoa(r, celulaChip(r.celula), pronto(r) ? '' : `<em class="tag">Falta o ${nomeTreino}</em>`)).join('');
    const todos = g.length > 6 ? `<button type="button" class="btn-link" data-sit="${sit}">Ver todas as ${g.length} pessoas</button>` : '';
    return painel(titulo, sub, g.length ? `${barra}<ul class="pessoas">${lista}</ul>${todos}` : '');
  }).join('');
}

interface Aniversario { r: Registro; d: Date; dias: number; anos: number }
function proximosAniversarios(base: Registro[]): Aniversario[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return base.map(r => {
    if (!r._nasc) return null;
    let d = new Date(hoje.getFullYear(), r._nasc.getMonth(), r._nasc.getDate());
    if (d < hoje) d = new Date(hoje.getFullYear() + 1, r._nasc.getMonth(), r._nasc.getDate());
    return { r, d, dias: Math.round((d.getTime() - hoje.getTime()) / 864e5), anos: d.getFullYear() - r._nasc.getFullYear() };
  }).filter((a): a is Aniversario => !!a && a.dias <= 30).sort((a, b) => a.dias - b.dias);
}

function aniversarios(lista: Aniversario[]): string {
  const quando = (a: Aniversario): string => a.dias === 0 ? 'Hoje' : a.dias === 1 ? 'Amanhã' : `Em ${a.dias} dias`;
  const itens = lista.map(a => `<li><button type="button" class="pessoa aniv${a.dias === 0 ? ' hoje' : ''}" data-reg="${estado.regs.indexOf(a.r)}">
    <i class="cal" aria-hidden="true"><strong>${a.d.getDate()}</strong><small>${a.d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></i>
    ${avatar(a.r)}<b>${esc(a.r.nome)}</b><span>${quando(a)} · faz ${a.anos} anos · ${celulaChip(a.r.celula)}</span></button></li>`).join('');
  return painel('Aniversariantes', 'Quem faz aniversário nos próximos 30 dias.', itens ? `<ul class="pessoas rolar">${itens}</ul>` : '<p class="vazio">Nenhum aniversário nos próximos 30 dias.</p>');
}

function sugestoes(g: Registro[]): string {
  const lista = g.map(r => `<li><button type="button" class="pessoa sug" data-reg="${estado.regs.indexOf(r)}"><b>${esc(r.sugestao)}</b><span>${avatar(r, 'av-xs')}${esc(curto(r.nome))} · ${celulaChip(r.celula)}</span></button></li>`).join('');
  return painel('Sugestões para as células', g.length ? `${plural(g.length, 'sugestão recebida', 'sugestões recebidas')}, da mais recente para a mais antiga.` : 'O que as pessoas escreveram no formulário.', lista ? `<ul class="pessoas citacoes rolar">${lista}</ul>` : '<p class="vazio">Ninguém deixou sugestão ainda.</p>');
}

// Resumo do dia: cada chip leva ao grupo correspondente
function atalhos(itens: [string, string, string][]): string {
  return `<nav class="atalhos" aria-label="Resumo do dia">${itens.map(([alvo, texto, classe]) => `<button type="button" class="atalho ${classe}" data-ir="${alvo}">${texto}</button>`).join('')}</nav>`;
}

function renderAcompanhar() {
  const base = baseIndicadores();
  if (!base.length) {
    $('aConteudo').innerHTML = `<div class="empty">${estado.regs.length ? 'Ninguém nesse setor ou célula.' : 'Ainda não há cadastros para acompanhar.'}</div>`;
    return;
  }
  const nCuidar = base.filter(algum(CUIDAR)).length;
  const nServir = base.filter(algum(POTENCIAL)).length;
  const nArrumar = base.filter(algum(ARRUMAR)).length;
  const aniv = proximosAniversarios(base);
  const hoje = aniv.filter(a => a.dias === 0).length;
  const sugs = base.filter(r => r.sugestao);
  const discipula = estado.escopo.perfil !== 'DISCIPULADOR';
  const pctDisc = Math.round((base.filter(r => r.discipuladorId).length / base.length) * 100);
  const lembrar = [hoje ? plural(hoje, 'aniversário hoje', 'aniversários hoje') : aniv.length ? plural(aniv.length, 'aniversário no mês', 'aniversários no mês') : '',
    sugs.length ? plural(sugs.length, 'sugestão', 'sugestões') : ''].filter(Boolean).join(' · ') || 'Nenhum aniversário no mês';

  const chips: [string, string, string][] = [['cuidar', nCuidar ? `${plural(nCuidar, 'pessoa precisa', 'pessoas precisam')} de cuidado` : 'Tudo em dia', nCuidar ? 'quente' : 'ok']];
  if (discipula) chips.push(['disc', `${pctDisc}% com discipulador`, '']);
  chips.push(['servir', `${plural(nServir, 'quer', 'querem')} servir`, '']);
  chips.push(['lembrar', lembrar, hoje ? 'festa' : '']);
  if (nArrumar) chips.push(['arrumar', plural(nArrumar, 'cadastro para arrumar', 'cadastros para arrumar'), '']);

  $('aConteudo').innerHTML = atalhos(chips) + cuidar(base) + (discipula ? painelDiscipulado(base, `${pctDisc}% com discipulador`) : '') +
    grupo('servir', 'Quem quer servir', plural(nServir, 'pessoa', 'pessoas'), potencial(base), 'three') +
    grupo('lembrar', 'Para não esquecer', lembrar, aniversarios(aniv) + sugestoes(sugs)) +
    arrumar(base);
}

// Um toque num número leva à aba Pessoas já filtrada; num nome, abre o cadastro
const aoTocar = (e: Event): void => {
  const alvo = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-sit], [data-reg]') : null;
  if (!alvo) return;
  if (alvo.dataset.reg) {
    const r = estado.regs[Number(alvo.dataset.reg)];
    if (r) abrirDetalhe(r);
    return;
  }
  estado.situacao = alvo.dataset.sit || 'todos';
  if (alvo.dataset.setor) { estado.setor = alvo.dataset.setor; estado.celula = ''; }
  if (alvo.dataset.cel) estado.celula = alvo.dataset.cel;
  estado.busca = '';
  $<HTMLInputElement>('fBusca').value = '';
  $('tip').classList.add('hidden');
  mostrarAba('cadastros');
  renderTudo();
  $('registrationsTitle').scrollIntoView({ block: 'start' });
};
['gConteudo', 'aConteudo'].forEach(id => $(id).addEventListener('click', aoTocar));

$('aConteudo').addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-ver]') : null;
  if (!b) return;
  const k = b.dataset.ver || '';
  verSit = verSit === k ? '' : k;
  renderAcompanhar();
  document.querySelector<HTMLElement>(`#aConteudo [data-ver="${k}"]:not(.ca-fechar)`)?.focus({ preventScroll: true });
  document.getElementById('cuidadoAberto')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// Atalhos do resumo abrem o grupo e rolam até ele; o estado aberto/fechado sobrevive aos filtros
$('aConteudo').addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-ir]') : null;
  const g = b && document.getElementById('ag-' + b.dataset.ir);
  if (!g) return;
  if (g instanceof HTMLDetailsElement) g.open = true;
  g.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('aConteudo').addEventListener('toggle', e => {
  const d = e.target;
  if (d instanceof HTMLDetailsElement && d.id.startsWith('ag-')) abertos[d.id.slice(3)] = d.open;
}, true);
