// ══════ INDICADORES ══════
// Monta a aba Indicadores e seus gráficos de colunas. Os blocos de pessoas ficam em acompanhamento.ts.
// A aba usa os mesmos filtros de setor e célula da aba Cadastros.

type Coluna = { rotulo: string; sub?: string; titulo: string; n: number };

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const FAIXAS: [string, number, number][] = [['até 17', 0, 17], ['18–24', 18, 24], ['25–34', 25, 34], ['35–44', 35, 44], ['45–59', 45, 59], ['60+', 60, 200]];
const VIDA: [string, (r: Registro) => boolean][] = [
  ['Recebeu Jesus', r => r.recebeuJesus === 'S'],
  ['Congrega com frequência', r => r.frequentaCultos === 'S'],
  ['Serve em ministério', r => r.serveMinisterio === 'S'],
  ['Tem discipulador', r => !!r.discipulador]
];
const plural = (n: number, um: string, varios: string): string => `${n} ${n === 1 ? um : varios}`;

// Colunas com o valor no topo; a mais alta ocupa toda a altura do gráfico
function colunas(itens: Coluna[]): string {
  const max = Math.max(1, ...itens.map(i => i.n));
  return `<ol class="cols">${itens.map(i => `
    <li tabindex="0" data-tip="${esc(i.titulo)}" aria-label="${esc(i.titulo)}">
      <span class="col-plot" aria-hidden="true"><span class="col-v">${i.n || ''}</span><i style="--h:${i.n / max}"></i></span>
      <span class="col-x" aria-hidden="true">${i.rotulo}<small>${i.sub || ''}</small></span>
    </li>`).join('')}</ol>`;
}

function painel(titulo: string, sub: string, corpo: string): string {
  return `<section class="panel"><header class="panel-head"><h2>${titulo}</h2><p>${sub}</p></header>${corpo}</section>`;
}

function kpi(label: string, valor: string, nota: string): string {
  return `<div class="stat kpi"><span>${label}</span><b>${valor}</b><small>${nota}</small></div>`;
}

// Cadastros recebidos em cada um dos últimos 12 meses, incluindo os meses sem nenhum
function porMes(base: Registro[]): Coluna[] {
  const hoje = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - 11 + i, 1);
    const n = base.filter(r => { const e = parseData(r.dataHora); return !!e && e.getFullYear() === d.getFullYear() && e.getMonth() === d.getMonth(); }).length;
    const mes = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return { rotulo: MESES[d.getMonth()], sub: i === 0 || d.getMonth() === 0 ? String(d.getFullYear()) : '', titulo: `${mes}: ${plural(n, 'cadastro', 'cadastros')}`, n };
  });
}

function renderIndicadores() {
  const base = baseIndicadores();
  const total = base.length;
  if (!total) {
    $('gConteudo').innerHTML = `<div class="empty">${estado.regs.length ? 'Nenhum cadastro nesse setor ou célula.' : 'Ainda não há cadastros para mostrar.'}</div>`;
    return;
  }
  const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const novos = base.filter(r => (parseData(r.dataHora)?.getTime() ?? 0) >= limite).length;
  const idades = base.map(r => r._idade).filter((i): i is number => i != null);
  const media = idades.length ? Math.round(idades.reduce((a, b) => a + b, 0) / idades.length) : null;
  const completa = base.filter(r => r._jornada === JORNADA.length).length;
  const etapas = (base.reduce((a, r) => a + r._jornada, 0) / total).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const faixas = FAIXAS.map(([rotulo, min, max]): Coluna => {
    const n = idades.filter(i => i >= min && i <= max).length;
    return { rotulo, titulo: `${rotulo} anos: ${plural(n, 'pessoa', 'pessoas')} (${idades.length ? Math.round((n / idades.length) * 100) : 0}%)`, n };
  });
  const semIdade = total - idades.length;
  const lista = (itens: [string, number][]) => `<ol class="meters">${itens.map(([l, n]) => medidor(l, n, total)).join('')}</ol>`;
  const sim = (grupo: [string, string][]) => lista(grupo.map(([k, l]): [string, number] => [l, base.filter(r => r[k] === 'S').length]));

  $('gConteudo').innerHTML =
    `<div class="stats">${
      kpi('Novos em 30 dias', String(novos), `${Math.round((novos / total) * 100)}% dos cadastros`) +
      kpi('Idade média', media != null ? `${media}` : '—', media != null ? 'anos' : 'sem datas de nascimento') +
      kpi('Jornada completa', String(completa), `${Math.round((completa / total) * 100)}% concluíram as ${JORNADA.length} etapas`) +
      kpi('Etapas por pessoa', etapas, `em média, de ${JORNADA.length}`)
    }</div>
    <div class="panels">${proximosPassos(base) + mapaJornada(base)}</div>
    ${painelDiscipulado(base)}
    <h2 class="group-title">Quem quer servir</h2>
    <div class="panels three">${potencial(base)}</div>
    <div class="panels">${aniversarios(base) + sugestoes(base)}</div>
    <h2 class="group-title">Retrato da área</h2>
    <div class="panels">${
      painel('Novos cadastros', 'Formulários recebidos por mês, nos últimos 12 meses.', colunas(porMes(base))) +
      painel('Faixa etária', semIdade ? `Idade de ${idades.length} pessoas; ${plural(semIdade, 'cadastro', 'cadastros')} sem data válida.` : 'Idade de quem está cadastrado.', colunas(faixas)) +
      painel('Vida na igreja', 'Quem já vive cada prática.', lista(VIDA.map(([l, f]): [string, number] => [l, base.filter(f).length]))) +
      painel('Treinamentos', 'Quem já fez ou participa.', sim(TREINOS))
    }</div>`;
}

// ── Dica ao passar o mouse ou focar uma coluna ──
function mostrarDica(e: Event) {
  const alvo = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-tip]') : null;
  const tip = $('tip');
  if (!alvo) { tip.classList.add('hidden'); return; }
  tip.textContent = alvo.dataset.tip || '';
  tip.classList.remove('hidden');
  const r = alvo.getBoundingClientRect();
  const meio = Math.min(Math.max(r.left + r.width / 2, tip.offsetWidth / 2 + 8), window.innerWidth - tip.offsetWidth / 2 - 8);
  tip.style.left = `${meio}px`;
  tip.style.top = `${r.top - 8}px`;
}
['pointerover', 'focusin'].forEach(ev => $('gConteudo').addEventListener(ev, mostrarDica));
['pointerleave', 'focusout'].forEach(ev => $('gConteudo').addEventListener(ev, () => $('tip').classList.add('hidden')));
window.addEventListener('scroll', () => $('tip').classList.add('hidden'), { passive: true });
