"use strict";
// ══════ FOTOS DE PERFIL ══════
// Foto ao lado do nome em todo o painel; sem foto, as iniciais. Quem pode editar a pessoa
// troca ou remove a foto no cabeçalho do cadastro. O navegador recorta e reduz a imagem
// antes de enviar, então ela chega pequena ao servidor.
const FOTO_LADO = 256;
const FOTO_MAX = 38 * 1024; // o servidor aceita até 40 KB
// Primeira letra do primeiro e do último nome, ignorando símbolos
function iniciais(nome) {
    const p = nome.replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0] || '?') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}
// Círculo com a foto ou as iniciais; o nome ao lado é que dá o significado
// Foto da ficha ou, sem foto, o rosto ilustrado gerado pelo número do cadastro (Spec 009).
// Sem número (caso raro), ficam as iniciais.
function avatar(p, classe = '') {
    const corpo = p.fotoUrl ? `<img src="${esc(p.fotoUrl)}" alt="" loading="lazy" decoding="async">`
        : p.linha ? regrasAvatar.svg(p.linha) : esc(iniciais(p.nome));
    return `<i class="av ${classe}${!p.fotoUrl && p.linha ? ' av-ilustrado' : ''}" aria-hidden="true">${corpo}</i>`;
}
// Cadastro de alguém da área que esteja na visão de quem entrou (para pegar a foto)
const avatarDe = (id, nome, classe = '') => avatar({ nome, fotoUrl: estado.regs.find(r => r.linha === id)?.fotoUrl, linha: id }, classe);
function renderFotoDetalhe(r) {
    $('detFoto').innerHTML = `${avatar(r, 'av-g')}<button type="button" class="foto-btn" id="fotoBtn" aria-haspopup="${r.fotoUrl ? 'menu' : 'false'}" aria-label="${r.fotoUrl ? 'Trocar ou remover a foto' : 'Adicionar foto'}">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button>
    <span class="foto-menu" id="fotoMenu" role="menu" hidden><button type="button" role="menuitem" data-foto="trocar">Trocar foto</button><button type="button" role="menuitem" data-foto="remover">Remover foto</button></span>`;
    $('fotoMsg').textContent = '';
}
// Recorta um quadrado (um pouco acima do centro nas fotos em pé, onde costuma estar o rosto)
// e reduz até caber no limite. Devolve o JPEG em base64.
async function prepararFoto(arquivo) {
    const bmp = await createImageBitmap(arquivo);
    const lado = Math.min(bmp.width, bmp.height);
    const c = document.createElement('canvas');
    c.width = c.height = FOTO_LADO;
    const ctx = c.getContext('2d');
    if (!ctx)
        throw new Error('canvas');
    ctx.fillStyle = '#fff'; // PNG transparente não fica preto no JPEG
    ctx.fillRect(0, 0, FOTO_LADO, FOTO_LADO);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, (bmp.width - lado) / 2, (bmp.height - lado) * 0.3, lado, lado, 0, 0, FOTO_LADO, FOTO_LADO);
    bmp.close();
    for (const q of [0.85, 0.75, 0.6, 0.45]) {
        const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', q));
        if (blob && blob.size <= FOTO_MAX) {
            const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob); });
            return url.slice(url.indexOf(',') + 1);
        }
    }
    throw new Error('grande');
}
async function enviarFoto(r, payload) {
    const s = lerSessao();
    if (!s) {
        $('det').close();
        mostrarLogin('Sua sessão expirou. Entre novamente.');
        return null;
    }
    $('detFoto').classList.add('enviando');
    try {
        const res = await api({ ...payload, linha: r.linha, token: s.token });
        if (res.ok)
            return res;
        if (res.erro === 'sessao') {
            limparSessao();
            $('det').close();
            mostrarLogin('Sua sessão expirou. Entre novamente.');
            return null;
        }
        $('fotoMsg').textContent = res.erro === 'foto_invalida' ? 'Essa imagem não serve. Use uma foto JPG ou PNG.' : 'Não foi possível salvar. Atualize o painel e tente de novo.';
    }
    catch (err) {
        $('fotoMsg').textContent = 'Não foi possível conectar. Verifique a internet.';
    }
    finally {
        $('detFoto').classList.remove('enviando');
    }
    return null;
}
function aposFoto(r, url) {
    r.fotoUrl = url;
    renderTudo();
    if (registroAberto() === r)
        renderFotoDetalhe(r);
}
const fecharMenuFoto = () => { document.getElementById('fotoMenu')?.setAttribute('hidden', ''); };
$('detFoto').addEventListener('click', async (e) => {
    const alvo = e.target instanceof Element ? e.target.closest('#fotoBtn, [data-foto]') : null;
    const r = registroAberto();
    if (!alvo || !r)
        return;
    if (alvo.id === 'fotoBtn' && r.fotoUrl) {
        $('fotoMenu').toggleAttribute('hidden');
        return;
    }
    fecharMenuFoto();
    if (alvo.id === 'fotoBtn' || alvo.dataset.foto === 'trocar') {
        $('fotoArquivo').click();
        return;
    }
    if (!confirm(`Remover a foto de ${nomeCurto(r)}?`))
        return;
    if (await enviarFoto(r, { acao: 'foto_excluir' }))
        aposFoto(r, '');
});
document.addEventListener('click', e => { if (e.target instanceof Element && !e.target.closest('#detFoto'))
    fecharMenuFoto(); });
$('detFoto').addEventListener('keydown', e => { if (e.key === 'Escape' && !$('fotoMenu').hidden) {
    e.stopPropagation();
    e.preventDefault();
    fecharMenuFoto();
    $('fotoBtn').focus();
} });
$('fotoArquivo').addEventListener('change', async (e) => {
    const inp = e.target;
    const arquivo = inp.files?.[0];
    inp.value = '';
    const r = registroAberto();
    if (!arquivo || !r)
        return;
    let imagem;
    try {
        imagem = await prepararFoto(arquivo);
    }
    catch (err) {
        $('fotoMsg').textContent = 'Não foi possível ler essa imagem. Use uma foto JPG ou PNG.';
        return;
    }
    const res = await enviarFoto(r, { acao: 'foto_salvar', imagem });
    if (res)
        aposFoto(r, res.fotoUrl || '');
});
// Arte do login (Spec 009): grupos de rostos ilustrados com sementes fixas, que não são de ninguém
(function arteLogin() {
    const el = document.getElementById('loginArte');
    if (!el)
        return;
    const grupos = [[3, 11, 19, 27], [5, 13, 21, 29], [7, 15, 23, 31], [9, 17, 25, 33]];
    el.innerHTML = grupos.map((g, i) => `<div class="la-g la-g${i}">${g.map(n => `<i class="la-av">${regrasAvatar.svg(n)}</i>`).join('')}</div>`).join('');
})();
