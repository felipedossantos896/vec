// ══════ PLANEJAR MULTIPLICAÇÃO (Spec 005) ══════
// Painel na aba Mapa: o servidor propõe dois grupos para a célula escolhida e as
// casas de cada um; o líder move pessoas e o servidor recalcula. É só simulação:
// nada é gravado. Os nomes vêm da lista do escopo; a resposta só traz números.

let multAtual: Multiplicacao | null = null;
let multProposta: number[][] | null = null; // divisão original, para "Voltar à proposta"
let multCelula = '';
let multPedido = 0;

function renderPainelMultiplicacao() {
  const painel = $<HTMLDetailsElement>('multPainel');
  const alvo = celulaDoRanking();
  $('multResumo').textContent = alvo ? `Planejar multiplicação de ${alvo}` : 'Planejar multiplicação';
  if (alvo !== multCelula) { multAtual = null; multProposta = null; }
  if (!painel.open) return;
  if (!alvo) {
    $('multStatus').textContent = 'Escolha uma célula no filtro acima para planejar a multiplicação.';
    $('multCorpo').innerHTML = '';
    return;
  }
  if (multAtual) desenharMultiplicacao();
  else carregarMultiplicacao(alvo, null);
}

async function carregarMultiplicacao(celula: string, grupos: number[][] | null, movido?: { linha: number; destino: number }) {
  const s = lerSessao();
  if (!s) return;
  const pedido = ++multPedido;
  multCelula = celula;
  document.querySelectorAll<HTMLButtonElement>('#multCorpo button[data-mult]').forEach(b => { b.disabled = true; });
  if (!grupos) $('multStatus').textContent = 'Montando a proposta…';
  try {
    const res = await api<ApiResult & Multiplicacao>({ acao: 'multiplicacao', celula, token: s.token, ...(grupos ? { grupos } : {}) });
    if (pedido !== multPedido || celulaDoRanking() !== celula) return; // outro pedido ou outra célula
    if (!res.ok) {
      if (res.erro === 'sessao') { limparSessao(); mostrarLogin('Sua sessão expirou. Entre novamente.'); return; }
      $('multStatus').textContent = res.erro === 'nao_encontrado'
        ? 'Esta célula não tem membros no seu escopo.'
        : res.erro === 'dados_invalidos' ? 'A lista de membros mudou. Atualize o painel e tente de novo.'
          : 'Não foi possível calcular agora. Atualize o painel e tente de novo.';
      document.querySelectorAll<HTMLButtonElement>('#multCorpo button[data-mult]').forEach(b => { b.disabled = false; });
      return;
    }
    multAtual = res;
    if (!grupos) multProposta = res.grupos.map(g => [...g.linhas]);
    desenharMultiplicacao();
    if (estado.ferramenta === 'multPainel') renderMapa(); // grupos A e B no mapa
    if (movido) {
      $('multStatus').textContent = regrasMult.anuncio(nomeMult(movido.linha), movido.destino, res.grupos.map(g => g.linhas));
      document.querySelector<HTMLButtonElement>(`#multCorpo [data-mult="mover"][data-linha="${movido.linha}"]`)?.focus();
    }
  } catch (err) {
    if (pedido === multPedido) {
      $('multStatus').textContent = 'Não foi possível conectar. Verifique a internet.';
      document.querySelectorAll<HTMLButtonElement>('#multCorpo button[data-mult]').forEach(b => { b.disabled = false; });
    }
  }
}

const nomeMult = (linha: number): string => { const r = regDe(linha); return r ? nomeCurto(r) : `Cadastro nº ${linha}`; };

function desenharMultiplicacao() {
  const m = multAtual;
  if (!m) return;
  $('multStatus').textContent = m.ajustada
    ? 'Divisão ajustada à mão. Os números abaixo já consideram as mudanças.'
    : m.automatica ? `Proposta para ${m.celula}: dois grupos pela proximidade dos membros.` : `Monte os grupos de ${m.celula} movendo as pessoas.`;
  const avisos = regrasMult.avisos(m);
  const grupo = (g: GrupoMult, i: number): string => {
    const outro = i === 0 ? 1 : 0;
    const sem = new Set(g.semPosicao);
    const pessoas = [...g.linhas].sort((a, b) => nomeMult(a).localeCompare(nomeMult(b), 'pt-BR'));
    const casas = g.casas.slice(0, regrasAnfitriao.DESTAQUES);
    return `<section class="mult-grupo" aria-labelledby="multG${i}">
      <h3 id="multG${i}" tabindex="-1">${esc(regrasMult.titulo(g, i))}</h3>
      ${pessoas.length ? `<ul class="mult-pessoas">${pessoas.map(l => `<li>
        <button type="button" class="btn-link" data-mapa-pessoa="${l}">${esc(nomeMult(l))}</button>
        ${sem.has(l) ? '<span class="anf-tag alerta">Sem posição — confira o grupo</span>' : ''}
        <button type="button" class="btn-sec mult-mover" data-mult="mover" data-linha="${l}" data-destino="${outro}" aria-label="Mover ${esc(nomeMult(l))} para o grupo ${outro + 1}">Mover para o grupo ${outro + 1}</button>
      </li>`).join('')}</ul>` : '<p class="nota-fraca">Ninguém neste grupo.</p>'}
      <h4 class="mult-h">Casas sugeridas</h4>
      ${casas.length ? `<ol class="anf-casas">${casas.map((c, j) => {
        const id = `multExp${i}_${c.linha}`;
        return `<li class="anf-casa${regrasAnfitriao.destaque(j, c) ? ' destaque' : ''}">
          <div class="anf-topo"><span class="anf-pos" aria-hidden="true">${j + 1}º</span>
            <button type="button" class="btn-link anf-nome" data-mapa-pessoa="${c.linha}" aria-describedby="${id}">${esc(nomeMult(c.linha))}</button>
            ${c.comporta ? '' : '<span class="anf-tag alerta">Não comporta o grupo</span>'}</div>
          <ul class="anf-expl" id="${id}">${regrasAnfitriao.explicar(c, g.membros, true).map(t => `<li>${esc(t)}</li>`).join('')}</ul></li>`;
      }).join('')}</ol>${g.casas.length > casas.length ? `<p class="field-hint">Mais ${g.casas.length - casas.length} no painel "Escolher anfitrião".</p>` : ''}`
        : '<p class="nota-fraca">Nenhuma casa confirmada com endereço localizado para este grupo.</p>'}
    </section>`;
  };
  $('multCorpo').innerHTML =
    `<p class="anf-aviso">${regrasMult.AVISO_SIMULACAO} Distância em linha reta, não é tempo de trajeto.</p>` +
    (avisos.length ? `<ul class="anf-fora">${avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : '') +
    (m.ajustada && multProposta ? '<div class="end-acoes"><button type="button" class="btn-sec" data-mult="voltar">Voltar à proposta</button></div>' : '') +
    `<div class="mult-grupos">${m.grupos.map(grupo).join('')}</div>`;
}

$('multPainel').addEventListener('toggle', () => renderPainelMultiplicacao());
$('multCorpo').addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('button[data-mult]') : null;
  if (!b || b.disabled || !multAtual) return;
  if (b.dataset.mult === 'voltar') {
    carregarMultiplicacao(multCelula, null).then(() => document.querySelector<HTMLElement>('#multG0')?.focus());
    return;
  }
  const linha = Number(b.dataset.linha), destino = Number(b.dataset.destino);
  const grupos = regrasMult.mover(multAtual.grupos.map(g => g.linhas), linha, destino);
  carregarMultiplicacao(multCelula, grupos, { linha, destino });
});
