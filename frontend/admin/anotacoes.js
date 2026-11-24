"use strict";
// WhatsApp e autorização na ficha, datas da jornada e avisos do painel.
const fmtTel = (d) => d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d;
const soData = (s) => esc(String(s || '').split(' ')[0]);
function linhasContato(r) {
    return [
        ['WhatsApp', r.telefone ? `<a class="whats" href="https://wa.me/55${esc(r.telefone)}" target="_blank" rel="noopener">${esc(fmtTel(r.telefone))}</a>` : '<span class="pill x">—</span>'],
        ['Autorizou o uso dos dados', r.consentimentoEm ? soData(r.consentimentoEm) : '<span class="nota-fraca">Enviado antes da autorização</span>']
    ];
}
// Data em que a etapa foi marcada, ao lado do "Sim"
const dataEtapa = (r, k) => r[k] === 'S' && r.jornadaDatas?.[k] ? `<small class="det-data">${soData(r.jornadaDatas[k])}</small>` : '';
function avisoRapido(msg, acao, tipo = 'ok') {
    let el = document.getElementById('toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        el.className = 'toast';
        el.setAttribute('role', 'status');
        document.body.appendChild(el);
    }
    el.classList.toggle('erro', tipo === 'erro');
    el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
    el.innerHTML = `<span>${tipo === 'erro' ? '<b aria-hidden="true">!</b> ' : ''}${esc(msg)}</span>${acao ? `<button type="button" class="toast-a">${esc(acao.rotulo)}</button>` : ''}`;
    el.classList.add('on');
    const b = el.querySelector('.toast-a');
    if (b && acao)
        b.onclick = () => { el.classList.remove('on'); acao.fazer(); };
    clearTimeout(avisoRapido.t);
    avisoRapido.t = window.setTimeout(() => el.classList.remove('on'), 7000);
}
window.addEventListener('offline', () => avisoRapido('Sem internet agora. O que você já viu continua aqui.', undefined, 'erro'));
window.addEventListener('online', () => avisoRapido('Conexão de volta.'));
