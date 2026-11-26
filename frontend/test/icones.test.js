const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/icones.js', 'utf8') + '\n;globalThis.icone = icone; globalThis.SVG = ICONES_SVG;', contexto);
const { icone } = contexto;

test('pacote de ícones (ADR-0012): os ícones da Spec 014, decorativos ou com nome', () => {
  for (const n of ['area', 'setor', 'celula', 'casa', 'whatsapp', 'ficha', 'fechar', 'voltar', 'subir']) {
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

test('nenhum ícone desenhado à mão no painel e no formulário (Spec 015)', () => {
  // Ficam de fora: a marca "Área VEC" e os desenhos que não são ícones (avatares,
  // minigráficos), além do próprio pacote de ícones.
  const desenhos = { 'frontend/src/admin/avatar-regras.ts': 1, 'frontend/src/admin/charts.ts': 1 };
  const arquivos = ['frontend/index.html', 'frontend/admin/index.html',
    ...fs.readdirSync('frontend/src/admin').filter(f => f.endsWith('.ts') && f !== 'icones.ts').map(f => `frontend/src/admin/${f}`),
    ...fs.readdirSync('frontend/src').filter(f => f.endsWith('.ts')).map(f => `frontend/src/${f}`)];
  for (const arq of arquivos) {
    const s = fs.readFileSync(arq, 'utf8');
    const svgs = [...s.matchAll(/<svg/g)].filter(m => !s.slice(Math.max(0, m.index - 80), m.index).includes('brand-mark'));
    assert.equal(svgs.length, desenhos[arq] || 0, `${arq}: <svg> fora do pacote de ícones`);
    assert.doesNotMatch(s, /aria-hidden="true">\s*[→›×+✓]\s*</, `${arq}: caractere usado como ícone`);
    assert.doesNotMatch(s, />\+ [A-ZÁÉÍÓÚ]/, `${arq}: "+" de texto no botão`);
    assert.doesNotMatch(s, />\s*← |\s→\s*</, `${arq}: seta de texto no botão`);
  }
  for (const html of ['frontend/index.html', 'frontend/admin/index.html']) {
    const s = fs.readFileSync(html, 'utf8');
    for (const [, nome] of s.matchAll(/data-ic="([^"]+)"/g)) assert.ok(icone(nome), `${html}: ícone ${nome} não existe`);
    const pos = (src) => s.indexOf(`<script src="${src}"`);
    const [ic, usa] = html.includes('admin/') ? [pos('icones.js'), pos('admin.js')] : [pos('admin/icones.js'), pos('app.js')];
    assert.ok(ic > 0 && ic < usa, `${html}: icones.js antes dos scripts que o usam`);
  }
});
