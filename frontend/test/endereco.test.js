const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Regras puras do endereço (Spec 002). Dados fictícios.
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/endereco-regras.js', 'utf8') + '\n;globalThis.regras = regrasEndereco;', contexto);
const regras = contexto.regras;

const valido = () => ({ cep: '60.000-000', logradouro: 'Rua Exemplo', numero: 's/n', complemento: '', bairro: 'Centro', cidade: 'Fortaleza', uf: 'ce' });

test('formata e limpa o CEP', () => {
  assert.equal(regras.fmtCep('60000000'), '60000-000');
  assert.equal(regras.fmtCep('60.000-000'), '60000-000');
  assert.equal(regras.fmtCep('600'), '600');
  assert.equal(regras.soDigitosCep('60000-0001'), '60000000');
});

test('endereço completo com autorização é válido', () => {
  assert.deepEqual({ ...regras.validar(valido(), true) }, {});
});

test('aponta cada campo inválido e exige autorização', () => {
  const e = { ...valido(), cep: '6000-00', logradouro: ' ', numero: '', bairro: '', cidade: '', uf: 'XX' };
  const erros = regras.validar(e, false);
  for (const campo of ['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'uf', 'consentimento']) {
    assert.ok(erros[campo], `sem erro para ${campo}`);
  }
  assert.ok(regras.validar({ ...valido(), cep: '6000000a' }, true).cep, 'CEP com letra');
});

test('respeita os tamanhos máximos do servidor', () => {
  assert.ok(regras.validar({ ...valido(), logradouro: 'a'.repeat(121) }, true).logradouro);
  assert.ok(regras.validar({ ...valido(), numero: '1'.repeat(11) }, true).numero);
  assert.deepEqual({ ...regras.validar({ ...valido(), complemento: 'b'.repeat(60) }, true) }, {});
});

test('monta as linhas exibidas na ficha', () => {
  assert.deepEqual([...regras.linhas({ ...valido(), cep: '60000000', complemento: 'Casa B', uf: 'CE' })],
    ['Rua Exemplo, s/n · Casa B', 'Centro · Fortaleza/CE', 'CEP 60000-000']);
});

test('a ficha carrega o endereço sob demanda e fora da lista', () => {
  const detalhe = fs.readFileSync('frontend/src/admin/detalhe.ts', 'utf8');
  assert.match(detalhe, /blocoEndereco\(\)/);
  assert.match(detalhe, /carregarEnderecoDe\(r\)/);
  const csv = fs.readFileSync('frontend/src/admin/admin.ts', 'utf8').match(/const CSV_COLS[\s\S]*?\];/)[0];
  assert.doesNotMatch(csv, /cep|logradouro|bairro|endereco/i);
});

test('a busca pelo CEP envia só o CEP', () => {
  assert.equal(regras.urlViaCep('60.000-000'), 'https://viacep.com.br/ws/60000000/json/');
  assert.equal(regras.urlViaCep('6000'), null);
});

test('aplica a resposta do ViaCEP sem tocar em número e complemento', () => {
  const form = { ...valido(), numero: '10', complemento: 'Casa B', logradouro: '', bairro: '', cidade: '', uf: '' };
  const r = regras.aplicarViaCep(form, { logradouro: 'Rua Pública', bairro: 'Centro', localidade: 'Fortaleza', uf: 'ce' });
  assert.deepEqual([...r.preenchidos], ['logradouro', 'bairro', 'cidade', 'uf']);
  assert.equal(r.form.logradouro, 'Rua Pública');
  assert.equal(r.form.uf, 'CE');
  assert.equal(r.form.numero, '10');
  assert.equal(r.form.complemento, 'Casa B');
});

test('CEP de cidade inteira preenche só cidade e UF', () => {
  const r = regras.aplicarViaCep({ ...valido(), logradouro: 'Rua Digitada' }, { logradouro: '', bairro: '', localidade: 'Cidade Exemplo', uf: 'CE' });
  assert.deepEqual([...r.preenchidos], ['cidade', 'uf']);
  assert.equal(r.form.logradouro, 'Rua Digitada');
});

test('CEP inexistente ou resposta estranha não muda nada', () => {
  assert.equal(regras.aplicarViaCep(valido(), { erro: 'true' }), null);
  assert.equal(regras.aplicarViaCep(valido(), null), null);
  assert.equal(regras.aplicarViaCep(valido(), 'html'), null);
  assert.equal(regras.aplicarViaCep(valido(), { uf: 'XX' }), null);
});
