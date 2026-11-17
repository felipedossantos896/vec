// ══════ EDIÇÃO DE CADASTROS ══════
// Editar e excluir um cadastro a partir do detalhe, e sinalizar possíveis duplicados.
// O servidor confere a permissão: cada líder só altera o que enxerga.

type SalvarRegistroResult = ApiResult & { dados: Record<string, string>; editadoEm: string; editadoPor: string };

const ERROS_EDICAO: Record<string, string> = {
  nome_invalido: 'Informe o nome completo.',
  nascimento_invalido: 'Confira a data de nascimento.',
  nao_encontrado: 'Este cadastro não está mais disponível. Atualize a lista.',
  dados_invalidos: 'Algum campo não foi aceito. Confira e tente de novo.'
};
const registroAberto = (): Registro | undefined => estado.regs.find(r => String(r.linha) === $('det').dataset.linha);
const isoData = (d: Date | null): string => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';

// Mesmo nome e mesma data de nascimento: provavelmente a mesma pessoa preencheu duas vezes
function marcarDuplicados() {
  const chave = (r: Registro): string => `${norm(r.nome).replace(/\s+/g, ' ')}|${r.nascimento || ''}`;
  const cont: Record<string, number> = {};
  estado.regs.forEach(r => { cont[chave(r)] = (cont[chave(r)] || 0) + 1; });
  estado.regs.forEach(r => { r._dup = cont[chave(r)]; });
}

// Rodapé do detalhe: aviso de duplicado e ações
function acoesDetalhe(r: Registro): string {
  const aviso = r._dup > 1 ? `<div class="det-aviso"><p><b>Possível duplicado.</b> Há ${r._dup} cadastros com este nome e esta data de nascimento.</p><button type="button" class="btn-link" data-acao="duplicados">Ver os ${r._dup} cadastros</button></div>` : '';
  return `${aviso}<div class="det-actions" id="detAcoes"><button type="button" class="btn-sec solid" data-acao="editar">Editar cadastro</button><button type="button" class="btn-link perigo" data-acao="excluir">Excluir</button></div>`;
}

// ── Formulário ──
function simNao(k: string, label: string, v: unknown): string {
  const op = (valor: string, texto: string) => `<label><input type="radio" name="e_${k}" value="${valor}" ${(v || '') === valor ? 'checked' : ''}><span>${texto}</span></label>`;
  return `<div class="sn" role="radiogroup" aria-label="${label}"><span class="sn-l">${label}</span><span class="sn-o">${op('S', 'Sim')}${op('N', 'Não')}${op('', '<abbr title="Sem resposta">—</abbr>')}</span></div>`;
}
const grupoSN = (titulo: string, r: Registro, itens: [string, string][]): string =>
  `<div class="det-sec"><h4>${titulo}</h4><div class="sn-box">${itens.map(([k, l]) => simNao(k, l, r[k])).join('')}</div></div>`;
const campo = (id: string, label: string, corpo: string): string => `<div class="field" id="w_${id}"><label class="label" for="${id}">${label}</label>${corpo}</div>`;
const opcoesSel = (lista: string[], atual: unknown): string => lista.map(v => `<option${v === atual ? ' selected' : ''}>${esc(v)}</option>`).join('');

function abrirEdicao(r: Registro) {
  const soltas = distintos('celula', CELULAS).filter(c => !SETOR_DA_CELULA[c]);
  const celulas = `<option value="">Sem célula</option>` +
    SETORES.map(s => `<optgroup label="Setor ${esc(s)}">${opcoesSel(CELULAS.filter(c => SETOR_DA_CELULA[c] === s), r.celula)}</optgroup>`).join('') +
    (soltas.length ? `<optgroup label="Outras">${opcoesSel(soltas, r.celula)}</optgroup>` : '');
  $('detBody').innerHTML = `<form id="eForm" novalidate>
    <div class="det-sec"><h4>Dados pessoais</h4>
      ${campo('eNome', 'Nome completo', `<input class="input" id="eNome" autocapitalize="words" autocomplete="off" value="${esc(r.nome)}">`)}
      ${campo('eNasc', 'Data de nascimento', `<input class="input" id="eNasc" type="date" min="1900-01-01" max="${isoData(new Date())}" value="${isoData(r._nasc)}">`)}
      <div class="sn-box">${simNao('recebeuJesus', 'Recebeu Jesus', r.recebeuJesus)}</div>
    </div>
    ${grupoSN('Etapas da jornada', r, JORNADA)}
    <div class="det-sec"><h4>Célula e serviço</h4>
      ${campo('eCelula', 'Célula', `<select class="input" id="eCelula">${celulas}</select>`)}
      ${campo('eSetor', 'Setor', `<select class="input" id="eSetor"><option value="">Sem setor</option>${opcoesSel(distintos('setor', SETORES), r.setor)}</select><p class="field-hint">Quem tem célula fica no setor dela.</p>`)}
      <div class="sn-box">${simNao('frequentaCultos', 'Congrega com frequência', r.frequentaCultos)}${simNao('serveMinisterio', 'Serve em ministério', r.serveMinisterio)}</div>
      ${campo('eMinisterio', 'Em qual ministério?', `<input class="input" id="eMinisterio" autocapitalize="sentences" value="${esc(r.ministerioNome)}">`)}
    </div>
    ${grupoSN('Treinamentos', r, TREINOS)}
    <div class="det-sec"><h4>Discipulado e interesses</h4>
      ${campo('eDiscipulador', 'Nome do discipulador', `<input class="input" id="eDiscipulador" autocapitalize="words" autocomplete="off" placeholder="Deixe em branco se não tiver" value="${esc(r.discipulador)}">`)}
      <div class="sn-box">${INTERESSES.map(([k, l]) => simNao(k, l, r[k])).join('')}</div>
    </div>
    <p class="msg" id="eMsg" role="alert"></p>
    <div class="det-actions"><button type="submit" class="btn-sec solid" id="eSalvar">Salvar alterações</button><button type="button" class="btn-link" data-acao="cancelar">Cancelar</button></div>
  </form>`;
  ajustarEdicao();
  $('detBody').scrollTop = 0;
  $('det').scrollTop = 0;
  $<HTMLInputElement>('eNome').focus();
}

// O setor só é escolhido à parte por quem não tem célula; o ministério, só por quem serve
function ajustarEdicao() {
  const f = $<HTMLFormElement>('eForm');
  $('w_eSetor').classList.toggle('hidden', !!SETOR_DA_CELULA[$<HTMLSelectElement>('eCelula').value]);
  $('w_eMinisterio').classList.toggle('hidden', !f.querySelector('input[name="e_serveMinisterio"][value="S"]:checked'));
}

async function salvarEdicao(r: Registro) {
  const f = $<HTMLFormElement>('eForm');
  const celula = $<HTMLSelectElement>('eCelula').value;
  const dados: Record<string, string> = {
    nome: $<HTMLInputElement>('eNome').value.trim(), nascimento: $<HTMLInputElement>('eNasc').value,
    celula, setor: SETOR_DA_CELULA[celula] || $<HTMLSelectElement>('eSetor').value,
    ministerioNome: $<HTMLInputElement>('eMinisterio').value.trim(), discipulador: $<HTMLInputElement>('eDiscipulador').value.trim(),
    sugestao: r.sugestao || ''
  };
  f.querySelectorAll<HTMLInputElement>('input[type="radio"]:checked').forEach(i => { dados[i.name.slice(2)] = i.value; });
  const res = await chamarEdicao<SalvarRegistroResult>({ acao: 'registro_salvar', linha: r.linha, dados }, $('eMsg'), $<HTMLButtonElement>('eSalvar'));
  if (!res) return;
  Object.assign(r, res.dados, { editadoEm: res.editadoEm, editadoPor: res.editadoPor });
  derivar(r);
  atualizarPainel();
  abrirDetalhe(r);
}

async function excluirCadastro(r: Registro, botao: HTMLButtonElement) {
  const res = await chamarEdicao<ApiResult>({ acao: 'registro_excluir', linha: r.linha }, $('xMsg'), botao);
  if (!res) return;
  estado.regs = estado.regs.filter(x => x !== r);
  $<HTMLDialogElement>('det').close();
  atualizarPainel();
}

function atualizarPainel() {
  marcarDuplicados();
  montarFiltros();
  if (estado.situacao === 'duplicados' && !estado.regs.some(SITUACOES.duplicados.f)) Object.assign(estado, { situacao: 'todos', busca: '' });
  $<HTMLInputElement>('fBusca').value = estado.busca;
  renderTudo();
}

// Envia ao servidor com o botão travado; devolve null (e mostra o motivo) se não deu certo
async function chamarEdicao<T extends ApiResult>(payload: object, msg: HTMLElement, botao: HTMLButtonElement): Promise<T | null> {
  const s = lerSessao();
  if (!s) { $<HTMLDialogElement>('det').close(); mostrarLogin('Sua sessão expirou. Entre novamente.'); return null; }
  msg.textContent = '';
  botao.disabled = true;
  try {
    const res = await api<T>({ ...payload, token: s.token });
    if (res.ok) return res;
    if (res.erro === 'sessao') { limparSessao(); $<HTMLDialogElement>('det').close(); mostrarLogin('Sua sessão expirou. Entre novamente.'); return null; }
    msg.textContent = ERROS_EDICAO[res.erro || ''] || 'Não foi possível salvar. Tente novamente.';
  } catch (err) {
    msg.textContent = 'Não foi possível conectar. Verifique a internet.';
  } finally {
    botao.disabled = false;
  }
  return null;
}

// ── Ações do detalhe ──
$('detBody').addEventListener('click', e => {
  const alvo = e.target instanceof Element ? e.target.closest<HTMLButtonElement>('[data-acao]') : null;
  const r = registroAberto();
  if (!alvo || !r) return;
  const acao = alvo.dataset.acao;
  if (acao === 'editar') abrirEdicao(r);
  if (acao === 'cancelar') abrirDetalhe(r);
  if (acao === 'excluir') {
    $('detAcoes').innerHTML = `<div class="confirma"><p><b>Excluir o cadastro de ${esc(curto(r.nome))}?</b> Ele sai do painel e dos indicadores.</p><p class="msg" id="xMsg" role="alert"></p><div><button type="button" class="btn-sec perigo" data-acao="confirmar">Excluir cadastro</button><button type="button" class="btn-link" data-acao="cancelar">Cancelar</button></div></div>`;
    $('detAcoes').querySelector<HTMLButtonElement>('[data-acao="cancelar"]')?.focus();
  }
  if (acao === 'confirmar') excluirCadastro(r, alvo);
  if (acao === 'duplicados') {
    Object.assign(estado, { situacao: 'duplicados', busca: r.nome, setor: '', celula: '' });
    $<HTMLInputElement>('fBusca').value = r.nome;
    $<HTMLDialogElement>('det').close();
    mostrarAba('cadastros');
    renderTudo();
    $('registrationsTitle').scrollIntoView({ block: 'start' });
  }
});
$('detBody').addEventListener('change', e => { if ((e.target as Element).closest('#eForm')) ajustarEdicao(); });
$('detBody').addEventListener('submit', e => {
  e.preventDefault();
  const r = registroAberto();
  if (r) salvarEdicao(r);
});
