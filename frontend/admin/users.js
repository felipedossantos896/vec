"use strict";
// ══════ USUÁRIOS ══════
const PERFIL_LABEL = { AREA: 'Líder de área', SETOR: 'Líder de setor', CELULA: 'Líder de célula' };
const MSG_USUARIO = {
    usuario_invalido: 'Usuário inválido: use de 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado, sem espaços.',
    usuario_existe: 'Já existe alguém com esse usuário. Escolha outro.',
    nome_obrigatorio: 'Informe o nome.',
    senha_curta: 'A senha precisa ter pelo menos 6 caracteres.',
    senha_longa: 'A senha pode ter no máximo 256 caracteres.',
    perfil_invalido: 'Escolha um perfil.',
    escopo_obrigatorio: 'Marque pelo menos um item de acesso.',
    nao_encontrado: 'Usuário não encontrado. Atualize a lista e tente de novo.',
    auto_bloqueio: 'Você não pode desativar o próprio acesso nem remover sua permissão de gerenciar usuários.'
};
let editando = null;
document.querySelectorAll('#tabs button').forEach(b => b.addEventListener('click', () => mostrarAba(b.dataset.aba || 'cadastros')));
function mostrarAba(aba) {
    estado.aba = aba;
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
    $('cadastrosView').classList.toggle('hidden', aba !== 'cadastros');
    $('usersView').classList.toggle('hidden', aba !== 'usuarios');
    if (aba === 'usuarios' && !estado.usuariosCarregados)
        carregarUsuarios();
}
function sessaoInvalida(r) {
    if (r.erro === 'sessao') {
        limparSessao();
        mostrarLogin('Sua sessão expirou. Entre novamente.');
        return true;
    }
    if (r.erro === 'sem_escopo') {
        limparSessao();
        mostrarLogin('Seu acesso ainda não foi configurado. Fale com a liderança da área.');
        return true;
    }
    if (r.erro === 'sem_permissao') {
        estado.gerencia = false;
        $('tabs').classList.add('hidden');
        mostrarAba('cadastros');
        return true;
    }
    return false;
}
async function carregarUsuarios() {
    const s = lerSessao();
    if (!s)
        return mostrarLogin('Sua sessão expirou. Entre novamente.');
    $('userList').innerHTML = '<div class="loading"><span class="spinner"></span>Carregando usuários...</div>';
    $('btnRefresh').disabled = true;
    try {
        const r = await api({ acao: 'usuarios_listar', token: s.token });
        if (!r.ok) {
            if (sessaoInvalida(r))
                return;
            throw new Error(r.erro);
        }
        estado.usuarios = r.usuarios;
        estado.usuariosCarregados = true;
        renderUsuarios();
    }
    catch (e) {
        $('userList').innerHTML = '<div class="empty">Não foi possível carregar os usuários. <button class="btn-sec" type="button" onclick="carregarUsuarios()">Tentar novamente</button></div>';
    }
    finally {
        $('btnRefresh').disabled = false;
    }
}
function escopoTexto(u) {
    if (u.perfil === 'AREA')
        return 'Vê todos os cadastros da área';
    const p = [];
    if (u.setores.length)
        p.push((u.setores.length > 1 ? 'Setores: ' : 'Setor: ') + u.setores.join(', '));
    if (u.celulas.length)
        p.push((u.celulas.length > 1 ? 'Células: ' : 'Célula: ') + u.celulas.join(', '));
    return p.join(' · ') || 'Acesso ainda não configurado';
}
function renderUsuarios() {
    const lista = [...estado.usuarios].sort((a, b) => (Number(b.ativo) - Number(a.ativo)) || String(a.nome || a.usuario).localeCompare(String(b.nome || b.usuario), 'pt-BR'));
    const ativos = lista.filter(u => u.ativo).length;
    $('userCount').textContent = `${ativos} ativo${ativos === 1 ? '' : 's'} de ${lista.length}`;
    $('userList').innerHTML = lista.length ? lista.map(u => `
    <button type="button" class="uitem ${u.ativo ? '' : 'off'}" data-u="${esc(u.usuario)}">
      <span class="u-top"><span class="u-name">${esc(u.nome || u.usuario)}</span><span class="badge ${u.ativo ? '' : 'off'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></span>
      <span class="u-login">@${esc(u.usuario)} · ${PERFIL_LABEL[u.perfil] || 'Sem perfil'}${u.gerencia ? ' · gerencia usuários' : ''}</span>
      <span class="u-scope">${esc(escopoTexto(u))}</span>
      <span class="u-meta">${u.acesso ? 'Último acesso: ' + esc(u.acesso) : 'Ainda não acessou'}</span>
    </button>`).join('') : '<div class="empty">Nenhum usuário cadastrado.</div>';
    $('userList').querySelectorAll('.uitem').forEach(b => b.addEventListener('click', () => abrirUsuario(estado.usuarios.find(x => x.usuario === b.dataset.u) || null)));
}
// Opções de setores e células: listas fixas + o que já existe nos cadastros e usuários
function opcoes(tipo) {
    const vistos = new Map();
    const add = (v) => { const k = norm(v); if (v && !vistos.has(k))
        vistos.set(k, v); };
    (tipo === 'setores' ? SETORES : CELULAS).forEach(add);
    estado.regs.forEach(r => add(tipo === 'setores' ? r.setor : r.celula));
    estado.usuarios.forEach(u => u[tipo].forEach(add));
    return [...vistos.values()];
}
function preencherChks(id, tipo, marcados) {
    const m = new Set(marcados.map(norm));
    $(id).innerHTML = opcoes(tipo).map(v => `<label><input type="checkbox" value="${esc(v)}" ${m.has(norm(v)) ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('');
}
const marcados = (id) => [...$(id).querySelectorAll('input:checked')].map(i => i.value);
const perfilAtual = () => document.querySelector('input[name="uPerfil"]:checked')?.value || '';
function atualizarPerfilUI() {
    const p = perfilAtual();
    $('uSetoresWrap').classList.toggle('hidden', p !== 'SETOR');
    $('uCelulasWrap').classList.toggle('hidden', p !== 'SETOR' && p !== 'CELULA');
    $('uCelulasLbl').textContent = p === 'SETOR' ? 'Também lidera células de outro setor? (opcional)' : 'Células que lidera';
    $('uPerfilHint').textContent = p === 'AREA' ? 'Vê todos os cadastros da área.'
        : p === 'SETOR' ? 'Vê todos os cadastros dos setores marcados.'
            : p === 'CELULA' ? 'Vê apenas os cadastros das células marcadas.' : '';
}
document.querySelectorAll('input[name="uPerfil"]').forEach(r => r.addEventListener('change', atualizarPerfilUI));
function abrirUsuario(u) {
    editando = u || null;
    const novo = !u;
    const eu = !!u && u.usuario === lerSessao()?.usuario;
    $('uTitle').textContent = novo ? 'Novo usuário' : (u.nome || u.usuario);
    $('uSub').textContent = novo ? 'Acesso ao painel da liderança' : '@' + u.usuario + (eu ? ' · você' : '');
    $('uNome').value = u ? (u.nome || '') : '';
    $('uLogin').value = u ? u.usuario : '';
    $('uLogin').disabled = !novo;
    $('uLoginHint').textContent = novo ? 'Letras minúsculas, números, ponto, hífen ou sublinhado. Sem espaços.' : 'O usuário não pode ser alterado.';
    $('uSenha').value = '';
    $('uSenhaLbl').textContent = novo ? 'Senha' : 'Nova senha';
    $('uSenhaHint').textContent = novo ? 'Mínimo de 6 caracteres. Toque em Gerar para criar uma senha segura.' : 'Deixe em branco para manter a senha atual.';
    const perfil = u && u.perfil ? u.perfil : 'CELULA';
    document.querySelectorAll('input[name="uPerfil"]').forEach(r => { r.checked = r.value === perfil; });
    preencherChks('uSetores', 'setores', u ? u.setores : []);
    preencherChks('uCelulas', 'celulas', u ? u.celulas : []);
    $('uAtivo').checked = u ? u.ativo : true;
    $('uGerencia').checked = u ? u.gerencia : false;
    $('uAtivo').disabled = eu;
    $('uGerencia').disabled = eu;
    atualizarPerfilUI();
    $('uMsg').textContent = '';
    $('uCampos').classList.remove('hidden');
    $('uShare').classList.add('hidden');
    $('uDlg').showModal();
    $('uDlg').scrollTop = 0;
}
$('btnNovoUsuario').addEventListener('click', () => abrirUsuario(null));
$('uClose').addEventListener('click', () => $('uDlg').close());
$('uConcluir').addEventListener('click', () => $('uDlg').close());
$('uGerar').addEventListener('click', () => {
    const c = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const a = new Uint32Array(10);
    crypto.getRandomValues(a);
    $('uSenha').value = [...a].map(x => c[x % c.length]).join('');
});
$('uForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = lerSessao();
    if (!s) {
        $('uDlg').close();
        return mostrarLogin('Sua sessão expirou. Entre novamente.');
    }
    const novo = !editando;
    const perfil = perfilAtual();
    const dados = {
        acao: 'usuario_salvar', token: s.token, novo,
        usuario: novo ? $('uLogin').value.trim().toLowerCase() : editando.usuario,
        nome: $('uNome').value.trim(),
        senha: $('uSenha').value,
        perfil,
        setores: perfil === 'SETOR' ? marcados('uSetores') : [],
        celulas: perfil === 'SETOR' || perfil === 'CELULA' ? marcados('uCelulas') : [],
        ativo: $('uAtivo').checked,
        gerencia: $('uGerencia').checked
    };
    const msg = $('uMsg');
    let erro = '';
    if (!dados.nome)
        erro = 'nome_obrigatorio';
    else if (!/^[a-z0-9._-]{3,30}$/.test(dados.usuario))
        erro = 'usuario_invalido';
    else if ((novo || dados.senha) && dados.senha.length < 6)
        erro = 'senha_curta';
    else if (!perfil)
        erro = 'perfil_invalido';
    else if (perfil === 'SETOR' && !dados.setores.length)
        erro = 'escopo_obrigatorio';
    else if (perfil === 'CELULA' && !dados.celulas.length)
        erro = 'escopo_obrigatorio';
    if (erro) {
        msg.textContent = MSG_USUARIO[erro];
        return;
    }
    const btn = $('uSalvar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Salvando...';
    msg.textContent = '';
    try {
        const r = await api(dados);
        if (!r.ok) {
            if (sessaoInvalida(r)) {
                $('uDlg').close();
                return;
            }
            msg.textContent = MSG_USUARIO[r.erro || ''] || 'Não foi possível salvar. Tente novamente.';
            return;
        }
        if (r.token && r.expiraEm)
            salvarSessao({ ...s, token: r.token, expira: Date.now() + (r.expiraEm - 60) * 1000 });
        carregarUsuarios();
        if (dados.senha) {
            const txt = `Olá, ${dados.nome}! Este é o seu acesso ao painel da Área VEC:\n\nEndereço: ${location.origin}/admin\nUsuário: ${dados.usuario}\nSenha: ${dados.senha}\n\nNão compartilhe esta senha com outras pessoas.`;
            $('uShareTxt').textContent = txt;
            $('uWhats').href = 'https://wa.me/?text=' + encodeURIComponent(txt);
            $('uCopiar').textContent = 'Copiar';
            $('uCampos').classList.add('hidden');
            $('uShare').classList.remove('hidden');
            $('uDlg').scrollTop = 0;
        }
        else {
            $('uDlg').close();
        }
    }
    catch (err) {
        msg.textContent = 'Não foi possível conectar. Verifique a internet.';
    }
    finally {
        btn.disabled = false;
        btn.textContent = 'Salvar';
    }
});
$('uCopiar').addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText($('uShareTxt').textContent);
        $('uCopiar').textContent = 'Copiado!';
    }
    catch (e) {
        const r = document.createRange();
        r.selectNodeContents($('uShareTxt'));
        const sel = getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(r);
        }
        $('uCopiar').textContent = 'Texto selecionado';
    }
});
$('uDlg').addEventListener('click', e => { if (e.target === $('uDlg'))
    $('uDlg').close(); });
async function carregarVersaoDeploy() {
    const el = $('deployVersion');
    try {
        const r = await fetch('/version', { cache: 'no-store' });
        if (!r.ok)
            throw new Error(`http ${r.status}`);
        const v = (await r.text()).trim();
        if (!v)
            throw new Error('versão vazia');
        el.textContent = `version: ${v}`;
    }
    catch {
        el.textContent = 'version: indisponível';
    }
}
// ── Início ──
carregarVersaoDeploy();
if (lerSessao())
    entrar();
else
    mostrarLogin();
