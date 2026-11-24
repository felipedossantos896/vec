"use strict";
// ══════ NOVA PESSOA (Spec 010) ══════
// O líder cadastra quem já aceitou Jesus e é membro de uma célula do seu escopo, com a
// autorização verbal da pessoa. Depois de salvar, a ficha abre no Resumo: a trilha
// (jornada, discipulador e contato) segue com o que o painel já tem.
const novaDlg = document.createElement('dialog');
novaDlg.className = 'ct-dlg np-dlg';
novaDlg.setAttribute('aria-labelledby', 'npTitulo');
novaDlg.innerHTML = `<div class="det-head"><div><p class="ct-kick">Nova pessoa</p><h3 id="npTitulo">Cadastrar membro</h3></div>
  <button class="icon-btn" type="button" data-fechar aria-label="Fechar">${icone('fechar', { classe: 'ic-18' })}</button></div>
  <form class="det-body np-form" id="npForm" novalidate>
    <p class="np-intro" id="npIntro">Para quem já aceitou Jesus e é membro de uma célula. Depois de salvar, a ficha abre para seguir a trilha.</p>
    <div class="field" id="npF-nome"><label class="label" for="npNome">Nome completo</label><input class="input" id="npNome" autocomplete="off" autocapitalize="words" maxlength="200"><p class="msg" id="npE-nome"></p></div>
    <div class="np-duas">
      <div class="field" id="npF-nascimento"><label class="label" for="npNasc">Data de nascimento</label><input class="input" id="npNasc" type="date" min="1900-01-01"><p class="msg" id="npE-nascimento"></p></div>
      <div class="field" id="npF-telefone"><label class="label" for="npTel">WhatsApp <span class="opc">opcional</span></label><input class="input" id="npTel" type="tel" inputmode="tel" autocomplete="off" placeholder="(85) 99999-9999" maxlength="20"><p class="msg" id="npE-telefone"></p></div>
    </div>
    <fieldset class="field np-papel hidden" id="npPapelWrap"><legend class="label">Quem é</legend>
      <div class="ct-dias">${regrasLideranca.PAPEIS.map(([k, l], i) => `<label class="ct-dia"><input type="radio" name="npPapel" value="${k}"${i === 0 ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <p class="field-hint" id="npPapelHint"></p></fieldset>
    <div class="field hidden" id="npF-setor"><label class="label" for="npSetor">Setor que lidera</label><select class="input" id="npSetor"></select><p class="msg" id="npE-setor"></p></div>
    <div class="field" id="npF-celula"><label class="label" for="npCelula">Célula</label><select class="input" id="npCelula"></select><p class="field-hint" id="npCelulaUnica"></p><p class="msg" id="npE-celula"></p></div>
    <div class="field"><label class="label" for="npDisc">Discipulador <span class="opc">opcional</span></label><select class="input" id="npDisc"></select></div>
    <fieldset class="field np-jesus"><legend class="label">Já recebeu Jesus como Senhor e Salvador?</legend>
      <div class="ct-dias"><label class="ct-dia"><input type="radio" name="npJesus" value="S" checked><span>Sim</span></label><label class="ct-dia"><input type="radio" name="npJesus" value="N"><span>Não</span></label></div></fieldset>
    <label class="np-aut" id="npF-autorizou"><input type="checkbox" id="npAut"><span>A pessoa autorizou a liderança da Área VEC a guardar estes dados e usá-los para acompanhá-la na caminhada.</span></label>
    <p class="msg" id="npE-autorizou"></p>
    <div class="np-dup hidden" id="npDup" role="alert"></div>
    <p class="msg" id="npMsg" role="alert"></p>
    <button type="submit" class="btn-primary" id="npSalvar">Cadastrar e abrir a ficha</button>
  </form>`;
document.body.appendChild(novaDlg);
let npEnvio = '';
const novoEnvio = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
const celulasNova = () => regrasNovaPessoa.celulasPermitidas(estado.escopo, estrutura.celulas.map(c => ({ nome: c.nome, setor: c.setor, ativa: c.ativa })));
// O botão só aparece para quem pode cadastrar em pelo menos uma célula
function atualizarBotoesNova() {
    const pode = celulasNova().length > 0;
    document.querySelectorAll('[data-nova-pessoa]').forEach(b => b.classList.toggle('hidden', !pode));
}
function abrirNovaPessoa() {
    const cels = celulasNova();
    if (!cels.length)
        return;
    npEnvio = novoEnvio();
    $('npForm').reset();
    const preferida = cels.includes(estado.celula) ? estado.celula : cels.length === 1 ? cels[0] : '';
    $('npCelula').innerHTML = (cels.length > 1 ? '<option value="">Escolha a célula</option>' : '') + cels.map(c => `<option${c === preferida ? ' selected' : ''}>${esc(c)}</option>`).join('');
    $('npCelula').disabled = cels.length === 1;
    $('npCelulaUnica').textContent = cels.length === 1 ? 'É a célula que você lidera.' : '';
    $('npDisc').innerHTML = '<option value="">Sem discipulador por enquanto</option>' + opcoesPessoas(estado.pessoas, 0);
    // Liderança sem célula (Spec 013): só quem vê a área toda cadastra líderes
    $('npPapelWrap').classList.toggle('hidden', !estado.escopo.todos);
    $('npSetor').innerHTML = '<option value="">Escolha o setor</option>' + estrutura.setores.map(x => `<option>${esc(x.nome)}</option>`).join('');
    ajustarPapelNova();
    $('npNasc').max = regrasContato.iso(new Date());
    mostrarErrosNova({});
    $('npDup').classList.add('hidden');
    $('npMsg').textContent = '';
    novaDlg.showModal();
    $('npNome').focus();
}
const papelNova = () => novaDlg.querySelector('input[name="npPapel"]:checked')?.value || 'membro';
function ajustarPapelNova() {
    const papel = papelNova();
    $('npF-celula').classList.toggle('hidden', papel !== 'membro');
    $('npF-setor').classList.toggle('hidden', papel !== 'lider_setor');
    $('npPapelHint').textContent = papel === 'membro' ? '' : papel === 'lider_setor'
        ? 'Sem célula fixa: supervisiona as células do setor. Tem jornada e pode ser discipulador.'
        : 'Sem célula fixa nem jornada: supervisiona a área e pode ser discipulador.';
    $('npIntro').textContent = papel === 'membro' ? 'Para quem já aceitou Jesus e é membro de uma célula. Depois de salvar, a ficha abre para seguir a trilha.'
        : 'Cadastro de liderança, sem célula. Depois de salvar, ele já aparece na escolha de discipulador.';
}
novaDlg.addEventListener('change', e => { if (e.target?.name === 'npPapel')
    ajustarPapelNova(); });
function mostrarErrosNova(e) {
    ['nome', 'nascimento', 'telefone', 'celula', 'setor', 'autorizou'].forEach(k => {
        $(`npE-${k}`).textContent = e[k] || '';
        $(`npF-${k}`).classList.toggle('invalid', !!e[k]);
    });
    const primeiro = ['nome', 'nascimento', 'telefone', 'celula', 'setor', 'autorizou'].find(k => e[k]);
    if (primeiro)
        ({ nome: $('npNome'), nascimento: $('npNasc'), telefone: $('npTel'), celula: $('npCelula'), setor: $('npSetor'), autorizou: $('npAut') }[primeiro].focus());
}
// Máscara do WhatsApp, como no formulário público
$('npTel').addEventListener('input', () => {
    const i = $('npTel');
    const d = regrasNovaPessoa.digitos(i.value).slice(0, 11);
    i.value = d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
});
$('npForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const s = lerSessao();
    if (!s) {
        novaDlg.close();
        return mostrarLogin('Sua sessão expirou. Entre novamente.');
    }
    const p = {
        nome: $('npNome').value.trim(), nascimento: $('npNasc').value,
        celula: $('npCelula').value, telefone: $('npTel').value, autorizou: $('npAut').checked,
        papel: papelNova(), setor: $('npSetor').value
    };
    const erros = regrasNovaPessoa.validar(p, regrasContato.iso(new Date()));
    mostrarErrosNova(erros);
    $('npDup').classList.add('hidden');
    $('npMsg').textContent = '';
    if (Object.keys(erros).length)
        return;
    const btn = $('npSalvar');
    btn.disabled = true;
    try {
        const jesus = novaDlg.querySelector('input[name="npJesus"]:checked')?.value || 'S';
        const res = await api({
            acao: 'registro_criar', token: s.token, requestId: npEnvio, autorizou: p.autorizou, papel: p.papel,
            dados: { nome: p.nome, nascimento: p.nascimento, celula: p.papel === 'membro' ? p.celula : '', setor: p.papel === 'lider_setor' ? (p.setor || '') : '', telefone: regrasNovaPessoa.digitos(p.telefone), recebeuJesus: jesus, discipuladorId: Number($('npDisc').value) || 0 }
        });
        if (!res.ok) {
            if (res.erro === 'sessao') {
                limparSessao();
                novaDlg.close();
                return mostrarLogin('Sua sessão expirou. Entre novamente.');
            }
            if (res.erro === 'duplicado' && res.existente) {
                const ex = res.existente;
                $('npDup').innerHTML = `<p><b title="${esc(regrasNomes.completo(ex.nome))}">${esc(nomeCurtoId(ex.linha, ex.nome))}</b> já tem cadastro${ex.celula ? ` na ${esc(ex.celula)}` : ''}. Não dá para cadastrar de novo.</p><button type="button" class="b-sec" data-abrir="${ex.linha}">Abrir cadastro</button>`;
                $('npDup').classList.remove('hidden');
                $('npDup').querySelector('button')?.focus();
                return;
            }
            $('npMsg').textContent = regrasNovaPessoa.mensagem(res.erro || '');
            return;
        }
        const r = res.registro;
        if (!r)
            return;
        const x = { ...r };
        Object.keys(r).forEach(k => { x[k] = typeof r[k] === 'string' ? String(r[k]).trim() : r[k]; });
        derivar(x);
        estado.regs = [x, ...estado.regs.filter(o => o.linha !== x.linha)];
        estado.pessoas = [...estado.pessoas.filter(o => o.id !== x.linha), { id: x.linha, nome: x.nome, celula: String(x.celula || ''), papel: regrasLideranca.papel(x), setor: String(x.setor || '') }].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        npEnvio = novoEnvio();
        novaDlg.close();
        atualizarPainel();
        abaDetalhe = 'resumo';
        abrirDetalhe(x);
        avisoRapido(`Cadastro de ${nomeCurto(x)} criado. Siga a trilha pela ficha.`);
    }
    catch {
        $('npMsg').textContent = 'Não foi possível conectar. Verifique a internet. Ao tentar de novo, nada é duplicado.';
    }
    finally {
        btn.disabled = false;
    }
});
novaDlg.addEventListener('click', e => {
    const alvo = e.target instanceof Element ? e.target : null;
    if (e.target === novaDlg || alvo?.closest('[data-fechar]')) {
        novaDlg.close();
        return;
    }
    const abrir = alvo?.closest('[data-abrir]');
    const r = abrir ? estado.regs.find(x => x.linha === Number(abrir.dataset.abrir)) : undefined;
    if (r) {
        novaDlg.close();
        abrirDetalhe(r);
    }
});
document.addEventListener('click', e => {
    if (e.target instanceof Element && e.target.closest('[data-nova-pessoa]'))
        abrirNovaPessoa();
});
