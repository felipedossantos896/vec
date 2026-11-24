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
  assert.match(charts, /class="ind-kpi"/);
  assert.match(charts, /class="panel ui-card"/);
});

test('rotula os três grupos de filtros', () => {
  for (const label of ['Filtros da área', 'Filtros de pessoas', 'Filtros de indicadores']) {
    assert.match(html, new RegExp(`class="filters ui-filter-bar[^"]*" role="group" aria-label="${label}"`));
  }
});

test('indicadores da Spec 009: cinco números com tendência e os painéis do preview', () => {
  for (const metrica of ['Pessoas na área', 'Novos cadastros', 'Jornada completa', 'Com discipulador', 'Precisam de cuidado']) {
    assert.match(charts, new RegExp(metrica));
  }
  for (const painel of ['Cadastros por mês', 'Faixa etária', 'Treinamentos', 'Onde agir']) {
    assert.match(charts, new RegExp(painel));
  }
  assert.match(charts, /mapaJornada\(base\)/);
  assert.match(charts, /class="chart-scroll" role="region" aria-label=/);
});

test('Onde agir reutiliza os filtros de Pessoas e a lente da Área', () => {
  assert.match(charts, /id="indAgir"/);
  assert.match(charts, /data-sit="semDiscipulador"/);
  assert.match(charts, /data-sit="batizar"/);
  assert.match(charts, /data-lente="cuidado"/);
});
