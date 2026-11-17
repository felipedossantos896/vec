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
