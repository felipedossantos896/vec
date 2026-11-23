const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/contato-regras.js', 'utf8') + '\n;globalThis.regras = regrasContato;', contexto);
const regras = contexto.regras;
const agora = new Date(2026, 10, 22, 15, 0); // 22/11/2026
const f = (o = {}) => ({ tipo: 'ligacao', quando: 'hoje', outroDia: '', texto: '', lembrarDias: 30, ...o });

test('dia do contato e lembrete', () => {
  assert.equal(regras.dataDoContato(f(), agora), '2026-11-22');
  assert.equal(regras.dataDoContato(f({ quando: 'ontem' }), agora), '2026-11-21');
  assert.equal(regras.dataDoContato(f({ quando: 'outro', outroDia: '2026-10-05' }), agora), '2026-10-05');
  assert.equal(regras.lembrete(30, agora), '2026-12-22');
  assert.equal(regras.lembrete(0, agora), '');
  assert.equal(regras.dataDoContato(f({ quando: 'ontem' }), new Date(2026, 0, 1)), '2025-12-31');
});

test('validação igual à do servidor', () => {
  assert.deepEqual({ ...regras.validar(f(), agora) }, {});
  assert.ok(regras.validar(f({ tipo: 'email' }), agora).tipo);
  assert.ok(regras.validar(f({ tipo: 'nota' }), agora).texto);
  assert.equal(regras.validar(f({ tipo: 'nota', texto: 'oi' }), agora).texto, undefined);
  assert.ok(regras.validar(f({ quando: 'outro', outroDia: '2026-11-23' }), agora).outroDia);
  assert.ok(regras.validar(f({ quando: 'outro', outroDia: '2025-11-01' }), agora).outroDia);
  assert.equal(regras.validar(f({ quando: 'outro', outroDia: '2026-01-10' }), agora).outroDia, undefined);
});

test('quem precisa de cuidado por falta de contato respeita o lembrete', () => {
  const d = (y, m, dd) => new Date(y, m - 1, dd);
  assert.equal(regras.semContato(null, null, agora), true);
  assert.equal(regras.semContato(d(2026, 11, 1), null, agora), false); // 21 dias, sem lembrete
  assert.equal(regras.semContato(d(2026, 8, 1), null, agora), true);  // mais de 60 dias
  assert.equal(regras.semContato(d(2026, 8, 1), d(2026, 12, 1), agora), false); // lembrete ainda não venceu
  assert.equal(regras.semContato(d(2026, 11, 1), d(2026, 11, 20), agora), true); // lembrete venceu
});

test('rótulos e ícones', () => {
  assert.equal(regras.rotulo('visita'), 'Visita');
  assert.equal(regras.rotulo('x'), 'Anotação');
  assert.equal(regras.diaMes('2026-12-22'), '22/12');
});
