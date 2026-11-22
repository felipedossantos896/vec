"use strict";
// ══════ MAPA DE MEMBROS (Spec 003) ══════
// Leaflet (versionado em admin/vendor/leaflet) com o fundo do OpenStreetMap. Cada
// marcador é uma área de ~300 m com a contagem de pessoas; o endereço exato fica só
// na ficha. A lista abaixo do mapa tem o mesmo conteúdo e funciona sem ele.
// Política de tiles do OSM: atribuição sempre visível, sem pré-carga nem uso offline.
const TILES_OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Reportar erro no mapa</a>';
const ZOOM_MAX = 16; // além disso não há o que ver: as posições são aproximadas
const RECARREGAR_APOS_MS = 60000;
let dadosMapa = null;
let mapaCarregadoEm = 0;
let mapaLeaflet = null;
let camadaGrupos = null;
const regDe = (id) => estado.regs.find(r => r.linha === id);
function nomesMapa(ids) {
    const regs = ids.map(regDe).filter((r) => Boolean(r)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return `<ul class="mapa-nomes">${regs.map(r => `<li><button type="button" class="btn-link" data-mapa-pessoa="${r.linha}">${esc(r.nome)}</button> <span class="nota-fraca">${esc(r.celula || 'Sem célula')}</span></li>`).join('')}</ul>`;
}
async function carregarMapa() {
    const s = lerSessao();
    if (!s)
        return;
    $('mapaStatus').textContent = 'Carregando mapa…';
    try {
        const res = await api({ acao: 'mapa', token: s.token });
        if (!res.ok) {
            if (res.erro === 'sessao') {
                limparSessao();
                mostrarLogin('Sua sessão expirou. Entre novamente.');
                return;
            }
            $('mapaStatus').textContent = 'Não foi possível carregar o mapa. Atualize o painel e tente de novo.';
            return;
        }
        dadosMapa = { grupos: res.grupos, soCidade: res.soCidade, naoLocalizados: res.naoLocalizados, pendentes: res.pendentes };
        mapaCarregadoEm = Date.now();
        renderMapa();
    }
    catch (err) {
        $('mapaStatus').textContent = 'Não foi possível conectar. Verifique a internet.';
    }
}
// Chamado ao abrir a aba: recarrega se os dados estiverem velhos.
function abrirMapa() {
    renderPainelAnfitriao();
    renderPainelMultiplicacao();
    if (!dadosMapa || Date.now() - mapaCarregadoEm > RECARREGAR_APOS_MS)
        carregarMapa();
    else
        renderMapa();
}
function iniciarLeaflet() {
    if (mapaLeaflet) {
        mapaLeaflet.invalidateSize();
        return true;
    }
    if (typeof L === 'undefined') {
        $('mapaCanvas').classList.add('hidden');
        $('mapaAviso').textContent = 'O mapa não pôde ser carregado. A lista abaixo mostra as mesmas áreas.';
        return false;
    }
    const animar = !matchMedia('(prefers-reduced-motion: reduce)').matches; // o Leaflet não respeita sozinho
    mapaLeaflet = L.map('mapaCanvas', { maxZoom: ZOOM_MAX, minZoom: 4, zoomAnimation: animar, fadeAnimation: animar, markerZoomAnimation: animar });
    L.tileLayer(TILES_OSM, { maxZoom: ZOOM_MAX, attribution: ATRIBUICAO_OSM }).addTo(mapaLeaflet);
    mapaLeaflet.attributionControl.setPrefix(false);
    camadaGrupos = L.layerGroup().addTo(mapaLeaflet);
    return true;
}
function renderMapa() {
    if (estado.aba !== 'mapa')
        return;
    if (!dadosMapa) {
        renderPainelAnfitriao();
        renderPainelMultiplicacao();
        return;
    }
    const f = regrasMapa.filtrar(dadosMapa, new Set(baseIndicadores().map(r => r.linha)));
    $('mapaStatus').textContent = regrasMapa.resumo(f);
    if (iniciarLeaflet()) {
        camadaGrupos.clearLayers();
        // A vista vem antes dos marcadores: sem ela o Leaflet não cria o elemento e o
        // rótulo acessível não teria onde ficar.
        if (f.grupos.length)
            mapaLeaflet.fitBounds(L.latLngBounds(f.grupos.map(g => [g.lat, g.lng])).pad(0.25), { maxZoom: 15 });
        else
            mapaLeaflet.setView([-14.2, -51.9], 4);
        f.grupos.forEach((g, i) => {
            const rotulo = `Área ${i + 1}: ${regrasMapa.pessoas(g.linhas.length)}`;
            const m = L.marker([g.lat, g.lng], {
                icon: L.divIcon({ className: 'mapa-grupo', html: `<span>${g.linhas.length}</span>`, iconSize: [38, 38] }),
                keyboard: true, title: rotulo
            });
            m.bindPopup(`<p class="mapa-pop-t">${esc(rotulo)}${g.peloBairro ? ' (algumas pelo bairro)' : ''}</p>${nomesMapa(g.linhas)}`);
            m.addTo(camadaGrupos);
            m.getElement()?.setAttribute('aria-label', rotulo);
        });
    }
    const secao = (titulo, ids, nota = '') => ids.length
        ? `<details class="mapa-sec"><summary>${titulo} · ${regrasMapa.pessoas(ids.length)}</summary>${nota ? `<p class="field-hint">${nota}</p>` : ''}${nomesMapa(ids)}</details>` : '';
    $('mapaLista').innerHTML =
        (f.grupos.length ? `<h2 class="mapa-h">Áreas no mapa</h2>` : '') +
            f.grupos.map((g, i) => secao(`Área ${i + 1}`, g.linhas, g.peloBairro ? 'Inclui pessoas localizadas só pelo bairro.' : '')).join('') +
            (f.soCidade.length + f.naoLocalizados.length + f.pendentes.length + f.semEndereco.length ? `<h2 class="mapa-h">Sem posição no mapa</h2>` : '') +
            secao('Localizadas só pela cidade', f.soCidade, 'O endereço foi encontrado só no nível da cidade; confira a rua na ficha.') +
            secao('Endereço não localizado', f.naoLocalizados, 'Confira o endereço na ficha.') +
            secao('Aguardando localização', f.pendentes, 'A posição é calculada logo depois de salvar o endereço.') +
            secao('Sem endereço cadastrado', f.semEndereco);
    renderPainelAnfitriao();
    renderPainelMultiplicacao();
}
// Nome no mapa (popup) ou na lista abre a ficha da pessoa.
document.addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('[data-mapa-pessoa]') : null;
    const r = b ? regDe(Number(b.dataset.mapaPessoa)) : undefined;
    if (r)
        abrirDetalhe(r);
});
