const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Regras puras do mapa (Spec 003). Dados fictícios.
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/mapa-regras.js', 'utf8') + '\n;globalThis.regras = regrasMapa;', contexto);
const regras = contexto.regras;

const dados = () => ({
  grupos: [{ lat: -3.7305, lng: -38.5215, linhas: [1, 2, 3], peloBairro: 1 }, { lat: -3.7005, lng: -38.5005, linhas: [4], peloBairro: 0 }],
  soCidade: [5], naoLocalizados: [6], pendentes: [7]
});

test('recorta grupos e listas pelo filtro e descarta grupos vazios', () => {
  const f = regras.filtrar(dados(), new Set([1, 3, 5, 9]));
  assert.equal(f.grupos.length, 1);
  assert.deepEqual([...f.grupos[0].linhas], [1, 3]);
  assert.deepEqual([...f.soCidade], [5]);
  assert.deepEqual([...f.naoLocalizados], []);
  assert.deepEqual([...f.semEndereco], [9]);
  assert.equal(f.noMapa, 2);
});

test('sem filtro, todos os grupos e quem não tem endereço', () => {
  const f = regras.filtrar(dados(), new Set([1, 2, 3, 4, 5, 6, 7, 8]));
  assert.equal(f.grupos.length, 2);
  assert.equal(f.noMapa, 4);
  assert.deepEqual([...f.semEndereco], [8]);
});

test('resumo acima do mapa', () => {
  assert.equal(regras.resumo(regras.filtrar(dados(), new Set([1, 2, 3, 4]))), '4 pessoas no mapa, em 2 áreas.');
  assert.equal(regras.resumo(regras.filtrar(dados(), new Set([4, 7]))), '1 pessoa no mapa, em 1 área; 1 pessoa sem posição (lista abaixo).');
  assert.equal(regras.resumo(regras.filtrar(dados(), new Set())), 'Ninguém neste filtro.');
});

test('não guarda coordenada de pessoa: só centros recebidos do servidor', () => {
  const fonte = fs.readFileSync('frontend/src/admin/mapa.ts', 'utf8');
  assert.match(fonte, /tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png/);
  assert.match(fonte, /OpenStreetMap<\/a> contributors/);
  assert.doesNotMatch(fonte, /localStorage|sessionStorage\.setItem/);
});
