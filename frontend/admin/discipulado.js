"use strict";
// ══════ DISCIPULADO ══════
// Liga cada pessoa ao cadastro do seu discipulador e cada login ao cadastro de quem entra.
// Assim o discipulador vê os seus discípulos e o que falta na jornada de cada um.
const rotuloPessoa = (p) => nomeCurtoId(p.id, p.nome) + (p.celula ? ` · ${p.celula}` : '');
// Discipuladores (Spec 013): a liderança no topo, com o papel; depois os membros com a célula
const opcaoPessoa = (p, atual, rotulo) => `<option value="${p.id}"${p.id === atual ? ' selected' : ''}>${esc(rotulo)}</option>`;
function opcoesPessoas(lista, atual) {
    const { lideranca, membros } = regrasLideranca.ordemDiscipuladores(lista);
    if (!lideranca.length)
        return membros.map(p => opcaoPessoa(p, atual, rotuloPessoa(p))).join('');
    return `<optgroup label="Liderança">${lideranca.map(p => opcaoPessoa(p, atual, `${nomeCurtoId(p.id, p.nome)} · ${regrasLideranca.rotulo(p)}`)).join('')}</optgroup>` +
        `<optgroup label="Membros">${membros.map(p => opcaoPessoa(p, atual, rotuloPessoa(p))).join('')}</optgroup>`;
}
// Etapas da jornada que a pessoa ainda não concluiu
function faltam(r) {
    const f = JORNADA.filter(([k]) => r[k] !== 'S').map(([, etapa]) => etapa);
    return f.length ? `<span class="falta"><b>Falta:</b> ${f.join(', ')}</span>` : '<span class="falta"><b>Jornada completa.</b></span>';
}
const semVinculo = (r) => r.discipulador && !r.discipuladorId ? ' <em class="tag">sem vínculo</em>' : '';
// Cadastros cujo nome contém tudo o que a pessoa digitou no formulário
function sugestoesDe(texto, lista) {
    const partes = norm(texto).split(/\s+/).filter(p => p.length > 2);
    return partes.length ? lista.filter(p => partes.every(parte => norm(p.nome).includes(parte))).slice(0, 3) : [];
}
// Campo do formulário de edição: escolhe o discipulador entre os cadastros da área
function campoDiscipulador(r) {
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
function lerDiscipulador(r) {
    const v = $('eDiscipulador').value;
    return v === 'texto' ? { discipulador: String(r.discipulador || ''), discipuladorId: 0 } : { discipulador: '', discipuladorId: Number(v) || 0 };
}
// Mantém a lista de pessoas e os discípulos em dia depois de editar (r) ou excluir (r ausente da lista)
function atualizarVinculos(r) {
    const existe = estado.regs.includes(r);
    estado.pessoas = estado.pessoas.filter(p => p.id !== r.linha);
    if (existe)
        estado.pessoas.push({ id: r.linha, nome: r.nome, celula: r.celula || '', papel: regrasLideranca.papel(r), setor: String(r.setor || '') });
    estado.pessoas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    estado.regs.forEach(x => {
        if (x.discipuladorId !== r.linha)
            return;
        if (existe)
            x.discipulador = r.nome;
        else
            x.discipuladorId = 0;
        derivar(x);
    });
}
// Situações que só fazem sentido em certos casos: a de um discipulador escolhido nos
// Indicadores e a dos próprios discípulos
const situacaoVisivel = (k) => k === 'discipulosDe' ? estado.situacao === k : k !== 'meusDiscipulos' || (!!estado.meuCadastro && estado.escopo.perfil !== 'DISCIPULADOR');
const rotuloSituacao = (k, label) => k === 'discipulosDe' ? `Discípulos de ${nomeCurtoId(estado.discipuladorDe, estado.pessoas.find(p => p.id === estado.discipuladorDe)?.nome || '…')}` : label;
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
    const b = e.target instanceof Element ? e.target.closest('[data-vincular]') : null;
    if (b)
        $('eDiscipulador').value = b.dataset.vincular || '';
});
// ── Indicadores de discipulado ──
const MUITOS_DISCIPULOS = 12; // acima disso o discipulador aparece marcado como sobrecarregado
const discipula = (r) => estado.regs.some(x => x.discipuladorId === r.linha);
// Discipuladores e cobertura num cartão só, em duas colunas quando há espaço
function painelDiscipulado(base, resumoGrupo) {
    const cont = {};
    base.forEach(r => { if (r.discipuladorId)
        cont[r.discipuladorId] = (cont[r.discipuladorId] || 0) + 1; });
    const nomeDe = (id) => estado.pessoas.find(p => p.id === id)?.nome || 'Cadastro removido';
    const ids = Object.keys(cont).map(Number).sort((a, b) => cont[b] - cont[a] || nomeDe(a).localeCompare(nomeDe(b), 'pt-BR'));
    const vinculados = base.filter(r => r.discipuladorId).length;
    const max = Math.max(1, ...Object.values(cont));
    const linhas = ids.map(id => {
        const n = cont[id];
        const dica = `${nomeDe(id)}: ${plural(n, 'discípulo', 'discípulos')}`;
        return `<button type="button" class="cell-row" data-disc="${id}" data-tip="${esc(dica)}" aria-label="${esc(dica)}">
      <span class="cell-name com-av">${avatarDe(id, nomeDe(id), 'av-s')}<span title="${esc(regrasNomes.completo(nomeDe(id)))}">${esc(nomeCurtoId(id, nomeDe(id)))}</span>${n > MUITOS_DISCIPULOS ? ` <em class="tag">mais de ${MUITOS_DISCIPULOS}</em>` : ''}</span>
      <span class="cell-bar"><i data-w="${(n / max) * 100}"></i></span><span class="cell-n">${n}</span></button>`;
    }).join('');
    const resumo = ids.length ? `${plural(ids.length, 'discipulador acompanha', 'discipuladores acompanham')} ${plural(vinculados, 'pessoa', 'pessoas')}; ${base.length - vinculados} sem vínculo.` : 'Nenhum discipulador vinculado ainda.';
    const celulas = distintos('celula', CELULAS).filter(c => base.some(r => r.celula === c));
    const cobertura = celulas.map(c => { const rs = base.filter(r => r.celula === c); return medidor(esc(c), rs.filter(r => r.discipuladorId).length, rs.length); }).join('');
    const prontos = base.filter(SITUACOES.podeDiscipular.f).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const todos = prontos.length > 6 ? `<button type="button" class="btn-link" data-sit="podeDiscipular">Ver todas as ${prontos.length} pessoas</button>` : '';
    const duo = `<section class="panel duo-panel"><header class="panel-head"><h2>Discipuladores</h2><p>${resumo}</p></header><div class="duo">
    <div><h3 class="mini">Quem discipula</h3>${linhas ? `<div class="cells rolar">${linhas}</div>` : '<p class="vazio">Vincule os discipuladores ao editar os cadastros.</p>'}</div>
    <div><h3 class="mini">Cobertura por célula</h3>${cobertura ? `<ol class="meters">${cobertura}</ol>` : '<p class="vazio">A cobertura aparece quando houver cadastros ligados a uma célula.</p>'}</div></div></section>`;
    return grupo('disc', 'Discipulado', resumoGrupo, duo +
        painel('Prontos para discipular', prontos.length ? `${plural(prontos.length, 'pessoa fez', 'pessoas fizeram')} o Expresso 01 e ainda não ${prontos.length === 1 ? 'discipula' : 'discipulam'} ninguém.` : 'Quem fez o Expresso 01 e ainda não discipula.', prontos.length ? `<ul class="pessoas">${prontos.slice(0, 6).map(r => pessoa(r, esc(r.celula || 'Sem célula'))).join('')}</ul>${todos}` : '<p class="vazio">Ninguém nessa situação agora.</p>'), 'disc');
}
// Um toque num discipulador leva à lista de quem ele acompanha
$('aConteudo').addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('[data-disc]') : null;
    if (!b)
        return;
    Object.assign(estado, { situacao: 'discipulosDe', discipuladorDe: Number(b.dataset.disc) });
    $('tip').classList.add('hidden');
    mostrarAba('cadastros');
    montarFiltros();
    renderTudo();
    $('registrationsTitle').scrollIntoView({ block: 'start' });
});
// ══════ MEUS DISCÍPULOS (Spec 009) ══════
// O servidor limita a lista aos próprios discípulos.
const soDiscipulador = () => estado.escopo.perfil === 'DISCIPULADOR';
function renderDiscipulos() {
    if (!soDiscipulador())
        return;
    const lista = [...estado.regs].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const etapas = estado.regs.reduce((s, r) => s + r._jornada, 0);
    const primeiro = curtoNome(String(estado.nomeUsuario || ''));
    const cartao = (r) => {
        const prox = regrasPessoas.proximoPasso(JORNADA, k => r[k] === 'S');
        return `<article class="dc" data-cor="${r.celula ? corDaCelula(String(r.celula)) : regrasCelula.SEM_COR}">
      ${avatar(r, 'av-g')}
      <h2><button type="button" class="dc-nome" data-reg="${estado.regs.indexOf(r)}" title="${esc(regrasNomes.completo(r.nome))}">${esc(nomeCurto(r))}</button></h2>
      <p class="dc-cel">${celulaOuPapel(r)}</p>
      <span class="dc-jor" role="img" aria-label="${r._jornada} de ${JORNADA.length} etapas da jornada">${JORNADA.map(([k]) => `<i class="${r[k] === 'S' ? 'on' : ''}"></i>`).join('')}</span>
      <p class="dc-prox">${prox ? `Próximo passo: <b>${esc(prox)}</b>` : '<b>Jornada completa</b>'}</p>
      <div class="dc-acoes">${r.telefone ? `<a class="b-zap" href="${regrasArea.whatsapp(String(r.telefone))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div>
    </article>`;
    };
    $('discView').innerHTML = `<section class="dc-hero" aria-labelledby="dcTitulo">
      <div><p class="ct-kick">Olá${primeiro ? `, ${esc(primeiro)}` : ''}</p>
      <h1 id="dcTitulo">${lista.length ? `Você discipula ${plural(lista.length, 'pessoa', 'pessoas')}.` : 'Ainda não há discípulos ligados a você.'}</h1>
      ${lista.length ? '' : '<p>Peça à liderança da sua célula para ligar os seus discípulos ao seu cadastro.</p>'}</div>
      ${lista.length ? `<dl class="dc-num"><div><dt>etapas concluídas juntos</dt><dd>${etapas}</dd></div></dl>` : ''}
    </section>
    ${lista.length ? `<div class="dc-grade">${lista.map(cartao).join('')}</div>` : ''}`;
}
$('discView').addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('[data-reg]') : null;
    const r = b ? estado.regs[Number(b.dataset.reg)] : undefined;
    if (r)
        abrirDetalhe(r);
});
