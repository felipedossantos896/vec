const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(
  fs.readFileSync('frontend/admin/contato-regras.js', 'utf8') + '\n' +
  fs.readFileSync('frontend/admin/pessoas-regras.js', 'utf8') + '\n;globalThis.regras = regrasPessoas;', contexto);
const regras = contexto.regras;
const agora = new Date(2026, 10, 22, 15, 0); // 22/11/2026
const diasAtras = n => new Date(2026, 10, 22 - n, 12, 0);
const p = (o = {}) => ({ contato: diasAtras(10), lembrete: null, semDiscipulador: false, celula: 'Ashrei', duplicados: 1, ...o });

test('há quanto tempo foi o último contato', () => {
  assert.equal(regras.haQuanto(null, agora), 'sem contato');
  assert.equal(regras.haQuanto(new Date(2026, 10, 22, 9, 0), agora), 'hoje');
  assert.equal(regras.haQuanto(diasAtras(1), agora), 'há 1 dia');
  assert.equal(regras.haQuanto(diasAtras(94), agora), 'há 94 dias');
});

test('etiquetas de cuidado da ficha', () => {
  assert.deepEqual([...regras.etiquetas(p(), agora)], []);
  assert.deepEqual([...regras.etiquetas(p({ contato: diasAtras(94), semDiscipulador: true }), agora)], ['94 dias sem contato', 'Sem discipulador']);
  assert.deepEqual([...regras.etiquetas(p({ contato: null, celula: '', duplicados: 2 }), agora)], ['Sem contato registrado', 'Sem célula', 'Possível duplicado']);
  // O lembrete ainda no futuro adia o aviso de contato
  assert.deepEqual([...regras.etiquetas(p({ contato: diasAtras(94), lembrete: new Date(2026, 11, 1) }), agora)], []);
});

test('paginação da lista', () => {
  assert.deepEqual({ ...regras.visiveis(24, 50) }, { mostra: 24, resta: 0 });
  assert.deepEqual({ ...regras.visiveis(120, 50) }, { mostra: 50, resta: 70 });
  assert.deepEqual({ ...regras.visiveis(120, 100) }, { mostra: 100, resta: 20 });
  assert.deepEqual({ ...regras.visiveis(0, 50) }, { mostra: 0, resta: 0 });
});

test('consequências da exclusão', () => {
  assert.deepEqual([...regras.consequencias('Zeca', 0)], []);
  assert.deepEqual([...regras.consequencias('Zeca', 1)], ['Quem tinha Zeca como discipulador fica sem vínculo.']);
  assert.deepEqual([...regras.consequencias('Zeca', 3)], ['As 3 pessoas que tinham Zeca como discipulador ficam sem vínculo.']);
});

test('visão do discipulador: próximo passo, contato e ordem', () => {
  const J = [['a', 'Café com Pastor'], ['b', 'Estação DNA'], ['c', 'Batismo']];
  assert.equal(regras.proximoPasso(J, k => k === 'a'), 'Estação DNA');
  assert.equal(regras.proximoPasso(J, () => true), '');
  const s1 = regras.situacaoContato(diasAtras(48), null, agora);
  assert.equal(s1.alerta, false); // 48 dias ainda está dentro dos 60
  assert.equal(regras.situacaoContato(diasAtras(70), null, agora).texto, 'Falar agora · último contato há 70 dias');
  assert.equal(regras.situacaoContato(null, null, agora).texto, 'Falar agora · nenhum contato ainda');
  assert.equal(s1.texto, 'Em dia · último contato há 48 dias');
  const l = regras.ordemDiscipulos([
    { nome: 'Bia', alerta: false, contato: diasAtras(5) },
    { nome: 'Caio', alerta: true, contato: diasAtras(70) },
    { nome: 'Ana', alerta: true, contato: null },
    { nome: 'Davi', alerta: false, contato: diasAtras(40) }
  ]);
  assert.deepEqual([...l.map(x => x.nome)], ['Ana', 'Caio', 'Davi', 'Bia']);
});
