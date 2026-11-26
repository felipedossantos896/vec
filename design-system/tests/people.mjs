import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const inventory = JSON.parse(await readFile(path.join(root, 'inventory.json'), 'utf8'));
const browser = await chromium.launch(process.env.STUDIO_CHROME ? { channel: 'chrome' } : {});
try {
  for (const { width, height } of inventory.viewports) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 600 });
    await page.clock.setFixedTime(new Date(2027, 3, 12, 12));
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://studio.test/**', route => {
      const url = new URL(route.request().url());
      return route.fulfill({ path: path.join(root, url.pathname === '/' ? 'index.html' : url.pathname.slice(1)) });
    });
    await page.route(url => url.hostname !== 'studio.test', route => route.abort());
    const open = frame => page.goto(`https://studio.test/screens/preview.html?screen=${frame}`);
    const capture = (name) => process.env.STUDIO_ARTIFACTS &&
      page.screenshot({ path: path.join(process.env.STUDIO_ARTIFACTS, `people-${width}-${name}.png`), animations: 'disabled' });
    await open('people');
    assert.equal(await page.locator('.people-row').count(), 3);
    assert.equal(await page.locator('.people-columns').isVisible(), width > 600);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await capture('list');
    const search = page.getByRole('searchbox', { name: 'Busca' });
    await search.fill('Ninguém');
    assert.match(await page.getByRole('status').innerText(), /Nenhuma pessoa/);
    assert.equal(await page.locator('.people-directory').isVisible(), false);
    await search.fill('Exemplo Bruno');
    assert.equal(await page.locator('.people-row').count(), 0);
    await search.fill('ana');
    await page.getByLabel('Célula', { exact: true }).selectOption('Horizonte');
    assert.equal(await page.locator('.people-row').count(), 0);
    await page.getByLabel('Célula', { exact: true }).selectOption('Aurora');
    assert.equal(await page.locator('.people-row').count(), 2);
    await page.locator('.people-row').first().press('Enter');
    assert.match(await page.getByRole('dialog').innerText(), /Trilho do discipulador/);
    assert.equal(await page.locator('.people-badge.is-complete').count(), 2);
    await capture('profile');
    await page.keyboard.press('Escape');
    assert.equal(await search.inputValue(), 'ana');
    assert.equal(await page.locator('.people-row').first().evaluate(el => document.activeElement === el), true);
    await page.getByRole('button', { name: 'Nova pessoa' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome completo').fill('   ');
    await dialog.getByLabel('Nascimento').fill('2027-04-12');
    await dialog.getByLabel('Célula').selectOption('Horizonte');
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    assert.match(await dialog.getByRole('alert').innerText(), /Informe o nome/);
    await dialog.getByLabel('Nome completo').fill('Ana Exemplo');
    await capture('form');
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    assert.match(await dialog.innerText(), /Ana Exemplo/);
    await dialog.getByRole('button', { name: 'Editar pessoa' }).click();
    await dialog.getByLabel('Nome completo').fill('Pessoa Alterada');
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    assert.match(await dialog.innerText(), /Pessoa Alterada/);
    await dialog.getByRole('button', { name: 'Editar pessoa' }).click();
    await dialog.getByLabel('Nome completo').fill('Rascunho descartado');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    assert.match(await dialog.innerText(), /Pessoa Alterada/);
    assert.doesNotMatch(await dialog.innerText(), /Rascunho descartado/);
    await page.keyboard.press('Escape');
    assert.equal(await search.inputValue(), 'ana');
    assert.equal(await page.getByLabel('Célula', { exact: true }).inputValue(), 'Aurora');
    assert.equal(await page.locator('.people-row').count(), 2);
    await search.fill('');
    await page.getByLabel('Célula', { exact: true }).selectOption('');
    await page.getByText('4 de 4 pessoas').waitFor();
    assert.equal(await page.locator('.people-row').count(), 4);
    assert.match(await page.locator('.people-row').filter({ hasText: 'Clara Ensaio' }).innerText(), /Ana Exemplo/);
    await search.fill('Bruno Modelo');
    await page.getByLabel('Célula', { exact: true }).selectOption('Horizonte');
    await page.locator('.people-row').filter({ hasText: 'Bruno Modelo' }).press('Enter');
    await dialog.getByRole('button', { name: 'Editar pessoa' }).click();
    await dialog.getByLabel('Célula').selectOption('Aurora');
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    assert.match(await dialog.getByRole('status').innerText(), /Cadastro fictício salvo/);
    await page.keyboard.press('Escape');
    assert.match(await page.getByRole('status').innerText(), /Nenhuma pessoa encontrada/);
    for (const frame of ['profile', 'new-person', 'edit-person']) {
      await open(frame);
      assert.equal(await page.getByRole('dialog').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    assert.deepEqual(errors, []);
    console.log(`Pessoas ${width}×${height}: OK`);
    await page.close();
  }
} finally {
  await browser.close();
}
