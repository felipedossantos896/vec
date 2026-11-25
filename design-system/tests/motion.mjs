import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const { viewports } = JSON.parse(await readFile(path.join(root, 'inventory.json'), 'utf8'));
const browser = await chromium.launch(process.env.STUDIO_CHROME ? { channel: 'chrome' } : {});
try {
  for (const { width, height } of viewports) {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 600 });
    page.setDefaultTimeout(7000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://studio.test/**', route => {
      const url = new URL(route.request().url());
      return route.fulfill({path: path.join(root, url.pathname === '/' ? 'index.html' : url.pathname.slice(1))});
    });
    await page.route(url => url.hostname !== 'studio.test', route => route.abort());
    await page.goto('https://studio.test/');
    const nav = page.getByRole('navigation', {name:'Inventário'});
    await nav.getByRole('button', {name:'B06 · Cadastro recebido'}).waitFor();
    const foundations = nav.getByRole('button', {name:'Fundamentos'});
    await foundations.press('ArrowDown');
    assert.equal(await page.locator(':focus').innerText(), 'Componentes');
    await page.keyboard.press('ArrowUp');
    assert.equal(await page.locator(':focus').innerText(), 'Fundamentos');
    await foundations.press('End');
    assert.match(await page.locator(':focus').innerText(), /B06/);
    await nav.getByRole('button', {name:'B06 · Cadastro recebido'}).press('Home');
    assert.equal(await page.locator(':focus').innerText(), 'Fundamentos');
    const people = nav.getByRole('button', {name:'A07 · Gestão de pessoas'});
    await people.press('Enter');
    const frame = page.frameLocator('#preview');
    await frame.locator('.people-row').first().waitFor();
    assert.equal(await frame.locator('body').evaluate(() => {
      try {
        void window.parent.sessionStorage;
        return true;
      } catch {
        return false;
      }
    }), false);
    assert.equal(await people.getAttribute('aria-current'), 'true');
    const index = viewports.findIndex(v => v.width === width);
    await page.getByLabel('Viewport').selectOption(String(index));
    await page.frames().find(f => f.parentFrame()).waitForFunction(
      ([w, h]) => innerWidth === w && innerHeight === h, [width, height]);
    await frame.locator('.people-row').first().press('Enter');
    assert.equal(await frame.getByRole('dialog').evaluate(el => getComputedStyle(el).animationName), 'studio-drawer');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await frame.getByRole('dialog').evaluate(el => getComputedStyle(el).animationName), 'none');
    await frame.getByRole('button',{name:'Fechar'}).press('Escape');
    assert.equal(await frame.locator('.people-row').first().evaluate(el => el === document.activeElement), true);
    await nav.getByRole('button', {name:'A02 · Mapa da área'}).click();
    await frame.locator('.mx-pin[data-person]').first().waitFor();
    if (width < 600) {
      await page.setViewportSize({ width: 360, height });
      assert(await page.locator('#stage').evaluate(el => el.scrollWidth > el.clientWidth));
      assert(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
      for (const control of await frame.locator('.mx-controls button').all()) {
        const bounds = await control.boundingBox();
        assert(bounds && bounds.width >= 44 && bounds.height >= 44);
      }
    }
    const marker = frame.locator('.mx-pin[data-person]').first();
    const id = await marker.getAttribute('data-person');
    await marker.press('Enter');
    await frame.locator('#mx-close').press('Escape');
    assert.equal(await frame.locator('.mx-pin[data-person="'+id+'"]').evaluate(el => el === document.activeElement), true);
    const toggle = frame.locator('#mx-toggle');
    await toggle.press('Enter');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    const row = frame.locator('.mx-row').filter({ hasText: 'Sem localização' }).first();
    await row.press('Enter');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await frame.locator('#mx-close').press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await row.evaluate(el => el === document.activeElement), true);
    await toggle.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
    await nav.getByRole('button', {name:/B01/}).click();
    await frame.getByLabel('Nome completo').fill('Pessoa Simulada');
    await frame.getByLabel('Nascimento').fill('2000-01-01');
    await frame.getByRole('button', {name:'Continuar'}).press('Enter');
    assert.equal(await frame.locator('h1').innerText(), 'Sua fé');
    await nav.getByRole('button', {name:/A14/}).click();
    await frame.getByLabel('Nome completo').fill('Pessoa Simulada');
    await frame.getByLabel('Nascimento').fill('2000-01-01');
    await frame.getByRole('dialog').getByLabel('Célula', {exact:true}).selectOption('Aurora');
    await frame.getByRole('button', {name:'Salvar'}).press('Enter');
    const profile = frame.getByRole('dialog', {name:'Ficha individual'});
    assert.match(await profile.innerText(), /Pessoa Simulada/);
    await profile.getByRole('button', {name:'Fechar'}).press('Enter');
    await frame.getByRole('dialog').waitFor({state:'hidden'});
    assert.match(await frame.getByRole('list', {name:'Pessoas'}).innerText(), /Pessoa Simulada/);
    await nav.getByRole('button', {name:/A12/}).click();
    await frame.getByLabel('Nome', {exact:true}).fill('Pessoa Simulada');
    await frame.getByRole('button', {name:'Salvar acesso de exemplo'}).press('Enter');
    await frame.getByRole('heading', {name:'Acesso salvo', exact:true}).waitFor();
    await frame.locator('body').evaluate(body => {
      document.addEventListener('securitypolicyviolation', event => {
        if (event.effectiveDirective === 'form-action') body.dataset.submitBlocked = 'true';
      });
      const form = document.createElement('form');
      form.action = '/blocked-form';
      body.append(form);
      form.requestSubmit();
    });
    await frame.locator('body[data-submit-blocked="true"]').waitFor();
    assert.deepEqual(errors, []);
    console.log('Movimento e interação ' + width + '×' + height + ': OK');
    await page.close();
  }
} finally { await browser.close(); }
