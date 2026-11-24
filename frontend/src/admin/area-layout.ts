// ══════ ÁREA EM TELA CHEIA (Spec 016) ══════
// O mapa ocupa o espaço livre da tela; o conteúdo de baixo vive numa gaveta suspensa por
// cima do mapa. Aqui ficam as medidas (CSSOM, por causa do CSP), a gaveta (toque, arrasto,
// teclado) e a troca de lugar do painel escuro e da ferramenta no celular.

const palco = $('areaPalco');
const gaveta = $('gaveta');
const gvAlca = $<HTMLButtonElement>('gvAlca');
const gvCorpo = $('gvCorpo');
const NAV_EMBAIXO = '(max-width: 1023px)'; // menu no topo e abas embaixo (ADR-0010)
const CELULAR = '(max-width: 720px), (max-height: 500px)'; // painel e ferramenta na gaveta (celular ou tela baixa)
let estadoGaveta: EstadoGaveta = 'recolhida';

// Altura do topo e das abas de baixo, para o palco ocupar o resto da tela
function medirTela() {
  const embaixo = matchMedia(NAV_EMBAIXO).matches;
  const topo = embaixo ? (document.querySelector('.topbar')?.getBoundingClientRect().height || 0) : 0;
  const abas = embaixo ? ($('tabs').getBoundingClientRect().height || 0) : 0;
  document.documentElement.style.setProperty('--topo', `${Math.round(topo)}px`);
  document.documentElement.style.setProperty('--abas', `${Math.round(abas)}px`);
}

// Posição da gaveta: --gv-aberta (altura total) e --gv-h (quanto aparece). O Leaflet usa --gv-h
// para manter o zoom e a atribuição do OpenStreetMap sempre acima da gaveta.
function posicionarGaveta(h?: number) {
  const alto = palco.clientHeight;
  const visivel = h ?? regrasGaveta.altura(estadoGaveta, alto);
  palco.style.setProperty('--gv-aberta', `${regrasGaveta.aberta(alto)}px`);
  palco.style.setProperty('--gv-h', `${regrasGaveta.limitar(visivel, alto)}px`);
}

function definirGaveta(estado: EstadoGaveta, focarAlca = false) {
  estadoGaveta = estado;
  const aberta = estado === 'aberta';
  gaveta.dataset.estado = estado;
  gvAlca.setAttribute('aria-expanded', String(aberta));
  gvAlca.setAttribute('aria-label', aberta ? 'Recolher' : 'Mostrar mais da Área');
  gvCorpo.inert = !aberta; // recolhida, o conteúdo sai da ordem de Tab
  if (aberta) mapaLeaflet?.closePopup(); // a gaveta cobre o mapa: o cartão fecha
  posicionarGaveta();
  if (focarAlca) gvAlca.focus({ preventScroll: true });
}
function abrirGaveta() { if (estadoGaveta !== 'aberta') definirGaveta('aberta'); }

// Painel escuro e ferramenta: no celular, dentro da gaveta; no resto, flutuando no palco
function arrumarPaineis() {
  const cel = matchMedia(CELULAR).matches;
  const painel = $('areaPainel'), ferr = $('areaFerrPainel');
  if (cel && painel.parentElement !== $('gvSlotPainel')) $('gvSlotPainel').appendChild(painel);
  if (!cel && painel.parentElement !== palco) palco.insertBefore(painel, $('mapaVazio'));
  if (cel && ferr.parentElement !== $('gvSlotFerr')) $('gvSlotFerr').appendChild(ferr);
  if (!cel && ferr.parentElement !== palco) palco.insertBefore(ferr, gaveta);
}

// Recuos do mapa para o enquadramento (Spec 016): barra de filtros, painel, ferramenta e gaveta
function folgasMapa(): { paddingTopLeft: [number, number]; paddingBottomRight: [number, number] } {
  const p = palco.getBoundingClientRect();
  const filtros = document.querySelector('.area-filtros')?.getBoundingClientRect();
  const topo = Math.max(24, filtros ? filtros.bottom - p.top + 16 : 24);
  const painel = $('areaPainel');
  const esq = painel.parentElement === palco ? painel.getBoundingClientRect().right - p.left + 24 : 24;
  const ferr = $('areaFerrPainel');
  const dir = !ferr.hidden && ferr.parentElement === palco ? p.right - ferr.getBoundingClientRect().left + 24 : 40;
  return { paddingTopLeft: [esq, topo], paddingBottomRight: [dir, regrasGaveta.MIN + 28] };
}

// ── Arrasto da alça: acompanha o dedo ou o mouse; ao soltar, vai para o estado mais próximo ──
let arrasto: { y0: number; h0: number; y: number; t: number; v: number; moveu: boolean } | null = null;
let ignorarClique = false;
gvAlca.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  const h0 = regrasGaveta.altura(estadoGaveta, palco.clientHeight);
  arrasto = { y0: e.clientY, h0, y: e.clientY, t: performance.now(), v: 0, moveu: false };
  gvAlca.setPointerCapture(e.pointerId);
});
gvAlca.addEventListener('pointermove', e => {
  if (!arrasto) return;
  const agora = performance.now();
  if (!arrasto.moveu && Math.abs(e.clientY - arrasto.y0) < 6) return; // ainda é um toque
  arrasto.moveu = true;
  gaveta.classList.add('arrastando');
  arrasto.v = (arrasto.y - e.clientY) / Math.max(agora - arrasto.t, 1); // > 0 subindo
  arrasto.y = e.clientY; arrasto.t = agora;
  posicionarGaveta(arrasto.h0 + (arrasto.y0 - e.clientY));
});
const soltarAlca = (e: PointerEvent) => {
  const a = arrasto;
  arrasto = null;
  if (!a) return;
  if (gvAlca.hasPointerCapture(e.pointerId)) gvAlca.releasePointerCapture(e.pointerId);
  gaveta.classList.remove('arrastando');
  if (!a.moveu) return; // o clique cuida do toque
  ignorarClique = true;
  const h = a.h0 + (a.y0 - e.clientY);
  definirGaveta(regrasGaveta.soltar(h, a.v, palco.clientHeight));
};
gvAlca.addEventListener('pointerup', soltarAlca);
gvAlca.addEventListener('pointercancel', soltarAlca);
// Toque, clique, Enter e Espaço alternam
gvAlca.addEventListener('click', () => {
  if (ignorarClique) { ignorarClique = false; return; }
  definirGaveta(estadoGaveta === 'aberta' ? 'recolhida' : 'aberta');
});
// Esc recolhe a gaveta (depois do cartão e do leque do mapa, que fecham primeiro)
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || e.defaultPrevented || estado.aba !== 'acompanhar' || estadoGaveta !== 'aberta') return;
  if (document.querySelector('dialog[open]')) return;
  definirGaveta('recolhida', true);
});

// Tamanho: tela, giro do celular e barra do navegador (dvh) mudam o palco
function aoMudarTamanho() {
  medirTela();
  arrumarPaineis();
  posicionarGaveta();
  mapaLeaflet?.invalidateSize();
}
// O painel aparece depois do login: medir quando o topo, as abas ou o palco mudam de tamanho
const observador = new ResizeObserver(() => { if (!arrasto) aoMudarTamanho(); });
[palco, $('tabs'), document.querySelector('.topbar')].forEach(el => { if (el) observador.observe(el); });
addEventListener('resize', aoMudarTamanho);
matchMedia(CELULAR).addEventListener('change', aoMudarTamanho);
document.body.classList.toggle('na-area', estado.aba === 'acompanhar'); // a Área é a tela inicial
aoMudarTamanho();
definirGaveta('recolhida');
