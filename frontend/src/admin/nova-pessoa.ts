// ══════ NOVA PESSOA (Spec 010) ══════
// O líder cadastra quem já aceitou Jesus e é membro de uma célula do seu escopo, com a
// autorização verbal da pessoa. Depois de salvar, a ficha abre no Resumo: a trilha
// (jornada, discipulador e contato) segue com o que o painel já tem.

type CriarResult = ApiResult & { registro?: Registro; existente?: { linha: number; nome: string; celula: string } };

const novaDlg = document.createElement('dialog');
novaDlg.className = 'ct-dlg np-dlg';
novaDlg.setAttribute('aria-labelledby', 'npTitulo');
novaDlg.innerHTML = `<div class="det-head"><div><p class="ct-kick">Nova pessoa</p><h3 id="npTitulo">Cadastrar membro</h3></div>
  <button class="icon-btn" type="button" data-fechar aria-label="Fechar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
  <form class="det-body np-form" id="npForm" novalidate>
    <p class="np-intro">Para quem já aceitou Jesus e é membro de uma célula. Depois de salvar, a ficha abre para seguir a trilha.</p>
    <div class="field" id="npF-nome"><label class="label" for="npNome">Nome completo</label><input class="input" id="npNome" autocomplete="off" autocapitalize="words" maxlength="200"><p class="msg" id="npE-nome"></p></div>
    <div class="np-duas">
      <div class="field" id="npF-nascimento"><label class="label" for="npNasc">Data de nascimento</label><input class="input" id="npNasc" type="date" min="1900-01-01"><p class="msg" id="npE-nascimento"></p></div>
      <div class="field" id="npF-telefone"><label class="label" for="npTel">WhatsApp <span class="opc">opcional</span></label><input class="input" id="npTel" type="tel" inputmode="tel" autocomplete="off" placeholder="(85) 99999-9999" maxlength="20"><p class="msg" id="npE-telefone"></p></div>
    </div>
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
const novoEnvio = (): string => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
const celulasNova = (): string[] => regrasNovaPessoa.celulasPermitidas(estado.escopo, estrutura.celulas.map(c => ({ nome: c.nome, setor: c.setor, ativa: c.ativa })));

// O botão só aparece para quem pode cadastrar em pelo menos uma célula
function atualizarBotoesNova() {
  const pode = celulasNova().length > 0;
  document.querySelectorAll<HTMLElement>('[data-nova-pessoa]').forEach(b => b.classList.toggle('hidden', !pode));
}

function abrirNovaPessoa() {
  const cels = celulasNova();
  if (!cels.length) return;
  npEnvio = novoEnvio();
  $<HTMLFormElement>('npForm').reset();
  const preferida = cels.includes(estado.celula) ? estado.celula : cels.length === 1 ? cels[0] : '';
  $('npCelula').innerHTML = (cels.length > 1 ? '<option value="">Escolha a célula</option>' : '') + cels.map(c => `<option${c === preferida ? ' selected' : ''}>${esc(c)}</option>`).join('');
  $<HTMLSelectElement>('npCelula').disabled = cels.length === 1;
  $('npCelulaUnica').textContent = cels.length === 1 ? 'É a célula que você lidera.' : '';
  $('npDisc').innerHTML = '<option value="">Sem discipulador por enquanto</option>' + opcoesPessoas(estado.pessoas, 0);
  $<HTMLInputElement>('npNasc').max = regrasContato.iso(new Date());
  mostrarErrosNova({});
  $('npDup').classList.add('hidden');
  $('npMsg').textContent = '';
  novaDlg.showModal();
  $<HTMLInputElement>('npNome').focus();
}

function mostrarErrosNova(e: Record<string, string>) {
  ['nome', 'nascimento', 'telefone', 'celula', 'autorizou'].forEach(k => {
    $(`npE-${k}`).textContent = e[k] || '';
    $(`npF-${k}`).classList.toggle('invalid', !!e[k]);
  });
  const primeiro = ['nome', 'nascimento', 'telefone', 'celula', 'autorizou'].find(k => e[k]);
  if (primeiro) ({ nome: $('npNome'), nascimento: $('npNasc'), telefone: $('npTel'), celula: $('npCelula'), autorizou: $('npAut') } as Record<string, HTMLElement>)[primeiro].focus();
}

// Máscara do WhatsApp, como no formulário público
$('npTel').addEventListener('input', () => {
  const i = $<HTMLInputElement>('npTel');
  const d = regrasNovaPessoa.digitos(i.value).slice(0, 11);
  i.value = d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
});

$('npForm').addEventListener('submit', async e => {
  e.preventDefault();
  const s = lerSessao();
  if (!s) { novaDlg.close(); return mostrarLogin('Sua sessão expirou. Entre novamente.'); }
  const p: NovaPessoa = {
    nome: $<HTMLInputElement>('npNome').value.trim(), nascimento: $<HTMLInputElement>('npNasc').value,
    celula: $<HTMLSelectElement>('npCelula').value, telefone: $<HTMLInputElement>('npTel').value, autorizou: $<HTMLInputElement>('npAut').checked
  };
  const erros = regrasNovaPessoa.validar(p, regrasContato.iso(new Date()));
  mostrarErrosNova(erros);
  $('npDup').classList.add('hidden');
  $('npMsg').textContent = '';
  if (Object.keys(erros).length) return;
  const btn = $<HTMLButtonElement>('npSalvar');
  btn.disabled = true;
  try {
    const jesus = novaDlg.querySelector<HTMLInputElement>('input[name="npJesus"]:checked')?.value || 'S';
    const res = await api<CriarResult>({
      acao: 'registro_criar', token: s.token, requestId: npEnvio, autorizou: p.autorizou,
      dados: { nome: p.nome, nascimento: p.nascimento, celula: p.celula, telefone: regrasNovaPessoa.digitos(p.telefone), recebeuJesus: jesus, discipuladorId: Number($<HTMLSelectElement>('npDisc').value) || 0 }
    });
    if (!res.ok) {
      if (res.erro === 'sessao') { limparSessao(); novaDlg.close(); return mostrarLogin('Sua sessão expirou. Entre novamente.'); }
      if (res.erro === 'duplicado' && res.existente) {
        const ex = res.existente;
        $('npDup').innerHTML = `<p><b>${esc(ex.nome)}</b> já tem cadastro${ex.celula ? ` na ${esc(ex.celula)}` : ''}. Não dá para cadastrar de novo.</p><button type="button" class="b-sec" data-abrir="${ex.linha}">Abrir cadastro</button>`;
        $('npDup').classList.remove('hidden');
        $('npDup').querySelector<HTMLButtonElement>('button')?.focus();
        return;
      }
      $('npMsg').textContent = regrasNovaPessoa.mensagem(res.erro || '');
      return;
    }
    const r = res.registro;
    if (!r) return;
    const x: Registro = { ...r } as Registro;
    Object.keys(r).forEach(k => { x[k] = typeof r[k] === 'string' ? String(r[k]).trim() : r[k]; });
    derivar(x);
    estado.regs = [x, ...estado.regs.filter(o => o.linha !== x.linha)];
    estado.pessoas = [...estado.pessoas.filter(o => o.id !== x.linha), { id: x.linha, nome: x.nome, celula: String(x.celula || '') }].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    npEnvio = novoEnvio();
    novaDlg.close();
    atualizarPainel();
    abaDetalhe = 'resumo';
    abrirDetalhe(x);
    avisoRapido(`Cadastro de ${curtoNome(x.nome)} criado. Siga a trilha pela ficha.`);
  } catch {
    $('npMsg').textContent = 'Não foi possível conectar. Verifique a internet. Ao tentar de novo, nada é duplicado.';
  } finally {
    btn.disabled = false;
  }
});

novaDlg.addEventListener('click', e => {
  const alvo = e.target instanceof Element ? e.target : null;
  if (e.target === novaDlg || alvo?.closest('[data-fechar]')) { novaDlg.close(); return; }
  const abrir = alvo?.closest<HTMLElement>('[data-abrir]');
  const r = abrir ? estado.regs.find(x => x.linha === Number(abrir.dataset.abrir)) : undefined;
  if (r) { novaDlg.close(); abrirDetalhe(r); }
});
document.addEventListener('click', e => {
  if (e.target instanceof Element && e.target.closest('[data-nova-pessoa]')) abrirNovaPessoa();
});
