// ══════ ENDEREÇO NA FICHA (Spec 002) ══════
// Carregado sob demanda ao abrir a pessoa (não vem na lista), só para quem tem a
// pessoa no escopo. Para salvar, é preciso marcar a autorização da pessoa a cada vez.

type EnderecoSalvo = EnderecoForm & { consentimentoEm: string; consentimentoPor: string; atualizadoEm: string; atualizadoPor: string };
type PinoEndereco = { lat: number | null; lng: number | null; precisao: string; revisao: string };
type EnderecoResult = ApiResult & { endereco?: EnderecoSalvo | null; pinoEndereco?: PinoEndereco };

const TEXTO_CONSENTIMENTO = 'A pessoa autorizou o uso do endereço para organização das células e pode pedir a remoção a qualquer momento.';
const ERROS_ENDERECO: Record<string, string> = {
  cep_invalido: 'Confira o CEP: são 8 dígitos.',
  uf_invalida: 'Escolha a UF.',
  pino_desatualizado: 'O endereço mudou. Reabra o ajuste do ponto e tente de novo.',
  endereco_incompleto: 'Preencha rua, número, bairro e cidade.',
  consentimento_endereco: 'Marque a autorização da pessoa para salvar o endereço.',
  nao_encontrado: 'Este cadastro não está mais disponível. Atualize a lista.',
  dados_invalidos: 'Algum campo não foi aceito. Confira e tente de novo.'
};
const CAMPOS_ENDERECO: [keyof EnderecoForm, string, string][] = [
  ['cep', 'CEP', 'postal-code'], ['logradouro', 'Rua', 'address-line1'], ['numero', 'Número', 'off'],
  ['complemento', 'Complemento (opcional)', 'address-line2'], ['bairro', 'Bairro', 'address-level3'],
  ['cidade', 'Cidade', 'address-level2'], ['uf', 'UF', 'address-level1']
];
let enderecoAtual: EnderecoSalvo | null = null;

const blocoEndereco = (): string =>
  `<div class="det-sec" id="endSec"><h4>${icone('mapa', { classe: 'ic-18' })}Localização</h4><div id="endCorpo"><p class="nota-fraca">Carregando endereço…</p></div><p class="msg" id="endMsg" role="alert"></p></div>`;

function renderEndereco() {
  const e = enderecoAtual;
  $('endCorpo').innerHTML = e
    ? `<address class="end-linhas">${regrasEndereco.linhas(e).map(l => `<span>${esc(l)}</span>`).join('')}</address>
      <p class="field-hint">Autorizado em ${soData(e.consentimentoEm)} por ${esc(e.consentimentoPor)}. Atualizado em ${soData(e.atualizadoEm)} por ${esc(e.atualizadoPor)}.</p>
      <div class="end-acoes"><button type="button" class="btn-sec" data-end="editar">Editar endereço</button><button type="button" class="btn-sec" data-end="pino">Ajustar ponto no mapa</button><button type="button" class="btn-link perigo" data-end="remover">Remover endereço</button></div>`
    : `<p class="nota-fraca">Sem endereço cadastrado.</p>
      <div class="end-acoes"><button type="button" class="btn-sec" data-end="editar">Cadastrar endereço</button></div>`;
}

function formEndereco() {
  const e: EnderecoForm = enderecoAtual || { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };
  const campoEnd = ([k, label, auto]: [keyof EnderecoForm, string, string]): string => {
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
    <div class="field"><label class="end-consent"><input type="checkbox" id="end_consentimento" aria-describedby="end_consentimento_erro"><span>${TEXTO_CONSENTIMENTO}</span></label><p class="msg" id="end_consentimento_erro"></p></div>
    <div class="end-acoes"><button type="submit" class="btn-sec solid" id="endSalvar">Salvar endereço</button><button type="button" class="btn-link" data-end="cancelar">Cancelar</button></div>
  </form>`;
  $<HTMLInputElement>('end_cep').focus();
}

function lerFormEndereco(): EnderecoForm {
  const v = (k: string): string => $<HTMLInputElement>(`end_${k}`).value;
  return { cep: v('cep'), logradouro: v('logradouro'), numero: v('numero'), complemento: v('complemento'), bairro: v('bairro'), cidade: v('cidade'), uf: v('uf') };
}

// Marca cada campo com erro e foca o primeiro; devolve se está tudo certo.
function mostrarErrosEndereco(erros: Record<string, string>): boolean {
  let primeiro: HTMLElement | null = null;
  for (const k of [...CAMPOS_ENDERECO.map(([c]) => c as string), 'consentimento']) {
    const campo = $(`end_${k}`);
    campo.setAttribute('aria-invalid', String(Boolean(erros[k])));
    campo.closest('.field')?.classList.toggle('invalid', Boolean(erros[k]));
    $(`end_${k}_erro`).textContent = erros[k] || '';
    if (erros[k] && !primeiro) primeiro = campo;
  }
  if (primeiro) (primeiro as HTMLElement).focus();
  return !primeiro;
}

// Chama o servidor; só atualiza a tela se a ficha ainda é desta pessoa.
async function chamarEndereco(r: Registro, payload: object, botao?: HTMLButtonElement): Promise<EnderecoResult | null> {
  const s = lerSessao();
  if (!s) { $<HTMLDialogElement>('det').close(); mostrarLogin('Sua sessão expirou. Entre novamente.'); return null; }
  if (botao) botao.disabled = true;
  try {
    const res = await api<EnderecoResult>({ ...payload, linha: r.linha, token: s.token });
    if (registroAberto() !== r || !document.getElementById('endCorpo')) return null;
    if (!res.ok && res.erro === 'sessao') { limparSessao(); $<HTMLDialogElement>('det').close(); mostrarLogin('Sua sessão expirou. Entre novamente.'); return null; }
    if (!res.ok) $('endMsg').textContent = ERROS_ENDERECO[res.erro || ''] || 'Não foi possível concluir. Atualize o painel e tente de novo.';
    return res;
  } catch (err) {
    if (document.getElementById('endMsg')) $('endMsg').textContent = 'Não foi possível conectar. Verifique a internet.';
    return null;
  } finally {
    if (botao) botao.disabled = false;
  }
}

async function carregarEnderecoDe(r: Registro) {
  enderecoAtual = null;
  const res = await chamarEndereco(r, { acao: 'endereco_ler' });
  if (!res) return;
  if (!res.ok) { $('endCorpo').innerHTML = '<p class="nota-fraca">Endereço indisponível.</p>'; return; }
  enderecoAtual = res.endereco || null;
  renderEndereco();
}

// ── Busca pelo CEP (T005) ──
// Preenche rua, bairro, cidade e UF; falha ou demora nunca impede o preenchimento manual.
let cepBuscado = '';
async function buscarCep(cep: string) {
  const url = regrasEndereco.urlViaCep(cep);
  const aviso = document.getElementById('end_cep_busca');
  if (!url || !aviso || cep === cepBuscado) return;
  cepBuscado = cep;
  aviso.textContent = 'Buscando endereço do CEP…';
  const pararEm = new AbortController();
  const prazo = setTimeout(() => pararEm.abort(), 5000);
  try {
    const res = await fetch(url, { signal: pararEm.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
    const json: unknown = res.ok ? await res.json() : null;
    if (cepBuscado !== cep || !document.getElementById('endForm')) return; // outro CEP digitado ou formulário fechado
    const aplicado = regrasEndereco.aplicarViaCep(lerFormEndereco(), json);
    if (!aplicado) { aviso.textContent = 'CEP não encontrado. Preencha o endereço à mão.'; return; }
    for (const k of aplicado.preenchidos) $<HTMLInputElement>(`end_${k}`).value = aplicado.form[k as keyof EnderecoForm];
    aviso.textContent = aplicado.preenchidos.includes('logradouro')
      ? 'Endereço preenchido pelo CEP. Confira e informe o número.'
      : 'Cidade preenchida pelo CEP. Informe a rua e o número.';
  } catch {
    if (cepBuscado === cep && document.getElementById('end_cep_busca')) aviso.textContent = 'Não foi possível buscar o CEP agora. Preencha o endereço à mão.';
  } finally {
    clearTimeout(prazo);
  }
}
$('detBody').addEventListener('input', e => {
  const alvo = e.target as HTMLInputElement;
  if (alvo.id !== 'end_cep') return;
  const d = regrasEndereco.soDigitosCep(alvo.value);
  if (d.length === 8) buscarCep(d);
  else { cepBuscado = ''; const aviso = document.getElementById('end_cep_busca'); if (aviso) aviso.textContent = ''; }
});

$('detBody').addEventListener('submit', async e => {
  if ((e.target as Element).id !== 'endForm') return;
  e.preventDefault();
  const r = registroAberto();
  if (!r) return;
  $('endMsg').textContent = '';
  const form = lerFormEndereco();
  const consentimento = $<HTMLInputElement>('end_consentimento').checked;
  if (!mostrarErrosEndereco(regrasEndereco.validar(form, consentimento))) return;
  const res = await chamarEndereco(r, { acao: 'endereco_salvar', endereco: form, consentimento }, $<HTMLButtonElement>('endSalvar'));
  if (!res?.ok) return;
  enderecoAtual = res.endereco || null;
  renderEndereco();
  $('endMsg').textContent = '';
  $('endCorpo').querySelector<HTMLButtonElement>('[data-end="editar"]')?.focus();
});

async function abrirEditorPino(r: Registro, botao: HTMLButtonElement) {
  const res = await chamarEndereco(r, { acao: 'endereco_pino' }, botao);
  const pino = res?.pinoEndereco;
  if (!pino || !botao.isConnected || !$<HTMLDialogElement>('det').open) return;
  if (typeof L === 'undefined') {
    $('endMsg').textContent = 'Não foi possível abrir o mapa.';
    return;
  }
  $('endCorpo').innerHTML = `<p class="field-hint">${pino.precisao === 'manual' ? 'Precisão manual confirmada.' : 'Arraste o mapa até alinhar o pino à entrada da casa.'} O ponto exato só aparece nesta ficha.</p>
    <div class="end-pino-palco"><div id="endPinoMapa" class="end-pino-mapa" aria-label="Mapa para ajustar a localização"></div><span class="end-pino-marca" aria-hidden="true"></span></div>
    <label class="end-consent"><input type="checkbox" id="endPinoConsentimento"><span>A pessoa autorizou salvar o ponto exato na ficha.</span></label>
    <div class="end-acoes"><button type="button" id="endPinoSalvar" class="btn-sec solid">Confirmar ponto</button><button type="button" class="btn-link" data-end="cancelar">Cancelar</button></div>`;
  const el = $('endPinoMapa');
  const localizado = pino.lat !== null && pino.lng !== null;
  const mapa = L.map(el, { minZoom: 4, maxZoom: ZOOM_MAX }).setView(localizado ? [pino.lat, pino.lng] : [-14.2, -51.9], localizado ? 16 : 4);
  L.tileLayer(TILES_OSM, { maxZoom: ZOOM_TILES, detectRetina: true, attribution: ATRIBUICAO_OSM }).addTo(mapa);
  const dialogo = $<HTMLDialogElement>('det');
  const fechar = () => {
    observador.disconnect();
    dialogo.removeEventListener('close', fechar);
    mapa.remove();
    if (el.isConnected && !dialogo.open) renderEndereco();
  };
  const observador = new MutationObserver(() => { if (!el.isConnected) fechar(); });
  observador.observe($('detBody'), { childList: true, subtree: true });
  dialogo.addEventListener('close', fechar, { once: true });
  const salvar = $<HTMLButtonElement>('endPinoSalvar');
  const consentiu = $<HTMLInputElement>('endPinoConsentimento');
  const atualizarBotao = () => { salvar.disabled = !consentiu.checked || mapa.getZoom() < 16; };
  consentiu.addEventListener('change', atualizarBotao);
  mapa.on('zoomend', atualizarBotao);
  atualizarBotao();
  el.focus();
  salvar.addEventListener('click', async () => {
    const { lat, lng } = mapa.getCenter().wrap();
    const resposta = await chamarEndereco(r, { acao: 'endereco_pino', pinoEndereco: { lat, lng, revisao: pino.revisao }, consentimento: consentiu.checked }, salvar);
    if (!resposta?.ok || !el.isConnected || !dialogo.open) return;
    dadosMapa = null;
    await carregarEnderecoDe(r);
    $('endCorpo').querySelector<HTMLButtonElement>('[data-end="pino"]')?.focus();
    if (estado.aba === 'acompanhar') renderMapa();
  });
}

$('detBody').addEventListener('click', async e => {
  const b = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-end]') : null;
  const r = registroAberto();
  if (!b || !r) return;
  $('endMsg').textContent = '';
  if (b.dataset.end === 'editar') formEndereco();
  else if (b.dataset.end === 'pino') await abrirEditorPino(r, b);
  else if (b.dataset.end === 'cancelar') { renderEndereco(); $('endCorpo').querySelector<HTMLButtonElement>('[data-end="editar"]')?.focus(); }
  else if (b.dataset.end === 'remover') {
    if (!confirm(`Remover o endereço de ${nomeCurto(r)}? Ele é apagado de vez.`)) return;
    const res = await chamarEndereco(r, { acao: 'endereco_excluir' }, b);
    if (!res?.ok) return;
    enderecoAtual = null;
    renderEndereco();
    $('endCorpo').querySelector<HTMLButtonElement>('[data-end="editar"]')?.focus();
  }
});
