"use strict";
// ══════ DETALHE DA PESSOA ══════
// A aba escolhida (Resumo ou Ficha completa) vale para a próxima pessoa.
const ABAS_DETALHE = [['resumo', 'Resumo'], ['ficha', 'Ficha completa']];
let abaDetalhe = 'resumo';
function secao(titulo, linhas) {
    return `<div class="det-sec"><h4>${titulo}</h4><dl>${linhas.map(([l, v]) => `<div class="det-row"><dt>${l}</dt><dd>${v}</dd></div>`).join('')}</dl></div>`;
}
const ICONE_CHECK = icone('feito', { classe: 'ic-12' });
// Jornada como lista de etapas marcadas, em duas colunas no espaço da ficha
function jornadaResumo(r) {
    return `<div class="det-sec"><h4>Jornada · ${r._jornada} de ${JORNADA.length}</h4><ul class="jor-lista">${JORNADA.map(([k, l]) => {
        const ok = r[k] === 'S';
        return `<li class="${ok ? 'ok' : ''}"><span class="jor-c" aria-hidden="true">${ok ? ICONE_CHECK : ''}</span><span>${l}<span class="sr-only">${ok ? ': concluída' : ': ainda não'}</span>${dataEtapa(r, k)}</span></li>`;
    }).join('')}</ul></div>`;
}
function trilhosDetalhe(r) {
    const marco = (k) => pill(r[k]) + dataEtapa(r, k);
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
function abrirDetalhe(r, ajustarLocal = false) {
    const txt = (v) => v ? esc(v) : '<span class="pill x">—</span>';
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
    const resumo = (trilha ? trilhosDetalhe(r) : `<div class="det-sec"><h4>${esc(regrasLideranca.rotulo(r))}</h4><p class="nota-fraca">Supervisiona a área: sem célula fixa e sem jornada.</p></div>`) +
        secao('Dados principais', [
            linhasContato(r)[0],
            ['Discipulador', r.discipulador ? esc(r.discipulador) + semVinculo(r) : `<button type="button" class="btn-link${regrasLideranca.temTrilha(r) ? ' det-alerta' : ''}" data-acao="editar">Vincular</button>`],
            ['Congrega com frequência', pill(r.frequentaCultos)],
            ['Nascimento', nasc],
            ...(regrasLideranca.ehLider(r) ? [['Discípulos', String(discipulos)]] : [])
        ]) +
        (interesses.length ? `<div class="det-sec"><h4>Quer servir como</h4><p class="det-tags">${interesses.map(([, l]) => `<span>${l}</span>`).join('')}</p></div>` : '') +
        acoesDetalhe(r);
    const ficha = secao('Dados pessoais', [['Nascimento', nasc], ...linhasContato(r), ['Recebeu Jesus', pill(r.recebeuJesus)]]) +
        blocoEndereco() +
        blocoAnfitriao() +
        secao('Célula e serviço', [
            ...(regrasLideranca.ehLider(r) ? [['Papel', esc(regrasLideranca.rotulo(r))]] : []),
            ['Setor', txt(r.setor)], ['Célula', r.celula ? celulaChip(r.celula) : regrasLideranca.ehLider(r) ? '<span class="nota-fraca">Sem célula fixa</span>' : txt('')],
            ['Congrega com frequência', pill(r.frequentaCultos)],
            ['Serve em ministério', pill(r.serveMinisterio)],
            ...(r.serveMinisterio === 'S' ? [['Ministério', txt(r.ministerioNome)]] : [])
        ]) +
        (trilha ? jornadaResumo(r) : '') +
        secao('Treinamentos', TREINOS.map(([k, l]) => [l, pill(r[k])])) +
        secao('Discipulado e interesses', [['Discipulador', txt(r.discipulador) + semVinculo(r)], ...INTERESSES.map(([k, l]) => ['Interesse: ' + l.toLowerCase(), pill(r[k])])]) +
        (r.sugestao ? `<div class="det-sec"><h4>Sugestão para as células</h4><div class="det-text">${esc(r.sugestao)}</div></div>` : '') +
        secao('Registro', [['Enviado em', txt(r.dataHora)], ...(r.editadoEm ? [['Editado em', `${esc(r.editadoEm)} · ${esc(r.editadoPor)}`]] : []), ['Nº do cadastro', String(r.linha)]]);
    const paineis = { resumo, ficha };
    $('detBody').innerHTML =
        (r._dup > 1 ? '<p class="det-status"><span class="tag-c">Possível duplicado</span></p>' : '') +
            `<div class="det-topo-acoes">
      ${r.telefone ? `<a class="b-zap" href="https://wa.me/55${esc(r.telefone)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
      <button type="button" class="b-sec" data-acao="editar">Editar</button>
    </div>
    <div class="det-tabs" role="tablist" aria-label="Seções do cadastro">${ABAS_DETALHE.map(([k, l]) => `<button type="button" role="tab" id="dt-${k}" data-dtab="${k}" aria-controls="dp-${k}" aria-selected="${k === abaDetalhe}" tabindex="${k === abaDetalhe ? 0 : -1}">${l}</button>`).join('')}</div>
    ${ABAS_DETALHE.map(([k]) => `<div class="det-pane" role="tabpanel" id="dp-${k}" aria-labelledby="dt-${k}"${k === abaDetalhe ? '' : ' hidden'}>${paineis[k]}</div>`).join('')}`;
    const d = $('det');
    d.dataset.linha = String(r.linha);
    if (!d.open) {
        if (typeof d.showModal === 'function')
            d.showModal();
        else
            d.setAttribute('open', '');
    }
    $('detBody').scrollTop = 0;
    d.scrollTop = 0;
    marcarSelecionado();
    if (ajustarLocal)
        mostrarAbaDetalhe('ficha');
    void carregarEnderecoDe(r).then(carregado => {
        const editarEndereco = document.querySelector('#endCorpo [data-end="editar"]');
        if (carregado && ajustarLocal && registroAberto() === r && $('det').open && editarEndereco) {
            editarEndereco.click();
            $('endSec').scrollIntoView({ block: 'start' });
        }
    });
    carregarAnfitriaoDe(r);
}
function mostrarAbaDetalhe(k, focar = false) {
    abaDetalhe = k;
    document.querySelectorAll('#detBody [data-dtab]').forEach(b => {
        const sel = b.dataset.dtab === k;
        b.setAttribute('aria-selected', String(sel));
        b.tabIndex = sel ? 0 : -1;
        if (sel && focar)
            b.focus();
    });
    document.querySelectorAll('#detBody .det-pane').forEach(p => { p.hidden = p.id !== 'dp-' + k; });
}
$('detBody').addEventListener('click', e => {
    const alvo = e.target instanceof Element ? e.target : null;
    const b = alvo?.closest('[data-dtab]');
    if (b)
        mostrarAbaDetalhe(b.dataset.dtab || 'resumo');
});
$('detBody').addEventListener('keydown', e => {
    const b = e.target instanceof Element ? e.target.closest('[data-dtab]') : null;
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!b || !delta)
        return;
    e.preventDefault();
    const i = ABAS_DETALHE.findIndex(([k]) => k === b.dataset.dtab);
    mostrarAbaDetalhe(ABAS_DETALHE[(i + delta + ABAS_DETALHE.length) % ABAS_DETALHE.length][0], true);
});
$('detClose').addEventListener('click', () => $('det').close());
$('det').addEventListener('click', e => { if (e.target === $('det'))
    $('det').close(); });
