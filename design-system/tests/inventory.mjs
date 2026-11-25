import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const inventory = JSON.parse(await readFile(path.join(root, 'inventory.json'), 'utf8'));
assert.equal(inventory.screens.length, 21);
assert.equal(new Set(inventory.screens.map(screen => screen.key)).size, 21);
const headings = {
  login: 'Entrar no painel', member: 'Mapa da área', care: 'Mapa da área',
  multiply: 'Planejar multiplicação', people: 'Pessoas', profile: 'Pessoas',
  'new-person': 'Pessoas', 'edit-person': 'Pessoas', disciples: 'Meus discípulos'
};
const personDialogs = new Set(['profile', 'new-person', 'edit-person']);
const activeSections = {
  map: 'Área', member: 'Área', care: 'Área', host: 'Área', multiply: 'Área',
  people: 'Pessoas', profile: 'Pessoas', 'new-person': 'Pessoas', 'edit-person': 'Pessoas', disciples: 'Pessoas',
  metrics: 'Indicadores', settings: 'Configurações', 'new-user': 'Configurações', saved: 'Configurações'
};
const browser = await chromium.launch(process.env.STUDIO_CHROME ? { channel: 'chrome' } : {});
try {
  for (const { width, height } of inventory.viewports) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 600 });
    const errors = [];
    page.setDefaultTimeout(6000);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://studio.test/**', route => route.fulfill({ path: path.join(root, new URL(route.request().url()).pathname.slice(1)) }));
    await page.route(url => url.hostname !== 'studio.test', route => {
      errors.push('Pedido externo: ' + route.request().url());
      return route.abort();
    });
    const open = frame => page.goto('https://studio.test/screens/preview.html?screen=' + frame);
    for (const screen of inventory.screens) {
      assert.equal(screen.status, 'prototype');
      await open(screen.key);
      assert.equal(await page.locator('h1').innerText(), headings[screen.key] ?? screen.title, screen.key);
      const navigation = page.locator('.panel-nav nav');
      if (activeSections[screen.key]) {
        assert.deepEqual(await navigation.locator('a').allTextContents().then(labels => labels.map(label => label.trim())),
          ['Área', 'Pessoas', 'Indicadores', 'Configurações'], screen.key);
        assert.equal((await navigation.locator('[aria-current="page"]').textContent()).trim(), activeSections[screen.key]);
      } else {
        assert.equal(await navigation.count(), 0, screen.key);
      }
      if (personDialogs.has(screen.key)) {
        assert(await page.getByRole('dialog', { name: screen.title, exact: true }).isVisible());
      }
      if (['map', 'member', 'care'].includes(screen.key)) {
        assert.equal(await page.locator('#mx-member').isVisible(), screen.key === 'member');
        assert.equal(await page.locator('#mx-list').isVisible(), screen.key === 'care');
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, screen.key + ' em ' + width);
      if (process.env.STUDIO_ARTIFACTS) await page.screenshot({path: path.join(process.env.STUDIO_ARTIFACTS, screen.id + '-' + width + '.png')});
    }
    await open('map');
    await page.getByRole('navigation', { name: 'Seções do painel' }).getByRole('link', { name: 'Pessoas' }).click();
    await page.getByRole('heading', { name: 'Pessoas', exact: true }).waitFor();
    await open('host');
    await page.getByLabel('Célula').selectOption('Horizonte');
    assert.match(await page.locator('ol').innerText(), /Bruno Modelo/);
    await open('multiply');
    const mover = page.getByRole('button', {name:'Mover: Ana Exemplo'});
    await mover.click();
    assert.match(await page.getByRole('status').innerText(), /mudou de grupo/);
    assert.equal(await mover.evaluate(el => document.activeElement === el), true);
    await open('metrics');
    await page.getByLabel('Célula').selectOption('Horizonte');
    assert.equal(await page.locator('.inv-kpis strong').first().innerText(), '8');
    assert(await page.getByRole('meter', { name: 'Setembro' }).isVisible());
    await open('settings');
    await page.getByRole('link',{name:'Novo usuário'}).click();
    await page.getByLabel('Nome',{exact:true}).fill('Persona Teste');
    await page.getByRole('button',{name:'Salvar acesso de exemplo'}).click();
    await page.getByRole('heading', { name: 'Acesso salvo', exact: true }).waitFor();
    await open('registration-1');
    await page.getByLabel('Nome completo').fill('Persona Teste');
    await page.getByLabel('Nascimento').fill('2000-01-01');
    await page.getByRole('button',{name:'Continuar'}).click();
    await page.getByRole('button',{name:'Voltar'}).click();
    assert.equal(await page.getByLabel('Nome completo').inputValue(), 'Persona Teste');
    for (const heading of ['Sua fé', 'Sua célula', 'Treinamentos', 'Para terminar']) {
      await page.getByRole('button',{name:'Continuar'}).click();
      assert.equal(await page.locator('h1').innerText(), heading);
    }
    await page.getByLabel('Confirmo que usei dados fictícios').check();
    await page.getByRole('button',{name:'Concluir'}).click();
    assert.match(await page.locator('h1').innerText(), /Cadastro recebido/);
    assert.equal(await page.locator('h1').evaluate(el => el === document.activeElement), true);
    await page.getByRole('button', {name:'Iniciar novo exemplo'}).click();
    assert.equal(await page.getByLabel('Nome completo').inputValue(), '');
    assert.equal(await page.locator('h1').evaluate(el => el === document.activeElement), true);
    assert.deepEqual(errors, []);
    console.log('Inventário e interações ' + width + '×' + height + ': OK');
    await page.close();
  }
} finally {
  await browser.close();
}
