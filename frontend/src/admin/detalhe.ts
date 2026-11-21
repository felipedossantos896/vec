// ══════ DETALHE DA PESSOA ══════
// Cabeçalho com a jornada e três abas: Resumo (o do dia a dia), Acompanhamento
// (anotações) e Ficha completa (todas as respostas). A aba escolhida vale para a próxima pessoa.

const ABAS_DETALHE: [string, string][] = [['resumo', 'Resumo'], ['notas', 'Acompanhamento'], ['ficha', 'Ficha completa']];
let abaDetalhe = 'resumo';

function secao(titulo: string, linhas: [string, string][]): string {
  return `<div class="det-sec"><h4>${titulo}</h4><dl>${linhas.map(([l, v]) => `<div class="det-row"><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
}

function abrirDetalhe(r: Registro) {
  const txt = (v: unknown): string => v ? esc(v) : '<span class="pill x">—</span>';
  $('detNome').textContent = r.nome;
  renderFotoDetalhe(r);
  $('detSub').textContent = [r.celula || 'Sem célula', r.setor, r.discipulador ? `discipulado por ${curto(String(r.discipulador))}` : ''].filter(Boolean).join(' · ');
  const w = $<HTMLAnchorElement>('detWhats');
  w.classList.toggle('hidden', !r.telefone);
  w.href = r.telefone ? `https://wa.me/55${r.telefone}` : '#';

  const nasc = r._nasc ? `${fmtData(r._nasc)}${r._idade != null ? ` · ${r._idade} anos` : ''}` : txt(r.nascimento);
  const interesses = INTERESSES.filter(([k]) => r[k] === 'S');
  const resumo =
    secao('Etapas da jornada', JORNADA.map(([k, l]): [string, string] => [l, dataEtapa(r, k) + pill(r[k])])) +
    secao('Contato e cuidado', [
      linhasContato(r)[0], ['Nascimento', nasc],
      ['Discipulador', txt(r.discipulador) + semVinculo(r)],
      ['Último contato', r._contato ? fmtData(r._contato) : '<span class="nota-fraca">Nenhum registrado</span>'],
      ['Congrega com frequência', pill(r.frequentaCultos)]
    ]) +
    (interesses.length ? secao('Quer servir como', interesses.map(([, l]): [string, string] => [l, pill('S')])) : '');
  const ficha =
    secao('Dados pessoais', [['Nascimento', nasc], ...linhasContato(r), ['Recebeu Jesus', pill(r.recebeuJesus)]]) +
    blocoEndereco() +
    secao('Célula e serviço', [
      ['Setor', txt(r.setor)], ['Célula', txt(r.celula)],
      ['Congrega com frequência', pill(r.frequentaCultos)],
      ['Serve em ministério', pill(r.serveMinisterio)],
      ...(r.serveMinisterio === 'S' ? ([['Ministério', txt(r.ministerioNome)]] as [string, string][]) : [])
    ]) +
    secao('Treinamentos', TREINOS.map(([k, l]): [string, string] => [l, pill(r[k])])) +
    secao('Discipulado e interesses', [['Discipulador', txt(r.discipulador) + semVinculo(r)], ...INTERESSES.map(([k, l]): [string, string] => ['Interesse: ' + l.toLowerCase(), pill(r[k])])]) +
    (r.sugestao ? `<div class="det-sec"><h4>Sugestão para as células</h4><div class="det-text">${esc(r.sugestao)}</div></div>` : '') +
    secao('Registro', [['Enviado em', txt(r.dataHora)], ...(r.editadoEm ? ([['Editado em', `${esc(r.editadoEm)} · ${esc(r.editadoPor)}`]] as [string, string][]) : []), ['Nº do cadastro', String(r.linha)]]);
  const paineis: Record<string, string> = { resumo, notas: blocoNotas(r), ficha };

  $('detBody').innerHTML =
    `<div class="det-journey">${pips(r)}<span><b>${r._jornada} de ${JORNADA.length}</b> etapas da jornada</span>${faltam(r)}</div>
    <div class="det-tabs" role="tablist" aria-label="Seções do cadastro">${ABAS_DETALHE.map(([k, l]) => `<button type="button" role="tab" id="dt-${k}" data-dtab="${k}" aria-controls="dp-${k}" aria-selected="${k === abaDetalhe}" tabindex="${k === abaDetalhe ? 0 : -1}">${l}</button>`).join('')}</div>
    ${ABAS_DETALHE.map(([k]) => `<div class="det-pane" role="tabpanel" id="dp-${k}" aria-labelledby="dt-${k}"${k === abaDetalhe ? '' : ' hidden'}>${paineis[k]}</div>`).join('')}` +
    acoesDetalhe(r);
  const d = $<HTMLDialogElement>('det');
  d.dataset.linha = String(r.linha);
  if (!d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
  $('detBody').scrollTop = 0;
  d.scrollTop = 0;
  carregarNotasDe(r);
  carregarEnderecoDe(r);
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
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-dtab]') : null;
  if (b) mostrarAbaDetalhe(b.dataset.dtab || 'resumo');
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
