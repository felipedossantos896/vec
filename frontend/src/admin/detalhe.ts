// ══════ DETALHE DA PESSOA ══════
// A aba escolhida (Resumo ou Ficha completa) vale para a próxima pessoa.

const ABAS_DETALHE = [['resumo', 'Visão geral', 'casa'], ['jornada', 'Jornada', 'indicadores'], ['ficha', 'Ficha completa', 'ficha']] as const;
let abaDetalhe = 'resumo';
const abasDe = (trilha: boolean) => ABAS_DETALHE.filter(([k]) => trilha || k !== 'jornada');

function secao(titulo: string, linhas: [string, string][], simbolo?: string): string {
  return `<div class="det-sec"><h4>${simbolo ? icone(simbolo, { classe: 'ic-18' }) : ''}${titulo}</h4><dl>${linhas.map(([l, v]) => `<div class="det-row"><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
}

// ── Trilhos (Spec 027) ──
const ICONE_TRILHO: Record<string, string> = { membro: 'pessoas', discipulador: 'discipulos', lider: 'celula' };
const barraTrilho = (feitas: number, total: number): string =>
  `<span class="tri-barra" aria-hidden="true"><i data-w="${total ? Math.round((feitas / total) * 100) : 0}"></i></span>`;

// Visão geral: uma linha por trilho; o clique abre a aba Jornada no trilho escolhido.
function trilhosResumo(r: Registro): string {
  return `<div class="det-sec tri-resumo"><h4>${icone('indicadores', { classe: 'ic-18' })}Jornada</h4><ul>${regrasTrilhos.TRILHOS.map(t => {
    const { feitas, total } = regrasTrilhos.progresso(r, t);
    return `<li><button type="button" class="tri-linha" data-dtab="jornada" data-trilho="${t.id}" data-tri="${t.id}">
      <span class="tri-ic">${icone(ICONE_TRILHO[t.id], { classe: 'ic-16' })}</span>
      <span class="tri-nome">${t.titulo}</span>
      <span class="tri-conta"><b>${feitas}</b> de ${total}<span class="sr-only"> etapas registradas</span></span>
      ${barraTrilho(feitas, total)}
      ${icone('seguir', { classe: 'ic-16 tri-seta' })}
    </button></li>`;
  }).join('')}</ul></div>`;
}

// Aba Jornada: cada trilho como linha do tempo, com estado em ícone e texto e a data registrada.
function trilhoCompleto(r: Registro, t: Trilho): string {
  const { feitas, total } = regrasTrilhos.progresso(r, t);
  const etapas = t.etapas.map(([k, rotulo]) => {
    const e = regrasTrilhos.estado(r, k);
    const marca = e === 'feito' ? icone('feito', { classe: 'ic-12' }) : e === 'nao' ? '<b>–</b>' : '';
    const valor = k === 'celula' && r.celula ? celulaChip(r.celula) : regrasTrilhos.rotuloEstado(e);
    const falta = k === 'batismo' ? regrasTrilhos.faltaParaBatismo(r) : [];
    return `<li class="tri-e" data-estado="${e}"><span class="tri-no" aria-hidden="true">${marca}</span>
      <span class="tri-e-t">${rotulo}${falta.length ? `<small class="tri-falta">Falta confirmar: ${falta.join(' e ')}</small>` : ''}</span>
      <span class="tri-e-v">${valor}${dataEtapa(r, k)}</span></li>`;
  }).join('');
  return `<section class="det-sec tri" id="tri-${t.id}" data-tri="${t.id}" aria-labelledby="tri-h-${t.id}">
    <header class="tri-topo"><span class="tri-ic">${icone(ICONE_TRILHO[t.id], { classe: 'ic-18' })}</span>
      <span><h4 id="tri-h-${t.id}">${t.titulo}</h4><small>${t.resumo}</small></span>
      <span class="tri-conta"><b>${feitas}</b> de ${total}<span class="sr-only"> etapas registradas</span></span></header>
    ${barraTrilho(feitas, total)}
    <ol class="tri-etapas">${etapas}</ol></section>`;
}

function abrirDetalhe(r: Registro) {
  const txt = (v: unknown): string => v ? esc(v) : '<span class="pill x">—</span>';
  $('detNome').textContent = nomeCurto(r);
  const completo = regrasNomes.completo(r.nome);
  $('detNomeCompleto').textContent = completo;
  $('detNomeCompleto').hidden = completo === nomeCurto(r); // Spec 011: o completo logo abaixo
  renderFotoDetalhe(r);
  $('detSub').innerHTML = [regrasLideranca.ehLider(r) ? celulaOuPapel(r) : r.celula ? celulaChip(r.celula) : 'Sem célula', r._idade != null ? `${r._idade} anos` : '', r.discipulador ? `discipulado por ${esc(r.discipuladorId ? nomeCurtoId(Number(r.discipuladorId), String(r.discipulador)) : regrasNomes.curto(String(r.discipulador)))}` : '']
    .filter(Boolean).join('<span aria-hidden="true"> · </span>');

  const nasc = r._nasc ? `${fmtData(r._nasc)}${r._idade != null ? ` · ${r._idade} anos` : ''}` : txt(r.nascimento);
  const interesses = INTERESSES.filter(([k]) => r[k] === 'S');
  const trilha = regrasLideranca.temTrilha(r); // o líder de área não tem jornada (Spec 013)
  const discipulos = estado.regs.filter(x => x.discipuladorId === r.linha).length;
  const resumo =
    (trilha ? trilhosResumo(r) : `<div class="det-sec"><h4>${esc(regrasLideranca.rotulo(r))}</h4><p class="nota-fraca">Supervisiona a área: sem célula fixa e sem jornada.</p></div>`) +
    secao('Dados principais', [
      linhasContato(r)[0],
      ['Discipulador', r.discipulador ? esc(r.discipulador) + semVinculo(r) : `<button type="button" class="btn-link${regrasLideranca.temTrilha(r) ? ' det-alerta' : ''}" data-acao="editar">Vincular</button>`],
      ['Congrega com frequência', pill(r.frequentaCultos)],
      ['Nascimento', nasc],
      ...(regrasLideranca.ehLider(r) ? ([['Discípulos', String(discipulos)]] as [string, string][]) : [])
    ], 'ficha') +
    (interesses.length ? `<div class="det-sec"><h4>Quer servir como</h4><p class="det-tags">${interesses.map(([, l]) => `<span>${l}</span>`).join('')}</p></div>` : '') +
    acoesDetalhe(r);
  const [membro, ...outros] = regrasTrilhos.TRILHOS;
  const jornada = trilha ? `<div class="tri-grade">${trilhoCompleto(r, membro)}<div class="tri-col">${outros.map(t => trilhoCompleto(r, t)).join('')}</div></div>` : '';
  const ficha =
    '<div class="det-ficha-dados">' +
    secao('Dados pessoais', [['Nascimento', nasc], ...linhasContato(r), ['Recebeu Jesus', pill(r.recebeuJesus)]], 'ficha') +
    '<div class="det-ficha-apoio">' + blocoEndereco() +
    blocoAnfitriao() +
    secao('Célula e serviço', [
      ...(regrasLideranca.ehLider(r) ? ([['Papel', esc(regrasLideranca.rotulo(r))]] as [string, string][]) : []),
      ['Setor', txt(r.setor)], ['Célula', r.celula ? celulaChip(r.celula) : regrasLideranca.ehLider(r) ? '<span class="nota-fraca">Sem célula fixa</span>' : txt('')],
      ['Congrega com frequência', pill(r.frequentaCultos)],
      ['Serve em ministério', pill(r.serveMinisterio)],
      ...(r.serveMinisterio === 'S' ? ([['Ministério', txt(r.ministerioNome)]] as [string, string][]) : [])
    ], 'pessoas') + '</div></div>' +
    secao('Treinamentos', TREINOS.map(([k, l]): [string, string] => [l, pill(r[k])])) +
    secao('Discipulado e interesses', [['Discipulador', txt(r.discipulador) + semVinculo(r)], ...INTERESSES.map(([k, l]): [string, string] => ['Interesse: ' + l.toLowerCase(), pill(r[k])])]) +
    (r.sugestao ? `<div class="det-sec"><h4>Sugestão para as células</h4><div class="det-text">${esc(r.sugestao)}</div></div>` : '') +
    secao('Registro', [['Enviado em', txt(r.dataHora)], ...(r.editadoEm ? ([['Editado em', `${esc(r.editadoEm)} · ${esc(r.editadoPor)}`]] as [string, string][]) : []), ['Nº do cadastro', String(r.linha)]]);
  const paineis: Record<string, string> = { resumo, jornada, ficha };
  const abas = abasDe(trilha);
  if (!abas.some(([k]) => k === abaDetalhe)) abaDetalhe = 'resumo';

  $('detBody').innerHTML =
    (r._dup > 1 ? '<p class="det-status"><span class="tag-c">Possível duplicado</span></p>' : '') +
    `<div class="det-topo-acoes">
      ${r.telefone ? `<a class="b-zap" href="https://wa.me/55${esc(r.telefone)}" target="_blank" rel="noopener">${icone('whatsapp', { classe: 'ic-16' })}WhatsApp</a>` : ''}
      <button type="button" class="b-sec" data-acao="editar">${icone('ficha', { classe: 'ic-16' })}Editar perfil</button>
    </div>
    <div class="det-tabs" role="tablist" aria-label="Seções do cadastro">${abas.map(([k, l, simbolo]) => `<button type="button" role="tab" id="dt-${k}" data-dtab="${k}" aria-controls="dp-${k}" aria-selected="${k === abaDetalhe}" tabindex="${k === abaDetalhe ? 0 : -1}">${icone(simbolo, { classe: 'ic-16' })}${l}</button>`).join('')}</div>
    ${abas.map(([k]) => `<div class="det-pane" role="tabpanel" id="dp-${k}" aria-labelledby="dt-${k}"${k === abaDetalhe ? '' : ' hidden'}>${paineis[k]}</div>`).join('')}`;
  const d = $<HTMLDialogElement>('det');
  d.dataset.linha = String(r.linha);
  if (!d.open) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
  $('detBody').scrollTop = 0;
  d.scrollTop = 0;
  marcarSelecionado();
  carregarEnderecoDe(r);
  carregarAnfitriaoDe(r);
}

function mostrarAbaDetalhe(k: string, focar = false) {
  abaDetalhe = k;
  document.querySelectorAll<HTMLButtonElement>('#detBody [role="tab"]').forEach(b => {
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
  if (b) {
    mostrarAbaDetalhe(b.dataset.dtab || 'resumo');
    const tri = b.dataset.trilho ? document.getElementById('tri-' + b.dataset.trilho) : null;
    if (tri) tri.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
});
$('detBody').addEventListener('keydown', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-dtab]') : null;
  const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (!b || !delta) return;
  e.preventDefault();
  const ks = [...document.querySelectorAll<HTMLElement>('#detBody [role="tab"]')].map(x => x.dataset.dtab || '');
  const i = ks.indexOf(b.dataset.dtab || '');
  mostrarAbaDetalhe(ks[(i + delta + ks.length) % ks.length], true);
});
$('detClose').addEventListener('click', () => $<HTMLDialogElement>('det').close());
$<HTMLDialogElement>('det').addEventListener('click', e => { if (e.target === $<HTMLDialogElement>('det')) $<HTMLDialogElement>('det').close(); });
