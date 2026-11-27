// ══════ USUÁRIOS ══════
const PERFIL_LABEL: Record<string, string> = { AREA: 'Líder de área', SETOR: 'Líder de setor', CELULA: 'Líder de célula', DISCIPULADOR: 'Discipulador' };
const MSG_USUARIO: Record<string, string> = {
  usuario_invalido: 'Usuário inválido: use de 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado, sem espaços.',
  usuario_existe: 'Já existe alguém com esse usuário. Escolha outro.',
  nome_obrigatorio: 'Informe o nome.',
  senha_curta: 'A senha precisa ter pelo menos 6 caracteres.',
  senha_longa: 'A senha pode ter no máximo 256 caracteres.',
  perfil_invalido: 'Escolha um perfil.',
  escopo_obrigatorio: 'Marque pelo menos um item de acesso.',
  cadastro_obrigatorio: 'Escolha o cadastro desta pessoa: é por ele que ela vê os próprios discípulos.',
  cadastro_invalido: 'Esse cadastro não está mais disponível. Escolha outro.',
  nao_encontrado: 'Usuário não encontrado. Atualize a lista e tente de novo.',
  auto_bloqueio: 'Você não pode desativar o próprio acesso nem remover sua permissão de gerenciar usuários.',
  // Cadastro do líder (Spec 013)
  nascimento_invalido: 'Informe a data de nascimento do líder para criar o cadastro.',
  telefone_invalido: 'Confira o WhatsApp do líder: DDD e número.',
  consentimento: 'Marque a autorização para criar o cadastro do líder.',
  duplicado: 'Esta pessoa já tem cadastro. Ligue o login ao cadastro existente em "Cadastro desta pessoa".',
  duplicado_fora: 'Esta pessoa já tem cadastro. Ligue o login ao cadastro existente em "Cadastro desta pessoa".'
};
let editando: UsuarioPainel | null = null;

const abas = [...document.querySelectorAll<HTMLButtonElement>('#tabs button')];
abas.forEach(b => {
  b.addEventListener('click', () => mostrarAba(b.dataset.aba || 'cadastros'));
  b.addEventListener('keydown', e => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const visiveis = abas.filter(a => !a.classList.contains('hidden'));
    const proxima = visiveis[(visiveis.indexOf(b) + delta + visiveis.length) % visiveis.length];
    proxima.focus();
    proxima.click();
  });
});

// Células e Usuários ficam juntos em Configurações; cada um é uma sub-aba
const segs = [...document.querySelectorAll<HTMLButtonElement>('#configSeg button')];
segs.forEach(b => b.addEventListener('click', () => mostrarAba(b.dataset.aba || 'estrutura')));
const visivel = (id: string): boolean => !$(id).classList.contains('hidden');

function mostrarAba(aba: string) {
  if (aba === 'config') aba = visivel('tabEstrutura') ? 'estrutura' : 'usuarios';
  if (aba === 'acompanhar' && soDiscipulador()) aba = 'discipulos';
  estado.aba = aba;
  const naNav = aba === 'estrutura' || aba === 'usuarios' ? 'config' : aba;
  abas.forEach(b => {
    const selecionada = b.dataset.aba === naNav;
    b.setAttribute('aria-selected', String(selecionada));
    b.tabIndex = selecionada ? 0 : -1;
  });
  segs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.aba === aba)));
  $('acompanharView').classList.toggle('hidden', aba !== 'acompanhar');
  $('discView').classList.toggle('hidden', aba !== 'discipulos');
  $('cadastrosView').classList.toggle('hidden', aba !== 'cadastros');
  $('indicadoresView').classList.toggle('hidden', aba !== 'indicadores');
  $('configView').classList.toggle('hidden', naNav !== 'config');
  $('usersView').classList.toggle('hidden', aba !== 'usuarios');
  $('estruturaView').classList.toggle('hidden', aba !== 'estrutura');
  $('tip').classList.add('hidden');
  atualizarConfig();
  if (aba === 'estrutura') renderEstrutura();
  if (aba === 'usuarios' && !estado.usuariosCarregados) carregarUsuarios();
  document.body.classList.toggle('na-area', aba === 'acompanhar'); // mapa em tela cheia (Spec 016)
  if (aba === 'acompanhar') { aoMudarTamanho(); abrirMapa(); } // a Área tem o mapa no topo (Spec 009)
  if (aba === 'discipulos') renderDiscipulos();
  if (aba === 'indicadores' && retratos === null) carregarRetratos(); // tendências do mês (Spec 009)
}

// Configurações aparece para quem pode ver ao menos uma das duas partes
function atualizarConfig() {
  const est = visivel('tabEstrutura'), us = visivel('tabUsuarios');
  $('tabConfig').classList.toggle('hidden', !est && !us);
  $('configSeg').classList.toggle('hidden', !(est && us));
}

function sessaoInvalida(r: ApiResult) {
  if (r.erro === 'sessao') { limparSessao(); mostrarLogin('Sua sessão expirou. Entre novamente.'); return true; }
  if (r.erro === 'sem_escopo') { limparSessao(); mostrarLogin('Seu acesso ainda não foi configurado. Fale com a liderança da área.'); return true; }
  if (r.erro === 'sem_permissao') { avisoRapido('Esta parte não é do seu escopo.', undefined, 'erro'); estado.gerencia = false; $('tabUsuarios').classList.add('hidden'); mostrarAba('acompanhar'); return true; }
  return false;
}

async function carregarUsuarios() {
  const s = lerSessao();
  if (!s) return mostrarLogin('Sua sessão expirou. Entre novamente.');
  $('userList').innerHTML = regrasEstados.carregando('Carregando os usuários…', 3);
  try {
    const r = await api<UsuariosResult>({ acao: 'usuarios_listar', token: s.token });
    if (!r.ok) { if (sessaoInvalida(r)) return; throw new Error(r.erro); }
    estado.usuarios = r.usuarios;
    estado.usuariosCarregados = true;
    renderUsuarios();
  } catch (e) {
    $('userList').innerHTML = regrasEstados.html(regrasEstados.falhaCarga(navigator.onLine));
  }
}

function escopoTexto(u: UsuarioPainel): string {
  if (u.perfil === 'AREA') return 'Vê todos os cadastros da área';
  const p = [];
  if (u.setores.length) p.push((u.setores.length > 1 ? 'Setores: ' : 'Setor: ') + u.setores.join(', '));
  if (u.celulas.length) p.push((u.celulas.length > 1 ? 'Células: ' : 'Célula: ') + u.celulas.join(', '));
  if (u.cadastro) p.push('Os próprios discípulos');
  return p.join(' · ') || 'Acesso ainda não configurado';
}

function renderUsuarios() {
  const lista = [...estado.usuarios].sort((a, b) => (Number(b.ativo) - Number(a.ativo)) || String(a.nome || a.usuario).localeCompare(String(b.nome || b.usuario), 'pt-BR'));
  const ativos = lista.filter(u => u.ativo).length;
  const agora = new Date();
  const eu = lerSessao()?.usuario;
  $('userCount').textContent = `${plural(lista.length, 'usuário', 'usuários')} · ${ativos} ${ativos === 1 ? 'ativo' : 'ativos'} · cada um vê só o próprio escopo`;
  const discipulos = (u: UsuarioPainel): number => u.cadastro ? estado.regs.filter(r => r.discipuladorId === u.cadastro).length : 0;
  $('userList').innerHTML = lista.length ? '<div class="uhead" aria-hidden="true"><span>Usuário</span><span>Perfil</span><span>Escopo</span><span>Acesso</span><span>Situação</span></div>' + lista.map(u => {
    const nome = u.nome || u.usuario;
    const rosto = u.cadastro ? avatarDe(u.cadastro, nome) : avatar({ nome });
    const acesso = regrasAjustes.acesso(String(u.acessoEm || ''), agora);
    return `<button type="button" class="urow${u.ativo ? '' : ' off'}" data-u="${esc(u.usuario)}">
      <span class="u-pes">${rosto}<span class="u-id"><b>${esc(nome)}${u.usuario === eu ? ' <small class="u-voce">você</small>' : ''}</b><small>@${esc(u.usuario)}</small></span></span>
      <span class="u-perf"><span class="perf-b ${esc(u.perfil)}">${esc(regrasAjustes.rotuloPerfil(u.perfil))}</span></span>
      <span class="u-esc">${esc(regrasAjustes.escopo(u, discipulos(u)))}${u.gerencia ? '<small>gerencia usuários</small>' : ''}</span>
      <span class="u-ac"><span class="sr-only">Último acesso: </span>${esc(acesso)}</span>
      <span class="u-st">${u.ativo ? '<span class="badge">Ativo</span>' : '<span class="badge off">Desativado</span>'}</span>
    </button>`;
  }).join('') : '<div class="empty">Nenhum usuário cadastrado. Use Novo usuário para dar o primeiro acesso.</div>';
  $('userList').querySelectorAll<HTMLButtonElement>('.urow').forEach(b => b.addEventListener('click', () => abrirUsuario(estado.usuarios.find(x => x.usuario === b.dataset.u) || null)));
}

// Opções de setores e células: listas fixas + o que já existe nos cadastros e usuários
function opcoes(tipo: 'setores' | 'celulas'): string[] {
  const vistos = new Map();
  const add = (v: string | undefined): void => { const k = norm(v); if (v && !vistos.has(k)) vistos.set(k, v); };
  (tipo === 'setores' ? SETORES : CELULAS.filter(c => !FECHADAS.has(c))).forEach(add);
  estado.regs.forEach(r => add(tipo === 'setores' ? r.setor : r.celula));
  estado.usuarios.forEach(u => u[tipo].forEach(add));
  return [...vistos.values()];
}

function preencherChks(id: string, tipo: 'setores' | 'celulas', marcados: string[]) {
  const m = new Set(marcados.map(norm));
  $(id).innerHTML = opcoes(tipo).map(v => `<label><input type="checkbox" value="${esc(v)}" ${m.has(norm(v)) ? 'checked' : ''}><span>${tipo === 'celulas' ? `<i class="chk-cor" data-cor="${corDaCelula(v)}" aria-hidden="true"></i>` : ''}${esc(v)}</span></label>`).join('');
}
const marcados = (id: string): string[] => [...$(id).querySelectorAll<HTMLInputElement>('input:checked')].map(i => i.value);
const perfilAtual = (): string => document.querySelector<HTMLInputElement>('input[name="uPerfil"]:checked')?.value || '';

// Liderança sem célula (Spec 013): login de área ou setor sem cadastro pode criar o cadastro junto
function atualizarLiderUI() {
  const p = perfilAtual();
  const pode = estado.escopo.todos && (p === 'AREA' || p === 'SETOR') && !$<HTMLSelectElement>('uCadastro').value;
  $('uLiderWrap').classList.toggle('hidden', !pode);
  $('uLiderCampos').classList.toggle('hidden', !pode || !$<HTMLInputElement>('uCriarCad').checked);
}
$('uCadastro').addEventListener('change', atualizarLiderUI);
$('uCriarCad').addEventListener('change', atualizarLiderUI);

function atualizarPerfilUI() {
  atualizarLiderUI();
  const p = perfilAtual();
  $('uSetoresWrap').classList.toggle('hidden', p !== 'SETOR');
  $('uCelulasWrap').classList.toggle('hidden', p !== 'SETOR' && p !== 'CELULA');
  $('uCelulasLbl').textContent = p === 'SETOR' ? 'Também lidera células de outro setor? (opcional)' : 'Células que lidera';
  $('uPerfilHint').textContent = p === 'AREA' ? 'Vê todos os cadastros da área.'
    : p === 'SETOR' ? 'Vê todos os cadastros dos setores marcados.'
    : p === 'CELULA' ? 'Vê apenas os cadastros das células marcadas.'
    : p === 'DISCIPULADOR' ? 'Não lidera célula: vê apenas os próprios discípulos.' : '';
}
document.querySelectorAll<HTMLInputElement>('input[name="uPerfil"]').forEach(r => r.addEventListener('change', atualizarPerfilUI));

function abrirUsuario(u: UsuarioPainel | null) {
  editando = u || null;
  const novo = !u;
  const eu = !!u && u.usuario === lerSessao()?.usuario;
  $('uTitle').textContent = novo ? 'Novo usuário' : (u.nome || u.usuario);
  $('uSub').textContent = novo ? 'Acesso ao painel da liderança' : '@' + u.usuario + (eu ? ' · você' : '');
  $<HTMLInputElement>('uNome').value = u ? (u.nome || '') : '';
  $<HTMLInputElement>('uLogin').value = u ? u.usuario : '';
  $<HTMLInputElement>('uLogin').disabled = !novo;
  $('uLoginHint').textContent = novo ? 'Letras minúsculas, números, ponto, hífen ou sublinhado. Sem espaços.' : 'O usuário não pode ser alterado.';
  $<HTMLInputElement>('uSenha').value = '';
  $('uSenhaLbl').textContent = novo ? 'Senha' : 'Nova senha';
  $('uSenhaHint').textContent = novo ? 'Mínimo de 6 caracteres. Use Gerar para criar uma senha segura.' : 'Deixe em branco para manter a senha atual.';
  const perfil = u && u.perfil ? u.perfil : 'CELULA';
  document.querySelectorAll<HTMLInputElement>('input[name="uPerfil"]').forEach(r => { r.checked = r.value === perfil; });
  $('uCadastro').innerHTML = '<option value="">Sem cadastro ligado</option>' + opcoesPessoas(estado.pessoas, u ? u.cadastro : 0);
  preencherChks('uSetores', 'setores', u ? u.setores : []);
  preencherChks('uCelulas', 'celulas', u ? u.celulas : []);
  $<HTMLInputElement>('uAtivo').checked = u ? u.ativo : true;
  $<HTMLInputElement>('uGerencia').checked = u ? u.gerencia : false;
  $<HTMLInputElement>('uAtivo').disabled = eu;
  $<HTMLInputElement>('uGerencia').disabled = eu;
  $<HTMLInputElement>('uCriarCad').checked = false;
  $<HTMLInputElement>('uNasc').value = ''; $<HTMLInputElement>('uTel').value = ''; $<HTMLInputElement>('uAut').checked = false;
  $<HTMLInputElement>('uNasc').max = regrasContato.iso(new Date());
  atualizarPerfilUI();
  $('uMsg').textContent = '';
  $('uCampos').classList.remove('hidden');
  $('uShare').classList.add('hidden');
  $<HTMLDialogElement>('uDlg').showModal();
  $('uDlg').scrollTop = 0;
}

$('btnNovoUsuario').addEventListener('click', () => abrirUsuario(null));
$('userList').addEventListener('click', e => { if (e.target instanceof Element && e.target.closest('[data-recarregar]')) carregarUsuarios(); });
$('uClose').addEventListener('click', () => $<HTMLDialogElement>('uDlg').close());
$('uConcluir').addEventListener('click', () => $<HTMLDialogElement>('uDlg').close());

$('uGerar').addEventListener('click', () => {
  const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint32Array(10);
  crypto.getRandomValues(a);
  $<HTMLInputElement>('uSenha').value = [...a].map(x => c[x % c.length]).join('');
});

$('uForm').addEventListener('submit', async e => {
  e.preventDefault();
  const s = lerSessao();
  if (!s) { $<HTMLDialogElement>('uDlg').close(); return mostrarLogin('Sua sessão expirou. Entre novamente.'); }
  const novo = !editando;
  const perfil = perfilAtual();
  const dados = {
    acao: 'usuario_salvar', token: s.token, novo,
    usuario: novo ? $<HTMLInputElement>('uLogin').value.trim().toLowerCase() : editando!.usuario,
    nome: $<HTMLInputElement>('uNome').value.trim(),
    senha: $<HTMLInputElement>('uSenha').value,
    perfil,
    setores: perfil === 'SETOR' ? marcados('uSetores') : [],
    celulas: perfil === 'SETOR' || perfil === 'CELULA' ? marcados('uCelulas') : [],
    cadastro: Number($<HTMLSelectElement>('uCadastro').value) || 0,
    ativo: $<HTMLInputElement>('uAtivo').checked,
    gerencia: $<HTMLInputElement>('uGerencia').checked,
    ...(!$('uLiderWrap').classList.contains('hidden') && $<HTMLInputElement>('uCriarCad').checked
      ? { criarCadastro: { nascimento: $<HTMLInputElement>('uNasc').value, telefone: regrasNovaPessoa.digitos($<HTMLInputElement>('uTel').value), autorizou: $<HTMLInputElement>('uAut').checked } } : {})
  };
  const criaCadastro = 'criarCadastro' in dados;

  const msg = $('uMsg');
  let erro = '';
  if (!dados.nome) erro = 'nome_obrigatorio';
  else if (!/^[a-z0-9._-]{3,30}$/.test(dados.usuario)) erro = 'usuario_invalido';
  else if ((novo || dados.senha) && dados.senha.length < 6) erro = 'senha_curta';
  else if (!perfil) erro = 'perfil_invalido';
  else if (perfil === 'SETOR' && !dados.setores.length) erro = 'escopo_obrigatorio';
  else if (perfil === 'CELULA' && !dados.celulas.length) erro = 'escopo_obrigatorio';
  else if (perfil === 'DISCIPULADOR' && !dados.cadastro) erro = 'cadastro_obrigatorio';
  else if (criaCadastro && !/^\d{4}-\d{2}-\d{2}$/.test($<HTMLInputElement>('uNasc').value)) erro = 'nascimento_invalido';
  else if (criaCadastro && !$<HTMLInputElement>('uAut').checked) erro = 'consentimento';
  if (erro) { msg.textContent = MSG_USUARIO[erro]; return; }

  const btn = $<HTMLButtonElement>('uSalvar');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Salvando...';
  msg.textContent = '';
  try {
    const r = await api<SalvarUsuarioResult>(dados);
    if (!r.ok) {
      if (sessaoInvalida(r)) { $<HTMLDialogElement>('uDlg').close(); return; }
      msg.textContent = MSG_USUARIO[r.erro || ''] || 'Não foi possível salvar. Tente de novo.';
      return;
    }
    if (r.token && r.expiraEm) salvarSessao({ ...s, token: r.token, expira: Date.now() + (r.expiraEm - 60) * 1000 });
    carregarUsuarios();
    if (criaCadastro) carregar(); // o cadastro novo do líder entra na lista e na escolha de discipulador
    if (dados.senha) {
      const txt = `Olá, ${dados.nome}! Este é o seu acesso ao painel da Área VEC:\n\nEndereço: ${location.origin}/admin\nUsuário: ${dados.usuario}\nSenha: ${dados.senha}\n\nNão compartilhe esta senha com outras pessoas.`;
      $('uShareTxt').textContent = txt;
      $<HTMLAnchorElement>('uWhats').href = 'https://wa.me/?text=' + encodeURIComponent(txt);
      $('uCopiar').textContent = 'Copiar';
      $('uCampos').classList.add('hidden');
      $('uShare').classList.remove('hidden');
      $('uDlg').scrollTop = 0;
    } else {
      $<HTMLDialogElement>('uDlg').close();
    }
  } catch (err) {
    msg.textContent = 'Não foi possível conectar. Verifique a internet.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar';
  }
});

$('uCopiar').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('uShareTxt').textContent);
    $('uCopiar').textContent = 'Copiado!';
  } catch (e) {
    const r = document.createRange();
    r.selectNodeContents($('uShareTxt'));
    const sel = getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(r); }
    $('uCopiar').textContent = 'Texto selecionado';
  }
});
$<HTMLDialogElement>('uDlg').addEventListener('click', e => { if (e.target === $<HTMLDialogElement>('uDlg')) $<HTMLDialogElement>('uDlg').close(); });

async function carregarVersaoDeploy() {
  let versao = 'indisponível';
  try {
    const r = await fetch('/version', { cache: 'no-store' });
    if (r.ok) versao = (await r.text()).trim() || versao;
  } catch {
    // O painel e o login continuam disponíveis sem a informação de versão.
  }
  document.querySelectorAll('[data-deploy-version]').forEach(el => { el.textContent = `Versão: ${versao}`; });
}

// ── Início ──
carregarVersaoDeploy();
if (lerSessao()) entrar(); else mostrarLogin();
