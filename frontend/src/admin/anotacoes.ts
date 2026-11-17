// ══════ CONTATO E ACOMPANHAMENTO ══════
// WhatsApp e autorização no detalhe, anotações de cada conversa e a data em que cada
// etapa da jornada foi marcada como concluída.

type Anotacao = { id: number; autorNome: string; em: string; texto: string; minha: boolean };
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

function blocoNotas(r: Registro): string {
  const ultimo = r._contato ? `Último contato em ${fmtData(r._contato)}.` : 'Nenhum contato registrado ainda.';
  return `<div class="det-sec" id="nSec"><h4>Acompanhamento</h4>
    <form class="nota-form" id="nForm" novalidate><label class="label" for="nTexto">Registrar contato</label>
      <textarea class="input" id="nTexto" rows="3" maxlength="2000" placeholder="Como foi a conversa? O que ficou combinado?"></textarea>
      <p class="msg" id="nMsg" role="alert"></p>
      <div class="nota-acoes"><span class="field-hint">${ultimo}</span><button type="submit" class="btn-sec" id="nSalvar">Registrar</button></div></form>
    <ol class="notas" id="nLista"><li class="vazio">Carregando anotações…</li></ol></div>`;
}

function renderNotas(lista: Anotacao[]) {
  $('nLista').innerHTML = lista.map(n => `<li><p>${esc(n.texto)}</p><span>${esc(n.autorNome)} · ${esc(n.em.slice(0, 16))}${n.minha ? ` <button type="button" class="btn-link" data-nota="${n.id}">Apagar</button>` : ''}</span></li>`).join('')
    || '<li class="vazio">Nenhuma anotação ainda.</li>';
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
      $('nMsg').textContent = res.erro === 'texto_vazio' ? 'Escreva o que conversaram.' : 'Não foi possível salvar. Atualize o painel e tente de novo.';
      return false;
    }
    renderNotas(res.anotacoes);
    const antes = r.ultimoContato;
    r.ultimoContato = res.anotacoes[0]?.em || '';
    if (r.ultimoContato !== antes) { derivar(r); renderTudo(); }
    return true;
  } catch (err) {
    if (document.getElementById('nMsg')) $('nMsg').textContent = 'Não foi possível conectar. Verifique a internet.';
    return false;
  } finally {
    if (botao) botao.disabled = false;
  }
}

const carregarNotasDe = (r: Registro): void => { notas(r, { acao: 'anotacoes' }); };

$('detBody').addEventListener('submit', async e => {
  if ((e.target as Element).id !== 'nForm') return;
  e.preventDefault();
  const r = registroAberto();
  const texto = $<HTMLTextAreaElement>('nTexto').value.trim();
  $('nMsg').textContent = '';
  if (!r) return;
  if (!texto) { $('nMsg').textContent = 'Escreva o que conversaram.'; return; }
  if (await notas(r, { acao: 'anotacao_salvar', texto }, $<HTMLButtonElement>('nSalvar'))) {
    $<HTMLTextAreaElement>('nTexto').value = '';
    $('nSec').querySelector('.nota-acoes .field-hint')!.textContent = 'Contato registrado agora.';
  }
});
$('detBody').addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-nota]') : null;
  const r = registroAberto();
  if (b && r) notas(r, { acao: 'anotacao_excluir', id: Number(b.dataset.nota) }, b);
});
