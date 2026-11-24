"use strict";
// ══════ MAPA DE MEMBROS (Spec 003) ══════
// Leaflet (versionado em admin/vendor/leaflet) com o fundo do OpenStreetMap. Cada
// marcador é uma área de ~300 m com a contagem de pessoas; o endereço exato fica só
// na ficha. A lista abaixo do mapa tem o mesmo conteúdo e funciona sem ele.
// Política de tiles do OSM: atribuição sempre visível, sem pré-carga nem uso offline.
const TILES_OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Reportar erro no mapa</a>';
const ZOOM_MAX = 16; // além disso não há o que ver: as posições são aproximadas
const ZOOM_ENQUADRAMENTO = 14;
const ZOOM_TILES = 17; // detectRetina reduz em um o teto efetivo da camada no Leaflet 1.9.4
const RECARREGAR_APOS_MS = 60000;
let dadosMapa = null;
let mapaCarregadoEm = 0;
let mapaLeaflet = null;
let camadaGrupos = null;
let camadaFerr = null; // casas e linhas da ferramenta aberta (Spec 009)
const regDe = (id) => estado.regs.find(r => r.linha === id);
function nomesMapa(ids) {
    const regs = ids.map(regDe).filter((r) => Boolean(r)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return `<ul class="mapa-nomes">${regs.map(r => `<li><button type="button" class="btn-link" data-mapa-pessoa="${r.linha}" title="${esc(regrasNomes.completo(r.nome))}">${esc(nomeCurto(r))}</button> <span class="nota-fraca">${celulaOuPapel(r)}</span></li>`).join('')}</ul>`;
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
// Papel e destaques da pessoa no mapa (Spec 014): líder de célula e casa vêm do servidor
const pessoaNoMapa = (r) => ({
    papel: r.papel, setor: r.setor,
    destaque: dadosMapa?.destaques?.[String(r.linha)]
});
// Selos no canto do rosto: liderança em cima, casa da célula embaixo
function selosHtml(r) {
    const s = regrasMapa.selos(pessoaNoMapa(r));
    return ['cima', 'baixo'].map(k => {
        const selo = s[k];
        return selo ? `<span class="selo selo-${k}" data-selo="${selo}">${icone(selo, { rotulo: regrasMapa.NOME_SELO[selo] })}</span>` : '';
    }).join('');
}
// Rosto do pino: anel na cor da célula (neutro para líder de área ou setor), anel grosso na
// casa da célula e os selos
function rostoPin(r, cor) {
    const casa = regrasMapa.selos(pessoaNoMapa(r)).baixo === 'casa';
    return `<span class="rp${casa ? ' rp-casa' : ''}" data-cor="${cor}">${avatar(r, 'av-pin')}${selosHtml(r)}</span>`;
}
// "Ana Souza, líder de setor" para os rótulos acessíveis
function nomeComPapel(r) {
    const papeis = regrasMapa.papeisDoCard(pessoaNoMapa(r)).map(p => p.texto.charAt(0).toLowerCase() + p.texto.slice(1));
    return [nomeCurto(r), ...papeis].join(', ');
}
// Cor do anel do rosto: a da célula; neutra para líder de área ou de setor
const corDoRosto = (r) => regrasLideranca.ehLider(r) ? regrasCelula.SEM_COR : corDaCelula(r.celula);
// Cartão (Spec 017, sobre a 014): rosto grande, nome curto, "célula · papel", outros papéis em
// contato" (WhatsApp, ou registrar o contato sem telefone) e "Ver perfil". O "x" tem 44 px.
function cartaoPessoa(r) {
    const p = pessoaNoMapa(r);
    const sub = regrasMapa.subtituloCartao(p, regrasLideranca.ehMembro(r) ? String(r.celula || '') : '');
    const url = regrasArea.whatsapp(r.telefone);
    const nome = nomeCurto(r);
    const contato = url ? `<a class="b-contato" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Entrar em contato com ${esc(nome)} pelo WhatsApp">Entrar em contato</a>` : '';
    return `<div class="cartao">
    <button type="button" class="cartao-x" data-cartao-fechar aria-label="Fechar o cartão" title="Fechar">${icone('fecharFino')}</button>
    <div class="cartao-topo"><span class="cartao-rosto" data-cor="${corDoRosto(r)}">${avatar(r, 'av-c')}</span>
      <div><b class="cartao-nome" title="${esc(regrasNomes.completo(r.nome))}">${esc(nome)}</b><span class="cartao-sub">${esc(sub.texto)}</span></div></div>
    ${sub.extras.length ? `<ul class="cartao-papeis">${sub.extras.map(x => `<li data-selo="${x.selo}"${x.selo === 'celula' ? ` data-cor="${corDaCelula(p.destaque.liderCelula[0])}"` : ''}><span class="cp-ic">${icone(x.selo)}</span>${esc(x.texto)}</li>`).join('')}</ul>` : ''}
    <div class="cartao-a">${contato}<button type="button" class="b-perfil" data-mapa-pessoa="${r.linha}" aria-label="Ver o perfil de ${esc(nome)}">Ver perfil ${icone('seguir', { classe: 'ic-18' })}</button></div>
  </div>`;
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
        dadosMapa = { grupos: res.grupos, soCidade: res.soCidade, naoLocalizados: res.naoLocalizados, pendentes: res.pendentes, destaques: res.destaques || {} };
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
    L.control.zoom({ position: 'bottomright' }).addTo(mapaLeaflet); // acima da gaveta (Spec 016)
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(mapaLeaflet);
    L.tileLayer(TILES_OSM, { maxZoom: ZOOM_TILES, detectRetina: true, attribution: ATRIBUICAO_OSM }).addTo(mapaLeaflet);
    mapaLeaflet.attributionControl.setPrefix(false);
    camadaGrupos = L.layerGroup().addTo(mapaLeaflet);
    // Rostos crescem com o zoom (Spec 012): redesenha só os marcadores, sem reenquadrar
    mapaLeaflet.on('zoomend', () => { if (estado.aba === 'acompanhar' && ultimoFiltro)
        desenharGrupos(ultimoFiltro); });
    ligarLeque();
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
    // Membros e líderes (Spec 014); as contas das células e os indicadores seguem só com membros
    const base = baseMapa();
    const f = regrasMapa.filtrar(dadosMapa, new Set(base.map(r => r.linha)));
    $('mapaStatus').textContent = regrasMapa.resumo(f, id => { const r = regDe(id); return !!r && regrasLideranca.ehLider(r); });
    $('mapaVazio').innerHTML = !f.grupos.length && base.length ? regrasEstados.html(regrasEstados.mapaVazio()) : '';
    if (iniciarLeaflet()) {
        camadaGrupos.clearLayers();
        camadaFerr.clearLayers();
        const casas = casasNoMapa();
        // A vista vem antes dos marcadores: sem ela o Leaflet não cria o elemento e o
        // rótulo acessível não teria onde ficar. Com a ferramenta de anfitrião, as casas entram.
        const pontos = [...f.grupos.map(g => [g.lat, g.lng]), ...casas.map(c => [c.lat, c.lng])];
        // Filtros, painel, ferramenta e gaveta ficam por cima do mapa: o enquadramento desconta
        // o espaço deles (Spec 016).
        const folga = folgasMapa();
        if (pontos.length)
            mapaLeaflet.fitBounds(L.latLngBounds(pontos), { maxZoom: ZOOM_ENQUADRAMENTO, ...folga, animate: false });
        else
            mapaLeaflet.setView([-14.2, -51.9], 4);
        ultimoFiltro = f;
        desenharGrupos(f);
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
// Quem aparece no mapa: todos do filtro, inclusive líderes de área e de setor (Spec 014)
const baseMapa = () => metricasIndicadores.filtrar(estado.regs, estado.setor, estado.celula);
// Marcadores das áreas: rostos empilhados com o tamanho do zoom atual (Spec 012)
let ultimoFiltro = null;
function desenharGrupos(f) {
    fecharLeque();
    camadaGrupos.clearLayers();
    const t = regrasMapa.tamanhoRosto(mapaLeaflet.getZoom(), matchMedia('(pointer: coarse), (max-width: 720px)').matches);
    $('mapaCanvas').style.setProperty('--rosto', `${t}px`); // CSSOM: o CSP não deixa style no HTML
    f.grupos.forEach((g, i) => {
        // Rostos empilhados (até 3) com a cor da célula; quem está na lente vem na frente
        const pessoas = g.linhas.map(regDe).filter((r) => Boolean(r))
            .sort((a, b) => Number(naLente(estado.lente, b)) - Number(naLente(estado.lente, a)) || a.nome.localeCompare(b.nome, 'pt-BR'));
        const acesas = pessoas.filter(r => naLente(estado.lente, r));
        const rotulo = `Área ${i + 1}: ${pessoas.map(nomeComPapel).join('; ') || regrasMapa.pessoas(g.linhas.length)}`;
        const grupo = grupoMult(pessoas[0]?.linha);
        const corPino = (r) => grupo === 'B' ? '#15171c' : corDoRosto(r);
        const rostosHtml = pessoas.slice(0, 3).map(r => rostoPin(r, corPino(r))).join('') + (grupo ? `<span class="rp-grupo">${grupo}</span>` : '');
        // Leque (Spec 012): todos os rostos do grupo, escondidos até abrir, com as linhas até o centro
        const pos = pessoas.length > 1 ? regrasMapa.leque(pessoas.length, t) : [];
        const leque = pos.length ? `<span class="leque" aria-hidden="true"><svg class="lq-linhas" width="1" height="1" aria-hidden="true">${pos.map(p => `<line x1="0" y1="0" x2="${p.x}" y2="${p.y}"/>`).join('')}</svg>` +
            pessoas.map((r, j) => `<button type="button" class="lq-rosto" data-lq="${j}" tabindex="-1" aria-label="${esc(nomeComPapel(r))}">${rostoPin(r, corPino(r))}<span class="lq-nome">${esc(nomeCurto(r))}</span></button>`).join('') + '</span>' : '';
        const html = `<span class="rostos-pin">${rostosHtml}${pessoas.length > 3 ? `<span class="rp-mais">+${pessoas.length - 3}</span>` : ''}</span>` +
            `<span class="rp-nome">${esc(pessoas.length === 1 ? nomeCurto(pessoas[0]) : regrasArea.rotulo(pessoas.map(r => r.nome)))}</span>${leque}`;
        const larg = Math.round(t + 6 + Math.max(0, Math.min(pessoas.length, 3) - 1) * t * 0.55 + (pessoas.length > 3 ? t * 0.55 : 0));
        const m = L.marker([g.lat, g.lng], {
            icon: L.divIcon({ className: `mapa-grupo${acesas.length || estado.lente === 'todos' ? '' : ' apagado'}`, html, iconSize: [larg, t + 30], iconAnchor: [larg / 2, Math.round(t / 2) + 3] }),
            keyboard: true, title: rotulo
        });
        m.addTo(camadaGrupos);
        const el = m.getElement();
        if (!el)
            return;
        el.setAttribute('aria-label', `${rotulo}. ${pos.length ? 'Enter abre os rostos.' : 'Enter abre o cartão.'}`);
        el.querySelectorAll('.lq-rosto').forEach((b, j) => {
            b.style.setProperty('--x', `${pos[j].x}px`); // CSSOM: o CSP não deixa style no HTML
            b.style.setProperty('--y', `${pos[j].y}px`);
            b.style.transitionDelay = `${Math.min(j, 12) * 14}ms`;
        });
        const gl = { m, el, pessoas, pos, t, fixo: false };
        // Passar o mouse (Spec 017): sozinho, abre o cartão; em grupo, abre o leque, e cada rosto
        // do leque abre o cartão daquela pessoa. Sair do rosto e do cartão fecha depois de 300 ms.
        if (temMouse()) {
            el.addEventListener('mouseenter', () => {
                cancelarFechar();
                if (pos.length) {
                    if (lequeAberto?.m !== m)
                        abrirLeque(gl, false);
                }
                else
                    passarNoRosto(gl, 0);
            });
            el.addEventListener('mouseleave', agendarFechar);
            el.querySelectorAll('.lq-rosto').forEach((b, j) => b.addEventListener('mouseenter', () => passarNoRosto(gl, j)));
        }
        // Enter ou Espaço no marcador (o Leaflet só abriria um popup ligado a ele)
        el.addEventListener('keydown', e => {
            if ((e.key !== 'Enter' && e.key !== ' ') || e.target !== el)
                return;
            e.preventDefault();
            if (!pos.length) {
                abrirCartao(gl, 0, true, true);
                return;
            }
            const la = lequeAberto;
            if (la && la.m === m) {
                fecharLeque();
                return;
            }
            abrirLeque(gl, true);
            el.querySelector('.lq-rosto')?.focus();
        });
        m.on('click', (ev) => {
            const o = ev.originalEvent;
            const alvo = o?.target instanceof Element ? o.target : null;
            const peloTeclado = !!o && (o.type.startsWith('key') || o.detail === 0);
            const rosto = alvo?.closest('.lq-rosto');
            if (rosto) {
                abrirCartao(gl, Number(rosto.dataset.lq), true, peloTeclado);
                return;
            }
            if (!pos.length) {
                abrirCartao(gl, 0, true, peloTeclado);
                return;
            }
            const la = lequeAberto;
            if (la && la.m === m && la.fixo) {
                fecharLeque();
                return;
            }
            abrirLeque(gl, true);
            if (peloTeclado)
                el.querySelector('.lq-rosto')?.focus();
        });
    });
}
let lequeAberto = null;
let cartaoDe = null;
let tFecharCartao;
let tFecharLeque;
const temMouse = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
function abrirLeque(g, fixo) {
    clearTimeout(tFecharLeque);
    if (lequeAberto && lequeAberto.m !== g.m)
        fecharLeque();
    g.fixo = fixo || g.fixo;
    lequeAberto = g;
    g.el.classList.add('aberto');
    g.m.setZIndexOffset(2000);
    g.el.querySelector('.leque')?.removeAttribute('aria-hidden');
    g.el.querySelectorAll('.lq-rosto').forEach(b => { b.tabIndex = 0; });
}
function fecharLeque() {
    clearTimeout(tFecharLeque);
    const g = lequeAberto;
    if (!g)
        return;
    lequeAberto = null;
    g.fixo = false;
    g.el.classList.remove('aberto');
    g.m.setZIndexOffset(0);
    g.el.querySelector('.leque')?.setAttribute('aria-hidden', 'true');
    g.el.querySelectorAll('.lq-rosto').forEach(b => { b.tabIndex = -1; });
}
// Passar e sair com o mouse (Spec 017): um cartão fixado (clique, toque ou teclado) não é
// trocado nem fechado pelo mouse
const FECHAR_AO_SAIR_MS = 300;
function cancelarFechar() { clearTimeout(tFecharCartao); clearTimeout(tFecharLeque); }
function agendarFechar() {
    cancelarFechar();
    tFecharCartao = setTimeout(() => {
        if (cartaoDe && !cartaoDe.fixo)
            fecharCartao({ som: false });
        if (lequeAberto && !lequeAberto.fixo && !(cartaoDe && cartaoDe.fixo))
            fecharLeque();
    }, FECHAR_AO_SAIR_MS);
}
function passarNoRosto(g, j) {
    cancelarFechar();
    if (cartaoDe?.fixo || (cartaoDe && cartaoDe.g.m === g.m && cartaoDe.j === j))
        return;
    abrirCartao(g, j, false);
}
// Cartão ancorado no rosto (ou no marcador, para quem está sozinho na área). Fixo: aberto
// por clique, toque ou teclado; o foco vai para o cartão só quando veio do teclado.
function abrirCartao(g, j, fixo = true, focar = false) {
    const r = g.pessoas[j];
    if (!r)
        return;
    cancelarFechar();
    if (g.pos.length)
        abrirLeque(g, fixo);
    const mesmo = cartaoDe && cartaoDe.g.m === g.m && cartaoDe.j === j;
    if (mesmo && cartaoDe) { // já aberto pelo mouse: o clique só fixa
        if (fixo && !cartaoDe.fixo) {
            cartaoDe.fixo = true;
            cartaoDe.pop.options.autoPan = true;
            cartaoDe.pop.update();
        } // agora cabe na tela
        if (focar)
            cartaoDe.pop.getElement()?.querySelector('.b-contato')?.focus({ preventScroll: true });
        return;
    }
    // Num grupo, o cartão abre acima do leque inteiro, para não cobrir os outros rostos
    // (Spec 017), e o rosto da pessoa fica destacado
    const topoLeque = g.pos.length ? Math.min(...g.pos.map(q => q.y)) - 4 : 0;
    g.el.querySelectorAll('.lq-rosto').forEach((b, k) => b.classList.toggle('ativo', k === j));
    // O cartão desvia da barra de filtros, do painel e da gaveta (Spec 016)
    const f = folgasMapa();
    const pop = L.popup({ offset: [0, topoLeque - Math.round(g.t / 2)], className: 'cartao-pop', autoPanPaddingTopLeft: f.paddingTopLeft, autoPanPaddingBottomRight: f.paddingBottomRight, closeButton: false, autoPan: fixo })
        .setLatLng(g.m.getLatLng()).setContent(cartaoPessoa(r)).openOn(mapaLeaflet);
    cartaoDe = { g, j, pop, fixo };
    const el = pop.getElement();
    if (!fixo)
        desviarCartao(pop);
    if (el && temMouse()) {
        el.addEventListener('mouseenter', cancelarFechar);
        el.addEventListener('mouseleave', agendarFechar);
    }
    if (focar)
        el?.querySelector('.b-contato')?.focus({ preventScroll: true });
}
// O mapa do Leaflet se move com transform, então o cartão fica sempre abaixo do painel, dos
// filtros e da ferramenta, que flutuam por cima (Spec 016). O cartão aberto pelo mouse não
// arrasta o mapa: ele desliza para o lado até sair de baixo do painel e da ferramenta, com a
// ponta ainda no rosto. Se não couber assim (ou se esbarrar nos filtros), o mapa se ajusta.
function desviarCartao(pop) {
    const w = pop.getElement()?.querySelector('.leaflet-popup-content-wrapper');
    if (!w)
        return;
    w.style.setProperty('translate', '0px 0px');
    // Medida sem a animação de entrada (escala): centro e tamanho reais do cartão
    const b = w.getBoundingClientRect(), cx = b.left + b.width / 2;
    const r = { left: cx - w.offsetWidth / 2, right: cx + w.offsetWidth / 2, top: b.bottom - w.offsetHeight, bottom: b.bottom, width: w.offsetWidth };
    const palco = $('areaPalco').getBoundingClientRect();
    const cruza = (o) => r.top < o.bottom && r.bottom > o.top;
    let esq = palco.left + 8, dir = palco.right - 8;
    const painel = $('areaPainel'), ferr = $('areaFerrPainel');
    if (painel.parentElement === $('areaPalco') && cruza(painel.getBoundingClientRect()))
        esq = Math.max(esq, painel.getBoundingClientRect().right + 22);
    if (!ferr.hidden && ferr.parentElement === $('areaPalco') && cruza(ferr.getBoundingClientRect()))
        dir = Math.min(dir, ferr.getBoundingClientRect().left - 22);
    const limite = r.width / 2 - 30; // a ponta continua dentro do cartão
    const quer = r.left < esq ? esq - r.left : r.right > dir ? dir - r.right : 0;
    const dx = Math.max(-limite, Math.min(limite, quer));
    w.style.setProperty('translate', `${Math.round(dx)}px 0px`); // CSSOM: o CSP não deixa style no HTML
    const filtros = document.querySelector('.area-filtros')?.getBoundingClientRect();
    const sobFiltros = !!filtros && r.top < filtros.bottom + 6 && r.right + dx > filtros.left && r.left + dx < filtros.right;
    if (dx !== quer || sobFiltros || r.top < palco.top + 6) {
        pop.options.autoPan = true;
        pop.update();
        w.style.setProperty('translate', '0px 0px');
    }
}
// Fechar (Spec 014): o cartão encolhe até o rosto em 180 ms (sem animação com "reduzir
// movimento"). Pelo "x" ou Esc toca o som e o foco volta ao rosto; ao sair com o mouse, não.
const SAIDA_CARTAO_MS = 180;
function fecharCartao(opcoes = {}) {
    const c = cartaoDe;
    if (!c)
        return;
    const deProposito = opcoes.som !== false;
    const volta = c.g.el.querySelectorAll('.lq-rosto')[c.j] || c.g.el;
    const el = c.pop.getElement();
    if (deProposito)
        sons.fechar();
    const fim = () => {
        if (cartaoDe?.pop !== c.pop)
            return; // outro cartão abriu no meio
        mapaLeaflet.closePopup(c.pop);
        if (deProposito)
            volta.focus({ preventScroll: true });
    };
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        fim();
        return;
    }
    el.classList.add('cartao-saindo');
    setTimeout(fim, SAIDA_CARTAO_MS);
}
document.addEventListener('click', e => {
    if (e.target instanceof Element && e.target.closest('[data-cartao-fechar]'))
        fecharCartao();
});
// Fecha o leque ao tocar no mapa, arrastar ou dar zoom; Esc fecha o cartão e depois o leque
function ligarLeque() {
    mapaLeaflet.on('click dragstart zoomstart', () => { mapaLeaflet.closePopup(); fecharLeque(); });
    mapaLeaflet.on('popupclose', () => { cartaoDe?.g.el.querySelectorAll('.lq-rosto.ativo').forEach(b => b.classList.remove('ativo')); cartaoDe = null; });
}
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || estado.aba !== 'acompanhar' || document.querySelector('dialog[open]'))
        return;
    if (cartaoDe) {
        e.preventDefault();
        fecharCartao();
        return;
    }
    if (lequeAberto) {
        e.preventDefault();
        const el = lequeAberto.el;
        fecharLeque();
        el.focus();
    }
});
// Nome no mapa (popup) ou na lista abre a ficha da pessoa.
document.addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('[data-mapa-pessoa]') : null;
    const r = b ? regDe(Number(b.dataset.mapaPessoa)) : undefined;
    if (r)
        abrirDetalhe(r);
});
// "Ver quem não tem endereço": abre a lista abaixo do mapa
$('mapaVazio').addEventListener('click', e => {
    if (!(e.target instanceof Element) || !e.target.closest('[data-ver-lista]'))
        return;
    const d = document.querySelector('details.area-lista');
    if (!d)
        return;
    abrirGaveta(); // a lista fica na gaveta (Spec 016)
    d.open = true;
    d.scrollIntoView({ block: 'start' });
    d.querySelector('summary')?.focus({ preventScroll: true });
});
