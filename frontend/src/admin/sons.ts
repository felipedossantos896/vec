// ══════ SONS DO PAINEL (Spec 014) ══════
// Som curto gerado pelo navegador (Web Audio), sem arquivo de áudio. A preferência vale
// para o aparelho (localStorage) e vem ligada. Sem áudio no navegador, não faz nada.

const sons = {
  CHAVE: 'vec.sons',
  ctx: null as AudioContext | null,

  ligados(): boolean {
    try { return localStorage.getItem(sons.CHAVE) !== '0'; } catch { return true; }
  },
  definir(ligar: boolean) {
    try { localStorage.setItem(sons.CHAVE, ligar ? '1' : '0'); } catch { /* sem armazenamento: vale só agora */ }
  },

  // "Fechar": um toque suave que desce de ~660 para ~330 Hz em 0,14 s, com volume baixo.
  // Só depois de um gesto da pessoa (o navegador exige).
  fechar() {
    if (!sons.ligados()) return;
    try {
      const Ctx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx: AudioContext = sons.ctx || (sons.ctx = new Ctx());
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, t);
      osc.frequency.exponentialRampToValueAtTime(330, t + 0.14);
      vol.gain.setValueAtTime(0.0001, t);
      vol.gain.exponentialRampToValueAtTime(0.06, t + 0.012);
      vol.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(vol).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    } catch { /* sem áudio: fecha em silêncio */ }
  }
};

// Botão "Sons" na barra lateral, com o estado do aparelho
function renderBotaoSons() {
  const b = document.getElementById('btnSons');
  if (!b) return;
  const on = sons.ligados();
  b.setAttribute('aria-pressed', String(on));
  b.setAttribute('aria-label', on ? 'Sons do painel: ligados' : 'Sons do painel: desligados');
  b.title = on ? 'Desligar os sons neste aparelho' : 'Ligar os sons neste aparelho';
  b.innerHTML = icone(on ? 'som' : 'semSom') + '<span class="txt">Sons</span>';
}
if (typeof document !== 'undefined') {
  renderBotaoSons();
  document.getElementById('btnSons')?.addEventListener('click', () => { sons.definir(!sons.ligados()); renderBotaoSons(); });
}
