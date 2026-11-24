const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/icones.js', 'utf8') + '\n;globalThis.icone = icone; globalThis.SVG = ICONES_SVG;', contexto);
const { icone } = contexto;

test('pacote de ícones (ADR-0012): os ícones da Spec 014, decorativos ou com nome', () => {
  for (const n of ['area', 'setor', 'celula', 'casa', 'whatsapp', 'ficha', 'fechar', 'som', 'semSom']) {
    const svg = icone(n);
    assert.match(svg, /^<svg class="ic" viewBox="0 0 256 256" fill="currentColor" focusable="false" aria-hidden="true">(<path d="[^"<>]+"\/>)+<\/svg>$/, n);
  }
  assert.equal(icone('nao-existe'), '');
  const rot = icone('area', { rotulo: 'Líder "de" área <x>', classe: 'a b' });
  assert.ok(rot.includes('role="img" aria-label="Líder &quot;de&quot; área &lt;x&gt;"'));
  assert.ok(rot.startsWith('<svg class="ic a b"'));
  assert.ok(!rot.includes('aria-hidden'));
});

test('o arquivo de ícones é o que o gerador produz, e a licença está no repositório', async () => {
  const { gerar, SAIDA } = await import('../../scripts/icones/gerar.mjs');
  assert.equal(fs.readFileSync(SAIDA, 'utf8'), gerar(process.cwd()));
  assert.match(fs.readFileSync('frontend/admin/vendor/phosphor/LICENSE', 'utf8'), /MIT License[\s\S]*Phosphor Icons/);
});
