// ══════ CONTATO E AUTORIZAÇÃO ══════
// WhatsApp opcional com máscara, autorização obrigatória de uso dos dados (LGPD) e a
// lista de células cadastrada no painel. Carregado depois de app.js.

const telInput = byId<HTMLInputElement>('telefone');
const aceiteInput = byId<HTMLInputElement>('consentimento');

// Só os dígitos, com DDD e sem o código do país
function digitosTel(): string {
  let d = telInput.value.replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d.slice(0, 11);
}
telInput.addEventListener('input', () => {
  const d = digitosTel();
  telInput.value = d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
});

function marcarCampo(id: string, ok: boolean): boolean {
  byId<HTMLElement>(`f-${id}`).classList.toggle('invalid', !ok);
  byId<HTMLElement>(id).setAttribute('aria-invalid', String(!ok));
  return ok;
}
const telefoneOk = (): boolean => { const d = digitosTel(); return marcarCampo('telefone', !d || ((d.length === 10 || d.length === 11) && d[0] !== '0')); };
const aceiteOk = (): boolean => marcarCampo('consentimento', aceiteInput.checked);
const dadosContato = (): Record<string, string> => ({ telefone: digitosTel(), consentimento: aceiteInput.checked ? 'S' : '' });

// As células vêm do painel; se o servidor não responder, fica a lista escrita no HTML
async function carregarCelulas() {
  try {
    type Det = { nome: string; cor?: string; diaSemana?: string; horario?: string; posicao?: number };
    const r: { ok: boolean; setores?: { nome: string; celulas: string[]; detalhes?: Det[] }[] } = await (await fetch(FORM_API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"acao":"estrutura"}' })).json();
    const setores = (r.setores || []).filter(s => s.celulas.length);
    if (!r.ok || !setores.length) return;
    const marcada = valor('celula');
    const e = (s: string): string => s.replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
    byId<HTMLElement>('celulasOpcoes').innerHTML = setores.map((s, i) => `<p class="opt-group" id="g-${i}">Setor ${e(s.nome)}</p>
      <div class="opts cols" data-setor="${e(s.nome)}" role="group" aria-labelledby="g-${i}">${s.celulas.map(c => {
        // Cor e dia do encontro da célula (Spec 009); a casa anfitriã nunca vem para cá.
        const d = (s.detalhes || []).find(x => x.nome === c);
        const cor = d ? regrasCelula.cor(d.cor || '', d.posicao ?? -1) : '';
        const enc = d ? regrasCelula.encontro(d.diaSemana || '', d.horario || '', true) : '';
        if (enc) encontroDaCelula[c] = enc;
        return `<label class="opt"><input type="radio" name="celula" value="${e(c)}"${c === marcada ? ' checked' : ''}><span><i class="opt-bar"${cor ? ` data-cor="${cor}"` : ''} aria-hidden="true"></i><span class="opt-t"><b>${e(c)}</b>${enc ? `<small>${e(enc)}</small>` : ''}</span></span></label>`;
      }).join('')}</div>`).join('');
    // A cor vai por CSSOM: o CSP não deixa usar style no HTML.
    byId<HTMLElement>('celulasOpcoes').querySelectorAll<HTMLElement>('[data-cor]').forEach(el => { if (regrasCelula.corValida(el.dataset.cor)) el.style.setProperty('--cel', el.dataset.cor); });
  } catch { /* mantém a lista do HTML */ }
}

carregarCelulas();

// Rostos ilustrados ao lado do aviso de privacidade (sementes fixas: não são de ninguém)
const ladoRostos = document.getElementById('ladoRostos');
if (ladoRostos && typeof regrasAvatar !== 'undefined') ladoRostos.innerHTML = [3, 8, 14, 21, 27].map(n => `<i class="fp-av">${regrasAvatar.svg(n)}</i>`).join('');
