const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Trilhos da jornada (Spec 027). Dados fictícios.
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/trilhos-regras.js', 'utf8') + '\n;globalThis.regras = regrasTrilhos;', contexto);
const regras = contexto.regras;
const trilho = id => regras.TRILHOS.find(t => t.id === id);

test('os três trilhos seguem a ordem da igreja', () => {
  assert.deepEqual([...regras.TRILHOS.map(t => t.id)], ['membro', 'discipulador', 'lider']);
  assert.deepEqual([...trilho('lider').etapas.map(([k]) => k)], ['expresso02', 'tlc', 'tadel']);
  assert.deepEqual([...trilho('membro').etapas.slice(-3).map(([k]) => k)], ['batismo', 'batismoEspirito', 'encontroDeus']);
});

test('estado distingue registrado, não e não informado; célula vem do nome', () => {
  const r = { cafePastor: 'S', novaCriatura: 'N', celula: 'Hope' };
  assert.equal(regras.estado(r, 'cafePastor'), 'feito');
  assert.equal(regras.estado(r, 'novaCriatura'), 'nao');
  assert.equal(regras.estado(r, 'tlc'), 'vazio');
  assert.equal(regras.estado(r, 'celula'), 'feito');
  assert.equal(regras.estado({ celula: '' }, 'celula'), 'vazio');
  assert.equal(regras.rotuloEstado('vazio'), 'Não informado');
});

test('progresso conta só as etapas registradas do trilho', () => {
  const r = { recebeuJesus: 'S', cafePastor: 'S', celula: 'Hope', batismo: 'N', expresso02: 'S', tadel: 'S' };
  assert.deepEqual({ ...regras.progresso(r, trilho('membro')) }, { feitas: 3, total: 10 });
  assert.deepEqual({ ...regras.progresso(r, trilho('lider')) }, { feitas: 2, total: 3 });
});

test('batismo mostra o que falta confirmar e nada depois de registrado', () => {
  assert.deepEqual([...regras.faltaParaBatismo({ cafePastor: 'S' })], ['Nova Criatura']);
  assert.deepEqual([...regras.faltaParaBatismo({})], ['Café com o Pastor', 'Nova Criatura']);
  assert.deepEqual([...regras.faltaParaBatismo({ batismo: 'S' })], []);
});
