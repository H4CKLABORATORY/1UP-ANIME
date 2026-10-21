/* 1UP Anime — black/green palette: real-browser acceptance, no third-party API. */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const ROOT = resolve('.');
const PORT = 8799;
const BASE = 'http://127.0.0.1:' + PORT + '/';
const types = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, BASE).pathname);
    const file = resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(ROOT + sep)) throw Error('Outside repository');
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream'});
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('Not Found');
  }
});
await new Promise(ok => server.listen(PORT, '127.0.0.1', ok));

let browser;
try {
  const html = await readFile('index.html', 'utf8');
  const sw = await readFile('sw.js', 'utf8');
  assert.match(html, /data-oneup-theme="esmeralda"/);
  assert.match(html, /themes\/oneup-palette\/selector\.css/);
  assert.match(html, /themes\/oneup-palette\/selector\.js/);
  assert(sw.includes('./themes/oneup-palette/selector.js'));
  assert(sw.includes('./themes/oneup-palette/selector.css'));
  browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
  for (const width of [320, 390, 1366]) {
    const mobile = width < 600;
    const context = await browser.newContext({
      viewport: {width, height: 844},
      isMobile: mobile,
      hasTouch: mobile,
      reducedMotion: 'reduce',
    });
    await context.route('**/*', route =>
      route.request().url().startsWith(BASE) ? route.continue() : route.abort());
    const page = await context.newPage();
    try {
      await page.goto(BASE + 'index.html', {waitUntil: 'domcontentloaded'});
      await page.addStyleTag({content: '#oneup-opening{display:none!important}'});
      await page.locator('#oneup-theme-trigger').waitFor({state: 'attached', timeout: 12000});
      const initial = await page.evaluate(() => ({
        theme: document.documentElement.dataset.oneupTheme,
        accent: getComputedStyle(document.documentElement).getPropertyValue('--oneup-pal-accent').trim(),
        buttons: document.querySelectorAll('[data-oneup-theme-option]').length,
        drawer: Boolean(document.querySelector('#km-drawer')),
        overflow: document.documentElement.scrollWidth - innerWidth,
      }));
      assert.equal(initial.theme, 'esmeralda');
      assert.equal(initial.accent, '#7aeeab');
      assert.equal(initial.buttons, 6, 'One selector group in header and one in drawer');
      assert(initial.drawer);
      assert(initial.overflow <= 14, 'Horizontal overflow at ' + width + ': ' + initial.overflow);
      const action = page.locator('#hero-detail');
      const green = await action.evaluate(el => getComputedStyle(el).backgroundImage);
      assert(green.includes('linear-gradient'), 'Green theme CTA missing');
      if (mobile) {
        assert.equal(await page.locator('#oneup-theme-trigger').isVisible(), false);
        await page.locator('#km-open').click();
        await page.locator('#km-drawer .oneup-theme-option[data-oneup-theme-option="violeta"]').click();
      } else {
        await page.locator('#oneup-theme-trigger').click();
        assert.equal(await page.locator('#oneup-theme-trigger').getAttribute('aria-expanded'), 'true');
        await page.locator('#oneup-theme-panel .oneup-theme-option[data-oneup-theme-option="violeta"]').click();
        assert.equal(await page.locator("#oneup-theme-trigger").evaluate(el => document.activeElement === el), true,
          "Theme picker should restore focus to its trigger after a selection");
      }
      assert.equal(await page.evaluate(() => document.documentElement.dataset.oneupTheme), 'violeta');
      assert.equal(await page.evaluate(() => localStorage.getItem('oneup.palette.v1')), 'violeta');
      assert.equal(await page.locator('.oneup-theme-option[aria-pressed="true"]').count(), 2);
      if (mobile) await page.locator('#km-close').click();
      await page.reload({waitUntil:'domcontentloaded'});
      await page.addStyleTag({content: '#oneup-opening{display:none!important}'});
      await page.locator('#oneup-theme-trigger').waitFor({state:'attached'});
      assert.equal(await page.evaluate(() => document.documentElement.dataset.oneupTheme), 'violeta',
        'Saved theme must survive reload');
      if (mobile) {
        await page.locator('#km-open').click();
        await page.locator('#km-drawer .oneup-theme-option[data-oneup-theme-option="original"]').click();
        await page.locator('#km-close').click();
      } else {
        await page.locator('#oneup-theme-trigger').click();
        await page.locator('#oneup-theme-panel .oneup-theme-option[data-oneup-theme-option="original"]').click();
      }
      const original = await page.evaluate(() => ({
        theme: document.documentElement.dataset.oneupTheme,
        palette: getComputedStyle(document.documentElement).getPropertyValue('--oneup-pal-accent').trim(),
      }));
      assert.equal(original.theme, 'original');
      assert.equal(original.palette, '', 'Original option must actually restore original CSS');
      // Return to the intended default look for screenshots.
      await page.evaluate(() => window.OneUpPalette.set('esmeralda'));
      await page.screenshot({path: 'e2e-oneup-theme-' + width + '.png', animations:'disabled'});
      console.log('PASS theme picker ' + width + 'px: mobile=' + mobile + ', persistence, restore, styling');
    } finally {
      await context.close();
    }
  }
} finally {
  await browser?.close();
  await new Promise(ok => server.close(ok));
}
