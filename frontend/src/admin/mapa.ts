// ══════ MAPA DE MEMBROS (Spec 003) ══════
// Leaflet (versionado em admin/vendor/leaflet) com o fundo do OpenStreetMap. Cada
// marcador é uma área de ~300 m com a contagem de pessoas; o endereço exato fica só
// na ficha. A lista abaixo do mapa tem o mesmo conteúdo e funciona sem ele.
// Política de tiles do OSM: atribuição sempre visível, sem pré-carga nem uso offline.

declare const L: any; // Leaflet, carregado por <script> antes deste arquivo

const TILES_OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUICAO_OSM = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors · <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener">Reportar erro no mapa</a>';
const ZOOM_MAX = 16; // além disso não há o que ver: as posições são aproximadas
const RECARREGAR_APOS_MS = 60_000;

let dadosMapa: DadosMapa | null = null;
let mapaCarregadoEm = 0;
let mapaLeaflet: any = null;
let camadaGrupos: any = null;
let camadaFerr: any = null; // casas e linhas da ferramenta aberta (Spec 009)

const regDe = (id: number): Registro | undefined => estado.regs.find(r => r.linha === id);

function nomesMapa(ids: number[]): string {
  const regs = ids.map(regDe).filter((r): r is Registro => Boolean(r)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return `<ul class="mapa-nomes">${regs.map(r => `<li><button type="button" class="btn-link" data-mapa-pessoa="${r.linha}" title="${esc(regrasNomes.completo(r.nome))}">${esc(nomeCurto(r))}</button> <span class="nota-fraca">${celulaChip(r.celula)}</span></li>`).join('')}</ul>`;
}

// Casas do ranking aberto (até 4), na posição aproximada da área de quem recebe.
function casasNoMapa(): { lat: number; lng: number; nome: string }[] {
  if (estado.ferramenta !== 'anfPainel' || !dadosMapa) return [];
  const d = rankingCache.get(celulaDoRanking())?.dados;
  if (!d) return [];
  return (d.casas || []).slice(0, 4).map(c => {
    const g = dadosMapa!.grupos.find(x => x.linhas.includes(c.linha));
    return g ? { lat: g.lat, lng: g.lng, nome: regDe(c.linha)?.nome || `Cadastro nº ${c.linha}` } : null;
  }).filter((x): x is { lat: number; lng: number; nome: string } => Boolean(x));
}
// Grupo (A ou B) de quem está no ponto, quando a multiplicação está aberta.
function grupoMult(linha: number | undefined): string {
  if (estado.ferramenta !== 'multPainel' || !multAtual || linha === undefined) return '';
  const i = multAtual.grupos.findIndex(g => g.linhas.includes(linha));
  return i < 0 ? '' : i === 0 ? 'A' : 'B';
}

// Popup: rosto, nome, célula, o motivo de cuidado e as ações.
function pessoasPopup(rs: Registro[]): string {
  return `<ul class="pop-pessoas">${rs.map(r => `<li>${avatar(r, 'av-s')}<div><b title="${esc(regrasNomes.completo(r.nome))}">${esc(nomeCurto(r))}</b><span>${celulaChip(r.celula)}${naLente('cuidado', r) ? ` · <em>${esc(regrasArea.motivo(pessoaArea(r)))}</em>` : ''}</span></div>
    <div class="pop-a">${botaoWhats(r)}<button type="button" class="b-pri" data-contato="${r.linha}">Contato feito</button><button type="button" class="b-sec" data-mapa-pessoa="${r.linha}">Ficha</button></div></li>`).join('')}</ul>`;
}

let mapaPedindo = false; // evita pedir o mapa de novo enquanto um pedido está no ar
async function carregarMapa() {
  const s = lerSessao();
  if (!s || mapaPedindo) return;
  mapaPedindo = true;
  $('mapaStatus').textContent = 'Carregando mapa…';
  try {
    const res = await api<ApiResult & DadosMapa>({ acao: 'mapa', token: s.token });
    if (!res.ok) {
      if (res.erro === 'sessao') { limparSessao(); mostrarLogin('Sua sessão expirou. Entre novamente.'); return; }
      $('mapaStatus').textContent = 'Não foi possível carregar o mapa. Atualize o painel e tente de novo.';
      return;
    }
    dadosMapa = { grupos: res.grupos, soCidade: res.soCidade, naoLocalizados: res.naoLocalizados, pendentes: res.pendentes };
    mapaCarregadoEm = Date.now();
    renderMapa();
  } catch (err) {
    $('mapaStatus').textContent = 'Não foi possível conectar. Verifique a internet.';
  } finally {
    mapaPedindo = false;
  }
}

// Chamado ao abrir a aba: recarrega se os dados estiverem velhos.
function abrirMapa() {
  renderPainelAnfitriao(); renderPainelMultiplicacao();
  if (!dadosMapa || Date.now() - mapaCarregadoEm > RECARREGAR_APOS_MS) carregarMapa();
  else renderMapa();
}

function iniciarLeaflet(): boolean {
  if (mapaLeaflet) { mapaLeaflet.invalidateSize(); return true; }
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
  // Rostos crescem com o zoom (Spec 012): redesenha só os marcadores, sem reenquadrar
  mapaLeaflet.on('zoomend', () => { if (estado.aba === 'acompanhar' && ultimoFiltro) desenharGrupos(ultimoFiltro); });
  ligarLeque();
  camadaFerr = L.layerGroup().addTo(mapaLeaflet);
  return true;
}

function renderMapa() {
  if (estado.aba !== 'acompanhar') return; // o mapa fica no topo da Área (Spec 009)
  renderArea();
  // A Área é a tela inicial: na primeira vez o mapa se carrega sozinho.
  if (!dadosMapa) { carregarMapa(); renderPainelAnfitriao(); renderPainelMultiplicacao(); return; }
  const f = regrasMapa.filtrar(dadosMapa, new Set(baseIndicadores().map(r => r.linha)));
  $('mapaStatus').textContent = regrasMapa.resumo(f);
  $('mapaVazio').innerHTML = !f.grupos.length && baseIndicadores().length ? regrasEstados.html(regrasEstados.mapaVazio()) : '';
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
    if (pontos.length) mapaLeaflet.fitBounds(L.latLngBounds(pontos), { maxZoom: ZOOM_MAX, ...folga, animate: false });
    else mapaLeaflet.setView([-14.2, -51.9], 4);
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
  const secao = (titulo: string, ids: number[], nota = ''): string => ids.length
    ? `<details class="mapa-sec"><summary>${titulo} · ${regrasMapa.pessoas(ids.length)}</summary>${nota ? `<p class="field-hint">${nota}</p>` : ''}${nomesMapa(ids)}</details>` : '';
  $('mapaLista').innerHTML =
    (f.grupos.length ? `<h2 class="mapa-h">Áreas no mapa</h2>` : '') +
    f.grupos.map((g, i) => secao(`Área ${i + 1}`, g.linhas, g.peloBairro ? 'Inclui pessoas localizadas só pelo bairro.' : '')).join('') +
    (f.soCidade.length + f.naoLocalizados.length + f.pendentes.length + f.semEndereco.length ? `<h2 class="mapa-h">Sem posição no mapa</h2>` : '') +
    secao('Localizadas só pela cidade', f.soCidade, 'O endereço foi encontrado só no nível da cidade; confira a rua na ficha.') +
    secao('Endereço não localizado', f.naoLocalizados, 'Confira o endereço na ficha.') +
    secao('Aguardando localização', f.pendentes, 'A posição é calculada logo depois de salvar o endereço.') +
    secao('Sem endereço cadastrado', f.semEndereco);
  renderPainelAnfitriao(); renderPainelMultiplicacao();
}

// Marcadores das áreas: rostos empilhados com o tamanho do zoom atual (Spec 012)
let ultimoFiltro: MapaFiltrado | null = null;
function desenharGrupos(f: MapaFiltrado) {
  fecharLeque();
  camadaGrupos.clearLayers();
  const t = regrasMapa.tamanhoRosto(mapaLeaflet.getZoom(), matchMedia('(pointer: coarse), (max-width: 720px)').matches);
  $('mapaCanvas').style.setProperty('--rosto', `${t}px`); // CSSOM: o CSP não deixa style no HTML
  f.grupos.forEach((g, i) => {
    // Rostos empilhados (até 3) com a cor da célula; quem está na lente vem na frente
    // e com "!" quando precisa de cuidado (Spec 009, ADR-0011). Mesma área de ~300 m.
    const pessoas = g.linhas.map(regDe).filter((r): r is Registro => Boolean(r))
      .sort((a, b) => Number(naLente(estado.lente, b)) - Number(naLente(estado.lente, a)) || a.nome.localeCompare(b.nome, 'pt-BR'));
    const acesas = pessoas.filter(r => naLente(estado.lente, r));
    const cuidado = pessoas.some(r => naLente('cuidado', r));
    const rotulo = `Área ${i + 1}: ${pessoas.map(r => r.nome).join(', ') || regrasMapa.pessoas(g.linhas.length)}`;
    const grupo = grupoMult(pessoas[0]?.linha);
    const corPino = (r: Registro): string => grupo === 'B' ? '#15171c' : corDaCelula(r.celula as string);
    const alerta = (r: Registro): string => naLente('cuidado', r) && estado.lente !== 'servir' ? '<span class="rp-alerta" aria-hidden="true">!</span>' : '';
    const rostosHtml = pessoas.slice(0, 3).map(r => `<span class="rp" data-cor="${corPino(r)}">${avatar(r, 'av-pin')}</span>`).join('') + (grupo ? `<span class="rp-grupo">${grupo}</span>` : '');
    // Leque (Spec 012): todos os rostos do grupo, escondidos até abrir, com as linhas até o centro
    const pos = pessoas.length > 1 ? regrasMapa.leque(pessoas.length, t) : [];
    const leque = pos.length ? `<span class="leque" aria-hidden="true"><svg class="lq-linhas" width="1" height="1" aria-hidden="true">${pos.map(p => `<line x1="0" y1="0" x2="${p.x}" y2="${p.y}"/>`).join('')}</svg>` +
      pessoas.map((r, j) => `<button type="button" class="lq-rosto" data-lq="${j}" tabindex="-1" aria-label="${esc(nomeCurto(r))}${naLente('cuidado', r) ? ', precisa de cuidado' : ''}"><span class="rp" data-cor="${corPino(r)}">${avatar(r, 'av-pin')}</span>${alerta(r)}<span class="lq-nome">${esc(nomeCurto(r))}</span></button>`).join('') + '</span>' : '';
    const html = `<span class="rostos-pin">${rostosHtml}${pessoas.length > 3 ? `<span class="rp-mais">+${pessoas.length - 3}</span>` : ''}</span>` +
      `<span class="rp-nome">${esc(pessoas.length === 1 ? nomeCurto(pessoas[0]) : regrasArea.rotulo(pessoas.map(r => r.nome)))}</span>${cuidado && estado.lente !== 'servir' ? '<span class="rp-alerta" aria-hidden="true">!</span>' : ''}${leque}`;
    const larg = Math.round(t + 6 + Math.max(0, Math.min(pessoas.length, 3) - 1) * t * 0.55 + (pessoas.length > 3 ? t * 0.55 : 0));
    const m = L.marker([g.lat, g.lng], {
      icon: L.divIcon({ className: `mapa-grupo${acesas.length || estado.lente === 'todos' ? '' : ' apagado'}`, html, iconSize: [larg, t + 30], iconAnchor: [larg / 2, Math.round(t / 2) + 3] }),
      keyboard: true, title: rotulo
    });
    m.addTo(camadaGrupos);
    const el: HTMLElement | undefined = m.getElement();
    if (!el) return;
    el.setAttribute('aria-label', `${rotulo}. ${pos.length ? 'Enter abre os rostos.' : 'Enter abre o cartão.'}`);
    el.querySelectorAll<HTMLElement>('.lq-rosto').forEach((b, j) => {
      b.style.setProperty('--x', `${pos[j].x}px`); // CSSOM: o CSP não deixa style no HTML
      b.style.setProperty('--y', `${pos[j].y}px`);
      b.style.transitionDelay = `${Math.min(j, 12) * 14}ms`;
    });
    const gl: GrupoLeque = { m, el, pessoas, pos, t, fixo: false };
    if (pos.length && temMouse()) {
      el.addEventListener('mouseenter', () => { clearTimeout(tFecharLeque); if (lequeAberto?.m !== m) abrirLeque(gl, false); });
      el.addEventListener('mouseleave', () => { const la = lequeAberto; if (la && la.m === m && !la.fixo) tFecharLeque = setTimeout(fecharLeque, 250); });
    }
    // Enter ou Espaço no marcador (o Leaflet só abriria um popup ligado a ele)
    el.addEventListener('keydown', e => {
      if ((e.key !== 'Enter' && e.key !== ' ') || e.target !== el) return;
      e.preventDefault();
      if (!pos.length) { abrirCartao(gl, 0); return; }
      const la = lequeAberto;
      if (la && la.m === m) { fecharLeque(); return; }
      abrirLeque(gl, true);
      el.querySelector<HTMLElement>('.lq-rosto')?.focus();
    });
    m.on('click', (ev: { originalEvent?: Event }) => {
      const o = ev.originalEvent;
      const alvo = o?.target instanceof Element ? o.target : null;
      const peloTeclado = !!o && (o.type.startsWith('key') || (o as MouseEvent).detail === 0);
      const rosto = alvo?.closest<HTMLElement>('.lq-rosto');
      if (rosto) { abrirCartao(gl, Number(rosto.dataset.lq)); return; }
      if (!pos.length) { abrirCartao(gl, 0); return; }
      const la = lequeAberto;
      if (la && la.m === m && la.fixo) { fecharLeque(); return; }
      abrirLeque(gl, true);
      if (peloTeclado) el.querySelector<HTMLElement>('.lq-rosto')?.focus();
    });
  });
}

// ── Leque e cartão (Spec 012): um grupo aberto por vez; o cartão é o popup de uma pessoa ──
type GrupoLeque = { m: any; el: HTMLElement; pessoas: Registro[]; pos: { x: number; y: number }[]; t: number; fixo: boolean };
let lequeAberto: GrupoLeque | null = null;
let cartaoDe: { g: GrupoLeque; j: number } | null = null;
let tFecharLeque: ReturnType<typeof setTimeout>;
const temMouse = (): boolean => matchMedia('(hover: hover) and (pointer: fine)').matches;

function abrirLeque(g: GrupoLeque, fixo: boolean) {
  clearTimeout(tFecharLeque);
  if (lequeAberto && lequeAberto.m !== g.m) fecharLeque();
  g.fixo = fixo || g.fixo;
  lequeAberto = g;
  g.el.classList.add('aberto');
  g.m.setZIndexOffset(2000);
  g.el.querySelector('.leque')?.removeAttribute('aria-hidden');
  g.el.querySelectorAll<HTMLElement>('.lq-rosto').forEach(b => { b.tabIndex = 0; });
}

function fecharLeque() {
  clearTimeout(tFecharLeque);
  const g = lequeAberto;
  if (!g) return;
  lequeAberto = null;
  g.fixo = false;
  g.el.classList.remove('aberto');
  g.m.setZIndexOffset(0);
  g.el.querySelector('.leque')?.setAttribute('aria-hidden', 'true');
  g.el.querySelectorAll<HTMLElement>('.lq-rosto').forEach(b => { b.tabIndex = -1; });
}

// Cartão pequeno ancorado no rosto (ou no marcador, para quem está sozinho na área)
function abrirCartao(g: GrupoLeque, j: number) {
  const r = g.pessoas[j];
  if (!r) return;
  if (g.pos.length) abrirLeque(g, true);
  const p = g.pos[j] || { x: 0, y: 0 };
  const pop = L.popup({ offset: [p.x, p.y - Math.round(g.t / 2)], className: 'cartao-pop', autoPanPadding: [24, 24] })
    .setLatLng(g.m.getLatLng()).setContent(pessoasPopup([r])).openOn(mapaLeaflet);
  cartaoDe = { g, j };
  (pop.getElement() as HTMLElement | undefined)?.querySelector<HTMLElement>('button, a')?.focus({ preventScroll: true });
}

// Fecha o leque ao tocar no mapa, arrastar ou dar zoom; Esc fecha o cartão e depois o leque
function ligarLeque() {
  mapaLeaflet.on('click dragstart zoomstart', () => { mapaLeaflet.closePopup(); fecharLeque(); });
  mapaLeaflet.on('popupclose', () => { cartaoDe = null; });
}
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || estado.aba !== 'acompanhar' || document.querySelector('dialog[open]')) return;
  if (cartaoDe) {
    const { g, j } = cartaoDe;
    mapaLeaflet.closePopup();
    (g.el.querySelectorAll<HTMLElement>('.lq-rosto')[j] || g.el).focus();
    return;
  }
  if (lequeAberto) { const el = lequeAberto.el; fecharLeque(); el.focus(); }
});

// Nome no mapa (popup) ou na lista abre a ficha da pessoa.
document.addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-mapa-pessoa]') : null;
  const r = b ? regDe(Number(b.dataset.mapaPessoa)) : undefined;
  if (r) abrirDetalhe(r);
});

// "Ver quem não tem endereço": abre a lista abaixo do mapa
$('mapaVazio').addEventListener('click', e => {
  if (!(e.target instanceof Element) || !e.target.closest('[data-ver-lista]')) return;
  const d = document.querySelector<HTMLDetailsElement>('details.area-lista');
  if (!d) return;
  d.open = true;
  d.scrollIntoView({ block: 'start' });
  d.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
});
