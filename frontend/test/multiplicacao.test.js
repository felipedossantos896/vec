const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Regras puras da multiplicação (Spec 005). Dados fictícios.
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/multiplicacao-regras.js', 'utf8') + '\n;globalThis.regras = regrasMult;', contexto);
const regras = contexto.regras;
const lista = v => JSON.parse(JSON.stringify(v));

test('mover leva a pessoa para o outro grupo sem duplicar', () => {
  const g = [[1, 2, 3], [4, 5]];
  assert.deepEqual(lista(regras.mover(g, 2, 1)), [[1, 3], [4, 5, 2]]);
  assert.deepEqual(lista(regras.mover(g, 4, 0)), [[1, 2, 3, 4], [5]]);
  assert.deepEqual(lista(regras.mover(g, 4, 1)), [[1, 2, 3], [5, 4]], 'mover para o mesmo grupo não duplica');
  assert.deepEqual(g, [[1, 2, 3], [4, 5]], 'não altera a lista original');
});

test('títulos e anúncio da mudança', () => {
  assert.equal(regras.titulo({ linhas: [1] }, 0), 'Grupo 1 · 1 pessoa');
  assert.equal(regras.titulo({ linhas: [1, 2, 3] }, 1), 'Grupo 2 · 3 pessoas');
  assert.equal(regras.anuncio('Ana', 1, [[1, 2], [3, 4, 5]]), 'Ana foi para o grupo 2. Grupo 1 com 2 pessoas; grupo 2 com 3 pessoas.');
});

const mult = (o = {}) => ({
  celula: 'Hope', automatica: true, ajustada: false, mesmaPrimeira: false, minimo: 4,
  grupos: [{ linhas: [1, 2], semPosicao: [], membros: 2, casas: [] }, { linhas: [3, 4], semPosicao: [], membros: 2, casas: [] }],
  foraDoRanking: { interessadosSemConfirmacao: 0, confirmadosSemPosicao: 0 }, ...o
});

test('avisos: sem proposta, sem posição, mesma casa e grupo vazio', () => {
  assert.deepEqual(lista(regras.avisos(mult())), []);
  assert.match(regras.avisos(mult({ automatica: false }))[0], /^Menos de 4 membros/);
  assert.deepEqual(lista(regras.avisos(mult({ automatica: false, ajustada: true }))), [], 'ajustada não repete o aviso');
  const comSem = mult({ grupos: [{ linhas: [1, 9], semPosicao: [9], membros: 2, casas: [] }, { linhas: [3], semPosicao: [], membros: 1, casas: [] }] });
  assert.equal(regras.avisos(comSem)[0], '1 pessoa sem posição foi posta num grupo sem cálculo; confira.');
  assert.match(regras.avisos(mult({ mesmaPrimeira: true }))[0], /mesma casa é a primeira/);
  assert.match(regras.avisos(mult({ grupos: [{ linhas: [], semPosicao: [], membros: 0, casas: [] }, { linhas: [1], semPosicao: [], membros: 1, casas: [] }] }))[0], /vazio/);
});

test('a tela avisa que é simulação e não lida com coordenadas', () => {
  const fonte = fs.readFileSync('frontend/src/admin/multiplicacao.ts', 'utf8');
  assert.equal(regras.AVISO_SIMULACAO, 'Simulação: nada é gravado e ninguém muda de célula.');
  assert.ok(fonte.includes('regrasMult.AVISO_SIMULACAO'));
  assert.ok(!/\blat\b|\blng\b/.test(fonte));
  assert.ok(!/salvar|excluir|registro_/.test(fonte), 'o painel não chama ações de escrita');
});
