const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/indicadores-regras.js', 'utf8') + '\n;globalThis.regras = regrasIndicadores;', contexto);
const regras = contexto.regras;
const agora = new Date(2026, 10, 23, 15, 0); // 23/11/2026
const R = (mes, tipo, nome, indicador, valor) => ({ mes, tipo, nome, indicador, valor });

test('últimos meses, do mais antigo ao atual', () => {
  assert.deepEqual([...regras.meses(agora, 3)], ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual([...regras.meses(new Date(2026, 0, 31), 2)], ['2025-12', '2026-01']);
  assert.equal(regras.meses(agora, 12)[0], '2025-12');
});

test('escopo do retrato', () => {
  const ver = (a, tipo, nomes) => { assert.equal(a.tipo, tipo); assert.deepEqual([...a.nomes], nomes); };
  ver(regras.alvo({ todos: true }, '', ''), 'area', ['']);
  ver(regras.alvo({ todos: true }, 'A', ''), 'setor', ['A']);
  ver(regras.alvo({ setores: ['A', 'B'] }, '', 'X'), 'celula', ['X']);
  const a = regras.alvo({ setores: ['A', 'B'], celulas: [] }, '', '');
  assert.equal(a.tipo, 'setor'); assert.deepEqual([...a.nomes], ['A', 'B']);
  assert.deepEqual([...regras.alvo({ setores: [], celulas: ['X'] }, '', '').nomes], ['X']);
});

test('série soma o alvo e deixa buraco no mês sem retrato', () => {
  const rs = [R('2026-09', 'setor', 'A', 'pessoas', 10), R('2026-09', 'setor', 'B', 'pessoas', 5), R('2026-11', 'setor', 'A', 'pessoas', 12),
    R('2026-11', 'setor', 'B', 'pessoas', 6), R('2026-11', 'area', '', 'pessoas', 99), R('2026-11', 'setor', 'A', 'precisam_cuidado', 3)];
  const serie = regras.serie(rs, 'pessoas', { tipo: 'setor', nomes: ['A', 'B'] }, ['2026-09', '2026-10', '2026-11']);
  assert.deepEqual([...serie], [15, null, 18]);
  assert.equal(regras.tendencia(21, serie), 3);
  assert.equal(regras.tendencia(21, [15, null]), null);
});

test('texto da tendência', () => {
  assert.equal(regras.textoTendencia(3), '+3 no mês');
  assert.equal(regras.textoTendencia(-2), '−2 no mês');
  assert.equal(regras.textoTendencia(0), 'igual no mês');
  assert.equal(regras.textoTendencia(null), '');
});

test('minilinha', () => {
  assert.equal(regras.minilinha([null, 5]), '');
  assert.equal(regras.minilinha([1, null, 3]), '0.0,28.0 100.0,4.0');
  assert.equal(regras.minilinha([2, 2]), '0.0,16.0 100.0,16.0');
});

test('faixas etárias e percentual', () => {
  assert.deepEqual([...regras.faixas([10, 17, 18, 30, 34, 49, 50, 80]).map(f => f[1])], [2, 1, 2, 1, 2]);
  assert.equal(regras.pct(1, 3), 33);
  assert.equal(regras.pct(0, 0), 0);
});
