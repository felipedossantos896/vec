const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Avatar ilustrado (Spec 009, ADR-0011).
const contexto = {};
vm.runInNewContext(fs.readFileSync('frontend/admin/avatar-regras.js', 'utf8') + '\n;globalThis.regras = regrasAvatar;', contexto);
const regras = contexto.regras;

test('mesmo número, mesmo rosto; números diferentes variam', () => {
  assert.equal(regras.svg(42), regras.svg(42));
  const unicos = new Set(Array.from({ length: 60 }, (_, i) => regras.svg(i + 1)));
  assert.ok(unicos.size >= 50, `rostos distintos: ${unicos.size}`);
});

test('o rosto sai só do número: nada de texto, id ou estilo inline', () => {
  const s = regras.svg(7);
  assert.ok(s.startsWith('<svg') && s.endsWith('</svg>'));
  assert.ok(!/<text|\sid=|style=|<script|on[a-z]+=/i.test(s), s);
  assert.ok(s.includes('aria-hidden="true"'));
});

test('traços vêm das listas e a roupa pode seguir a cor da célula', () => {
  for (let i = 1; i < 30; i++) {
    const t = regras.tracos(i);
    assert.ok(regras.PELES.includes(t.pele) && regras.CABELOS.includes(t.cabelo) && t.estilo >= 0 && t.estilo < 5);
  }
  assert.ok(regras.svg(3, '#0e8a8c').includes('fill="#0e8a8c"'));
});

test('a função de avatar do painel não passa o nome para o desenho', () => {
  const fonte = fs.readFileSync('frontend/src/admin/fotos.ts', 'utf8');
  assert.match(fonte, /regrasAvatar\.svg\(p\.linha\)/);
  assert.doesNotMatch(fonte, /regrasAvatar\.svg\([^)]*nome/);
});
