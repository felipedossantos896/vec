"use strict";
// ══════ ENDEREÇO NA FICHA (Spec 002) ══════
// Carregado sob demanda ao abrir a pessoa (não vem na lista), só para quem tem a
// pessoa no escopo. Para salvar, é preciso marcar a autorização da pessoa a cada vez.
const TEXTO_CONSENTIMENTO = 'A pessoa autorizou o uso do endereço para organização das células e pode pedir a remoção a qualquer momento.';
const ERROS_ENDERECO = {
    cep_invalido: 'Confira o CEP: são 8 dígitos.',
    uf_invalida: 'Escolha a UF.',
    endereco_incompleto: 'Preencha rua, número, bairro e cidade.',
    consentimento_endereco: 'Marque a autorização da pessoa para salvar o endereço.',
    nao_encontrado: 'Este cadastro não está mais disponível. Atualize a lista.',
    dados_invalidos: 'Algum campo não foi aceito. Confira e tente de novo.'
};
const CAMPOS_ENDERECO = [
    ['cep', 'CEP', 'postal-code'], ['logradouro', 'Rua', 'address-line1'], ['numero', 'Número', 'off'],
    ['complemento', 'Complemento (opcional)', 'address-line2'], ['bairro', 'Bairro', 'address-level3'],
    ['cidade', 'Cidade', 'address-level2'], ['uf', 'UF', 'address-level1']
];
let enderecoAtual = null;
const blocoEndereco = () => `<div class="det-sec" id="endSec"><h4>Endereço</h4><div id="endCorpo"><p class="nota-fraca">Carregando endereço…</p></div><p class="msg" id="endMsg" role="alert"></p></div>`;
function renderEndereco() {
    const e = enderecoAtual;
    $('endCorpo').innerHTML = e
        ? `<address class="end-linhas">${regrasEndereco.linhas(e).map(l => `<span>${esc(l)}</span>`).join('')}</address>
      <p class="field-hint">Autorizado em ${soData(e.consentimentoEm)} por ${esc(e.consentimentoPor)}. Atualizado em ${soData(e.atualizadoEm)} por ${esc(e.atualizadoPor)}.</p>
      <div class="end-acoes"><button type="button" class="btn-sec" data-end="editar">Editar endereço</button><button type="button" class="btn-link perigo" data-end="remover">Remover endereço</button></div>`
        : `<p class="nota-fraca">Sem endereço cadastrado.</p>
      <div class="end-acoes"><button type="button" class="btn-sec" data-end="editar">Cadastrar endereço</button></div>`;
}
function formEndereco() {
    const e = enderecoAtual || { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };
    const campoEnd = ([k, label, auto]) => {
        const id = `end_${k}`;
        const attrs = `id="${id}" name="${k}" autocomplete="${auto}" aria-describedby="${id}_erro"`;
        const corpo = k === 'uf'
            ? `<select class="input" ${attrs}><option value="">—</option>${regrasEndereco.UFS.map(u => `<option${u === e.uf ? ' selected' : ''}>${u}</option>`).join('')}</select>`
            : `<input class="input" ${attrs}${k === 'cep' ? ' inputmode="numeric" placeholder="00000-000"' : ''}${regrasEndereco.MAX[k] ? ` maxlength="${regrasEndereco.MAX[k]}"` : ''} value="${esc(k === 'cep' ? regrasEndereco.fmtCep(e.cep) : e[k])}">`;
        return `<div class="field end-${k}"><label class="label" for="${id}">${label}</label>${corpo}<p class="msg" id="${id}_erro"></p></div>`;
    };
    $('endCorpo').innerHTML = `<form id="endForm" class="end-form" novalidate>
    <div class="end-grid">${CAMPOS_ENDERECO.map(campoEnd).join('')}</div>
    <div class="field"><label class="end-consent"><input type="checkbox" id="end_consentimento" aria-describedby="end_consentimento_erro"><span>${TEXTO_CONSENTIMENTO}</span></label><p class="msg" id="end_consentimento_erro"></p></div>
    <div class="end-acoes"><button type="submit" class="btn-sec solid" id="endSalvar">Salvar endereço</button><button type="button" class="btn-link" data-end="cancelar">Cancelar</button></div>
  </form>`;
    $('end_cep').focus();
}
function lerFormEndereco() {
    const v = (k) => $(`end_${k}`).value;
    return { cep: v('cep'), logradouro: v('logradouro'), numero: v('numero'), complemento: v('complemento'), bairro: v('bairro'), cidade: v('cidade'), uf: v('uf') };
}
// Marca cada campo com erro e foca o primeiro; devolve se está tudo certo.
function mostrarErrosEndereco(erros) {
    let primeiro = null;
    for (const k of [...CAMPOS_ENDERECO.map(([c]) => c), 'consentimento']) {
        const campo = $(`end_${k}`);
        campo.setAttribute('aria-invalid', String(Boolean(erros[k])));
        campo.closest('.field')?.classList.toggle('invalid', Boolean(erros[k]));
        $(`end_${k}_erro`).textContent = erros[k] || '';
        if (erros[k] && !primeiro)
            primeiro = campo;
    }
    if (primeiro)
        primeiro.focus();
    return !primeiro;
}
// Chama o servidor; só atualiza a tela se a ficha ainda é desta pessoa.
async function chamarEndereco(r, payload, botao) {
    const s = lerSessao();
    if (!s) {
        $('det').close();
        mostrarLogin('Sua sessão expirou. Entre novamente.');
        return null;
    }
    if (botao)
        botao.disabled = true;
    try {
        const res = await api({ ...payload, linha: r.linha, token: s.token });
        if (registroAberto() !== r || !document.getElementById('endCorpo'))
            return null;
        if (!res.ok && res.erro === 'sessao') {
            limparSessao();
            $('det').close();
            mostrarLogin('Sua sessão expirou. Entre novamente.');
            return null;
        }
        if (!res.ok)
            $('endMsg').textContent = ERROS_ENDERECO[res.erro || ''] || 'Não foi possível concluir. Atualize o painel e tente de novo.';
        return res;
    }
    catch (err) {
        if (document.getElementById('endMsg'))
            $('endMsg').textContent = 'Não foi possível conectar. Verifique a internet.';
        return null;
    }
    finally {
        if (botao)
            botao.disabled = false;
    }
}
async function carregarEnderecoDe(r) {
    enderecoAtual = null;
    const res = await chamarEndereco(r, { acao: 'endereco_ler' });
    if (!res)
        return;
    if (!res.ok) {
        $('endCorpo').innerHTML = '<p class="nota-fraca">Endereço indisponível.</p>';
        return;
    }
    enderecoAtual = res.endereco || null;
    renderEndereco();
}
$('detBody').addEventListener('submit', async (e) => {
    if (e.target.id !== 'endForm')
        return;
    e.preventDefault();
    const r = registroAberto();
    if (!r)
        return;
    $('endMsg').textContent = '';
    const form = lerFormEndereco();
    const consentimento = $('end_consentimento').checked;
    if (!mostrarErrosEndereco(regrasEndereco.validar(form, consentimento)))
        return;
    const res = await chamarEndereco(r, { acao: 'endereco_salvar', endereco: form, consentimento }, $('endSalvar'));
    if (!res?.ok)
        return;
    enderecoAtual = res.endereco || null;
    renderEndereco();
    $('endMsg').textContent = '';
    $('endCorpo').querySelector('[data-end="editar"]')?.focus();
});
$('detBody').addEventListener('click', async (e) => {
    const b = e.target instanceof Element ? e.target.closest('[data-end]') : null;
    const r = registroAberto();
    if (!b || !r)
        return;
    $('endMsg').textContent = '';
    if (b.dataset.end === 'editar')
        formEndereco();
    else if (b.dataset.end === 'cancelar') {
        renderEndereco();
        $('endCorpo').querySelector('[data-end="editar"]')?.focus();
    }
    else if (b.dataset.end === 'remover') {
        if (!confirm(`Remover o endereço de ${curto(r.nome)}? Ele é apagado de vez.`))
            return;
        const res = await chamarEndereco(r, { acao: 'endereco_excluir' }, b);
        if (!res?.ok)
            return;
        enderecoAtual = null;
        renderEndereco();
        $('endCorpo').querySelector('[data-end="editar"]')?.focus();
    }
});
