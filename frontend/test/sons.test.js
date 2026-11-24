const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function carregar(extra) {
  const ctx = { ...extra };
  vm.runInNewContext(fs.readFileSync('frontend/admin/sons.js', 'utf8') + '\n;globalThis.sons = sons;', ctx);
  return ctx;
}
const memoria = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)) }; };

test('sons vêm ligados e a escolha fica no aparelho', () => {
  const { sons } = carregar({ localStorage: memoria() });
  assert.equal(sons.ligados(), true);
  sons.definir(false);
  assert.equal(sons.ligados(), false);
  sons.definir(true);
  assert.equal(sons.ligados(), true);
});

test('sem armazenamento nem áudio, nada quebra', () => {
  const quebrado = { getItem() { throw new Error('bloqueado'); }, setItem() { throw new Error('bloqueado'); } };
  const { sons } = carregar({ localStorage: quebrado });
  assert.equal(sons.ligados(), true);
  sons.definir(false);
  assert.doesNotThrow(() => sons.fechar());
});

test('fechar toca um som curto e baixo; desligado, não toca', () => {
  const tocados = [];
  class AudioContext {
    constructor() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
    createOscillator() { const o = { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime(v, t) { o.fim = t; } }, connect: g => g, start() { tocados.push(o); }, stop(t) { o.para = t; } }; return o; }
    createGain() { const g = { gain: { picos: [], setValueAtTime() {}, exponentialRampToValueAtTime(v) { g.gain.picos.push(v); } }, connect() {} }; this.g = g; return g; }
  }
  const ctx = carregar({ localStorage: memoria(), AudioContext });
  ctx.sons.fechar();
  assert.equal(tocados.length, 1);
  assert.ok(tocados[0].para <= 0.2);
  assert.ok(Math.max(...ctx.sons.ctx.g.gain.picos) <= 0.08);
  ctx.sons.definir(false);
  ctx.sons.fechar();
  assert.equal(tocados.length, 1);
});
