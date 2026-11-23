const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/lideranca-regras.js', 'utf8') + '\n;globalThis.regras = regrasLideranca;', contexto);
const regras = contexto.regras;

test('papel, membro e trilha', () => {
  assert.equal(regras.papel({}), 'membro');
  assert.equal(regras.papel({ papel: 'pastor' }), 'membro');
  assert.ok(regras.ehMembro({ papel: 'membro' }));
  assert.ok(regras.ehLider({ papel: 'lider_setor' }));
  assert.ok(regras.temTrilha({ papel: 'lider_setor' }));
  assert.ok(regras.temTrilha({}));
  assert.ok(!regras.temTrilha({ papel: 'lider_area' }));
});

test('rótulos', () => {
  assert.equal(regras.rotulo({ papel: 'lider_area' }), 'Líder de área');
  assert.equal(regras.rotulo({ papel: 'lider_setor', setor: 'Fogo no Altar' }), 'Líder do setor Fogo no Altar');
  assert.equal(regras.rotulo({ papel: 'lider_setor' }), 'Líder de setor');
  assert.equal(regras.rotulo({ papel: 'membro' }), '');
  assert.equal(regras.rotuloCurto({ papel: 'lider_setor', setor: 'X' }), 'Líder de setor');
});

test('discipuladores: liderança primeiro', () => {
  const o = regras.ordemDiscipuladores([
    { nome: 'Zeca', papel: 'membro' }, { nome: 'Marcos', papel: 'lider_setor' }, { nome: 'Ana', papel: 'lider_setor' }, { nome: 'Rute', papel: 'lider_area' }
  ]);
  assert.deepEqual([...o.lideranca.map(p => p.nome)], ['Rute', 'Ana', 'Marcos']);
  assert.deepEqual([...o.membros.map(p => p.nome)], ['Zeca']);
});
