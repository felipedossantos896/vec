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
      page.screenshot({ path: path.join(process.env.STUDIO_ARTIFACTS, `people-${width}-${name}.png`) });
    await open('people');
    assert.equal(await page.locator('.people-row').count(), 3);
    await capture('list');
    const search = page.getByRole('searchbox', { name: 'Busca' });
    await search.fill('Ninguém');
    assert.match(await page.getByRole('status').innerText(), /Nenhuma pessoa/);
    await search.fill('ana');
    await page.getByLabel('Célula', { exact: true }).selectOption('Aurora');
    assert.equal(await page.locator('.people-row').count(), 2);
    await page.locator('.people-row').first().press('Enter');
    assert.match(await page.getByRole('dialog').innerText(), /Trilho do discipulador/);
    await capture('profile');
    await page.keyboard.press('Escape');
    assert.equal(await search.inputValue(), 'ana');
    assert.equal(await page.locator('.people-row').first().evaluate(el => document.activeElement === el), true);
    await page.getByRole('button', { name: 'Nova pessoa' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Nome completo').fill('Ana Exemplo');
    await dialog.getByLabel('Nascimento').fill('2027-04-12');
    await dialog.getByLabel('Célula').selectOption('Horizonte');
    await capture('form');
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    assert.match(await dialog.innerText(), /Ana Exemplo/);
    await dialog.getByRole('button', { name: 'Editar pessoa' }).click();
    await dialog.getByLabel('Nome completo').fill('Pessoa Alterada');
    await dialog.getByRole('button', { name: 'Salvar' }).click();
    assert.match(await dialog.innerText(), /Pessoa Alterada/);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.people-row').count(), 4);
    assert.match(await page.locator('.people-row').filter({ hasText: 'Clara Ensaio' }).innerText(), /Ana Exemplo/);
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
