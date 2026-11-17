"use strict";
// ══════ CONTATO E AUTORIZAÇÃO ══════
// WhatsApp opcional com máscara, autorização obrigatória de uso dos dados (LGPD) e a
// lista de células cadastrada no painel. Carregado depois de app.js.
const telInput = byId('telefone');
const aceiteInput = byId('consentimento');
// Só os dígitos, com DDD e sem o código do país
function digitosTel() {
    let d = telInput.value.replace(/\D/g, '');
    if (d.length > 11 && d.startsWith('55'))
        d = d.slice(2);
    return d.slice(0, 11);
}
telInput.addEventListener('input', () => {
    const d = digitosTel();
    telInput.value = d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
        : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
            : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
});
function marcarCampo(id, ok) {
    byId(`f-${id}`).classList.toggle('invalid', !ok);
    byId(id).setAttribute('aria-invalid', String(!ok));
    return ok;
}
const telefoneOk = () => { const d = digitosTel(); return marcarCampo('telefone', !d || ((d.length === 10 || d.length === 11) && d[0] !== '0')); };
const aceiteOk = () => marcarCampo('consentimento', aceiteInput.checked);
const dadosContato = () => ({ telefone: digitosTel(), consentimento: aceiteInput.checked ? 'S' : '' });
// As células vêm do painel; se o servidor não responder, fica a lista escrita no HTML
async function carregarCelulas() {
    try {
        const r = await (await fetch(FORM_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"acao":"estrutura"}' })).json();
        const setores = (r.setores || []).filter(s => s.celulas.length);
        if (!r.ok || !setores.length)
            return;
        const marcada = valor('celula');
        const e = (s) => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
        byId('celulasOpcoes').innerHTML = setores.map((s, i) => `<p class="opt-group" id="g-${i}">Setor ${e(s.nome)}</p>
      <div class="opts cols" data-setor="${e(s.nome)}" role="group" aria-labelledby="g-${i}">${s.celulas.map(c => `<label class="opt"><input type="radio" name="celula" value="${e(c)}"${c === marcada ? ' checked' : ''}><span>${e(c)}</span></label>`).join('')}</div>`).join('');
    }
    catch { /* mantém a lista do HTML */ }
}
carregarCelulas();
