// ══════ CÉLULAS E SETORES ══════
// O líder de área cria, renomeia, muda de setor e desativa células, e cria e renomeia setores.
// As listas SETORES, CELULAS e SETOR_DA_CELULA passam a vir do servidor a cada carga.

type CelulaEstrutura = { id: number; nome: string; setorId: number; setor: string; ativa: boolean };
type Estrutura = { setores: { id: number; nome: string }[]; celulas: CelulaEstrutura[] };
const FECHADAS = new Set<string>(); // células inativas: fora do formulário e da edição
let estrutura: Estrutura = { setores: [], celulas: [] };
let editandoEst: { tipo: 'setor' | 'celula'; id: number } = { tipo: 'celula', id: 0 };
const ERROS_EST: Record<string, string> = {
  nome_invalido: 'Informe um nome com pelo menos 2 letras.',
  nome_existe: 'Já existe um item com esse nome.',
  setor_obrigatorio: 'Escolha o setor.',
  nao_encontrado: 'Não encontrado. Atualize o painel e tente de novo.',
  sem_permissao: 'Só o líder de área altera células e setores.'
};

function aplicarEstrutura(e?: Estrutura) {
  $('tabEstrutura').classList.toggle('hidden', !estado.escopo.todos);
  if (!estado.escopo.todos && estado.aba === 'estrutura') mostrarAba('acompanhar');
  atualizarConfig();
  if (!e || !e.setores.length) return; // sem dados do servidor: ficam as listas do código
  estrutura = e;
  SETORES.splice(0, SETORES.length, ...e.setores.map(s => s.nome));
  CELULAS.splice(0, CELULAS.length, ...e.celulas.map(c => c.nome));
  Object.keys(SETOR_DA_CELULA).forEach(k => delete SETOR_DA_CELULA[k]);
  FECHADAS.clear();
  e.celulas.forEach(c => { if (c.setor) SETOR_DA_CELULA[c.nome] = c.setor; if (!c.ativa) FECHADAS.add(c.nome); });
}

function renderEstrutura() {
  const pessoas = (f: (r: Registro) => boolean): string => plural(estado.regs.filter(f).length, 'pessoa', 'pessoas');
  const cartao = (s: { id: number; nome: string }): string => {
    const cels = estrutura.celulas.filter(c => c.setorId === s.id);
    const itens = cels.map(c => `<li><button type="button" class="est-item ${c.ativa ? '' : 'off'}" data-est="celula" data-id="${c.id}">
      <span class="est-nome">${esc(c.nome)}</span><span class="est-n">${pessoas(r => r.celula === c.nome)}</span>${c.ativa ? '' : '<span class="badge off">Inativa</span>'}</button></li>`).join('');
    return `<section class="panel"><header class="panel-head est-head"><div><h2>Setor ${esc(s.nome)}</h2>
      <p>${plural(cels.filter(c => c.ativa).length, 'célula ativa', 'células ativas')} · ${pessoas(r => r.setor === s.nome)}</p></div>
      <button type="button" class="btn-link" data-est="setor" data-id="${s.id}">Renomear</button></header>
      <ul class="est-lista">${itens || '<li class="vazio">Nenhuma célula ainda.</li>'}</ul></section>`;
  };
  $('estruturaView').innerHTML = `<header class="page-heading with-action"><div><h1>Células e setores</h1>
    <p>O que aparece no formulário. Uma célula inativa sai do formulário, mas os cadastros dela continuam.</p></div>
    <div class="est-acoes"><button class="btn-sec" type="button" data-est="setor" data-id="0">Novo setor</button><button class="btn-sec solid" type="button" data-est="celula" data-id="0">Nova célula</button></div></header>
    <div class="panels">${estrutura.setores.map(cartao).join('')}</div>`;
}

// ── Diálogo ──
const estDlg = document.createElement('dialog');
estDlg.setAttribute('aria-labelledby', 'estTitulo');
estDlg.innerHTML = `<div class="det-head"><div><h3 id="estTitulo"></h3><p id="estSub"></p></div>
  <button class="icon-btn" type="button" data-fechar aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <form class="det-body" id="estForm" novalidate>
    <div class="field"><label class="label" for="estNome">Nome</label><input class="input" id="estNome" autocomplete="off" autocapitalize="words" maxlength="60"></div>
    <div class="field" id="estSetorWrap"><label class="label" for="estSetor">Setor</label><select class="input" id="estSetor"></select></div>
    <label class="sw" id="estAtivaWrap"><input type="checkbox" id="estAtiva"><span class="sw-txt"><b>Célula ativa</b><small>Desative quando a célula fechar ou multiplicar. Ela sai do formulário; os cadastros continuam.</small></span><span class="sw-ui" aria-hidden="true"></span></label>
    <p class="field-hint" id="estAviso"></p>
    <p class="msg" id="estMsg" role="alert"></p>
    <button type="submit" class="btn-primary" id="estSalvar">Salvar</button>
  </form>`;
document.body.appendChild(estDlg);

function abrirEstrutura(tipo: 'setor' | 'celula', id: number) {
  editandoEst = { tipo, id };
  const c = estrutura.celulas.find(x => x.id === id);
  const s = estrutura.setores.find(x => x.id === id);
  const nome = tipo === 'celula' ? c?.nome : s?.nome;
  $('estTitulo').textContent = id ? nome || '' : tipo === 'setor' ? 'Novo setor' : 'Nova célula';
  $('estSub').textContent = tipo === 'setor' ? 'Setor da área' : c ? `Setor ${c.setor}` : 'Aparece no formulário de membro';
  $<HTMLInputElement>('estNome').value = nome || '';
  const setorPadrao = c?.setorId || estrutura.setores.find(x => x.nome === estado.setor)?.id || estrutura.setores[0]?.id;
  $('estSetor').innerHTML = estrutura.setores.map(x => `<option value="${x.id}"${x.id === setorPadrao ? ' selected' : ''}>${esc(x.nome)}</option>`).join('');
  $<HTMLInputElement>('estAtiva').checked = c ? c.ativa : true;
  $('estSetorWrap').classList.toggle('hidden', tipo === 'setor');
  $('estAtivaWrap').classList.toggle('hidden', tipo === 'setor');
  $('estAviso').textContent = !id ? '' : tipo === 'setor'
    ? 'Ao renomear, os cadastros e os acessos deste setor passam a usar o nome novo.'
    : 'Ao renomear ou mudar de setor, os cadastros e os acessos desta célula acompanham a mudança.';
  $('estMsg').textContent = '';
  estDlg.showModal();
  $<HTMLInputElement>('estNome').focus();
}

$('estruturaView').addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-est]') : null;
  if (b) abrirEstrutura(b.dataset.est === 'setor' ? 'setor' : 'celula', Number(b.dataset.id) || 0);
});
estDlg.addEventListener('click', e => {
  if (e.target === estDlg || (e.target instanceof Element && e.target.closest('[data-fechar]'))) estDlg.close();
});

$('estForm').addEventListener('submit', async e => {
  e.preventDefault();
  const s = lerSessao();
  if (!s) { estDlg.close(); return mostrarLogin('Sua sessão expirou. Entre novamente.'); }
  const msg = $('estMsg');
  const nome = $<HTMLInputElement>('estNome').value.trim();
  if (nome.length < 2) { msg.textContent = ERROS_EST.nome_invalido; return; }
  const btn = $<HTMLButtonElement>('estSalvar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Salvando...';
  msg.textContent = '';
  try {
    const r = await api<ApiResult>({
      acao: 'estrutura_salvar', token: s.token, tipo: editandoEst.tipo, id: editandoEst.id, nome,
      setorId: Number($<HTMLSelectElement>('estSetor').value) || 0, ativo: $<HTMLInputElement>('estAtiva').checked
    });
    if (r.ok) { estDlg.close(); carregar(); return; }
    if (r.erro === 'sessao') { limparSessao(); estDlg.close(); return mostrarLogin('Sua sessão expirou. Entre novamente.'); }
    msg.textContent = ERROS_EST[r.erro || ''] || 'Não foi possível salvar. Tente novamente.';
  } catch (err) {
    msg.textContent = 'Não foi possível conectar. Verifique a internet.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
});
