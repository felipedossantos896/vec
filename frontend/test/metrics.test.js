const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const JORNADA = [['cafePastor'], ['estacaoDNA'], ['acompInicial'], ['novaCriatura'], ['batismo'], ['batismoEspirito']];
const codigo = fs.readFileSync('frontend/admin/metrics.js', 'utf8') + '\n;globalThis.metricas = metricasIndicadores;';
const contexto = { JORNADA };
vm.runInNewContext(codigo, contexto);
const metricas = contexto.metricas;

test('conta as seis etapas de forma independente', () => {
  assert.equal(metricas.etapasConcluidas({ novaCriatura: 'S' }), 1);
  assert.equal(metricas.etapasConcluidas(Object.fromEntries(JORNADA.map(([chave]) => [chave, 'S']))), 6);
});

test('resume jornada e média', () => {
  const registros = [
    { _jornada: 6, discipulador: 'Ana' },
    { _jornada: 3, discipulador: '   ' },
    { _jornada: 0 }
  ];
  assert.deepEqual(
    { ...metricas.resumir(registros) },
    { total: 3, jornadaCompleta: 1, mediaEtapas: 3 }
  );
  assert.deepEqual(
    { ...metricas.resumir([]) },
    { total: 0, jornadaCompleta: 0, mediaEtapas: null }
  );
});

test('identifica discipulador ausente ou só com espaços', () => {
  assert.equal(metricas.semDiscipulador({}), true);
  assert.equal(metricas.semDiscipulador({ discipulador: '   ' }), true);
  assert.equal(metricas.semDiscipulador({ discipulador: 'Ana' }), false);
});

test('calcula seis jornadas completas entre doze pessoas', () => {
  const registros = Array.from({ length: 12 }, (_, i) => ({ _jornada: i < 6 ? 6 : 2 }));
  const resumo = metricas.resumir(registros);
  assert.equal(resumo.jornadaCompleta, 6);
  assert.equal(resumo.jornadaCompleta / resumo.total, 0.5);
});

test('aplica setor e célula no mesmo conjunto', () => {
  const registros = [
    { nome: 'A', setor: 'Norte', celula: 'Um' },
    { nome: 'B', setor: 'Norte', celula: 'Dois' },
    { nome: 'C', setor: 'Sul', celula: 'Um' }
  ];
  assert.deepEqual(metricas.filtrar(registros, 'Norte', '').map(r => r.nome), ['A', 'B']);
  assert.deepEqual(metricas.filtrar(registros, 'Norte', 'Um').map(r => r.nome), ['A']);
});
