// ══════ CONTATO E ACOMPANHAMENTO ══════
// WhatsApp e autorização no detalhe, anotações de cada conversa e a data em que cada
// etapa da jornada foi marcada como concluída.

type Anotacao = { id: number; autorNome: string; em: string; texto: string; minha: boolean; tipo?: string; contatoEm?: string; lembrarEm?: string };
type AnotacoesResult = ApiResult & { anotacoes: Anotacao[] };

const fmtTel = (d: string): string => d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d;
const soData = (s: unknown): string => esc(String(s || '').split(' ')[0]);

function linhasContato(r: Registro): [string, string][] {
  return [
    ['WhatsApp', r.telefone ? `<a class="whats" href="https://wa.me/55${esc(r.telefone)}" target="_blank" rel="noopener">${esc(fmtTel(r.telefone))}</a>` : '<span class="pill x">—</span>'],
    ['Autorizou o uso dos dados', r.consentimentoEm ? soData(r.consentimentoEm) : '<span class="nota-fraca">Enviado antes da autorização</span>']
  ];
}

// Data em que a etapa foi marcada, ao lado do "Sim"
const dataEtapa = (r: Registro, k: string): string => r[k] === 'S' && r.jornadaDatas?.[k] ? `<small class="det-data">${soData(r.jornadaDatas[k])}</small>` : '';

// ── Registrar contato (Spec 009): o mesmo formulário na ficha (prefixo "n") e no diálogo
// rápido da Área (prefixo "c"). Tipo, quando, anotação opcional e lembrete.
function formContato(p: string): string {
  const tipos = regrasContato.TIPOS.map(([k, l, ic], i) => `<label class="ct-tipo"><input type="radio" name="${p}Tipo" value="${k}"${i === 0 ? ' checked' : ''}><span><i aria-hidden="true">${ic}</i>${l}</span></label>`).join('');
  const quando = [['hoje', 'Hoje'], ['ontem', 'Ontem'], ['outro', 'Outro dia']].map(([k, l], i) => `<label class="ct-dia"><input type="radio" name="${p}Quando" value="${k}"${i === 0 ? ' checked' : ''}><span>${l}</span></label>`).join('');
  return `<fieldset class="ct-grupo"><legend class="label">Como foi?</legend><div class="ct-tipos">${tipos}</div><p class="msg" id="${p}TipoErro"></p></fieldset>
    <fieldset class="ct-grupo"><legend class="label">Quando</legend><div class="ct-dias">${quando}<input class="input ct-outro hidden" type="date" id="${p}Outro" aria-label="Dia do contato"></div><p class="msg" id="${p}OutroErro"></p></fieldset>
    <label class="label" for="${p}Texto">Anotação <span class="opc">opcional</span></label>
    <textarea class="input" id="${p}Texto" rows="3" maxlength="2000" placeholder="Como foi a conversa? O que ficou combinado?"></textarea><p class="msg" id="${p}TextoErro"></p>
    <div class="ct-lembra"><label class="label" for="${p}Lembrar">Lembrar de falar de novo</label><select class="input" id="${p}Lembrar">${regrasContato.LEMBRETES.map(([d, l]) => `<option value="${d}"${d === regrasContato.LEMBRETE_PADRAO ? ' selected' : ''}>${l}</option>`).join('')}</select></div>`;
}
function lerFormContato(p: string): FormContato {
  const marcado = (n: string): string => document.querySelector<HTMLInputElement>(`input[name="${p}${n}"]:checked`)?.value || '';
  return { tipo: marcado('Tipo'), quando: marcado('Quando'), outroDia: $<HTMLInputElement>(`${p}Outro`).value, texto: $<HTMLTextAreaElement>(`${p}Texto`).value, lembrarDias: Number($<HTMLSelectElement>(`${p}Lembrar`).value) || 0 };
}
function errosContato(p: string, e: Record<string, string>): boolean {
  (['tipo', 'outroDia', 'texto'] as const).forEach(k => { $(`${p}${k === 'outroDia' ? 'Outro' : k[0].toUpperCase() + k.slice(1)}Erro`).textContent = e[k] || ''; });
  return !Object.keys(e).length;
}
const payloadContato = (f: FormContato): object => {
  const agora = new Date();
  return { acao: 'anotacao_salvar', tipo: f.tipo, contatoEm: regrasContato.dataDoContato(f, agora), lembrarEm: regrasContato.lembrete(f.lembrarDias, agora), texto: f.texto.trim() };
};
// "Outro dia" mostra o campo de data.
document.addEventListener('change', e => {
  const i = e.target as HTMLInputElement;
  if (i?.name?.endsWith('Quando')) { const p = i.name.slice(0, -6); document.getElementById(`${p}Outro`)?.classList.toggle('hidden', i.value !== 'outro'); }
});

function blocoNotas(r: Registro): string {
  const ultimo = r._contato ? `Último contato em ${fmtData(r._contato)}.` : 'Nenhum contato registrado ainda.';
  const lembrete = r._lembrete ? ` Lembrete para ${fmtData(r._lembrete)}.` : '';
  return `<div class="det-sec" id="nSec">
    ${regrasContato.semContato(r._contato, r._lembrete || null, new Date()) ? `<p class="ct-alerta">${r._contato ? `${Math.floor((Date.now() - r._contato.getTime()) / 864e5)} dias desde o último contato.` : 'Nenhum contato registrado ainda.'}</p>` : ''}
    <form class="nota-form ct-form" id="nForm" novalidate><p class="ct-titulo">Registrar contato</p>${formContato('n')}
      <p class="msg" id="nMsg" role="alert"></p>
      <div class="nota-acoes"><span class="field-hint">${ultimo}${lembrete}</span><button type="submit" class="btn-sec solid" id="nSalvar">Registrar</button></div></form>
    <p class="ct-titulo">Histórico</p><ol class="notas ct-tl" id="nLista"><li class="vazio">Carregando…</li></ol></div>`;
}

function renderNotas(lista: Anotacao[]) {
  $('nLista').innerHTML = lista.map((n, i) => {
    const tipo = n.tipo || 'nota';
    const dia = n.contatoEm ? regrasContato.diaMes(n.contatoEm) : esc(n.em.slice(0, 5));
    return `<li class="ct-ev ${tipo}"><span class="ct-ic" aria-hidden="true">${regrasContato.icone(tipo)}</span><div>
      <p class="ct-eh"><b>${regrasContato.rotulo(tipo)}</b><span>${esc(n.autorNome)} · ${dia}</span></p>
      ${n.texto ? `<p class="ct-et">${esc(n.texto)}</p>` : ''}
      ${i === 0 && n.lembrarEm ? `<p class="ct-lem">Falar de novo em ${regrasContato.diaMes(n.lembrarEm)}</p>` : ''}
      ${n.minha ? `<button type="button" class="btn-link" data-nota="${n.id}">Apagar</button>` : ''}</div></li>`;
  }).join('') || '<li class="vazio">Nenhum contato registrado ainda.</li>';
}

// Último contato e lembrete da pessoa a partir da lista (a mais recente primeiro).
function atualizarContatoDe(r: Registro, lista: Anotacao[]) {
  const antes = `${r.ultimoContato}|${r.proximoContato}`;
  r.ultimoContato = lista[0] ? (lista[0].contatoEm || lista[0].em) : '';
  r.proximoContato = lista[0]?.lembrarEm || '';
  if (`${r.ultimoContato}|${r.proximoContato}` !== antes) { derivar(r); renderTudo(); }
}

// Aviso rápido no rodapé, com uma ação opcional ("Desfazer").
function avisoRapido(msg: string, acao?: { rotulo: string; fazer: () => void }, tipo: 'ok' | 'erro' = 'ok') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.classList.toggle('erro', tipo === 'erro');
  el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  el.innerHTML = `<span>${tipo === 'erro' ? '<b aria-hidden="true">!</b> ' : ''}${esc(msg)}</span>${acao ? `<button type="button" class="toast-a">${esc(acao.rotulo)}</button>` : ''}`;
  el.classList.add('on');
  const b = el.querySelector<HTMLButtonElement>('.toast-a');
  if (b && acao) b.onclick = () => { el!.classList.remove('on'); acao.fazer(); };
  clearTimeout((avisoRapido as unknown as { t?: number }).t);
  (avisoRapido as unknown as { t?: number }).t = window.setTimeout(() => el!.classList.remove('on'), 7000);
}

// Chama o servidor e, se o detalhe ainda é desta pessoa, mostra a lista e atualiza o último contato
async function notas(r: Registro, payload: object, botao?: HTMLButtonElement): Promise<boolean> {
  const s = lerSessao();
  if (!s) { $<HTMLDialogElement>('det').close(); mostrarLogin('Sua sessão expirou. Entre novamente.'); return false; }
  if (botao) botao.disabled = true;
  try {
    const res = await api<AnotacoesResult>({ ...payload, linha: r.linha, token: s.token });
    if (registroAberto() !== r || !document.getElementById('nLista')) return false;
    if (!res.ok) {
      if (res.erro === 'sessao') { limparSessao(); $<HTMLDialogElement>('det').close(); mostrarLogin('Sua sessão expirou. Entre novamente.'); return false; }
      $('nMsg').textContent = res.erro === 'texto_vazio' ? 'Escreva a anotação.' : res.erro === 'data_invalida' ? 'Confira o dia do contato.' : 'Não foi possível salvar. Atualize o painel e tente de novo.';
      return false;
    }
    renderNotas(res.anotacoes);
    renderResumoNotas(res.anotacoes);
    atualizarContatoDe(r, res.anotacoes);
    ultimaLista = res.anotacoes;
    return true;
  } catch (err) {
    if (document.getElementById('nMsg')) $('nMsg').textContent = 'Não foi possível conectar. Verifique a internet.';
    return false;
  } finally {
    if (botao) botao.disabled = false;
  }
}

let ultimaLista: Anotacao[] = [];
const carregarNotasDe = (r: Registro): void => { notas(r, { acao: 'anotacoes' }); };
// O contato que acabou de ser gravado é o de maior número entre os meus.
const novoId = (l: Anotacao[]): number => Math.max(0, ...l.filter(n => n.minha).map(n => n.id));

$('detBody').addEventListener('submit', async e => {
  if ((e.target as Element).id !== 'nForm') return;
  e.preventDefault();
  const r = registroAberto();
  $('nMsg').textContent = '';
  if (!r) return;
  const f = lerFormContato('n');
  if (!errosContato('n', regrasContato.validar(f, new Date()))) return;
  if (await notas(r, payloadContato(f), $<HTMLButtonElement>('nSalvar'))) {
    $<HTMLTextAreaElement>('nTexto').value = '';
    const id = novoId(ultimaLista);
    avisoRapido(`Contato com ${curtoNome(r.nome)} registrado.`, id ? { rotulo: 'Desfazer', fazer: () => { notas(r, { acao: 'anotacao_excluir', id }); } } : undefined);
  }
});
$('detBody').addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-nota]') : null;
  const r = registroAberto();
  if (b && r) notas(r, { acao: 'anotacao_excluir', id: Number(b.dataset.nota) }, b);
});

// ── Diálogo rápido "Contato feito" (Área) ──
const contatoDlg = document.createElement('dialog');
contatoDlg.className = 'ct-dlg';
contatoDlg.setAttribute('aria-labelledby', 'cTitulo');
contatoDlg.innerHTML = `<div class="det-head"><div><p class="ct-kick">Registrar contato</p><h3 id="cTitulo"></h3></div>
  <button class="icon-btn" type="button" data-fechar aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <form class="det-body ct-form" id="cForm" novalidate>${formContato('c')}<p class="msg" id="cMsg" role="alert"></p>
  <button type="submit" class="btn-primary" id="cSalvar">Registrar contato</button></form>`;
document.body.appendChild(contatoDlg);
let contatoDe: Registro | null = null;
function abrirContato(r: Registro) {
  contatoDe = r;
  $('cTitulo').textContent = r.nome;
  ($('cForm') as HTMLFormElement).reset();
  $('cOutro').classList.add('hidden'); $('cMsg').textContent = ''; errosContato('c', {});
  contatoDlg.showModal();
  contatoDlg.querySelector<HTMLInputElement>('input[name="cTipo"]:checked')?.focus();
}
contatoDlg.addEventListener('click', e => { if (e.target === contatoDlg || (e.target instanceof Element && e.target.closest('[data-fechar]'))) contatoDlg.close(); });
$('cForm').addEventListener('submit', async e => {
  e.preventDefault();
  const r = contatoDe, s = lerSessao();
  if (!r) return;
  if (!s) { contatoDlg.close(); return mostrarLogin('Sua sessão expirou. Entre novamente.'); }
  const f = lerFormContato('c');
  if (!errosContato('c', regrasContato.validar(f, new Date()))) return;
  const b = $<HTMLButtonElement>('cSalvar'); b.disabled = true;
  try {
    const res = await api<AnotacoesResult>({ ...payloadContato(f), linha: r.linha, token: s.token });
    if (!res.ok) {
      if (res.erro === 'sessao') { limparSessao(); contatoDlg.close(); return mostrarLogin('Sua sessão expirou. Entre novamente.'); }
      $('cMsg').textContent = res.erro === 'data_invalida' ? 'Confira o dia do contato.' : res.erro === 'texto_vazio' ? 'Escreva a anotação.' : 'Não foi possível salvar. Tente de novo.';
      return;
    }
    contatoDlg.close();
    atualizarContatoDe(r, res.anotacoes);
    const id = novoId(res.anotacoes);
    avisoRapido(`Contato com ${curtoNome(r.nome)} registrado.`, id ? { rotulo: 'Desfazer', fazer: async () => {
      const s2 = lerSessao(); if (!s2) return;
      const d = await api<AnotacoesResult>({ acao: 'anotacao_excluir', id, linha: r.linha, token: s2.token });
      if (d.ok) { atualizarContatoDe(r, d.anotacoes); avisoRapido('Registro desfeito.'); } else avisoRapido('Não foi possível desfazer. Tente de novo.', undefined, 'erro');
    } } : undefined);
  } catch { $('cMsg').textContent = 'Não foi possível conectar. Verifique a internet.'; } finally { b.disabled = false; }
});
document.addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-contato]') : null;
  const r = b ? estado.regs.find(x => x.linha === Number(b.dataset.contato)) : undefined;
  if (r) abrirContato(r);
});

// Sem conexão e de volta (Spec 009): o que já está na tela continua
window.addEventListener('offline', () => avisoRapido('Sem internet agora. O que você já viu continua aqui.', undefined, 'erro'));
window.addEventListener('online', () => avisoRapido('Conexão de volta.'));
