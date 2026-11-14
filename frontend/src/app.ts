// O servidor Go atende /api no mesmo endereço desta página.
const FORM_API_URL: string = '/api';

type Pergunta = [string, string, string?];

const MSG_ENVIO: Record<string, string> = {
  nome_invalido: 'Confira o nome completo.',
  nascimento_invalido: 'Confira a data de nascimento.',
  dados_invalidos: 'Alguma resposta não foi aceita. Atualize a página e tente de novo.'
};

const PERGUNTAS: Record<string, Pergunta[]> = {
  fe: [
    ['recebeuJesus', 'Já recebeu Jesus como Senhor e Salvador da sua vida?']
  ],
  jornada: [
    ['cafePastor', 'Café com Pastor'],
    ['estacaoDNA', 'Estação DNA'],
    ['acompInicial', 'Acompanhamento Inicial'],
    ['novaCriatura', 'Nova Criatura'],
    ['batismo', 'Batismo'],
    ['batismoEspirito', 'Batismo no Espírito Santo']
  ],
  servico: [
    ['frequentaCultos', 'Congrega frequentemente nos cultos?'],
    ['serveMinisterio', 'Serve em algum ministério?']
  ],
  treinamentos: [
    ['expresso01', 'Expresso 01', 'Treinamento para Discipuladores'],
    ['expresso02', 'Expresso 02', 'Treinamento para Líderes de Célula'],
    ['tlc', 'TLC'],
    ['encontroDeus', 'Encontro com Deus'],
    ['tadel', 'Participa do TADEL?']
  ],
  interesses: [
    ['interesseDiscipulado', 'Tem interesse em ser discipulado(a) ou acompanhado(a)?'],
    ['interesseCuidar', 'Tem interesse em cuidar de pessoas?'],
    ['interesseLider', 'Tem interesse em ser líder de célula?'],
    ['interesseAnfitrao', 'Tem interesse em ser anfitrião de célula?']
  ]
};

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento não encontrado: #${id}`);
  return element as T;
}

const form = byId<HTMLFormElement>('vecForm');
const btnSend = byId<HTMLButtonElement>('btnSend');
const btnBack = byId<HTMLButtonElement>('btnBack');
const btnNext = byId<HTMLButtonElement>('btnNext');
const sendError = byId<HTMLElement>('sendError');
const ministerioWrap = byId<HTMLElement>('ministerioWrap');
const etapas = [...form.querySelectorAll<HTMLElement>('.card')];
const ynNames: string[] = [];
let etapaAtual = 0;

function novoRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}
let requestId = novoRequestId();

// Monta as perguntas Sim/Não
for (const [grupo, lista] of Object.entries(PERGUNTAS)) {
  const alvo = document.querySelector<HTMLElement>(`[data-group="${grupo}"]`);
  if (!alvo) throw new Error(`Grupo de perguntas não encontrado: ${grupo}`);
  alvo.innerHTML = lista.map(([name, label, sub]) => {
    ynNames.push(name);
    return `
      <div class="q" role="radiogroup" aria-labelledby="l-${name}" data-q="${name}">
        <p class="q-label" id="l-${name}">${label}${sub ? `<span class="q-sub">${sub}</span>` : ''}</p>
        <div class="seg">
          <label class="sim"><input type="radio" name="${name}" value="S"><span>Sim</span></label>
          <label class="nao"><input type="radio" name="${name}" value="N"><span>Não</span></label>
        </div>
      </div>`;
  }).join('');
}

function valor(name: string): string {
  const radio = form.querySelector<HTMLInputElement>(`input[type="radio"][name="${name}"]:checked`);
  if (radio) return radio.value;
  const el = form.elements.namedItem(name);
  if (el instanceof HTMLInputElement && el.type === 'radio') return '';
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
    ? el.value.trim()
    : '';
}

function atualizarProgresso() {
  const pct = Math.round(((etapaAtual + 1) / etapas.length) * 100);
  byId<HTMLElement>('progressFill').style.width = pct + '%';
  byId<HTMLElement>('progressText').textContent = `Etapa ${etapaAtual + 1} de ${etapas.length}`;
  byId<HTMLElement>('progressBar').setAttribute('aria-valuenow', String(pct));
  byId<HTMLElement>('progressBar').setAttribute('aria-valuetext', `Etapa ${etapaAtual + 1} de ${etapas.length}`);
}

function mostrarEtapa(focar = false) {
  etapas.forEach((etapa, i) => {
    etapa.hidden = i !== etapaAtual;
    if (i === etapaAtual) etapa.setAttribute('aria-current', 'step');
    else etapa.removeAttribute('aria-current');
  });
  btnBack.classList.toggle('hidden', etapaAtual === 0);
  btnNext.classList.toggle('hidden', etapaAtual === etapas.length - 1);
  btnSend.classList.toggle('hidden', etapaAtual !== etapas.length - 1);
  byId<HTMLElement>('intro').hidden = etapaAtual !== 0;
  atualizarProgresso();
  if (focar) etapas[etapaAtual].querySelector('h2')?.focus();
}

function avancarEtapa() {
  if (etapaAtual === 0 && !validar()) return;
  if (etapaAtual < etapas.length - 1) {
    etapaAtual++;
    mostrarEtapa(true);
  }
}

form.addEventListener('change', (e: Event) => {
  const t = e.target;
  if (t instanceof HTMLInputElement && t.type === 'radio') {
    const q = t.closest('.q');
    if (q) q.classList.add('answered');
    if (t.name === 'serveMinisterio') {
      const sim = t.value === 'S';
      ministerioWrap.classList.toggle('show', sim);
      if (sim) setTimeout(() => byId<HTMLInputElement>('ministerioNome').focus({ preventScroll: false }), 50);
      else byId<HTMLInputElement>('ministerioNome').value = '';
    }
  }
});

form.addEventListener('input', (e: Event) => {
  const field = e.target instanceof Element ? e.target.closest('.field') : null;
  if (field) {
    field.classList.remove('invalid');
    field.querySelector<HTMLInputElement>('[aria-invalid]')?.setAttribute('aria-invalid', 'false');
  }
  sendError.classList.remove('show');
});

btnNext.addEventListener('click', avancarEtapa);
btnBack.addEventListener('click', () => {
  etapaAtual--;
  mostrarEtapa(true);
});

// "Próximo" no teclado do celular pula do nome para a data
byId<HTMLInputElement>('nome').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); byId<HTMLInputElement>('nascimento').focus(); }
});

// Data máxima = hoje
const hoje = new Date();
const hojeISO = new Date(hoje.getTime() - hoje.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
// Máscara DD/MM/AAAA
const nascInput = byId<HTMLInputElement>('nascimento');
nascInput.addEventListener('input', () => {
  const d = nascInput.value.replace(/\D/g, '').slice(0, 8);
  let out = d;
  if (d.length > 4) out = `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  else if (d.length > 2) out = `${d.slice(0, 2)}/${d.slice(2)}`;
  nascInput.value = out;
});

// Converte DD/MM/AAAA em AAAA-MM-DD; devolve '' se a data for inválida
function paraISO(txt: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(txt || '');
  if (!m) return '';
  const [, dd, mm, aaaa] = m;
  const dt = new Date(Number(aaaa), Number(mm) - 1, Number(dd));
  if (dt.getFullYear() !== Number(aaaa) || dt.getMonth() !== Number(mm) - 1 || dt.getDate() !== Number(dd)) return '';
  const iso = `${aaaa}-${mm}-${dd}`;
  return iso >= '1900-01-01' && iso <= hojeISO ? iso : '';
}

function validar() {
  let primeiroErro: HTMLElement | null = null;
  const nome = valor('nome');
  const nasc = valor('nascimento');

  const fNome = byId<HTMLElement>('f-nome');
  const nomeOk = nome.length >= 3;
  fNome.classList.toggle('invalid', !nomeOk);
  byId<HTMLInputElement>('nome').setAttribute('aria-invalid', String(!nomeOk));
  if (!nomeOk) primeiroErro = primeiroErro || byId<HTMLInputElement>('nome');

  const fNasc = byId<HTMLElement>('f-nascimento');
  const nascOk = !!paraISO(nasc);
  fNasc.classList.toggle('invalid', !nascOk);
  byId<HTMLInputElement>('nascimento').setAttribute('aria-invalid', String(!nascOk));
  if (!nascOk) primeiroErro = primeiroErro || byId<HTMLInputElement>('nascimento');

  if (primeiroErro) {
    primeiroErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => primeiroErro.focus({ preventScroll: true }), 300);
    return false;
  }
  return true;
}

function coletar() {
  const d: Record<string, string> = {
    _requestId: requestId,
    nome: valor('nome'),
    nascimento: paraISO(valor('nascimento')),
    setor: valor('setor'),
    celula: valor('celula'),
    ministerioNome: valor('serveMinisterio') === 'S' ? valor('ministerioNome') : '',
    discipulador: valor('discipulador'),
    sugestao: valor('sugestao')
  };
  ynNames.forEach(n => { d[n] = valor(n); });
  return d;
}

function mostrarErro(msg: string): void {
  sendError.textContent = msg;
  sendError.classList.add('show');
  sendError.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

let enviando = false;

form.addEventListener('submit', async (e: SubmitEvent): Promise<void> => {
  e.preventDefault();
  if (enviando) return;
  if (etapaAtual < etapas.length - 1) { avancarEtapa(); return; }
  sendError.classList.remove('show');
  if (!validar()) return;

  if (!navigator.onLine) {
    mostrarErro('Sem conexão com a internet. Suas respostas continuam aqui; conecte-se e toque em Enviar novamente.');
    return;
  }

  enviando = true;
  btnSend.disabled = true;
  btnSend.innerHTML = '<span class="spinner" aria-hidden="true"></span> Enviando...';

  try {
    const resp = await fetch(FORM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(coletar())
    });
    const r = await resp.json().catch((): null => null);
    if (!resp.ok || !r || !r.ok) {
      mostrarErro(MSG_ENVIO[r && r.erro] || 'Não foi possível enviar agora. Tente novamente em instantes.');
      return;
    }
    requestId = novoRequestId();
    form.style.display = 'none';
    byId<HTMLElement>('done').classList.add('show');
    byId<HTMLElement>('topbar').style.display = 'none';
    byId<HTMLElement>('intro').hidden = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    mostrarErro('Não foi possível enviar agora. Verifique a internet e toque em Enviar novamente.');
  } finally {
    enviando = false;
    btnSend.disabled = false;
    btnSend.textContent = 'Enviar formulário';
  }
});

byId<HTMLButtonElement>('btnAgain').addEventListener('click', () => {
  requestId = novoRequestId();
  form.reset();
  etapaAtual = 0;
  form.querySelectorAll('.q.answered').forEach(q => q.classList.remove('answered'));
  form.querySelectorAll('.field.invalid').forEach(f => f.classList.remove('invalid'));
  ministerioWrap.classList.remove('show');
  byId<HTMLElement>('done').classList.remove('show');
  byId<HTMLElement>('topbar').style.display = '';
  form.style.display = '';
  mostrarEtapa(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

mostrarEtapa();
