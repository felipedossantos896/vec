"use strict";
// ══════ ANFITRIÃO (Spec 004) ══════
// Seção "Anfitrião" na ficha (confirmação registrada pelo líder) e painel
// "Escolher anfitrião" na aba Mapa. O ranking chega do servidor só com distâncias
// arredondadas; os nomes vêm da lista do escopo. A decisão é sempre da liderança.
const TEXTO_CONFIRMACAO = 'A pessoa confirmou que pode receber a célula em casa e pode desistir a qualquer momento.';
const ERROS_ANFITRIAO = {
    capacidade_invalida: 'Informe quantas pessoas cabem, de 2 a 50.',
    dias_invalidos: 'Marque ao menos um dia possível.',
    confirmacao_anfitriao: 'Marque a confirmação da pessoa para salvar.',
    nao_encontrado: 'Este cadastro não está mais disponível. Atualize a lista.',
    dados_invalidos: 'Algum campo não foi aceito. Confira e tente de novo.'
};
let anfitriaoAtual = null;
const blocoAnfitriao = () => `<div class="det-sec" id="anfSec"><h4>${icone('casa', { classe: 'ic-18' })}Anfitrião</h4><div id="anfCorpo"><p class="nota-fraca">Carregando…</p></div><p class="msg" id="anfMsg" role="alert"></p></div>`;
function renderAnfitriao(r) {
    const a = anfitriaoAtual;
    $('anfCorpo').innerHTML = a
        ? `<dl class="anf-dados"><div><dt>Cabem</dt><dd>${a.capacidade} pessoas</dd></div><div><dt>Dias possíveis</dt><dd>${esc(regrasAnfitriao.fmtDias(a.dias))}</dd></div>${a.observacao ? `<div><dt>Observação</dt><dd>${esc(a.observacao)}</dd></div>` : ''}</dl>
      <p class="field-hint">Confirmado em ${soData(a.confirmadoEm)} por ${esc(a.confirmadoPor)}.</p>
      <div class="end-acoes"><button type="button" class="btn-sec" data-anf="editar">Editar confirmação</button><button type="button" class="btn-link perigo" data-anf="remover">Remover confirmação</button></div>`
        : `<p class="nota-fraca">${r.interesseAnfitrao === 'S' ? 'Marcou interesse no formulário; ainda sem confirmação.' : 'Sem confirmação de anfitrião.'}</p>
      <div class="end-acoes"><button type="button" class="btn-sec" data-anf="editar">Registrar confirmação</button></div>`;
}
function formAnfitriao() {
    const a = anfitriaoAtual;
    const dias = new Set(a ? a.dias : []);
    $('anfCorpo').innerHTML = `<form id="anfForm" class="end-form" novalidate>
    <div class="field"><label class="label" for="anf_capacidade">Quantas pessoas cabem</label>
      <input class="input anf-cap" id="anf_capacidade" type="number" inputmode="numeric" min="${regrasAnfitriao.MIN}" max="${regrasAnfitriao.MAX}" value="${a ? a.capacidade : ''}" aria-describedby="anf_capacidade_erro">
      <p class="msg" id="anf_capacidade_erro"></p></div>
    <fieldset class="field anf-dias" id="anf_dias" aria-describedby="anf_dias_erro"><legend class="label">Dias possíveis</legend>
      <div class="anf-dias-op">${regrasAnfitriao.DIAS.map(([k, l]) => `<label><input type="checkbox" name="anf_dia" value="${k}"${dias.has(k) ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div>
      <p class="msg" id="anf_dias_erro"></p></fieldset>
    <div class="field"><label class="label" for="anf_observacao">Observação (opcional)</label>
      <input class="input" id="anf_observacao" maxlength="${regrasAnfitriao.MAX_OBS}" placeholder="Ex.: a partir das 19h; tem escada" value="${esc(a ? a.observacao : '')}" aria-describedby="anf_observacao_erro">
      <p class="msg" id="anf_observacao_erro"></p></div>
    <div class="field"><label class="end-consent"><input type="checkbox" id="anf_confirmacao" aria-describedby="anf_confirmacao_erro"><span>${TEXTO_CONFIRMACAO}</span></label><p class="msg" id="anf_confirmacao_erro"></p></div>
    <div class="end-acoes"><button type="submit" class="btn-sec solid" id="anfSalvar">Salvar confirmação</button><button type="button" class="btn-link" data-anf="cancelar">Cancelar</button></div>
  </form>`;
    $('anf_capacidade').focus();
}
function lerFormAnfitriao() {
    return {
        capacidade: $('anf_capacidade').value,
        dias: [...document.querySelectorAll('#anfForm input[name="anf_dia"]:checked')].map(i => i.value),
        observacao: $('anf_observacao').value
    };
}
// Marca cada campo com erro e foca o primeiro; devolve se está tudo certo.
function mostrarErrosAnfitriao(erros) {
    let primeiro = null;
    for (const k of ['capacidade', 'dias', 'observacao', 'confirmacao']) {
        const campo = $(`anf_${k}`);
        const alvo = k === 'dias' ? campo.querySelector('input') : campo;
        campo.setAttribute('aria-invalid', String(Boolean(erros[k])));
        campo.closest('.field')?.classList.toggle('invalid', Boolean(erros[k]));
        $(`anf_${k}_erro`).textContent = erros[k] || '';
        if (erros[k] && !primeiro)
            primeiro = alvo;
    }
    if (primeiro)
        primeiro.focus();
    return !primeiro;
}
// Chama o servidor; só atualiza a tela se a ficha ainda é desta pessoa.
async function chamarAnfitriao(r, payload, botao) {
    const s = lerSessao();
    if (!s) {
        $('det').close();
        mostrarLogin('Sua sessão expirou. Entre novamente.');
        return null;
    }
    if (botao)
        botao.disabled = true;
    try {
        const res = await api({ ...payload, linha: r.linha, token: s.token });
        if (registroAberto() !== r || !document.getElementById('anfCorpo'))
            return null;
        if (!res.ok && res.erro === 'sessao') {
            limparSessao();
            $('det').close();
            mostrarLogin('Sua sessão expirou. Entre novamente.');
            return null;
        }
        if (!res.ok)
            $('anfMsg').textContent = ERROS_ANFITRIAO[res.erro || ''] || 'Não foi possível concluir. Atualize o painel e tente de novo.';
        return res;
    }
    catch (err) {
        if (document.getElementById('anfMsg'))
            $('anfMsg').textContent = 'Não foi possível conectar. Verifique a internet.';
        return null;
    }
    finally {
        if (botao)
            botao.disabled = false;
    }
}
async function carregarAnfitriaoDe(r) {
    anfitriaoAtual = null;
    const res = await chamarAnfitriao(r, { acao: 'anfitriao_ler' });
    if (!res)
        return;
    if (!res.ok) {
        $('anfCorpo').innerHTML = '<p class="nota-fraca">Confirmação indisponível.</p>';
        return;
    }
    anfitriaoAtual = res.anfitriao || null;
    renderAnfitriao(r);
}
function voltarAnfitriao(r) {
    renderAnfitriao(r);
    $('anfCorpo').querySelector('[data-anf="editar"]')?.focus();
    rankingCache.clear(); // a casa entrou, mudou ou saiu do ranking
}
$('detBody').addEventListener('submit', async (e) => {
    if (e.target.id !== 'anfForm')
        return;
    e.preventDefault();
    const r = registroAberto();
    if (!r)
        return;
    $('anfMsg').textContent = '';
    const form = lerFormAnfitriao();
    const confirmacao = $('anf_confirmacao').checked;
    if (!mostrarErrosAnfitriao(regrasAnfitriao.validar(form, confirmacao)))
        return;
    const anfitriao = { capacidade: Number(form.capacidade.trim()), dias: regrasAnfitriao.ordenarDias(form.dias), observacao: form.observacao.trim() };
    const res = await chamarAnfitriao(r, { acao: 'anfitriao_salvar', anfitriao, confirmacao }, $('anfSalvar'));
    if (!res?.ok)
        return;
    anfitriaoAtual = res.anfitriao || null;
    voltarAnfitriao(r);
});
$('detBody').addEventListener('click', async (e) => {
    const b = e.target instanceof Element ? e.target.closest('[data-anf]') : null;
    const r = registroAberto();
    if (!b || !r)
        return;
    $('anfMsg').textContent = '';
    if (b.dataset.anf === 'editar')
        formAnfitriao();
    else if (b.dataset.anf === 'cancelar') {
        renderAnfitriao(r);
        $('anfCorpo').querySelector('[data-anf="editar"]')?.focus();
    }
    else if (b.dataset.anf === 'remover') {
        if (!confirm(`Remover a confirmação de anfitrião de ${nomeCurto(r)}? Ela é apagada de vez.`))
            return;
        const res = await chamarAnfitriao(r, { acao: 'anfitriao_excluir' }, b);
        if (!res?.ok)
            return;
        anfitriaoAtual = null;
        voltarAnfitriao(r);
    }
});
// ── Painel "Escolher anfitrião" na aba Mapa ──
const RANKING_VALIDO_MS = 60000;
const rankingCache = new Map();
let rankingPedido = '';
const celulaDoRanking = () => regrasAnfitriao.celulaAlvo(estado.celula, [...new Set(estado.regs.map(r => r.celula).filter(Boolean))]);
function renderPainelAnfitriao() {
    const painel = $('anfPainel');
    const alvo = celulaDoRanking();
    $('anfResumo').textContent = alvo ? `Escolher anfitrião para ${alvo}` : 'Escolher anfitrião';
    if (!painel.open)
        return;
    if (!alvo) {
        $('anfStatus').textContent = 'Escolha uma célula no filtro acima para ver as casas que podem recebê-la.';
        $('anfLista').innerHTML = '';
        return;
    }
    const guardado = rankingCache.get(alvo);
    if (guardado && Date.now() - guardado.em < RANKING_VALIDO_MS)
        desenharRanking(guardado.dados);
    else
        carregarRanking(alvo);
}
async function carregarRanking(celula) {
    const s = lerSessao();
    if (!s)
        return;
    rankingPedido = celula;
    $('anfStatus').textContent = 'Calculando as distâncias…';
    $('anfLista').innerHTML = '';
    try {
        const res = await api({ acao: 'anfitrioes_ranking', celula, token: s.token });
        if (rankingPedido !== celula || celulaDoRanking() !== celula)
            return; // trocou de célula no meio
        if (!res.ok) {
            if (res.erro === 'sessao') {
                limparSessao();
                mostrarLogin('Sua sessão expirou. Entre novamente.');
                return;
            }
            $('anfStatus').textContent = res.erro === 'nao_encontrado'
                ? 'Esta célula não tem membros no seu escopo.'
                : 'Não foi possível calcular agora. Atualize o painel e tente de novo.';
            return;
        }
        rankingCache.set(celula, { em: Date.now(), dados: res });
        desenharRanking(res);
        if (estado.ferramenta === 'anfPainel')
            renderMapa(); // casas numeradas no mapa
    }
    catch (err) {
        if (rankingPedido === celula)
            $('anfStatus').textContent = 'Não foi possível conectar. Verifique a internet.';
    }
}
let anfitriaoNoMapa = null;
function selecionarCasaNoMapa(linha) {
    const botao = document.querySelector(`#anfLista [data-anf-mapa="${linha}"]`);
    if (!botao || estado.ferramenta !== 'anfPainel')
        return;
    const focado = document.activeElement === botao;
    anfitriaoNoMapa = linha;
    renderMapa();
    if (focado)
        document.querySelector(`#anfLista [data-anf-mapa="${linha}"]`)?.focus();
}
$('anfLista').addEventListener('click', e => {
    const botao = e.target instanceof Element ? e.target.closest('[data-anf-mapa]') : null;
    if (botao)
        selecionarCasaNoMapa(Number(botao.dataset.anfMapa));
});
function desenharRanking(d) {
    const casas = d.casas || [];
    const visiveis = casasNoMapa();
    if (!visiveis.some(c => c.linha === anfitriaoNoMapa))
        anfitriaoNoMapa = visiveis[0]?.linha ?? null;
    $('anfStatus').textContent = casas.length
        ? `${casas.length} ${casas.length === 1 ? 'casa' : 'casas'} para ${d.celula}, da mais perto para a mais longe dos ${regrasAnfitriao.membros(d.membros)}.`
        : (d.membros && d.semPosicao === d.membros
            ? 'Nenhum membro desta célula tem endereço localizado. Cadastre os endereços na ficha.'
            : 'Nenhuma casa confirmada com endereço localizado no seu escopo.');
    const avisos = regrasAnfitriao.avisos(d);
    const nome = (linha) => { const r = regDe(linha); return r ? nomeCurto(r) : `Cadastro nº ${linha}`; };
    $('anfLista').innerHTML =
        `<p class="anf-aviso">Distância em linha reta, não é tempo de trajeto. A decisão é sempre da liderança.</p>` +
            (avisos.length ? `<ul class="anf-fora">${avisos.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : '') +
            (casas.length ? `<ol class="anf-casas">${casas.map((c, i) => {
                const top = regrasAnfitriao.destaque(i, c);
                const id = `anfExp${c.linha}`;
                return `<li class="anf-casa${top ? ' destaque' : ''}${c.comporta ? '' : ' nao-comporta'}" aria-describedby="${id}">
        <div class="anf-topo"><span class="anf-pos" aria-hidden="true">${i + 1}º</span>
          <button type="button" class="btn-link anf-nome" data-mapa-pessoa="${c.linha}" aria-describedby="${id}">${esc(nome(c.linha))}</button>
          ${visiveis.some(casa => casa.linha === c.linha) ? `<button type="button" class="btn-sec" data-anf-mapa="${c.linha}" aria-label="Destacar ${esc(nome(c.linha))} no mapa" aria-pressed="${c.linha === anfitriaoNoMapa}">No mapa</button>` : ''}
          ${top ? '<span class="anf-tag">Entre as 3 mais perto</span>' : ''}${c.comporta ? '' : '<span class="anf-tag alerta">Não comporta o grupo</span>'}</div>
        <ul class="anf-expl" id="${id}">${regrasAnfitriao.explicar(c, d.membros).map(l => `<li>${esc(l)}</li>`).join('')}</ul></li>`;
            }).join('')}</ol>` : '');
}
$('anfPainel').addEventListener('toggle', () => renderPainelAnfitriao());
