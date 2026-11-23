const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/ajustes-regras.js', 'utf8') + '\n;globalThis.regras = regrasAjustes;', contexto);
const regras = contexto.regras;
const agora = new Date(2026, 10, 23, 15, 0);
const antes = (min) => new Date(agora.getTime() - min * 60000).toISOString();

test('último acesso em linguagem de gente', () => {
  assert.equal(regras.acesso('', agora), 'nunca');
  assert.equal(regras.acesso('lixo', agora), 'nunca');
  assert.equal(regras.acesso(antes(2), agora), 'agora');
  assert.equal(regras.acesso(antes(15), agora), 'há 15 min');
  assert.equal(regras.acesso(antes(130), agora), 'há 2 h');
  assert.equal(regras.acesso(new Date(2026, 10, 22, 23, 0).toISOString(), agora), 'ontem');
  assert.equal(regras.acesso(new Date(2026, 10, 20, 9, 0).toISOString(), agora), 'há 3 dias');
  assert.equal(regras.acesso(new Date(2026, 7, 12, 9, 0).toISOString(), agora), '12/08/2026');
});

test('escopo em poucas palavras', () => {
  const u = (o) => ({ perfil: 'CELULA', setores: [], celulas: [], cadastro: 0, ...o });
  assert.equal(regras.escopo(u({ perfil: 'AREA' }), 0), 'Toda a área');
  assert.equal(regras.escopo(u({ perfil: 'SETOR', setores: ['Fogo no Altar'] }), 0), 'Fogo no Altar');
  assert.equal(regras.escopo(u({ celulas: ['Ashrei', 'Hope'] }), 0), 'Ashrei e Hope');
  assert.equal(regras.escopo(u({ celulas: ['Ashrei', 'Hope', 'Betânia'] }), 0), 'Ashrei +2');
  assert.equal(regras.escopo(u({ perfil: 'DISCIPULADOR', cadastro: 5 }), 6), '6 discípulos');
  assert.equal(regras.escopo(u({ perfil: 'DISCIPULADOR', cadastro: 5 }), 1), '1 discípulo');
  assert.equal(regras.escopo(u({}), 0), 'Acesso não configurado');
});

test('rótulo do perfil', () => {
  assert.equal(regras.rotuloPerfil('SETOR'), 'Setor');
  assert.equal(regras.rotuloPerfil('X'), 'Sem perfil');
});
