// ══════ DETALHE DA PESSOA ══════
// A aba escolhida (Resumo ou Ficha completa) vale para a próxima pessoa.

const ABAS_DETALHE = [['resumo', 'Resumo', 'casa'], ['ficha', 'Ficha completa', 'ficha']] as const;
let abaDetalhe = 'resumo';

function secao(titulo: string, linhas: [string, string][], simbolo?: string): string {
  return `<div class="det-sec"><h4>${simbolo ? icone(simbolo, { classe: 'ic-18' }) : ''}${titulo}</h4><dl>${linhas.map(([l, v]) => `<div class="det-row"><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
}

const ICONE_CHECK = icone('feito', { classe: 'ic-12' });

// Cada etapa mantém o próprio estado e a data já registrada.
function jornadaResumo(r: Registro): string {
  return `<div class="det-sec"><h4>${icone('indicadores', { classe: 'ic-18' })}Jornada espiritual</h4><ul class="jor-lista" tabindex="0" aria-label="Etapas da jornada">${JORNADA.map(([k, l]) => {
    const ok = r[k] === 'S';
    const situacao = ok ? 'registrado' : r[k] === 'N' ? 'não' : 'não informado';
    return `<li class="${ok ? 'ok' : ''}"><span class="jor-c" aria-hidden="true">${ok ? ICONE_CHECK : '–'}</span><span>${l}<span class="sr-only">: ${situacao}</span>${dataEtapa(r, k)}</span></li>`;
  }).join('')}</ul></div>`;
}

function trilhosDetalhe(r: Registro): string {
  const marco = (k: string): string => pill(r[k]) + dataEtapa(r, k);
  const requisitos = [
    ...(r.cafePastor === 'S' ? [] : ['Café com o Pastor']),
    ...(r.novaCriatura === 'S' ? [] : ['Nova Criatura'])
  ];
  const batismo = marco('batismo') + (r.batismo !== 'S' && requisitos.length
    ? `<br><small>Falta confirmar: ${requisitos.join(' e ')}.</small>` : '');
  return secao('Trilho do membro', [
    ['Novo nascimento', marco('recebeuJesus')],
    ['Café com o Pastor', marco('cafePastor')],
    ['Estação DNA', marco('estacaoDNA')],
    ['Serve em ministério', marco('serveMinisterio')],
    ['Membro de célula', r.celula ? celulaChip(r.celula) : pill('')],
    ['Nova Criatura', marco('novaCriatura')],
    ['Acompanhamento Inicial', marco('acompInicial')],
    ['Batismo nas Águas', batismo]
  ]) + secao('Trilho do discipulador', [['Treinamento Expresso 01', marco('expresso01')]])
    + secao('Trilho do líder de célula (opcional)', [['Treinamento Expresso 02', marco('expresso02')]]);
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
  const destaques = trilha ? `<dl class="det-resumo-cards">
    <div><dt>${icone('indicadores', { classe: 'ic-18' })}Jornada</dt><dd>${r._jornada} de ${JORNADA.length} etapas registradas</dd></div>
    <div><dt>${icone('pessoas', { classe: 'ic-18' })}Célula</dt><dd>${r.celula ? celulaChip(r.celula) : 'Sem célula'}</dd></div>
    <div class="det-resumo-cuidado"><dt>${icone('discipulos', { classe: 'ic-18' })}Cuidado</dt><dd>${SITUACOES.semDiscipulador.f(r) ? 'Sem discipulador' : 'Discipulador informado'}</dd></div>
  </dl>` : '';
  const resumo =
    destaques + (trilha ? jornadaResumo(r) : `<div class="det-sec"><h4>${esc(regrasLideranca.rotulo(r))}</h4><p class="nota-fraca">Supervisiona a área: sem célula fixa e sem jornada.</p></div>`) +
    secao('Dados principais', [
      linhasContato(r)[0],
      ['Discipulador', r.discipulador ? esc(r.discipulador) + semVinculo(r) : `<button type="button" class="btn-link${regrasLideranca.temTrilha(r) ? ' det-alerta' : ''}" data-acao="editar">Vincular</button>`],
      ['Congrega com frequência', pill(r.frequentaCultos)],
      ['Nascimento', nasc],
      ...(regrasLideranca.ehLider(r) ? ([['Discípulos', String(discipulos)]] as [string, string][]) : [])
    ], 'ficha') +
    (trilha ? trilhosDetalhe(r) : '') +
    (interesses.length ? `<div class="det-sec"><h4>Quer servir como</h4><p class="det-tags">${interesses.map(([, l]) => `<span>${l}</span>`).join('')}</p></div>` : '') +
    acoesDetalhe(r);
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
    (trilha ? jornadaResumo(r) : '') +
    secao('Treinamentos', TREINOS.map(([k, l]): [string, string] => [l, pill(r[k])])) +
    secao('Discipulado e interesses', [['Discipulador', txt(r.discipulador) + semVinculo(r)], ...INTERESSES.map(([k, l]): [string, string] => ['Interesse: ' + l.toLowerCase(), pill(r[k])])]) +
    (r.sugestao ? `<div class="det-sec"><h4>Sugestão para as células</h4><div class="det-text">${esc(r.sugestao)}</div></div>` : '') +
    secao('Registro', [['Enviado em', txt(r.dataHora)], ...(r.editadoEm ? ([['Editado em', `${esc(r.editadoEm)} · ${esc(r.editadoPor)}`]] as [string, string][]) : []), ['Nº do cadastro', String(r.linha)]]);
  const paineis: Record<string, string> = { resumo, ficha };

  $('detBody').innerHTML =
    (r._dup > 1 ? '<p class="det-status"><span class="tag-c">Possível duplicado</span></p>' : '') +
    `<div class="det-topo-acoes">
      ${r.telefone ? `<a class="b-zap" href="https://wa.me/55${esc(r.telefone)}" target="_blank" rel="noopener">${icone('whatsapp', { classe: 'ic-16' })}WhatsApp</a>` : ''}
      <button type="button" class="b-sec" data-acao="editar">${icone('ficha', { classe: 'ic-16' })}Editar perfil</button>
    </div>
    <div class="det-tabs" role="tablist" aria-label="Seções do cadastro">${ABAS_DETALHE.map(([k, l, simbolo]) => `<button type="button" role="tab" id="dt-${k}" data-dtab="${k}" aria-controls="dp-${k}" aria-selected="${k === abaDetalhe}" tabindex="${k === abaDetalhe ? 0 : -1}">${icone(simbolo, { classe: 'ic-16' })}${l}</button>`).join('')}</div>
    ${ABAS_DETALHE.map(([k]) => `<div class="det-pane" role="tabpanel" id="dp-${k}" aria-labelledby="dt-${k}"${k === abaDetalhe ? '' : ' hidden'}>${paineis[k]}</div>`).join('')}`;
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
