"use strict";
// ══════ EDIÇÃO DE CADASTROS ══════
// Editar e excluir um cadastro a partir do detalhe, e sinalizar possíveis duplicados.
// O servidor confere a permissão: cada líder só altera o que enxerga.
const ERROS_EDICAO = {
    nome_invalido: 'Informe o nome completo.',
    nascimento_invalido: 'Confira a data de nascimento.',
    telefone_invalido: 'Confira o WhatsApp: DDD e número, como (85) 99999-9999.',
    nao_encontrado: 'Este cadastro não está mais disponível. Atualize a lista.',
    discipulador_invalido: 'Esse discipulador não está mais disponível. Escolha outro.',
    dados_invalidos: 'Algum campo não foi aceito. Confira e tente de novo.'
};
const registroAberto = () => estado.regs.find(r => String(r.linha) === $('det').dataset.linha);
const isoData = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
// Mesmo nome e mesma data de nascimento: provavelmente a mesma pessoa preencheu duas vezes
function marcarDuplicados() {
    const chave = (r) => `${norm(r.nome).replace(/\s+/g, ' ')}|${r.nascimento || ''}`;
    const cont = {};
    estado.regs.forEach(r => { cont[chave(r)] = (cont[chave(r)] || 0) + 1; });
    estado.regs.forEach(r => { r._dup = cont[chave(r)]; });
}
// Aviso de duplicado no Resumo. Editar fica no topo da ficha; Excluir, dentro da edição.
function acoesDetalhe(r) {
    return r._dup > 1 ? `<div class="det-aviso"><p><b>Possível duplicado.</b> Há ${r._dup} cadastros com este nome e esta data de nascimento.</p><button type="button" class="btn-link" data-acao="duplicados">Ver os ${r._dup} cadastros</button></div>` : '';
}
// ── Formulário ──
function simNao(k, label, v) {
    const op = (valor, texto) => `<label><input type="radio" name="e_${k}" value="${valor}" ${(v || '') === valor ? 'checked' : ''}><span>${texto}</span></label>`;
    return `<div class="sn" role="radiogroup" aria-label="${label}"><span class="sn-l">${label}</span><span class="sn-o">${op('S', 'Sim')}${op('N', 'Não')}${op('', '<abbr title="Sem resposta">—</abbr>')}</span></div>`;
}
const grupoSN = (id, titulo, r, itens) => `<div class="det-sec" id="${id}"><h4>${titulo}</h4><div class="sn-box">${itens.map(([k, l]) => simNao(k, l, r[k])).join('')}</div></div>`;
const campo = (id, label, corpo) => `<div class="field" id="w_${id}"><label class="label" for="${id}">${label}</label>${corpo}</div>`;
const opcoesSel = (lista, atual) => lista.map(v => `<option${v === atual ? ' selected' : ''}>${esc(v)}</option>`).join('');
function abrirEdicao(r) {
    const soltas = distintos('celula', CELULAS).filter(c => !SETOR_DA_CELULA[c]);
    const celulas = `<option value="">Sem célula</option>` +
        SETORES.map(s => `<optgroup label="Setor ${esc(s)}">${opcoesSel(CELULAS.filter(c => SETOR_DA_CELULA[c] === s && (!FECHADAS.has(c) || c === r.celula)), r.celula)}</optgroup>`).join('') +
        (soltas.length ? `<optgroup label="Outras">${opcoesSel(soltas, r.celula)}</optgroup>` : '');
    const secoes = [['edDados', 'Dados pessoais'], ['edJornada', 'Jornada'], ['edCelula', 'Célula e serviço'], ['edTreinos', 'Treinamentos'], ['edDisc', 'Discipulado']].filter(([id]) => id !== 'edJornada' || regrasLideranca.temTrilha(r));
    $('detBody').innerHTML = `<form id="eForm" class="ed-form" novalidate aria-labelledby="edTitulo">
    <p class="ct-kick" id="edTitulo">Editar cadastro</p>
    <nav class="ed-nav" aria-label="Partes do cadastro">${secoes.map(([id, l]) => `<button type="button" data-ir="${id}">${l}</button>`).join('')}</nav>
    <div class="det-sec" id="edDados"><h4>Dados pessoais</h4>
      ${campo('eNome', 'Nome completo', `<input class="input" id="eNome" autocapitalize="words" autocomplete="off" value="${esc(r.nome)}">`)}
      ${campo('eTelefone', 'WhatsApp', `<input class="input" id="eTelefone" type="tel" inputmode="tel" autocomplete="off" placeholder="(85) 99999-9999" value="${esc(fmtTel(r.telefone || ''))}">`)}
      ${campo('eNasc', 'Data de nascimento', `<input class="input" id="eNasc" type="date" min="1900-01-01" max="${isoData(new Date())}" value="${isoData(r._nasc)}">`)}
      <div class="sn-box">${simNao('recebeuJesus', 'Recebeu Jesus', r.recebeuJesus)}</div>
    </div>
    ${regrasLideranca.temTrilha(r) ? grupoSN('edJornada', 'Etapas da jornada', r, JORNADA) : ''}
    <div class="det-sec" id="edCelula"><h4>Célula e serviço</h4>
      ${regrasLideranca.ehLider(r) ? `<p class="field-hint ed-papel">${esc(regrasLideranca.rotulo(r))} · sem célula fixa</p><select class="hidden" id="eCelula"><option value="" selected></option></select>` : campo('eCelula', 'Célula', `<select class="input" id="eCelula">${celulas}</select>`)}
      ${campo('eSetor', 'Setor', `<select class="input" id="eSetor"><option value="">Sem setor</option>${opcoesSel(distintos('setor', SETORES), r.setor)}</select><p class="field-hint">Quem tem célula fica no setor dela.</p>`)}
      <div class="sn-box">${simNao('frequentaCultos', 'Congrega com frequência', r.frequentaCultos)}${simNao('serveMinisterio', 'Serve em ministério', r.serveMinisterio)}</div>
      ${campo('eMinisterio', 'Em qual ministério?', `<input class="input" id="eMinisterio" autocapitalize="sentences" value="${esc(r.ministerioNome)}">`)}
    </div>
    ${grupoSN('edTreinos', 'Treinamentos', r, TREINOS)}
    <div class="det-sec" id="edDisc"><h4>Discipulado e interesses</h4>
      ${campoDiscipulador(r)}
      <div class="sn-box">${INTERESSES.map(([k, l]) => simNao(k, l, r[k])).join('')}</div>
    </div>
    <p class="msg" id="eMsg" role="alert"></p>
    <div class="det-actions ed-pe"><button type="button" class="btn-link perigo" data-acao="excluir">Excluir cadastro</button>
      <span class="ed-pe-d"><button type="button" class="b-sec" data-acao="cancelar">Cancelar</button><button type="submit" class="b-pri" id="eSalvar">Salvar</button></span></div>
  </form>`;
    ajustarEdicao();
    $('detBody').scrollTop = 0;
    $('det').scrollTop = 0;
    $('eNome').focus();
}
// O setor só é escolhido à parte por quem não tem célula; o ministério, só por quem serve
function ajustarEdicao() {
    const f = $('eForm');
    const r = registroAberto();
    $('w_eSetor').classList.toggle('hidden', !!SETOR_DA_CELULA[$('eCelula').value] || (!!r && regrasLideranca.papel(r) === 'lider_area'));
    $('w_eMinisterio').classList.toggle('hidden', !f.querySelector('input[name="e_serveMinisterio"][value="S"]:checked'));
}
async function salvarEdicao(r) {
    const f = $('eForm');
    const celula = $('eCelula').value;
    const dados = {
        nome: $('eNome').value.trim(), nascimento: $('eNasc').value, telefone: $('eTelefone').value,
        celula, setor: SETOR_DA_CELULA[celula] || $('eSetor').value,
        ministerioNome: $('eMinisterio').value.trim(), ...lerDiscipulador(r),
        sugestao: r.sugestao || ''
    };
    f.querySelectorAll('input[type="radio"]:checked').forEach(i => { dados[i.name.slice(2)] = i.value; });
    const res = await chamarEdicao({ acao: 'registro_salvar', linha: r.linha, dados }, $('eMsg'), $('eSalvar'));
    if (!res)
        return;
    Object.assign(r, res.dados, { discipuladorId: res.discipuladorId, editadoEm: res.editadoEm, editadoPor: res.editadoPor });
    // Mesma regra do servidor: etapa marcada agora ganha a data da edição; desmarcada perde a data
    const datas = { ...(r.jornadaDatas || {}) };
    JORNADA.forEach(([k]) => { if (r[k] !== 'S')
        delete datas[k];
    else if (!datas[k])
        datas[k] = res.editadoEm; });
    r.jornadaDatas = datas;
    derivar(r);
    atualizarVinculos(r);
    atualizarPainel();
    abrirDetalhe(r);
}
async function excluirCadastro(r, botao) {
    const res = await chamarEdicao({ acao: 'registro_excluir', linha: r.linha }, $('xMsg'), botao);
    if (!res)
        return;
    estado.regs = estado.regs.filter(x => x !== r);
    atualizarVinculos(r);
    xDlg.close();
    $('det').close();
    avisoRapido(`Cadastro de ${nomeCurto(r)} excluído.`);
    atualizarPainel();
}
function atualizarPainel() {
    marcarDuplicados();
    aplicarNomesCurtos();
    montarFiltros();
    if (['duplicados', 'semVinculo', 'meusDiscipulos', 'discipulosDe'].includes(estado.situacao) && !estado.regs.some(SITUACOES[estado.situacao].f))
        Object.assign(estado, { situacao: 'todos', busca: '' });
    $('fBusca').value = estado.busca;
    renderTudo();
}
// Envia ao servidor com o botão travado; devolve null (e mostra o motivo) se não deu certo
async function chamarEdicao(payload, msg, botao) {
    const s = lerSessao();
    if (!s) {
        $('det').close();
        mostrarLogin('Sua sessão expirou. Entre novamente.');
        return null;
    }
    msg.textContent = '';
    botao.disabled = true;
    try {
        const res = await api({ ...payload, token: s.token });
        if (res.ok)
            return res;
        if (res.erro === 'sessao') {
            limparSessao();
            $('det').close();
            mostrarLogin('Sua sessão expirou. Entre novamente.');
            return null;
        }
        msg.textContent = ERROS_EDICAO[res.erro || ''] || 'Não foi possível salvar. Tente novamente.';
    }
    catch (err) {
        msg.textContent = 'Não foi possível conectar. Verifique a internet.';
    }
    finally {
        botao.disabled = false;
    }
    return null;
}
// ── Ações do detalhe ──
$('detBody').addEventListener('click', e => {
    const alvo = e.target instanceof Element ? e.target.closest('[data-acao]') : null;
    const r = registroAberto();
    if (!alvo || !r)
        return;
    const acao = alvo.dataset.acao;
    if (acao === 'editar')
        abrirEdicao(r);
    if (acao === 'cancelar')
        abrirDetalhe(r);
    if (acao === 'excluir')
        confirmarExclusao(r);
    if (acao === 'duplicados') {
        Object.assign(estado, { situacao: 'duplicados', busca: r.nome, setor: '', celula: '' });
        $('fBusca').value = r.nome;
        $('det').close();
        mostrarAba('cadastros');
        renderTudo();
        $('registrationsTitle').scrollIntoView({ block: 'start' });
    }
});
$('detBody').addEventListener('change', e => { if (e.target.closest('#eForm'))
    ajustarEdicao(); });
$('detBody').addEventListener('submit', e => {
    if (e.target.id !== 'eForm')
        return;
    e.preventDefault();
    const r = registroAberto();
    if (r)
        salvarEdicao(r);
});
// Pular para uma parte do formulário de edição
$('detBody').addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('[data-ir]') : null;
    const alvo = b ? document.getElementById(b.dataset.ir || '') : null;
    if (!alvo)
        return;
    alvo.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    alvo.querySelector('input, select')?.focus({ preventScroll: true });
});
// ── Confirmação de exclusão: diálogo próprio, com o que se perde ──
const xDlg = document.createElement('dialog');
xDlg.className = 'x-dlg';
xDlg.setAttribute('role', 'alertdialog');
xDlg.setAttribute('aria-labelledby', 'xTitulo');
xDlg.setAttribute('aria-describedby', 'xTexto');
xDlg.innerHTML = `<div class="x-corpo"><span class="x-ic" aria-hidden="true">!</span><h3 id="xTitulo"></h3>
  <p id="xTexto">Ele sai do painel, dos indicadores e do mapa. A foto, o endereço e a confirmação de anfitrião são apagados de vez.</p>
  <ul class="x-lista" id="xLista"></ul><p class="msg" id="xMsg" role="alert"></p>
  <div class="x-acoes"><button type="button" class="b-sec" data-x="cancelar">Cancelar</button><button type="button" class="b-perigo" data-x="confirmar">Excluir cadastro</button></div></div>`;
document.body.appendChild(xDlg);
let excluindo = null;
function confirmarExclusao(r) {
    excluindo = r;
    const nome = nomeCurto(r);
    $('xTitulo').textContent = `Excluir o cadastro de ${nome}?`;
    const notas = registroAberto() === r ? ultimaLista.length : 0;
    const discipulos = estado.regs.filter(x => x.discipuladorId === r.linha).length;
    $('xLista').innerHTML = regrasPessoas.consequencias(nome, notas, discipulos).map(t => `<li>${esc(t)}</li>`).join('');
    $('xMsg').textContent = '';
    xDlg.showModal();
    xDlg.querySelector('[data-x="cancelar"]')?.focus();
}
xDlg.addEventListener('click', e => {
    const b = e.target instanceof Element ? e.target.closest('[data-x]') : null;
    if (e.target === xDlg || b?.dataset.x === 'cancelar') {
        xDlg.close();
        return;
    }
    if (b?.dataset.x === 'confirmar' && excluindo)
        excluirCadastro(excluindo, b);
});
