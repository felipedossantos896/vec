// ══════ DETALHE DA PESSOA ══════
// Cabeçalho com a jornada e três abas: Resumo (o do dia a dia), Acompanhamento
// (anotações) e Ficha completa (todas as respostas). A aba escolhida vale para a próxima pessoa.

const ABAS_DETALHE: [string, string][] = [['resumo', 'Resumo'], ['notas', 'Acompanhamento'], ['ficha', 'Ficha completa']];
let abaDetalhe = 'resumo';

function secao(titulo: string, linhas: [string, string][]): string {
  return `<div class="det-sec"><h4>${titulo}</h4><dl>${linhas.map(([l, v]) => `<div class="det-row"><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
}

const ICONE_CHECK = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

// Jornada como lista de etapas marcadas, em duas colunas no espaço da ficha
function jornadaResumo(r: Registro): string {
  return `<div class="det-sec"><h4>Jornada · ${r._jornada} de ${JORNADA.length}</h4><ul class="jor-lista">${JORNADA.map(([k, l]) => {
    const ok = r[k] === 'S';
    return `<li class="${ok ? 'ok' : ''}"><span class="jor-c" aria-hidden="true">${ok ? ICONE_CHECK : ''}</span><span>${l}<span class="sr-only">${ok ? ': concluída' : ': ainda não'}</span>${dataEtapa(r, k)}</span></li>`;
  }).join('')}</ul></div>`;
}

function abrirDetalhe(r: Registro) {
  const txt = (v: unknown): string => v ? esc(v) : '<span class="pill x">—</span>';
  const agora = new Date();
  $('detNome').textContent = nomeCurto(r);
  const completo = regrasNomes.completo(r.nome);
  $('detNomeCompleto').textContent = completo;
  $('detNomeCompleto').hidden = completo === nomeCurto(r); // Spec 011: o completo logo abaixo
  renderFotoDetalhe(r);
  $('detSub').innerHTML = [r.celula ? celulaChip(r.celula) : 'Sem célula', r._idade != null ? `${r._idade} anos` : '', r.discipulador ? `discipulado por ${esc(r.discipuladorId ? nomeCurtoId(Number(r.discipuladorId), String(r.discipulador)) : regrasNomes.curto(String(r.discipulador)))}` : '']
    .filter(Boolean).join('<span aria-hidden="true"> · </span>');

  const nasc = r._nasc ? `${fmtData(r._nasc)}${r._idade != null ? ` · ${r._idade} anos` : ''}` : txt(r.nascimento);
  const interesses = INTERESSES.filter(([k]) => r[k] === 'S');
  const cuidado = regrasContato.semContato(r._contato, r._lembrete || null, agora);
  const ultimo = r._contato ? `<span class="${cuidado ? 'det-alerta' : ''}">${fmtData(r._contato)} · ${regrasPessoas.haQuanto(r._contato, agora)}</span>` : '<span class="det-alerta">Nenhum registrado</span>';
  const etiquetas = regrasPessoas.etiquetas({ contato: r._contato, lembrete: r._lembrete || null, semDiscipulador: SITUACOES.semDiscipulador.f(r), celula: String(r.celula || ''), duplicados: r._dup }, agora);
  const resumo =
    jornadaResumo(r) +
    secao('Contato e cuidado', [
      linhasContato(r)[0],
      ['Último contato', ultimo],
      ...(r._lembrete ? ([['Falar de novo em', fmtData(r._lembrete)]] as [string, string][]) : []),
      ['Discipulador', r.discipulador ? esc(r.discipulador) + semVinculo(r) : '<button type="button" class="btn-link det-alerta" data-acao="editar">Vincular</button>'],
      ['Congrega com frequência', pill(r.frequentaCultos)],
      ['Nascimento', nasc]
    ]) +
    (interesses.length ? `<div class="det-sec"><h4>Quer servir como</h4><p class="det-tags">${interesses.map(([, l]) => `<span>${l}</span>`).join('')}</p></div>` : '') +
    '<div class="det-sec" id="detUltima" hidden></div>' +
    acoesDetalhe(r);
  const ficha =
    secao('Dados pessoais', [['Nascimento', nasc], ...linhasContato(r), ['Recebeu Jesus', pill(r.recebeuJesus)]]) +
    blocoEndereco() +
    blocoAnfitriao() +
    secao('Célula e serviço', [
      ['Setor', txt(r.setor)], ['Célula', r.celula ? celulaChip(r.celula) : txt('')],
      ['Congrega com frequência', pill(r.frequentaCultos)],
      ['Serve em ministério', pill(r.serveMinisterio)],
      ...(r.serveMinisterio === 'S' ? ([['Ministério', txt(r.ministerioNome)]] as [string, string][]) : [])
    ]) +
    secao('Etapas da jornada', JORNADA.map(([k, l]): [string, string] => [l, dataEtapa(r, k) + pill(r[k])])) +
    secao('Treinamentos', TREINOS.map(([k, l]): [string, string] => [l, pill(r[k])])) +
    secao('Discipulado e interesses', [['Discipulador', txt(r.discipulador) + semVinculo(r)], ...INTERESSES.map(([k, l]): [string, string] => ['Interesse: ' + l.toLowerCase(), pill(r[k])])]) +
    (r.sugestao ? `<div class="det-sec"><h4>Sugestão para as células</h4><div class="det-text">${esc(r.sugestao)}</div></div>` : '') +
    secao('Registro', [['Enviado em', txt(r.dataHora)], ...(r.editadoEm ? ([['Editado em', `${esc(r.editadoEm)} · ${esc(r.editadoPor)}`]] as [string, string][]) : []), ['Nº do cadastro', String(r.linha)]]);
  const paineis: Record<string, string> = { resumo, notas: blocoNotas(r), ficha };
  const rotuloAba = (k: string, l: string): string => k === 'notas' ? `${l} <span class="det-n" id="dtNotasN" hidden></span>` : l;

  $('detBody').innerHTML =
    (etiquetas.length ? `<p class="det-status">${etiquetas.map(t => `<span class="tag-c">${esc(t)}</span>`).join('')}</p>` : '') +
    `<div class="det-topo-acoes">
      <button type="button" class="b-pri" data-acao="registrar">Registrar contato</button>
      ${r.telefone ? `<a class="b-zap" href="https://wa.me/55${esc(r.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      <button type="button" class="b-sec" data-acao="editar">Editar</button>
    </div>
    <div class="det-tabs" role="tablist" aria-label="Seções do cadastro">${ABAS_DETALHE.map(([k, l]) => `<button type="button" role="tab" id="dt-${k}" data-dtab="${k}" aria-controls="dp-${k}" aria-selected="${k === abaDetalhe}" tabindex="${k === abaDetalhe ? 0 : -1}">${rotuloAba(k, l)}</button>`).join('')}</div>
    ${ABAS_DETALHE.map(([k]) => `<div class="det-pane" role="tabpanel" id="dp-${k}" aria-labelledby="dt-${k}"${k === abaDetalhe ? '' : ' hidden'}>${paineis[k]}</div>`).join('')}`;
  const d = $<HTMLDialogElement>('det');
  d.dataset.linha = String(r.linha);
  if (!d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
  $('detBody').scrollTop = 0;
  d.scrollTop = 0;
  marcarSelecionado();
  carregarNotasDe(r);
  carregarEnderecoDe(r);
  carregarAnfitriaoDe(r);
}

// Depois que o histórico chega: contagem na aba e a última anotação com texto no Resumo
function renderResumoNotas(lista: Anotacao[]) {
  const n = document.getElementById('dtNotasN');
  if (n) { n.textContent = String(lista.length); n.hidden = !lista.length; }
  const el = document.getElementById('detUltima');
  const ult = lista.find(a => a.texto);
  if (!el) return;
  el.hidden = !ult;
  el.innerHTML = ult ? `<h4>Última anotação</h4><blockquote class="det-ult"><p>${esc(ult.texto)}</p><footer>${esc(ult.autorNome)} · ${ult.contatoEm ? regrasContato.diaMes(ult.contatoEm) : esc(ult.em.slice(0, 5))}</footer></blockquote>` : '';
}

function mostrarAbaDetalhe(k: string, focar = false) {
  abaDetalhe = k;
  document.querySelectorAll<HTMLButtonElement>('#detBody [data-dtab]').forEach(b => {
    const sel = b.dataset.dtab === k;
    b.setAttribute('aria-selected', String(sel));
    b.tabIndex = sel ? 0 : -1;
    if (sel && focar) b.focus();
  });
  document.querySelectorAll<HTMLElement>('#detBody .det-pane').forEach(p => { p.hidden = p.id !== 'dp-' + k; });
}
$('detBody').addEventListener('click', e => {
  const alvo = e.target instanceof Element ? e.target : null;
  const b = alvo?.closest<HTMLElement>('[data-dtab]');
  if (b) mostrarAbaDetalhe(b.dataset.dtab || 'resumo');
  // "Registrar contato" leva ao formulário do Acompanhamento
  if (alvo?.closest('[data-acao="registrar"]')) {
    mostrarAbaDetalhe('notas');
    const f = document.getElementById('nForm');
    f?.scrollIntoView({ block: 'nearest' });
    f?.querySelector<HTMLInputElement>('input[name="nTipo"]:checked')?.focus();
  }
});
$('detBody').addEventListener('keydown', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-dtab]') : null;
  const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (!b || !delta) return;
  e.preventDefault();
  const i = ABAS_DETALHE.findIndex(([k]) => k === b.dataset.dtab);
  mostrarAbaDetalhe(ABAS_DETALHE[(i + delta + ABAS_DETALHE.length) % ABAS_DETALHE.length][0], true);
});
$('detClose').addEventListener('click', () => $<HTMLDialogElement>('det').close());
$<HTMLDialogElement>('det').addEventListener('click', e => { if (e.target === $<HTMLDialogElement>('det')) $<HTMLDialogElement>('det').close(); });
