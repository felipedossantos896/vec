// ══════ SONS DO PAINEL (Spec 014, Spec 016) ══════
// Som curto gerado pelo navegador (Web Audio), sem arquivo de áudio. Toca sempre (a Spec 016
// tirou o botão de ligar e desligar). Sem áudio no navegador, não faz nada.

const sons = {
  ctx: null as AudioContext | null,

  // "Fechar": um toque suave que desce de ~660 para ~330 Hz em 0,14 s, com volume baixo.
  // Só depois de um gesto da pessoa (o navegador exige).
  fechar() {
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
