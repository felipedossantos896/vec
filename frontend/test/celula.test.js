const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/celula-regras.js', 'utf8') + '\n;globalThis.regras = regrasCelula;', contexto);
const regras = contexto.regras;

test('cor: a definida em Ajustes ou a da paleta pela posição', () => {
  assert.equal(regras.cor('#0E8A8C', 3), '#0e8a8c');
  assert.equal(regras.cor('', 0), regras.PALETA[0]);
  assert.equal(regras.cor('', 9), regras.PALETA[1]);
  assert.equal(regras.cor('vermelho', -1), regras.SEM_COR);
  for (const ruim of ['#fff', 'red', '#12345g', 'url(x)', '#1234567']) assert.equal(regras.corValida(ruim), false, ruim);
});

test('horário e encontro no painel e no formulário', () => {
  assert.equal(regras.hora('20:00'), '20h');
  assert.equal(regras.hora('19:30'), '19h30');
  assert.equal(regras.hora('09:00'), '9h');
  assert.equal(regras.hora(''), '');
  assert.equal(regras.encontro('ter', '20:00'), 'Ter · 20h');
  assert.equal(regras.encontro('qua', '19:30', true), 'Quartas, 19h30');
  assert.equal(regras.encontro('sab', '17:00', true), 'Sábados, 17h');
  assert.equal(regras.encontro('', '20:00'), '20h');
  assert.equal(regras.encontro('qui', ''), 'Qui');
  assert.equal(regras.encontro('', ''), '');
});
