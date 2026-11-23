const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/nomes-regras.js', 'utf8') + '\n;globalThis.regras = regrasNomes;', contexto);
const regras = contexto.regras;
const c = n => regras.curto(n);

test('primeiro nome e último sobrenome (cenário 1)', () => {
  assert.equal(c('Felipe dos Santos Carneiro'), 'Felipe Carneiro');
  assert.equal(c('Maria Rosa Lima'), 'Maria Lima'); // Rosa fica fora da lista de compostos
  assert.equal(c('  felipe   DOS santos  carneiro '), 'Felipe Carneiro');
});

test('partícula antes do último sobrenome (cenário 2)', () => {
  assert.equal(c('Roberta Rodrigues de Paulo'), 'Roberta Rodrigues');
  assert.equal(c('Ana de Paula'), 'Ana de Paula');
  assert.equal(c('João da Silva'), 'João da Silva');
  assert.equal(c('Carla Souza dos Santos e Silva'), 'Carla Santos');
});

test('Filho, Júnior, Neto e Sobrinho saem (cenário 3)', () => {
  assert.equal(c('José Almeida Filho'), 'José Almeida');
  assert.equal(c('Paulo Roberto Lima Júnior'), 'Paulo Roberto');
  assert.equal(c('Tiago Costa Neto'), 'Tiago Costa');
  assert.equal(c('José de Almeida Filho'), 'José de Almeida');
  assert.equal(c('Jorge Jr.'), 'Jorge Jr.'); // duas palavras ficam como estão
});

test('nome composto sem sobrenome (cenário 4)', () => {
  assert.equal(c('Ana Clara Souza'), 'Ana Clara');
  assert.equal(c('Pedro Arthur Lima'), 'Pedro Arthur');
  assert.equal(c('Maria Eduarda dos Santos Costa'), 'Maria Eduarda');
  assert.equal(c('Ana Clara'), 'Ana Clara');
});

test('uma ou duas palavras e maiúsculas', () => {
  assert.equal(c('ZECA'), 'Zeca');
  assert.equal(c('felipe carneiro'), 'Felipe Carneiro');
  assert.equal(c('ana-maria d\'ávila souza'), 'Ana-Maria Souza');
  assert.equal(c(''), '');
});

test('nomes curtos repetidos ganham as iniciais do meio (cenário 5)', () => {
  const m = regras.semColisao([
    { id: 1, nome: 'Ana Maria Souza' }, { id: 2, nome: 'Ana Rita Souza' }, { id: 3, nome: 'Felipe dos Santos Carneiro' },
    { id: 4, nome: 'Ana Clara Souza' }, { id: 5, nome: 'Ana Clara Lima' }, { id: 6, nome: 'Bia Souza' }, { id: 7, nome: 'Bia Souza' },
    { id: 8, nome: 'Ana Maria Rodrigues Souza' }
  ]);
  assert.equal(m.get(1), 'Ana M. Souza');
  assert.equal(m.get(2), 'Ana R. Souza');
  assert.equal(m.get(8), 'Ana M. R. Souza');
  assert.equal(m.get(3), 'Felipe Carneiro');
  assert.equal(m.get(4), 'Ana Clara Souza');
  assert.equal(m.get(5), 'Ana Clara Lima');
  assert.equal(m.get(6), 'Bia Souza'); // o mesmo nome completo duas vezes não desempata
  const sozinha = regras.semColisao([{ id: 1, nome: 'Ana Maria Souza' }]);
  assert.equal(sozinha.get(1), 'Ana Souza');
  const empate = regras.semColisao([{ id: 1, nome: 'Ana Maria Souza' }, { id: 2, nome: 'Ana Marta Souza' }]);
  assert.equal(empate.get(1), 'Ana Maria Souza'); // as iniciais empatam: volta o completo
  assert.equal(empate.get(2), 'Ana Marta Souza');
});
