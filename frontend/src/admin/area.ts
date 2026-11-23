// ══════ ÁREA (Spec 009, ADR-0010) ══════
// Tela inicial: o mapa com os rostos no topo (mapa.ts desenha), o painel de lentes e
// ferramentas e "Fale com eles esta semana". O resto do antigo Acompanhar segue abaixo.

// Quem entra em cada lente. "Precisam de cuidado" é a mesma soma dos cards de cuidado.
function naLente(lente: string, r: Registro): boolean {
  if (lente === 'cuidado') return algum(CUIDAR)(r);
  if (lente === 'semDisc') return SITUACOES.semDiscipulador.f(r);
  if (lente === 'servir') return algum(POTENCIAL)(r);
  return true;
}

function pessoaArea(r: Registro): PessoaArea {
  const dias = r._contato ? Math.floor((Date.now() - r._contato.getTime()) / 864e5) : null;
  return { nome: r.nome, diasSemContato: dias, semDiscipulador: SITUACOES.semDiscipulador.f(r), naoBatizado: r.recebeuJesus === 'S' && r.batismo !== 'S', semCelula: !r.celula };
}

function botaoWhats(r: Registro, classe = 'b-zap'): string {
  const url = regrasArea.whatsapp(r.telefone as string | undefined);
  return url ? `<a class="${classe}" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de ${esc(r.nome)}">WhatsApp</a>` : '';
}

function renderPainelArea(base: Registro[]) {
  const nCuidado = base.filter(r => naLente('cuidado', r)).length;
  const celulas = [...new Set(base.map(r => r.celula).filter(Boolean))] as string[];
  const lentes = regrasArea.LENTES.map(([k, rotulo]) => {
    const n = k === 'todos' ? base.length : base.filter(r => naLente(k, r)).length;
    return `<li><button type="button" class="lente${estado.lente === k ? ' on' : ''}" data-lente="${k}" aria-pressed="${estado.lente === k}"><span>${rotulo}</span><b>${n}</b></button></li>`;
  }).join('');
  const legenda = celulas.sort((a, b) => a.localeCompare(b, 'pt-BR')).map(c =>
    `<li>${celulaChip(c)}<b>${base.filter(r => r.celula === c).length}</b></li>`).join('');
  $('areaPainel').innerHTML = `<div class="ap-stats"><div><b>${base.length}</b><span>pessoas</span></div><div><b>${celulas.length}</b><span>${celulas.length === 1 ? 'célula' : 'células'}</span></div><div><b>${nCuidado}</b><span>precisam de cuidado</span></div></div>
    <p class="ap-kick">Mostrar</p><ul class="ap-lentes">${lentes}</ul>
    ${legenda ? `<p class="ap-kick">Células</p><ul class="ap-leg">${legenda}</ul>` : ''}
    <p class="ap-kick">Ferramentas</p><div class="ap-ferr"><button type="button" data-ferr="anfPainel">Escolher anfitrião <span aria-hidden="true">→</span></button><button type="button" data-ferr="multPainel">Planejar multiplicação <span aria-hidden="true">→</span></button></div>`;
  $('areaSub').textContent = `${plural(base.length, 'pessoa', 'pessoas')} em ${plural(celulas.length, 'célula', 'células')}. Toque num rosto para ver a pessoa e agir.`;
}

function renderFaleCom(base: Registro[]) {
  const precisam = base.filter(r => naLente('cuidado', r));
  const top = regrasArea.urgentes(precisam.map(r => ({ ...pessoaArea(r), r })), 6);
  $('faleCom').innerHTML = `<header class="fale-h"><h2 id="faleTitulo">Fale com eles esta semana</h2><p>${top.length ? `Os ${top.length === 1 ? 'mais urgente' : `${top.length} mais urgentes`}, na ordem — marcados com ! no mapa.` : 'Ninguém precisando de cuidado agora.'}</p></header>` +
    (top.length ? `<ul class="fale-lista">${top.map(({ r, ...p }) => `<li class="fale-c" data-cor="${corDaCelula(r.celula as string)}">
      <div class="fale-t">${avatar(r, 'av-m')}<div><b>${esc(r.nome)}</b><span>${celulaChip(r.celula)}</span></div></div>
      <p class="fale-m">${esc(regrasArea.motivo(p))}</p>
      <div class="fale-a">${botaoWhats(r)}<button type="button" class="b-pri" data-contato="${r.linha}">Contato feito</button><button type="button" class="b-sec" data-mapa-pessoa="${r.linha}">Ficha</button></div></li>`).join('')}</ul>` : '');
}

function renderArea() {
  if (estado.aba !== 'acompanhar') return;
  const base = baseIndicadores();
  renderPainelArea(base);
  renderFaleCom(base);
}

$('areaPainel').addEventListener('click', e => {
  const alvo = e.target instanceof Element ? e.target : null;
  const lente = alvo?.closest<HTMLElement>('[data-lente]');
  if (lente) {
    estado.lente = lente.dataset.lente || 'todos';
    renderArea(); renderMapa();
    $('areaPainel').querySelector<HTMLButtonElement>(`[data-lente="${estado.lente}"]`)?.focus();
    return;
  }
  const ferr = alvo?.closest<HTMLElement>('[data-ferr]');
  if (ferr) abrirFerramenta(ferr.dataset.ferr || '');
});

// Ferramenta no mapa (Spec 009): o painel abre ao lado do mapa e o mapa desenha as casas
// (anfitrião) ou os grupos (multiplicação). Uma de cada vez.
function abrirFerramenta(id: string) {
  estado.ferramenta = id;
  const aberta = id === 'anfPainel' || id === 'multPainel';
  ['anfPainel', 'multPainel'].forEach(k => { const d = $<HTMLDetailsElement>(k); d.open = k === id; d.hidden = !!aberta && k !== id; });
  $('areaFerrPainel').hidden = !aberta;
  document.querySelector('.area-palco')?.classList.toggle('modo-ferr', aberta);
  renderMapa();
  if (aberta) $<HTMLDetailsElement>(id).querySelector<HTMLElement>('summary')?.focus({ preventScroll: true });
  else $('areaPainel').querySelector<HTMLElement>('[data-ferr]')?.focus();
}
$('areaFerrPainel').addEventListener('click', e => {
  if (e.target instanceof Element && e.target.closest('[data-ferr-sair]')) abrirFerramenta('');
});
// O resumo do painel não fecha a ferramenta: quem sai é o "Voltar ao mapa".
['anfPainel', 'multPainel'].forEach(k => $(k).querySelector('summary')?.addEventListener('click', e => { if (estado.ferramenta === k) e.preventDefault(); }));
