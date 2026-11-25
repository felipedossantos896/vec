import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const { viewports } = JSON.parse(await readFile(path.join(root, 'inventory.json'), 'utf8'));
const luminance = color => color.match(/\d+/g).slice(0, 3).map(value => {
  const level = Number(value) / 255;
  return level <= .04045 ? level / 12.92 : ((level + .055) / 1.055) ** 2.4;
}).reduce((sum, level, index) => sum + level * [.2126, .7152, .0722][index], 0);
async function readable(locator) {
  const colors = await locator.evaluate(el => {
    const style = getComputedStyle(el);
    return [style.color, style.backgroundColor];
  });
  const [dark, light] = colors.map(luminance).sort((a, b) => a - b);
  assert((light + .05) / (dark + .05) >= 4.5, 'Contraste de texto abaixo de 4,5:1');
}
const browser = await chromium.launch(process.env.STUDIO_CHROME ? { channel: 'chrome' } : {});
try {
  for (const [index, { width, height }] of viewports.entries()) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.route('https://studio.test/**', route => {
      const pathname = new URL(route.request().url()).pathname;
      return route.fulfill({ path: path.join(root, pathname === '/' ? 'index.html' : pathname.slice(1)) });
    });
    await page.goto('https://studio.test/screens/preview.html?screen=foundations');
    assert.equal(await page.locator('.swatch').count(), 3);
    for (const swatch of await page.locator('.swatch').all()) await readable(swatch);
    await page.goto('https://studio.test/screens/preview.html?screen=components');
    const trigger = page.getByRole('button', { name: 'Nova pessoa' });
    await readable(trigger);
    await page.keyboard.press('Tab');
    assert.equal(await trigger.evaluate(el => document.activeElement === el && getComputedStyle(el).outlineWidth === '3px'), true);
    assert.equal(await trigger.evaluate(el => el.offsetHeight), width < 600 ? 44 : 36);
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Nova pessoa' });
    await dialog.waitFor();
    assert.equal(await dialog.getByRole('button').evaluate(el => document.activeElement === el), true);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await trigger.evaluate(el => document.activeElement === el), true);
    assert(await page.getByRole('button', { name: 'Indisponível' }).isDisabled());
    const search = page.getByRole('searchbox');
    await search.fill('Ana');
    assert.equal(await page.getByRole('status').innerText(), 'Filtros aplicados.');
    await page.getByRole('button', { name: 'Limpar filtros' }).click();
    assert.equal(await search.inputValue(), '');
    assert.equal(await page.getByRole('status').innerText(), 'Filtros limpos.');
    if (process.env.STUDIO_ARTIFACTS) await page.screenshot({ path: path.join(process.env.STUDIO_ARTIFACTS, 'components-' + width + '.png') });
    await page.goto('https://studio.test/');
    await page.getByRole('button', { name: 'B06 · Cadastro recebido' }).waitFor();
    await page.getByLabel('Viewport').selectOption(String(index));
    await page.getByRole('button', { name: 'Componentes', exact: true }).click();
    const frame = page.frameLocator('#preview');
    const embeddedTrigger = frame.getByRole('button', { name: 'Nova pessoa' });
    await embeddedTrigger.press('Enter');
    const embeddedDialog = frame.getByRole('dialog', { name: 'Nova pessoa' });
    const close = embeddedDialog.getByRole('button', { name: 'Fechar' });
    const point = await close.evaluate(button => {
      const bounds = button.getBoundingClientRect();
      return [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2];
    });
    const outer = await page.locator('#preview').boundingBox();
    await page.mouse.click(outer.x + point[0] * outer.width / width, outer.y + point[1] * outer.height / height);
    await embeddedDialog.waitFor({ state: 'hidden' });
    assert.equal(await embeddedTrigger.evaluate(el => document.activeElement === el), true);
    console.log('Biblioteca e foco ' + width + '×' + height + ': OK');
    await page.close();
  }
} finally {
  await browser.close();
}
