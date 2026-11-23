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
let camadaFerr = null; // casas e linhas da ferramenta aberta (Spec 009)
const regDe = (id) => estado.regs.find(r => r.linha === id);
function nomesMapa(ids) {
    const regs = ids.map(regDe).filter((r) => Boolean(r)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return `<ul class="mapa-nomes">${regs.map(r => `<li><button type="button" class="btn-link" data-mapa-pessoa="${r.linha}">${esc(r.nome)}</button> <span class="nota-fraca">${celulaChip(r.celula)}</span></li>`).join('')}</ul>`;
}
// Casas do ranking aberto (até 4), na posição aproximada da área de quem recebe.
function casasNoMapa() {
    if (estado.ferramenta !== 'anfPainel' || !dadosMapa)
        return [];
    const d = rankingCache.get(celulaDoRanking())?.dados;
    if (!d)
        return [];
    return (d.casas || []).slice(0, 4).map(c => {
        const g = dadosMapa.grupos.find(x => x.linhas.includes(c.linha));
        return g ? { lat: g.lat, lng: g.lng, nome: regDe(c.linha)?.nome || `Cadastro nº ${c.linha}` } : null;
    }).filter((x) => Boolean(x));
}
// Grupo (A ou B) de quem está no ponto, quando a multiplicação está aberta.
function grupoMult(linha) {
    if (estado.ferramenta !== 'multPainel' || !multAtual || linha === undefined)
        return '';
    const i = multAtual.grupos.findIndex(g => g.linhas.includes(linha));
    return i < 0 ? '' : i === 0 ? 'A' : 'B';
}
// Popup: rosto, nome, célula, o motivo de cuidado e as ações.
function pessoasPopup(rs) {
    return `<ul class="pop-pessoas">${rs.map(r => `<li>${avatar(r, 'av-s')}<div><b>${esc(r.nome)}</b><span>${celulaChip(r.celula)}${naLente('cuidado', r) ? ` · <em>${esc(regrasArea.motivo(pessoaArea(r)))}</em>` : ''}</span></div>
    <div class="pop-a">${botaoWhats(r)}<button type="button" class="b-pri" data-contato="${r.linha}">Contato feito</button><button type="button" class="b-sec" data-mapa-pessoa="${r.linha}">Ficha</button></div></li>`).join('')}</ul>`;
}
let mapaPedindo = false; // evita pedir o mapa de novo enquanto um pedido está no ar
async function carregarMapa() {
    const s = lerSessao();
    if (!s || mapaPedindo)
        return;
    mapaPedindo = true;
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
    finally {
        mapaPedindo = false;
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
    mapaLeaflet = L.map('mapaCanvas', { maxZoom: ZOOM_MAX, minZoom: 4, zoomAnimation: animar, fadeAnimation: animar, markerZoomAnimation: animar, zoomControl: false });
    L.control.zoom({ position: 'topright' }).addTo(mapaLeaflet); // o painel da Área ocupa o canto esquerdo
    L.tileLayer(TILES_OSM, { maxZoom: ZOOM_MAX, attribution: ATRIBUICAO_OSM }).addTo(mapaLeaflet);
    mapaLeaflet.attributionControl.setPrefix(false);
    camadaGrupos = L.layerGroup().addTo(mapaLeaflet);
    camadaFerr = L.layerGroup().addTo(mapaLeaflet);
    return true;
}
function renderMapa() {
    if (estado.aba !== 'acompanhar')
        return; // o mapa fica no topo da Área (Spec 009)
    renderArea();
    // A Área é a tela inicial: na primeira vez o mapa se carrega sozinho.
    if (!dadosMapa) {
        carregarMapa();
        renderPainelAnfitriao();
        renderPainelMultiplicacao();
        return;
    }
    const f = regrasMapa.filtrar(dadosMapa, new Set(baseIndicadores().map(r => r.linha)));
    $('mapaStatus').textContent = regrasMapa.resumo(f);
    if (iniciarLeaflet()) {
        camadaGrupos.clearLayers();
        camadaFerr.clearLayers();
        const casas = casasNoMapa();
        // A vista vem antes dos marcadores: sem ela o Leaflet não cria o elemento e o
        // rótulo acessível não teria onde ficar. Com a ferramenta de anfitrião, as casas entram.
        const pontos = [...f.grupos.map(g => [g.lat, g.lng]), ...casas.map(c => [c.lat, c.lng])];
        // Os painéis ficam por cima do mapa no computador: o enquadramento desconta o espaço deles.
        const largo = matchMedia('(min-width: 721px)').matches;
        const folga = largo ? { paddingTopLeft: [340, 40], paddingBottomRight: [estado.ferramenta ? 440 : 40, 40] } : { padding: [36, 36] };
        if (pontos.length)
            mapaLeaflet.fitBounds(L.latLngBounds(pontos), { maxZoom: ZOOM_MAX, ...folga });
        else
            mapaLeaflet.setView([-14.2, -51.9], 4);
        f.grupos.forEach((g, i) => {
            // Rostos empilhados (até 3) com a cor da célula; quem está na lente vem na frente
            // e com "!" quando precisa de cuidado (Spec 009, ADR-0011). Mesma área de ~300 m.
            const pessoas = g.linhas.map(regDe).filter((r) => Boolean(r))
                .sort((a, b) => Number(naLente(estado.lente, b)) - Number(naLente(estado.lente, a)) || a.nome.localeCompare(b.nome, 'pt-BR'));
            const acesas = pessoas.filter(r => naLente(estado.lente, r));
            const cuidado = pessoas.some(r => naLente('cuidado', r));
            const rotulo = `Área ${i + 1}: ${pessoas.map(r => r.nome).join(', ') || regrasMapa.pessoas(g.linhas.length)}`;
            const grupo = grupoMult(pessoas[0]?.linha);
            const corPino = (r) => grupo === 'B' ? '#15171c' : corDaCelula(r.celula);
            const rostosHtml = pessoas.slice(0, 3).map(r => `<span class="rp" data-cor="${corPino(r)}">${avatar(r, 'av-pin')}</span>`).join('') + (grupo ? `<span class="rp-grupo">${grupo}</span>` : '');
            const html = `<span class="rostos-pin">${rostosHtml}${pessoas.length > 3 ? `<span class="rp-mais">+${pessoas.length - 3}</span>` : ''}</span>` +
                `<span class="rp-nome">${esc(regrasArea.rotulo(pessoas.map(r => r.nome)))}</span>${cuidado && estado.lente !== 'servir' ? '<span class="rp-alerta" aria-hidden="true">!</span>' : ''}`;
            const larg = 44 + Math.max(0, Math.min(pessoas.length, 3) - 1) * 18 + (pessoas.length > 3 ? 22 : 0);
            const m = L.marker([g.lat, g.lng], {
                icon: L.divIcon({ className: `mapa-grupo${acesas.length || estado.lente === 'todos' ? '' : ' apagado'}`, html, iconSize: [larg, 66], iconAnchor: [larg / 2, 22] }),
                keyboard: true, title: rotulo
            });
            m.bindPopup(`<p class="mapa-pop-t">${esc(`Área ${i + 1}: ${regrasMapa.pessoas(g.linhas.length)}`)}${g.peloBairro ? ' (algumas pelo bairro)' : ''}</p>${pessoasPopup(pessoas)}`);
            m.addTo(camadaGrupos);
            m.getElement()?.setAttribute('aria-label', rotulo);
        });
        // Anfitrião: casas numeradas (no centro da área de ~300 m de quem recebe) e linhas da
        // casa 1 até as áreas dos membros. Distância em linha reta, como no ranking.
        if (casas.length) {
            const c1 = casas[0];
            f.grupos.forEach(g => L.polyline([[c1.lat, c1.lng], [g.lat, g.lng]], { color: '#c43a1f', weight: 2, dashArray: '4 6', opacity: 0.8, interactive: false }).addTo(camadaFerr));
            casas.forEach((c, i) => {
                const rot = `Casa ${i + 1}: ${c.nome}`;
                const m = L.marker([c.lat, c.lng], { icon: L.divIcon({ className: `casa-n${i === 0 ? ' top' : ''}`, html: `<span class="casa-pin"><b>${i + 1}</b></span>`, iconSize: i === 0 ? [44, 44] : [36, 36], iconAnchor: i === 0 ? [22, 50] : [18, 42] }), keyboard: true, title: rot, zIndexOffset: 1000 - i });
                m.addTo(camadaFerr);
                m.getElement()?.setAttribute('aria-label', rot);
            });
        }
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
