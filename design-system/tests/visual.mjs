import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const [mode, baselineFile] = process.argv.slice(2);
assert(['--record', '--compare'].includes(mode) && baselineFile,
  'Uso: node design-system/tests/visual.mjs --record|--compare arquivo.json');
const root = fileURLToPath(new URL('../', import.meta.url));
if (mode === '--record') {
  await access(baselineFile).then(
    () => assert.fail('A referência já existe. Escolha um novo arquivo.'),
    error => { if (error.code !== 'ENOENT') throw error; }
  );
}
const artifacts = process.env.STUDIO_ARTIFACTS ||
  await mkdtemp(path.join(tmpdir(), 'vec-studio-visual-' + mode.slice(2) + '-'));
const manifest = JSON.parse(await readFile(path.join(root, 'inventory.json'), 'utf8'));
const expected = mode === '--compare' ? JSON.parse(await readFile(baselineFile, 'utf8')) : null;
const referenceImages = expected && path.resolve(path.dirname(baselineFile), expected.images);
if (expected) {
  assert.notEqual(path.resolve(artifacts), referenceImages,
    'Use pastas distintas para a referência e a comparação.');
  const missing = [];
  for (const key of Object.keys(expected.pages)) {
    await access(path.join(referenceImages, key + '.png')).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      missing.push(key);
    });
  }
  assert.equal(missing.length, 0, 'Capturas de referência ausentes: ' + missing.join(', '));
}
const frameKeys = [...manifest.screens.map(({ id, key }) => [id, key]), ['foundations', 'foundations'], ['components', 'components']];
const changed = [];
async function differs(page, before, after) {
  return page.evaluate(async sources => {
    const images = await Promise.all(sources.map(async source => {
      const image = new Image();
      image.src = 'data:image/png;base64,' + source;
      await image.decode();
      return image;
    }));
    const [first, second] = images;
    if (first.width !== second.width || first.height !== second.height) return true;
    const canvas = new OffscreenCanvas(first.width, first.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const [left, right] = images.map(image => {
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, image.width, image.height).data;
    });
    let changedPixels = 0;
    for (let i = 0; i < left.length; i += 4) {
      const difference = Math.max(
        Math.abs(left[i] - right[i]), Math.abs(left[i + 1] - right[i + 1]),
        Math.abs(left[i + 2] - right[i + 2]), Math.abs(left[i + 3] - right[i + 3])
      );
      if (difference > 5 || (difference && ++changedPixels > 25)) return true;
    }
    return false;
  }, [before.toString('base64'), after.toString('base64')]);
}
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.STUDIO_CHROME ? 'chrome' : undefined,
  args: ['--disable-gpu']
});
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
    async function capture(imageKey) {
      const png = await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });
      await writeFile(path.join(artifacts, imageKey + '.png'), png, { flag: 'wx' });
      pages[imageKey] = createHash('sha256').update(png).digest('hex');
      if (!expected || expected.pages[imageKey] === pages[imageKey]) return;
      if (!Object.hasOwn(expected.pages, imageKey)) {
        changed.push(imageKey);
        return;
      }
      const baseline = await readFile(path.join(referenceImages, imageKey + '.png'));
      assert.equal(createHash('sha256').update(baseline).digest('hex'), expected.pages[imageKey], 'Referência alterada: ' + imageKey);
      if (await differs(page, baseline, png)) changed.push(imageKey);
    }
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
      await capture(imageKey);
      const scroller = page.locator('.mx-list:not([hidden]), .people-dialog[open]').first();
      if (await scroller.count()) {
        const scrolled = await scroller.evaluate(element => {
          element.scrollTop = element.scrollHeight;
          return element.scrollTop > 0;
        });
        if (scrolled) await capture(imageKey + '-scroll');
      }
    }
    assert.deepEqual(errors, []);
    console.log(frameKeys.length + ' frames em ' + width + '×' + height + ': OK');
    await page.close();
  }
  if (expected) {
    changed.push(...Object.keys(expected.pages).filter(key => !Object.hasOwn(pages, key)));
    assert.equal(changed.length, 0, 'Capturas diferentes: ' + changed.join(', ') + '. Veja ' + artifacts);
  } else {
    const images = path.relative(path.dirname(path.resolve(baselineFile)), path.resolve(artifacts));
    await writeFile(baselineFile, JSON.stringify({ environment, images, pages }, null, 2) + '\n', { flag: 'wx' });
  }
  console.log(Object.keys(pages).length + ' capturas em ' + artifacts);
} finally { await browser.close(); }
