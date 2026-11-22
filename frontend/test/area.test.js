const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/area-regras.js', 'utf8') + '\n;globalThis.regras = regrasArea;', contexto);
const regras = contexto.regras;
const p = (nome, dias, o = {}) => ({ nome, diasSemContato: dias, semDiscipulador: false, naoBatizado: false, semCelula: false, ...o });

test('urgência: sem contato pesa mais; nenhum contato é o mais longo; empate pelo nome', () => {
  const l = [p('Bia', 70), p('Ana', 70), p('Caio', 94), p('Duda', null), p('Edu', 10, { semDiscipulador: true }), p('Fábio', 5)];
  assert.deepEqual([...regras.urgentes(l, 4).map(x => x.nome)], ['Duda', 'Caio', 'Ana', 'Bia']);
  assert.equal(regras.urgentes(l, 10).length, 6);
  assert.ok(regras.prioridade(p('X', 10, { semDiscipulador: true })) > regras.prioridade(p('Y', 10)));
});

test('motivo em uma frase', () => {
  assert.equal(regras.motivo(p('A', null)), 'Nenhum contato registrado');
  assert.equal(regras.motivo(p('A', 94, { semDiscipulador: true })), '94 dias sem contato');
  assert.equal(regras.motivo(p('A', 5, { semDiscipulador: true })), 'Sem discipulador');
  assert.equal(regras.motivo(p('A', 5, { semCelula: true })), 'Sem célula');
  assert.equal(regras.motivo(p('A', 5, { naoBatizado: true })), 'Ainda não batizado(a)');
});

test('rótulo do ponto e link do WhatsApp', () => {
  assert.equal(regras.rotulo(['Ana Clara Souza']), 'Ana');
  assert.equal(regras.rotulo(['Ana', 'Bia', 'Caio']), '3 pessoas');
  assert.equal(regras.rotulo([]), '');
  assert.equal(regras.whatsapp('(85) 98204-3393'), 'https://wa.me/5585982043393');
  assert.equal(regras.whatsapp('8532221111'), 'https://wa.me/558532221111');
  assert.equal(regras.whatsapp('123'), '');
  assert.equal(regras.whatsapp(undefined), '');
});
