"use strict";
// ══════ ÁREA (Spec 009, ADR-0010) ══════
function naLente(lente, r) {
    if (lente === 'semDisc')
        return SITUACOES.semDiscipulador.f(r);
    if (lente === 'servir')
        return algum(POTENCIAL)(r);
    return true;
}
function renderPainelArea(base) {
    const celulas = [...new Set(base.map(r => r.celula).filter(Boolean))];
    const lentes = regrasArea.LENTES.map(([k, rotulo]) => {
        const n = k === 'todos' ? base.length : base.filter(r => naLente(k, r)).length;
        return `<li><button type="button" class="lente${estado.lente === k ? ' on' : ''}" data-lente="${k}" aria-pressed="${estado.lente === k}"><span>${rotulo}</span><b>${n}</b></button></li>`;
    }).join('');
    const legenda = celulas.sort((a, b) => a.localeCompare(b, 'pt-BR')).map(c => `<li>${celulaChip(c)}<b>${base.filter(r => r.celula === c).length}</b></li>`).join('');
    $('areaPainel').innerHTML = `<div class="ap-stats"><div><b>${base.length}</b><span>pessoas</span></div><div><b>${celulas.length}</b><span>${celulas.length === 1 ? 'célula' : 'células'}</span></div></div>
    <p class="ap-kick">Mostrar</p><ul class="ap-lentes">${lentes}</ul>
    ${legenda ? `<p class="ap-kick">Células</p><ul class="ap-leg">${legenda}</ul>` : ''}
    <p class="ap-kick">Ferramentas</p><div class="ap-ferr"><button type="button" data-ferr="anfPainel">Escolher anfitrião ${icone('seguir', { classe: 'ic-16' })}</button><button type="button" data-ferr="multPainel">Planejar multiplicação ${icone('seguir', { classe: 'ic-16' })}</button>${celulasNova().length ? `<button type="button" data-nova-pessoa>Nova pessoa ${icone('mais', { classe: 'ic-16' })}</button>` : ''}</div>`;
    $('areaSub').textContent = `${plural(base.length, 'pessoa', 'pessoas')} em ${plural(celulas.length, 'célula', 'células')}. Toque num rosto para ver a pessoa e agir.`;
}
function renderArea() {
    if (estado.aba !== 'acompanhar')
        return;
    const base = baseIndicadores();
    renderPainelArea(base);
    $('gvResumo').textContent = `${plural(base.length, 'pessoa', 'pessoas')} no recorte`;
}
$('areaPainel').addEventListener('click', e => {
    const alvo = e.target instanceof Element ? e.target : null;
    const lente = alvo?.closest('[data-lente]');
    if (lente) {
        estado.lente = lente.dataset.lente || 'todos';
        renderArea();
        renderMapa();
        $('areaPainel').querySelector(`[data-lente="${estado.lente}"]`)?.focus();
        return;
    }
    const ferr = alvo?.closest('[data-ferr]');
    if (ferr)
        abrirFerramenta(ferr.dataset.ferr || '');
});
// Ferramenta no mapa (Spec 009): o painel abre ao lado do mapa e o mapa desenha as casas
// (anfitrião) ou os grupos (multiplicação). Uma de cada vez.
function abrirFerramenta(id) {
    estado.ferramenta = id;
    const aberta = id === 'anfPainel' || id === 'multPainel';
    ['anfPainel', 'multPainel'].forEach(k => { const d = $(k); d.open = k === id; d.hidden = !!aberta && k !== id; });
    $('areaFerrPainel').hidden = !aberta;
    document.querySelector('.area-palco')?.classList.toggle('modo-ferr', aberta);
    // No celular a ferramenta fica no topo da gaveta (Spec 016): abre a gaveta e mostra
    if (aberta && matchMedia(CELULAR).matches) {
        abrirGaveta();
        $('gvCorpo').scrollTop = 0;
    }
    renderMapa();
    if (aberta)
        $(id).querySelector('summary')?.focus({ preventScroll: true });
    else
        $('areaPainel').querySelector('[data-ferr]')?.focus();
}
$('areaFerrPainel').addEventListener('click', e => {
    if (e.target instanceof Element && e.target.closest('[data-ferr-sair]'))
        abrirFerramenta('');
});
// O resumo do painel não fecha a ferramenta: quem sai é o "Voltar ao mapa".
['anfPainel', 'multPainel'].forEach(k => $(k).querySelector('summary')?.addEventListener('click', e => { if (estado.ferramenta === k)
    e.preventDefault(); }));
