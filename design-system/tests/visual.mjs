import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const [mode, baselineFile] = process.argv.slice(2);
assert(['--record', '--compare'].includes(mode) && baselineFile,
  'Uso: node design-system/tests/visual.mjs --record|--compare arquivo.json');
const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = process.env.STUDIO_ARTIFACTS ||
  path.join(tmpdir(), 'vec-studio-visual-' + mode.slice(2));
const manifest = JSON.parse(await readFile(path.join(root, 'inventory.json'), 'utf8'));
const expected = mode === '--compare' ? JSON.parse(await readFile(baselineFile, 'utf8')) : null;
const frameKeys = [...manifest.screens.map(({ id, key }) => [id, key]), ['foundations', 'foundations'], ['components', 'components']];
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch(process.env.STUDIO_CHROME ? { channel: 'chrome' } : {});
try {
  const environment = { browser: browser.version(), platform: process.platform, deviceScaleFactor: 1 };
  if (expected) assert.deepEqual(environment, expected.environment, 'A referência precisa do mesmo navegador, plataforma e DPR.');
  const pages = {};
  for (const { width, height } of manifest.viewports) {
    const page = await browser.newPage({
      viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce',
      locale: 'pt-BR', colorScheme: 'light', timezoneId: 'America/Fortaleza', hasTouch: width < 600
    });
    await page.clock.setFixedTime(new Date('2026-11-25T12:00:00Z'));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) errors.push(response.status() + ' ' + response.url());
    });
    await page.route('https://studio.test/**', route => {
      const url = new URL(route.request().url());
      return route.fulfill({ path: path.join(root, url.pathname.slice(1)) });
    });
    await page.route(url => url.hostname !== 'studio.test', route => {
      errors.push('Pedido externo: ' + route.request().url());
      return route.abort();
    });
    for (const [id, key] of frameKeys) {
      const imageKey = id + '-' + width + 'x' + height;
      await page.goto('https://studio.test/screens/preview.html?screen=' + encodeURIComponent(key));
      const heading = page.locator('h1').first();
      await heading.waitFor({ state: 'attached' });
      await page.evaluate(async () => {
        await document.fonts.ready;
        document.activeElement?.blur?.();
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      assert.deepEqual(await page.evaluate(() => [innerWidth, innerHeight]), [width, height]);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow em ' + imageKey);
      assert.doesNotMatch(await heading.innerText(), /Frame planejado/);
      const png = await page.screenshot({ path: path.join(artifacts, imageKey + '.png'), animations: 'disabled', caret: 'hide' });
      pages[imageKey] = createHash('sha256').update(png).digest('hex');
    }
    assert.deepEqual(errors, []);
    console.log(frameKeys.length + ' frames em ' + width + '×' + height + ': OK');
    await page.close();
  }
  if (expected) {
    const keys = new Set([...Object.keys(expected.pages), ...Object.keys(pages)]);
    const changed = [...keys].filter(key => expected.pages[key] !== pages[key]);
    assert.equal(changed.length, 0, 'Capturas diferentes: ' + changed.join(', ') + '. Veja ' + artifacts);
  } else {
    await writeFile(baselineFile, JSON.stringify({ environment, pages }, null, 2) + '\n', { flag: 'wx' });
  }
  console.log(Object.keys(pages).length + ' capturas em ' + artifacts);
} finally { await browser.close(); }
