const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Regras puras do anfitrião (Spec 004). Dados fictícios.
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/anfitriao-regras.js', 'utf8') + '\n;globalThis.regras = regrasAnfitriao;', contexto);
const regras = contexto.regras;
const form = (o = {}) => ({ capacidade: '12', dias: ['qui', 'ter'], observacao: '', ...o });

test('valida capacidade, dias, observação e confirmação como o servidor', () => {
  assert.deepEqual({ ...regras.validar(form(), true) }, {});
  for (const cap of ['', '1', '51', '2.5', 'abc', '-3']) assert.ok(regras.validar(form({ capacidade: cap }), true).capacidade, cap);
  for (const cap of ['2', '50', ' 10 ']) assert.equal(regras.validar(form({ capacidade: cap }), true).capacidade, undefined, cap);
  assert.ok(regras.validar(form({ dias: [] }), true).dias);
  assert.ok(regras.validar(form({ dias: ['sabado'] }), true).dias);
  assert.ok(regras.validar(form({ observacao: 'é'.repeat(201) }), true).observacao);
  assert.equal(regras.validar(form({ observacao: 'é'.repeat(200) }), true).observacao, undefined);
  assert.ok(regras.validar(form(), false).confirmacao);
});

test('dias sem repetição, na ordem da semana e por extenso', () => {
  assert.deepEqual([...regras.ordenarDias(['qui', 'ter', 'qui', 'xyz'])], ['ter', 'qui']);
  assert.equal(regras.fmtDias(['qui', 'ter']), 'Terça e quinta');
  assert.equal(regras.fmtDias(['sex', 'seg', 'qua']), 'Segunda, quarta e sexta');
  assert.equal(regras.fmtDias(['dom']), 'Domingo');
  assert.equal(regras.fmtDias(['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']), 'Todos os dias');
});

const casa = (o = {}) => ({ linha: 10, mediaKm: 0.8, maxKm: 1.2, considerados: 5, comporta: true, capacidade: 12, dias: ['ter'], peloBairro: false, ...o });

test('explica cada casa em frases completas', () => {
  assert.deepEqual([...regras.explicar(casa(), 6)], [
    'Média de 0,8 km até os membros; o mais longe fica a 1,2 km.',
    '5 de 6 membros no cálculo.',
    'Cabem 12 pessoas.',
    'Dias: terça.'
  ]);
  const pequena = regras.explicar(casa({ comporta: false, capacidade: 6, peloBairro: true }), 10);
  assert.equal(pequena[2], 'Não comporta o grupo: cabem 6 pessoas e a célula tem 10 membros.');
  assert.equal(pequena[4], 'Casa localizada só pelo bairro: distância menos precisa.');
  assert.equal(regras.explicar(casa({ considerados: 1 }), 1)[1], '1 de 1 membro no cálculo.');
  assert.equal(regras.explicar(casa({ comporta: false, capacidade: 3 }), 4, true)[2], 'Não comporta o grupo: cabem 3 pessoas e o grupo tem 4 membros.');
});

test('destaca só as 3 primeiras que comportam o grupo', () => {
  assert.equal(regras.destaque(0, casa()), true);
  assert.equal(regras.destaque(2, casa()), true);
  assert.equal(regras.destaque(3, casa()), false);
  assert.equal(regras.destaque(0, casa({ comporta: false })), false);
});

test('avisa quem ficou de fora e por quê', () => {
  const r = (semPosicao, interessados, confirmadosSemPosicao) => ({ celula: 'Hope', membros: 5, semPosicao, casas: [], foraDoRanking: { interessadosSemConfirmacao: interessados, confirmadosSemPosicao } });
  assert.deepEqual([...regras.avisos(r(0, 0, 0))], []);
  assert.deepEqual([...regras.avisos(r(1, 1, 1))], [
    '1 membro sem posição ficou fora do cálculo.',
    '1 pessoa marcou interesse em ser anfitrião e ainda não tem confirmação.',
    '1 anfitrião confirmado não tem endereço localizado pela rua ou pelo bairro.'
  ]);
  assert.deepEqual([...regras.avisos(r(2, 3, 4))], [
    '2 membros sem posição ficaram fora do cálculo.',
    '3 pessoas marcaram interesse em ser anfitrião e ainda não têm confirmação.',
    '4 anfitriões confirmados não têm endereço localizado pela rua ou pelo bairro.'
  ]);
});

test('célula do ranking: a do filtro ou a única do escopo', () => {
  assert.equal(regras.celulaAlvo('Hope', ['Hope', 'Betânia']), 'Hope');
  assert.equal(regras.celulaAlvo('', ['Hope']), 'Hope');
  assert.equal(regras.celulaAlvo('', ['Hope', 'Betânia']), '');
  assert.equal(regras.celulaAlvo('', []), '');
});

test('a tela mostra o aviso fixo e o texto de confirmação aprovados', () => {
  const fonte = fs.readFileSync('frontend/src/admin/anfitriao.ts', 'utf8');
  assert.ok(fonte.includes('Distância em linha reta, não é tempo de trajeto'));
  assert.ok(fonte.includes('A pessoa confirmou que pode receber a célula em casa e pode desistir a qualquer momento.'));
  assert.ok(!/\blat\b|\blng\b/.test(fonte), 'o painel não deve lidar com coordenadas');
});
