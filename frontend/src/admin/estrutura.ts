// ══════ CÉLULAS E SETORES ══════
// O líder de área cria, renomeia, muda de setor e desativa células, e cria e renomeia setores.
// As listas SETORES, CELULAS e SETOR_DA_CELULA passam a vir do servidor a cada carga.

type CelulaEstrutura = { id: number; nome: string; setorId: number; setor: string; ativa: boolean; cor?: string; diaSemana?: string; horario?: string; anfitriaoId?: number };
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

// Cor da célula (definida em Ajustes ou a da paleta pela posição) e o chip usado nas listas.
function corDaCelula(nome: string): string {
  const i = estrutura.celulas.findIndex(c => c.nome === nome);
  return regrasCelula.cor(estrutura.celulas[i]?.cor || '', i);
}
function celulaChip(nome: string | undefined): string {
  return nome ? `<span class="cel-chip" data-cor="${corDaCelula(nome)}"><i aria-hidden="true"></i>${esc(nome)}</span>` : 'Sem célula';
}
const encontroDe = (c: CelulaEstrutura): string => regrasCelula.encontro(c.diaSemana || '', c.horario || '');
function casaDe(c: CelulaEstrutura): string {
  const r = c.anfitriaoId ? estado.regs.find(x => x.linha === c.anfitriaoId) : undefined;
  return r ? `casa de ${nomeCurto(r)}` : '';
}
const curtoNome = (n: string): string => n.split(/\s+/)[0];

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
  const conta = (f: (r: Registro) => boolean): number => estado.regs.filter(f).length;
  const ativas = estrutura.celulas.filter(c => c.ativa).length;
  const setor = (s: { id: number; nome: string }): string => {
    const cels = estrutura.celulas.filter(c => c.setorId === s.id && c.ativa).length;
    return `<section class="est-setor"><p class="ct-kick">Setor</p><h2>${esc(s.nome)}</h2>
      <dl><div><dt>células ativas</dt><dd>${cels}</dd></div><div><dt>pessoas</dt><dd>${conta(r => r.setor === s.nome)}</dd></div></dl>
      <button type="button" class="btn-link" data-est="setor" data-id="${s.id}" aria-label="Renomear o setor ${esc(s.nome)}">Renomear</button></section>`;
  };
  const ordem = [...estrutura.celulas].sort((a, b) => Number(b.ativa) - Number(a.ativa) || (a.setor || '').localeCompare(b.setor || '', 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR'));
  const linha = (c: CelulaEstrutura): string => `<button type="button" class="est-row${c.ativa ? '' : ' off'}" data-est="celula" data-id="${c.id}" aria-label="Editar a célula ${esc(c.nome)}">
      <span class="er-cel">${celulaChip(c.nome)}<small class="er-m">${esc([c.setor, encontroDe(c)].filter(Boolean).join(' · '))}</small></span>
      <span class="er-set">${esc(c.setor || '—')}</span>
      <span class="er-enc">${esc(encontroDe(c) || '—')}</span>
      <span class="er-casa">${esc(casaDe(c) || 'sem anfitrião')}</span>
      <span class="er-n"><span class="sr-only">Pessoas: </span>${(n => `${n}<small class="er-n-rot" aria-hidden="true"> ${n === 1 ? 'pessoa' : 'pessoas'}</small>`)(conta(r => r.celula === c.nome))}</span>
      <span class="er-st">${c.ativa ? '<span class="badge">Ativa</span>' : '<span class="badge off">Inativa</span>'}</span>
      <span class="it-seta" aria-hidden="true">${icone('abrir', { classe: 'ic-18' })}</span></button>`;
  $('estruturaView').innerHTML = `<header class="page-heading with-action"><div><h1>Células e setores</h1>
    <p>${plural(estrutura.setores.length, 'setor', 'setores')} · ${plural(estrutura.celulas.length, 'célula', 'células')}, ${ativas} ${ativas === 1 ? 'ativa' : 'ativas'} · ${plural(estado.regs.length, 'pessoa', 'pessoas')}</p></div>
    <div class="est-acoes"><button class="b-sec" type="button" data-est="setor" data-id="0">${icone('mais', { classe: 'ic-16' })} Novo setor</button><button class="b-pri" type="button" data-est="celula" data-id="0">${icone('mais', { classe: 'ic-16' })} Nova célula</button></div></header>
    <div class="est-setores">${estrutura.setores.map(setor).join('')}</div>
    <div class="est-tab">${estrutura.celulas.length ? '<div class="est-thead" aria-hidden="true"><span>Célula</span><span>Setor</span><span>Encontro</span><span>Casa</span><span>Pessoas</span><span>Situação</span><span></span></div>' + ordem.map(linha).join('') : '<p class="empty">Nenhuma célula ainda.</p>'}</div>
    <p class="field-hint">Células inativas saem do formulário público e do mapa, mas as pessoas continuam vinculadas.</p>`;
}

// ── Diálogo ──
const estDlg = document.createElement('dialog');
estDlg.setAttribute('aria-labelledby', 'estTitulo');
estDlg.innerHTML = `<div class="det-head"><div><h3 id="estTitulo"></h3><p id="estSub"></p></div>
  <button class="icon-btn" type="button" data-fechar aria-label="Fechar">${icone('fechar', { classe: 'ic-18' })}</button></div>
  <form class="det-body" id="estForm" novalidate>
    <div class="field"><label class="label" for="estNome">Nome</label><input class="input" id="estNome" autocomplete="off" autocapitalize="words" maxlength="60"></div>
    <div class="field" id="estSetorWrap"><label class="label" for="estSetor">Setor</label><select class="input" id="estSetor"></select></div>
    <div id="estIdent">
      <fieldset class="field est-cores"><legend class="label">Cor no mapa e nas listas</legend><div class="cores-op" id="estCores"></div></fieldset>
      <div class="est-enc-campos"><div class="field"><label class="label" for="estDia">Dia do encontro</label><select class="input" id="estDia"><option value="">Não definido</option>${regrasCelula.DIAS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
      <div class="field"><label class="label" for="estHora">Horário</label><input class="input" id="estHora" type="time" step="900"></div></div>
      <div class="field"><label class="label" for="estCasa">Casa onde se reúne</label><select class="input" id="estCasa"></select><p class="field-hint">Só aparece no painel, nunca no formulário público.</p></div>
    </div>
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
  const corAtual = c ? corDaCelula(c.nome) : regrasCelula.PALETA[estrutura.celulas.length % regrasCelula.PALETA.length];
  $('estCores').innerHTML = regrasCelula.PALETA.map((cor, i) => `<label class="cor-op"><input type="radio" name="estCor" value="${cor}"${cor === corAtual ? ' checked' : ''}><span data-cor="${cor}"><i class="sr-only">Cor ${i + 1}</i></span></label>`).join('');
  $<HTMLSelectElement>('estDia').value = c?.diaSemana || '';
  $<HTMLInputElement>('estHora').value = c?.horario || '';
  const membros = c ? estado.regs.filter(r => r.celula === c.nome).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) : [];
  $('estCasa').innerHTML = '<option value="0">Não definida</option>' + membros.map(r => `<option value="${r.linha}"${r.linha === c?.anfitriaoId ? ' selected' : ''}>${esc(nomeCurto(r))}</option>`).join('');
  $('estIdent').classList.toggle('hidden', tipo === 'setor');
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
      setorId: Number($<HTMLSelectElement>('estSetor').value) || 0, ativo: $<HTMLInputElement>('estAtiva').checked,
      cor: estDlg.querySelector<HTMLInputElement>('input[name="estCor"]:checked')?.value || '',
      diaSemana: $<HTMLSelectElement>('estDia').value, horario: $<HTMLInputElement>('estHora').value,
      anfitriaoId: Number($<HTMLSelectElement>('estCasa').value) || 0
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
