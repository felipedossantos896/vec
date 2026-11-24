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
    consentimento_ponto: 'Confirme a autorização específica para mostrar a posição exata.',
    ponto_invalido: 'Escolha um ponto válido no mapa.',
    nao_encontrado: 'Este cadastro não está mais disponível. Atualize a lista.',
    dados_invalidos: 'Algum campo não foi aceito. Confira e tente de novo.'
};
const CAMPOS_ENDERECO = [
    ['cep', 'CEP', 'postal-code'], ['logradouro', 'Rua', 'address-line1'], ['numero', 'Número', 'off'],
    ['complemento', 'Complemento (opcional)', 'address-line2'], ['bairro', 'Bairro', 'address-level3'],
    ['cidade', 'Cidade', 'address-level2'], ['uf', 'UF', 'address-level1']
];
let enderecoAtual = null;
let editorPonto = null;
let pinoEndereco = null;
let pontoRascunho = null;
function limparEditorPonto() {
    editorPonto?.remove();
    editorPonto = pinoEndereco = pontoRascunho = null;
}
function marcarPontoEndereco(p) {
    pontoRascunho = { lat: Math.round(p.lat * 1e6) / 1e6, lng: Math.round(p.lng * 1e6) / 1e6 };
    pinoEndereco.setLatLng(pontoRascunho);
    $('endPontoEstado').textContent = 'Ponto escolhido. Salve o endereço para confirmar.';
}
function iniciarEditorPonto() {
    const el = document.getElementById('endMapa');
    if (!el || editorPonto || typeof L === 'undefined')
        return;
    const atual = enderecoAtual?.ponto;
    const centro = atual || { lat: -3.73, lng: -38.53 };
    editorPonto = L.map(el, { maxZoom: ZOOM_MAX, keyboard: false }).setView(centro, atual ? 16 : 12);
    L.tileLayer(TILES_OSM, { maxZoom: ZOOM_TILES, detectRetina: true, attribution: ATRIBUICAO_OSM }).addTo(editorPonto);
    editorPonto.attributionControl.setPrefix(false);
    pinoEndereco = L.marker(centro, {
        draggable: true, keyboard: false,
        icon: L.divIcon({ className: 'end-pino', html: '<span class="rp-alfinete"></span>', iconSize: [24, 24], iconAnchor: [12, 24] })
    }).addTo(editorPonto);
    editorPonto.on('click', (e) => marcarPontoEndereco(e.latlng.wrap()));
    pinoEndereco.on('dragend', () => marcarPontoEndereco(pinoEndereco.getLatLng().wrap()));
    el.addEventListener('keydown', e => {
        if (e.target !== el)
            return;
        const deslocamentos = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
        const d = deslocamentos[e.key];
        if (!d)
            return;
        e.preventDefault();
        const xy = editorPonto.latLngToContainerPoint(pinoEndereco.getLatLng());
        marcarPontoEndereco(editorPonto.containerPointToLatLng(xy.add(d)).wrap());
        editorPonto.panInside(pinoEndereco.getLatLng());
    });
}
const blocoEndereco = () => `<div class="det-sec" id="endSec"><h4>Endereço</h4><div id="endCorpo"><p class="nota-fraca">Carregando endereço…</p></div><p class="msg" id="endMsg" role="alert"></p></div>`;
function renderEndereco() {
    limparEditorPonto();
    const e = enderecoAtual;
    $('endCorpo').innerHTML = e
        ? `<address class="end-linhas">${regrasEndereco.linhas(e).map(l => `<span>${esc(l)}</span>`).join('')}</address>
      <p class="field-hint">Autorizado em ${soData(e.consentimentoEm)} por ${esc(e.consentimentoPor)}. Atualizado em ${soData(e.atualizadoEm)} por ${esc(e.atualizadoPor)}.</p>
      <div class="end-acoes"><button type="button" class="btn-sec" data-end="editar">Editar endereço</button><button type="button" class="btn-link perigo" data-end="remover">Remover endereço</button></div>`
        : `<p class="nota-fraca">Sem endereço cadastrado.</p>
      <div class="end-acoes"><button type="button" class="btn-sec" data-end="editar">Cadastrar endereço</button></div>`;
}
function formEndereco() {
    limparEditorPonto();
    const e = enderecoAtual || { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };
    const campoEnd = ([k, label, auto]) => {
        const id = `end_${k}`;
        const attrs = `id="${id}" name="${k}" autocomplete="${auto}" aria-describedby="${id}_erro"`;
        const corpo = k === 'uf'
            ? `<select class="input" ${attrs}><option value="">—</option>${regrasEndereco.UFS.map(u => `<option${u === e.uf ? ' selected' : ''}>${u}</option>`).join('')}</select>`
            : `<input class="input" ${attrs}${k === 'cep' ? ' inputmode="numeric" placeholder="00000-000"' : ''}${regrasEndereco.MAX[k] ? ` maxlength="${regrasEndereco.MAX[k]}"` : ''} value="${esc(k === 'cep' ? regrasEndereco.fmtCep(e.cep) : e[k])}">`;
        const busca = k === 'cep' ? '<p class="field-hint" id="end_cep_busca" aria-live="polite"></p>' : '';
        return `<div class="field end-${k}"><label class="label" for="${id}">${label}</label>${corpo}${busca}<p class="msg" id="${id}_erro"></p></div>`;
    };
    cepBuscado = regrasEndereco.soDigitosCep(e.cep); // não rebusca o CEP já salvo ao abrir
    $('endCorpo').innerHTML = `<form id="endForm" class="end-form" novalidate>
    <div class="end-grid">${CAMPOS_ENDERECO.map(campoEnd).join('')}</div>
    <fieldset class="field">
      <legend>Localização no mapa</legend>
      <p class="field-hint" id="endMapaAjuda">Arraste o alfinete, toque no mapa ou use as setas com o mapa em foco. Para usar o ponto atual sem mover, selecione o botão abaixo.</p>
      <div id="endMapa" class="end-mapa" tabindex="0" role="region" aria-label="Ajustar localização" aria-describedby="endMapaAjuda"></div>
      <button type="button" class="btn-link" data-end="usar-ponto">Usar posição do alfinete</button>
      <p class="field-hint" id="endPontoEstado" role="status">${enderecoAtual?.ponto?.exato ? 'Ponto confirmado.' : enderecoAtual?.ponto ? 'Ponto inicial aproximado. Confira antes de confirmar.' : 'Sem ponto calculado. Navegue até o endereço ou salve primeiro para localizar automaticamente.'}</p>
      <label class="end-consent"><input type="checkbox" id="end_ponto_consentimento"><span>A pessoa autorizou mostrar a localização exata no editor e no mapa da Área para quem pode editar o endereço.</span></label>
      ${enderecoAtual?.ponto?.exato ? '<label class="end-consent"><input type="checkbox" id="end_revogar_ponto"><span>Retirar a localização exata e voltar à aproximação.</span></label>' : ''}
    </fieldset>
    <div class="field"><label class="end-consent"><input type="checkbox" id="end_consentimento" aria-describedby="end_consentimento_erro"><span>${TEXTO_CONSENTIMENTO}</span></label><p class="msg" id="end_consentimento_erro"></p></div>
    <div class="end-acoes"><button type="submit" class="btn-sec solid" id="endSalvar">Salvar endereço</button><button type="button" class="btn-link" data-end="cancelar">Cancelar</button></div>
  </form>`;
    iniciarEditorPonto();
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
        if (lerSessao()?.token !== s.token || registroAberto() !== r || !$('det').open || !document.getElementById('endCorpo'))
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
    limparEditorPonto();
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
// ── Busca pelo CEP (T005) ──
// Preenche rua, bairro, cidade e UF; falha ou demora nunca impede o preenchimento manual.
let cepBuscado = '';
async function buscarCep(cep) {
    const url = regrasEndereco.urlViaCep(cep);
    const aviso = document.getElementById('end_cep_busca');
    if (!url || !aviso || cep === cepBuscado)
        return;
    cepBuscado = cep;
    aviso.textContent = 'Buscando endereço do CEP…';
    const pararEm = new AbortController();
    const prazo = setTimeout(() => pararEm.abort(), 5000);
    try {
        const res = await fetch(url, { signal: pararEm.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
        const json = res.ok ? await res.json() : null;
        if (cepBuscado !== cep || !document.getElementById('endForm'))
            return; // outro CEP digitado ou formulário fechado
        const aplicado = regrasEndereco.aplicarViaCep(lerFormEndereco(), json);
        if (!aplicado) {
            aviso.textContent = 'CEP não encontrado. Preencha o endereço à mão.';
            return;
        }
        for (const k of aplicado.preenchidos)
            $(`end_${k}`).value = aplicado.form[k];
        aviso.textContent = aplicado.preenchidos.includes('logradouro')
            ? 'Endereço preenchido pelo CEP. Confira e informe o número.'
            : 'Cidade preenchida pelo CEP. Informe a rua e o número.';
    }
    catch {
        if (cepBuscado === cep && document.getElementById('end_cep_busca'))
            aviso.textContent = 'Não foi possível buscar o CEP agora. Preencha o endereço à mão.';
    }
    finally {
        clearTimeout(prazo);
    }
}
$('detBody').addEventListener('input', e => {
    const alvo = e.target;
    if (pontoRascunho && CAMPOS_ENDERECO.some(([k]) => alvo.id === `end_${k}`)) {
        pontoRascunho = null;
        $('end_ponto_consentimento').checked = false;
        $('endPontoEstado').textContent = 'O endereço mudou. Confira e selecione novamente o ponto.';
    }
    if (alvo.id !== 'end_cep')
        return;
    const d = regrasEndereco.soDigitosCep(alvo.value);
    if (d.length === 8)
        buscarCep(d);
    else {
        cepBuscado = '';
        const aviso = document.getElementById('end_cep_busca');
        if (aviso)
            aviso.textContent = '';
    }
});
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
    const revogarPonto = document.querySelector('#end_revogar_ponto')?.checked || false;
    const autorizado = $('end_ponto_consentimento').checked;
    if (pontoRascunho && !revogarPonto && !autorizado) {
        $('endMsg').textContent = ERROS_ENDERECO.consentimento_ponto;
        $('end_ponto_consentimento').focus();
        return;
    }
    const ponto = pontoRascunho && !revogarPonto ? { ...pontoRascunho, autorizado } : undefined;
    const res = await chamarEndereco(r, { acao: 'endereco_salvar', endereco: { ...form, ponto, revogarPonto, versao: enderecoAtual?.versao || '' }, consentimento }, $('endSalvar'));
    if (!res?.ok)
        return;
    enderecoAtual = res.endereco || null;
    renderEndereco();
    atualizarMapaDeEndereco();
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
    else if (b.dataset.end === 'usar-ponto' && pinoEndereco)
        marcarPontoEndereco(pinoEndereco.getLatLng().wrap());
    else if (b.dataset.end === 'cancelar') {
        renderEndereco();
        $('endCorpo').querySelector('[data-end="editar"]')?.focus();
    }
    else if (b.dataset.end === 'remover') {
        if (!confirm(`Remover o endereço de ${nomeCurto(r)}? Ele é apagado de vez.`))
            return;
        const res = await chamarEndereco(r, { acao: 'endereco_excluir' }, b);
        if (!res?.ok)
            return;
        enderecoAtual = null;
        renderEndereco();
        atualizarMapaDeEndereco();
        $('endCorpo').querySelector('[data-end="editar"]')?.focus();
    }
});
function atualizarMapaDeEndereco() {
    invalidarDadosMapa();
    if (estado.aba === 'acompanhar')
        void carregarMapa();
}
$('det').addEventListener('close', limparEditorPonto);
