const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/nova-pessoa-regras.js', 'utf8') + '\n;globalThis.regras = regrasNovaPessoa;', contexto);
const regras = contexto.regras;

const CELS = [
  { nome: 'Hope', setor: 'Fogo no Altar', ativa: true },
  { nome: 'Ashrei', setor: 'Fogo no Altar', ativa: true },
  { nome: 'Fechada', setor: 'Fogo no Altar', ativa: false },
  { nome: 'Betânia', setor: 'Tabernáculo de Deus', ativa: true }
];

test('células permitidas pelo escopo, só as ativas', () => {
  assert.deepEqual([...regras.celulasPermitidas({ todos: true }, CELS)], ['Hope', 'Ashrei', 'Betânia']);
  assert.deepEqual([...regras.celulasPermitidas({ setores: ['fogo no altar'], celulas: [] }, CELS)], ['Hope', 'Ashrei']);
  assert.deepEqual([...regras.celulasPermitidas({ setores: [], celulas: ['Betânia'] }, CELS)], ['Betânia']);
  assert.deepEqual([...regras.celulasPermitidas({ celulas: ['Fechada'] }, CELS)], []);
  assert.deepEqual([...regras.celulasPermitidas({ perfil: 'DISCIPULADOR', celulas: ['Hope'] }, CELS)], []);
});

test('validação igual à do servidor', () => {
  const ok = { nome: 'Zeca Barros', nascimento: '1990-05-10', celula: 'Hope', telefone: '', autorizou: true };
  assert.deepEqual({ ...regras.validar(ok, '2026-11-23') }, {});
  const e = regras.validar({ nome: 'Ze', nascimento: '2030-01-01', celula: '', telefone: '(85) 9999', autorizou: false }, '2026-11-23');
  assert.deepEqual(Object.keys(e).sort(), ['autorizou', 'celula', 'nascimento', 'nome', 'telefone']);
  assert.equal(regras.validar({ ...ok, telefone: '+55 (85) 99999-0000' }, '2026-11-23').telefone, undefined);
  assert.equal(regras.digitos('+55 (85) 99999-0000'), '85999990000');
});

test('mensagens das respostas do servidor', () => {
  assert.ok(regras.mensagem('duplicado_fora').includes('outra célula'));
  assert.ok(!/nome|Hope/.test(regras.mensagem('duplicado_fora').replace('Fale com a liderança', '')));
  assert.ok(regras.mensagem('xyz').startsWith('Não foi possível'));
});
