// ══════ DISCIPULADO ══════
// Liga cada pessoa ao cadastro do seu discipulador e cada login ao cadastro de quem entra.
// Assim o discipulador vê os seus discípulos e o que falta na jornada de cada um.

const rotuloPessoa = (p: Pessoa): string => p.nome + (p.celula ? ` · ${p.celula}` : '');
const opcoesPessoas = (lista: Pessoa[], atual: number): string => lista.map(p => `<option value="${p.id}"${p.id === atual ? ' selected' : ''}>${esc(rotuloPessoa(p))}</option>`).join('');

// Etapas da jornada que a pessoa ainda não concluiu
function faltam(r: Registro): string {
  const f = JORNADA.filter(([k]) => r[k] !== 'S').map(([, etapa]) => etapa);
  return f.length ? `<span class="falta"><b>Falta:</b> ${f.join(', ')}</span>` : '<span class="falta"><b>Jornada completa.</b></span>';
}
const semVinculo = (r: Registro): string => r.discipulador && !r.discipuladorId ? ' <em class="tag">sem vínculo</em>' : '';

// Cadastros cujo nome contém tudo o que a pessoa digitou no formulário
function sugestoesDe(texto: string, lista: Pessoa[]): Pessoa[] {
  const partes = norm(texto).split(/\s+/).filter(p => p.length > 2);
  return partes.length ? lista.filter(p => partes.every(parte => norm(p.nome).includes(parte))).slice(0, 3) : [];
}

// Campo do formulário de edição: escolhe o discipulador entre os cadastros da área
function campoDiscipulador(r: Registro): string {
  const outros = estado.pessoas.filter(p => p.id !== r.linha);
  const solto = !!r.discipulador && !r.discipuladorId;
  const sug = solto ? sugestoesDe(String(r.discipulador), outros) : [];
  return `<div class="field"><label class="label" for="eDiscipulador">Discipulador</label>
    <select class="input" id="eDiscipulador"><option value="">Sem discipulador</option>
      ${solto ? `<option value="texto" selected>“${esc(r.discipulador)}” (digitado no formulário, sem vínculo)</option>` : ''}
      ${opcoesPessoas(outros, r.discipuladorId || 0)}</select>
    ${sug.length ? `<p class="field-hint sug-vinculo">É esta pessoa? ${sug.map(p => `<button type="button" class="btn-sec" data-vincular="${p.id}">${esc(rotuloPessoa(p))}</button>`).join('')}</p>` : ''}
    <p class="field-hint">Escolha o cadastro do discipulador: é assim que ele passa a ver esta pessoa no painel. Se ele não está na lista, peça para preencher o formulário.</p></div>`;
}

// O que o campo acima manda ao servidor
function lerDiscipulador(r: Registro): { discipulador: string; discipuladorId: number } {
  const v = $<HTMLSelectElement>('eDiscipulador').value;
  return v === 'texto' ? { discipulador: String(r.discipulador || ''), discipuladorId: 0 } : { discipulador: '', discipuladorId: Number(v) || 0 };
}

// Mantém a lista de pessoas e os discípulos em dia depois de editar (r) ou excluir (r ausente da lista)
function atualizarVinculos(r: Registro) {
  const existe = estado.regs.includes(r);
  estado.pessoas = estado.pessoas.filter(p => p.id !== r.linha);
  if (existe) estado.pessoas.push({ id: r.linha, nome: r.nome, celula: r.celula || '' });
  estado.pessoas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  estado.regs.forEach(x => {
    if (x.discipuladorId !== r.linha) return;
    if (existe) x.discipulador = r.nome; else x.discipuladorId = 0;
    derivar(x);
  });
}

// Situações que só fazem sentido em certos casos: a de um discipulador escolhido nos
// Indicadores e a dos próprios discípulos
const situacaoVisivel = (k: string): boolean =>
  k === 'discipulosDe' ? estado.situacao === k : k !== 'meusDiscipulos' || (!!estado.meuCadastro && estado.escopo.perfil !== 'DISCIPULADOR');
const rotuloSituacao = (k: string, label: string): string =>
  k === 'discipulosDe' ? `Discípulos de ${curto(estado.pessoas.find(p => p.id === estado.discipuladorDe)?.nome || '…')}` : label;

// Atalho na lista para quem lidera e também discipula
function renderMeus() {
  const n = estado.regs.filter(SITUACOES.meusDiscipulos.f).length;
  const b = $('btnMeus');
  b.classList.toggle('hidden', !n || n === estado.regs.length);
  b.textContent = estado.situacao === 'meusDiscipulos' ? 'Ver todos os cadastros' : `Meus discípulos (${n})`;
}
$('btnMeus').addEventListener('click', () => {
  estado.situacao = estado.situacao === 'meusDiscipulos' ? 'todos' : 'meusDiscipulos';
  renderTudo();
});
$('detBody').addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-vincular]') : null;
  if (b) $<HTMLSelectElement>('eDiscipulador').value = b.dataset.vincular || '';
});

// ── Indicadores de discipulado ──
const MUITOS_DISCIPULOS = 12; // acima disso o discipulador aparece marcado como sobrecarregado
const discipula = (r: Registro): boolean => estado.regs.some(x => x.discipuladorId === r.linha);

// Discipuladores e cobertura num cartão só, em duas colunas quando há espaço
function painelDiscipulado(base: Registro[], resumoGrupo: string): string {
  const cont: Record<number, number> = {};
  base.forEach(r => { if (r.discipuladorId) cont[r.discipuladorId] = (cont[r.discipuladorId] || 0) + 1; });
  const nomeDe = (id: number): string => estado.pessoas.find(p => p.id === id)?.nome || 'Cadastro removido';
  const ids = Object.keys(cont).map(Number).sort((a, b) => cont[b] - cont[a] || nomeDe(a).localeCompare(nomeDe(b), 'pt-BR'));
  const vinculados = base.filter(r => r.discipuladorId).length;
  const max = Math.max(1, ...Object.values(cont));
  const linhas = ids.map(id => {
    const n = cont[id];
    const dica = `${nomeDe(id)}: ${plural(n, 'discípulo', 'discípulos')}`;
    return `<button type="button" class="cell-row" data-disc="${id}" data-tip="${esc(dica)}" aria-label="${esc(dica)}">
      <span class="cell-name">${esc(curto(nomeDe(id)))}${n > MUITOS_DISCIPULOS ? ` <em class="tag">mais de ${MUITOS_DISCIPULOS}</em>` : ''}</span>
      <span class="cell-bar"><i style="width:${(n / max) * 100}%"></i></span><span class="cell-n">${n}</span></button>`;
  }).join('');
  const resumo = ids.length ? `${plural(ids.length, 'discipulador acompanha', 'discipuladores acompanham')} ${plural(vinculados, 'pessoa', 'pessoas')}; ${base.length - vinculados} sem vínculo.` : 'Nenhum discipulador vinculado ainda.';

  const celulas = distintos('celula', CELULAS).filter(c => base.some(r => r.celula === c));
  const cobertura = celulas.map(c => { const rs = base.filter(r => r.celula === c); return medidor(esc(c), rs.filter(r => r.discipuladorId).length, rs.length); }).join('');

  const prontos = base.filter(SITUACOES.podeDiscipular.f).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const todos = prontos.length > 6 ? `<button type="button" class="btn-link" data-sit="podeDiscipular">Ver todas as ${prontos.length} pessoas</button>` : '';

  const duo = `<section class="panel duo-panel"><header class="panel-head"><h2>Discipuladores</h2><p>${resumo}</p></header><div class="duo">
    <div><h3 class="mini">Quem discipula</h3>${linhas ? `<div class="cells rolar">${linhas}</div>` : '<p class="vazio">Vincule os discipuladores ao editar os cadastros.</p>'}</div>
    <div><h3 class="mini">Cobertura por célula</h3>${cobertura ? `<ol class="meters">${cobertura}</ol>` : '<p class="vazio">Nenhum cadastro com célula.</p>'}</div></div></section>`;
  return grupo('disc', 'Discipulado', resumoGrupo, duo +
    painel('Prontos para discipular', prontos.length ? `${plural(prontos.length, 'pessoa fez', 'pessoas fizeram')} o Expresso 01 e ainda não ${prontos.length === 1 ? 'discipula' : 'discipulam'} ninguém.` : 'Quem fez o Expresso 01 e ainda não discipula.', prontos.length ? `<ul class="pessoas">${prontos.slice(0, 6).map(r => pessoa(r, esc(r.celula || 'Sem célula'))).join('')}</ul>${todos}` : '<p class="vazio">Ninguém por aqui.</p>'), 'disc');
}

// Um toque num discipulador leva à lista de quem ele acompanha
$('aConteudo').addEventListener('click', e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-disc]') : null;
  if (!b) return;
  Object.assign(estado, { situacao: 'discipulosDe', discipuladorDe: Number(b.dataset.disc) });
  $('tip').classList.add('hidden');
  mostrarAba('cadastros');
  montarFiltros();
  renderTudo();
  $('registrationsTitle').scrollIntoView({ block: 'start' });
});
