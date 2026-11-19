const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const tokens = fs.readFileSync('frontend/design-tokens.css', 'utf8');
const dashboard = fs.readFileSync('frontend/admin/dashboard.css', 'utf8');
const html = fs.readFileSync('frontend/admin/index.html', 'utf8');
const charts = fs.readFileSync('frontend/src/admin/charts.ts', 'utf8');

test('define e consome os tokens mínimos do painel', () => {
  for (const token of ['--surface-card', '--surface-control', '--border-card', '--space-2', '--space-3', '--space-4', '--space-5']) {
    assert.match(tokens, new RegExp(`${token}:`));
    assert.match(`${dashboard}\n${fs.readFileSync('frontend/admin/admin.css', 'utf8')}`, new RegExp(`var\\(${token}\\)`));
  }
});

test('aplica componentes reutilizáveis sem remover contratos antigos', () => {
  assert.match(dashboard, /\.stat, \.ui-kpi/);
  assert.match(dashboard, /\.panel, \.ui-card/);
  assert.match(dashboard, /\.filters, \.ui-filter-bar/);
  assert.match(dashboard, /\.stat span, \.ui-kpi span/);
  assert.match(dashboard, /\.filters select, \.ui-filter-bar select/);
  assert.match(charts, /class="stat kpi ui-kpi"/);
  assert.match(charts, /class="panel ui-card"/);
});

test('rotula os três grupos de filtros', () => {
  assert.equal((html.match(/class="filters ui-filter-bar"/g) || []).length, 3);
  assert.equal((html.match(/role="group" aria-label="Filtros de/g) || []).length, 3);
});
