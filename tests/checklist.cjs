// Component integration test in a real browser. Set PLAYWRIGHT_HOME to a local
// Playwright installation if the package is outside Node's resolution path.
const { chromium } = require(process.env.PLAYWRIGHT_HOME || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'public');

async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || undefined,
    headless: true
  });
  const output = process.env.PDF_TEST_DIR || await fs.mkdtemp(path.join(os.tmpdir(), 'pulso-pdf-'));
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    // Route static fixture requests locally, including the real PDF bundle.
    await page.route('http://sheet.local/**', async route => {
      const url = new URL(route.request().url()).pathname;
      if (url === '/') return route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/checklist.css"><main></main><script type="module">import {renderChecklist} from "/checklist.js";document.querySelector("main").append(renderChecklist({}));</script>'
      });
      return route.fulfill({
        contentType: url.endsWith('.css') ? 'text/css' : 'text/javascript',
        body: await fs.readFile(path.join(root, url))
      });
    });
    await page.goto('http://sheet.local/');
    await page.locator('details').first().waitFor();
    assert.equal(await page.locator('details').count(), 8);
    await page.locator('#release-title').fill('Canción de prueba');
    await page.locator('#release-note-materiales').fill('Letra propia y percusión grabada.');
    await page.locator('#release-status-materiales').selectOption('Revisado');
    for (const [index, id, text] of [
      [1, 'humano', 'Escribí el verso final.'],
      [2, 'ia', 'La herramienta propuso dos armonías.'],
      [5, 'voz', 'Grabé mi voz.']
    ]) {
      await page.locator('summary').nth(index).click();
      await page.locator('#release-note-' + id).fill(text);
    }
    await page.locator('[data-compose]').click();
    assert.match(await page.locator('#release-declaration').inputValue(), /Aporte humano: Escribí el verso final./);
    await page.reload();
    assert.equal(await page.locator('#release-title').inputValue(), 'Canción de prueba');
    assert.equal(await page.locator('progress').getAttribute('value'), '1');
    async function download(id) {
      const next = page.waitForEvent('download', { timeout: 15000 });
      await page.locator('[data-export]').click();
      const file = path.join(output, id + '.pdf');
      await (await next).saveAs(file);
      assert.equal((await fs.readFile(file)).subarray(0,5).toString(), '%PDF-');
    }
    await download('normal');
    await page.setViewportSize({width: 360, height: 750});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.locator('#release-note-materiales').fill('🪕 茶 ñ á '.repeat(190));
    await download('unicode');
    await page.locator('#release-note-materiales').fill('g'.repeat(2000));
    await download('long');
    assert.deepEqual(errors, []);
    console.log('Ficha, recuperación, créditos, PDF y pantalla móvil verificados.', output);
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
