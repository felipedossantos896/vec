const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/estados-regras.js', 'utf8') + '\n;globalThis.regras = regrasEstados;', contexto);
const regras = contexto.regras;

test('lista vazia: sem cadastros, busca e filtros', () => {
  assert.equal(regras.listaVazia(0, '', false).tipo, 'vazio');
  const b = regras.listaVazia(24, 'Zequinha', false);
  assert.equal(b.titulo, 'Ninguém com “Zequinha”');
  assert.equal(b.acao.attr, 'data-limpar="busca"');
  assert.equal(regras.listaVazia(24, '', true).acao.attr, 'data-limpar="tudo"');
});

test('o bloco escapa o texto e usa o papel certo', () => {
  const h = regras.html(regras.listaVazia(5, '<img onerror=x>', false));
  assert.ok(!h.includes('<img'));
  assert.ok(h.includes('role="status"') && h.includes('data-limpar="busca"') && h.includes('class="b-sec"'));
  const off = regras.html(regras.falhaCarga(false));
  assert.ok(off.includes('role="alert"') && off.includes('Sem internet agora') && off.includes('class="b-pri" data-recarregar'));
  assert.ok(regras.html(regras.falhaCarga(true)).includes('Não foi possível carregar'));
  assert.ok(!/style=|onclick=/.test(off + regras.carregando('x')), 'sem estilo nem script inline (CSP)');
});

test('carregando, tudo em dia e mapa vazio', () => {
  assert.equal((regras.carregando('Carregando…', 3).match(/esq-l/g) || []).length, 3);
  assert.ok(regras.cuidadoEmDia('da Ashrei').texto.startsWith('Todas as pessoas da Ashrei'));
  assert.equal(regras.mapaVazio().acao.attr, 'data-ver-lista');
});
