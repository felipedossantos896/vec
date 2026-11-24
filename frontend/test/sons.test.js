const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function carregar(extra) {
  const ctx = { ...extra };
  vm.runInNewContext(fs.readFileSync('frontend/admin/sons.js', 'utf8') + '\n;globalThis.sons = sons;', ctx);
  return ctx;
}

test('sem áudio no navegador, fechar não quebra', () => {
  const { sons } = carregar({});
  assert.doesNotThrow(() => sons.fechar());
});

test('fechar toca sempre um som curto e baixo (sem preferência, Spec 016)', () => {
  const tocados = [];
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createOscillator() { const o = { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: g => g, start() { tocados.push(o); }, stop(t) { o.para = t; } }; return o; }
    createGain() { const g = { gain: { picos: [], setValueAtTime() {}, exponentialRampToValueAtTime(v) { g.gain.picos.push(v); } }, connect() {} }; this.g = g; return g; }
  }
  const ctx = carregar({ AudioContext, localStorage: { getItem: () => '0' } });
  ctx.sons.fechar();
  ctx.sons.fechar();
  assert.equal(tocados.length, 2);
  assert.ok(tocados[0].para <= 0.2);
  assert.ok(Math.max(...ctx.sons.ctx.g.gain.picos) <= 0.08);
  assert.equal(ctx.sons.ligados, undefined);
});
