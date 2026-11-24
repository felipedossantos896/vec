const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/gaveta-regras.js', 'utf8') + '\n;globalThis.regras = regrasGaveta;', contexto);
const regras = contexto.regras;

test('alturas da gaveta (Spec 016)', () => {
  assert.equal(regras.altura('recolhida', 800), 64);
  assert.equal(regras.altura('aberta', 800), 680);
  assert.equal(regras.aberta(50), 64); // tela muito baixa: nunca menor que a recolhida
  assert.equal(regras.limitar(10, 800), 64);
  assert.equal(regras.limitar(900, 800), 680);
  assert.equal(regras.limitar(300, 800), 300);
});

test('ao soltar: estado mais próximo ou a direção do gesto rápido', () => {
  assert.equal(regras.soltar(400, 0, 800), 'aberta');
  assert.equal(regras.soltar(300, 0, 800), 'recolhida');
  assert.equal(regras.soltar(100, 0.9, 800), 'aberta');
  assert.equal(regras.soltar(600, -0.9, 800), 'recolhida');
});

test('resumo da gaveta', () => {
  assert.equal(regras.resumo(3, 10), 'Fale com eles · 3 precisam de cuidado');
  assert.equal(regras.resumo(1, 10), 'Fale com eles · 1 precisa de cuidado');
  assert.equal(regras.resumo(0, 10), 'Fale com eles · ninguém precisando de cuidado');
  assert.equal(regras.resumo(0, 0), 'Mais da Área');
});
