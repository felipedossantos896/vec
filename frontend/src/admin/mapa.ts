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

const regDe = (id: number): Registro | undefined => estado.regs.find(r => r.linha === id);

function nomesMapa(ids: number[]): string {
  const regs = ids.map(regDe).filter((r): r is Registro => Boolean(r)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return `<ul class="mapa-nomes">${regs.map(r => `<li><button type="button" class="btn-link" data-mapa-pessoa="${r.linha}">${esc(r.nome)}</button> <span class="nota-fraca">${celulaChip(r.celula)}</span></li>`).join('')}</ul>`;
}

// Popup: rosto, nome, célula, o motivo de cuidado e as ações.
function pessoasPopup(rs: Registro[]): string {
  return `<ul class="pop-pessoas">${rs.map(r => `<li>${avatar(r, 'av-s')}<div><b>${esc(r.nome)}</b><span>${celulaChip(r.celula)}${naLente('cuidado', r) ? ` · <em>${esc(regrasArea.motivo(pessoaArea(r)))}</em>` : ''}</span></div>
    <div class="pop-a">${botaoWhats(r)}<button type="button" class="b-sec" data-mapa-pessoa="${r.linha}">Ficha</button></div></li>`).join('')}</ul>`;
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
  return true;
}

function renderMapa() {
  if (estado.aba !== 'acompanhar') return; // o mapa fica no topo da Área (Spec 009)
  renderArea();
  // A Área é a tela inicial: na primeira vez o mapa se carrega sozinho.
  if (!dadosMapa) { carregarMapa(); renderPainelAnfitriao(); renderPainelMultiplicacao(); return; }
  const f = regrasMapa.filtrar(dadosMapa, new Set(baseIndicadores().map(r => r.linha)));
  $('mapaStatus').textContent = regrasMapa.resumo(f);
  if (iniciarLeaflet()) {
    camadaGrupos.clearLayers();
    // A vista vem antes dos marcadores: sem ela o Leaflet não cria o elemento e o
    // rótulo acessível não teria onde ficar.
    if (f.grupos.length) mapaLeaflet.fitBounds(L.latLngBounds(f.grupos.map(g => [g.lat, g.lng])).pad(0.25), { maxZoom: 15 });
    else mapaLeaflet.setView([-14.2, -51.9], 4);
    f.grupos.forEach((g, i) => {
      // Rostos empilhados (até 3) com a cor da célula; quem está na lente vem na frente
      // e com "!" quando precisa de cuidado (Spec 009, ADR-0011). Mesma área de ~300 m.
      const pessoas = g.linhas.map(regDe).filter((r): r is Registro => Boolean(r))
        .sort((a, b) => Number(naLente(estado.lente, b)) - Number(naLente(estado.lente, a)) || a.nome.localeCompare(b.nome, 'pt-BR'));
      const acesas = pessoas.filter(r => naLente(estado.lente, r));
      const cuidado = pessoas.some(r => naLente('cuidado', r));
      const rotulo = `Área ${i + 1}: ${pessoas.map(r => r.nome).join(', ') || regrasMapa.pessoas(g.linhas.length)}`;
      const rostosHtml = pessoas.slice(0, 3).map(r => `<span class="rp" data-cor="${corDaCelula(r.celula as string)}">${avatar(r, 'av-pin')}</span>`).join('');
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

// Nome no mapa (popup) ou na lista abre a ficha da pessoa.
document.addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-mapa-pessoa]') : null;
  const r = b ? regDe(Number(b.dataset.mapaPessoa)) : undefined;
  if (r) abrirDetalhe(r);
});
