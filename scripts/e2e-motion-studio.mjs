import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root = resolve('.'), server = createServer(async (req, res) => {
  try {
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!path.startsWith(root + sep)) throw Error('bad path');
    const bytes = await readFile(path);
    res.writeHead(200, { 'Content-Type': { '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css',
      '.png': 'image/png', '.html': 'text/html' }[extname(path)] || 'application/octet-stream' });
    res.end(bytes);
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + server.address().port + '/dexter-motion-studio.html';
let browser, errors = [];
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  for (const spec of [
    { name: 'desktop', width: 1366, height: 768, mobile: false },
    { name: 'mobile', width: 390, height: 844, mobile: true }
  ]) {
    const context = await browser.newContext({ viewport: spec, isMobile: spec.mobile,
      hasTouch: spec.mobile, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !!window.DexterMotionStudio, { timeout: 15000 });
    if (!(await page.evaluate(() => window.DexterMotionStudio.hasLogo()))) throw Error('Logo failed to decode: ' + spec.name);
    const start = await page.evaluate(() => window.DexterMotionStudio.getScene());
    if (start.format !== 'landscape') throw Error('Unexpected initial format');
    await page.locator('#format').selectOption('portrait');
    let result = await page.evaluate(() => ({
      scene: window.DexterMotionStudio.getScene(), w: document.querySelector('canvas').width,
      h: document.querySelector('canvas').height, overflow: document.documentElement.scrollWidth - innerWidth
    }));
    if (result.scene.format !== 'portrait' || result.w !== 540 || result.h !== 960)
      throw Error('Portrait preview broken: ' + JSON.stringify(result));
    if (result.overflow > 3) throw Error('Mobile page horizontal overflow: ' + JSON.stringify(result));
    await page.locator('#title').fill('HOLA 1UP');
    await page.locator('#glow').evaluate(el => {
      el.value = '.42'; el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    result = await page.evaluate(() => ({
      scene: window.DexterMotionStudio.getScene(),
      rendered: window.DexterMotionStudio.renderAt(1.4),
      w: document.querySelector('canvas').width,
      pixel: Array.from(document.querySelector('canvas').getContext('2d').getImageData(15, 15, 1, 1).data)
    }));
    if (result.scene.title !== 'HOLA 1UP' || result.scene.glow !== .42 || result.rendered !== 1.4 ||
        result.pixel[3] !== 255) throw Error('Canvas editor failed: ' + JSON.stringify(result));
    const exported = await page.evaluate(() =>
      window.DexterMotionStudio.setExportMode('landscape', { duration: 2.5 }, { width: 320, height: 180 }));
    if (exported.width !== 320 || exported.height !== 180) throw Error('Headless export mode failed');
    await page.screenshot({ path: 'e2e-motion-studio-' + spec.name + '.png', fullPage: true });
    await context.close();
    console.log('PASS DEXTER Motion Studio ' + spec.name);
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.DexterMotionStudio);
  await page.locator('#play').click();
  const time = await page.locator('#timecode').textContent();
  if (time !== '0.00 / 3.20 s') throw Error('Reduced motion autoplay was not prevented: ' + time);
  console.log('PASS reduced-motion mode');
  await page.close();
  if (errors.length) throw Error('Page errors: ' + errors.join(' | '));
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
