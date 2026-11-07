/* Phase 2 — full anime detail pages at /anime/<id>.
 * Served by a tiny GitHub-Pages-like static server: unknown paths return
 * 404.html with a 404 status (exactly what GitHub Pages does), which is
 * what makes the deep-link pattern testable end to end.
 * All external traffic is intercepted: AniList gets local fixtures, every
 * other external request is aborted, so the suite is deterministic and
 * offline. The licensed TMS episode comes from data/licensed-media.json. */
const { test, expect } = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = 8771;
const ORIGIN = 'http://127.0.0.1:' + PORT;
const MIMES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2'
};

let server;
test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, ORIGIN).pathname);
      let file = path.resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        // GitHub Pages behaviour: unknown path -> 404.html with status 404.
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        res.end(fs.readFileSync(path.join(ROOT, '404.html')));
        return;
      }
      res.writeHead(200, { 'content-type': MIMES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(500).end(); }
  });
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
});
test.afterAll(async () => { await new Promise((resolve) => server.close(resolve)); });

const LUPIN = {
  data: {
    Media: {
      id: 21234, idMal: 27947,
      title: { english: 'Lupin the Third: Part 4', romaji: 'Lupin III: Part 4', native: 'ルパン三世 PART4' },
      synonyms: [], description: 'Lupin III undertakes a new adventure in Italy.',
      coverImage: { extraLarge: '', large: '' }, bannerImage: null,
      averageScore: 76, episodes: 24, format: 'TV', status: 'FINISHED',
      seasonYear: 2015, startDate: { year: 2015 }, genres: ['Action', 'Adventure', 'Comedy'],
      siteUrl: 'https://anilist.co/anime/21234', nextAiringEpisode: null, externalLinks: [],
      studios: { nodes: [{ name: 'Telecom Animation Film' }] }
    }
  }
};

async function prepare(page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('oneup-v3-opening-seen-v1', 'yes');
      sessionStorage.setItem('oneup_intro_seen', 'v5');
    } catch {}
  });
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(ORIGIN + '/')) return route.continue();
    if (url.includes('graphql.anilist.co')) {
      const body = route.request().postData() || '';
      if (body.includes('OneUpDetail')) {
        if (body.includes('27947')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LUPIN) });
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { Media: null } }) });
      }
      // Catalog/franchise/etc queries: empty page -> snapshot fallback.
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: { Page: { pageInfo: { hasNextPage: false, currentPage: 1 }, media: [] }, Media: null } })
      });
    }
    return route.abort();
  });
}

test('direct deep link /anime/mal-21 loads the detail page via the 404 pattern', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await prepare(page);
  await page.goto(ORIGIN + '/anime/mal-21', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#anime-detail')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#detail-anime-name')).toContainText(/One Piece/i);
  expect(new URL(page.url()).pathname).toBe('/anime/mal-21');
  await expect(page.locator('#anime-dialog')).toHaveCount(0);
  await expect(page.locator('#home-screen')).toBeHidden();
  expect(errors).toEqual([]);
});

test('mal-27947 detail shows the player section with the licensed TMS embed', async ({ page }) => {
  await prepare(page);
  await page.goto(ORIGIN + '/anime/mal-27947', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#anime-detail')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#detail-anime-name')).toContainText(/Lupin/i);
  const player = page.locator('#oneup-player-section');
  await expect(player).toBeVisible();
  await expect(player.locator('#oneup-watch-episode')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#detail-studio-value')).toHaveText('Telecom Animation Film', { timeout: 15000 });
  const play = page.locator('#oneup-embed-play');
  await expect(play).toBeVisible({ timeout: 15000 });
  await play.click();
  const iframe = page.locator('#oneup-embed-frame iframe');
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/K8LrLO_omys/);
});

test('in-app navigation changes the URL with no modal, and Back restores the exact catalog scroll', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await prepare(page);
  await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded' });
  await page.locator('.desktop-links [data-route="catalogo"]').click();
  await expect(page.locator('#browse-grid .anime-card').first()).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => window.scrollTo(0, 900));
  // The page uses CSS smooth scrolling: wait until the scroll settles so
  // `before` is the position the visitor actually leaves from (the value
  // the app stamps into the history entry), not a mid-animation sample.
  let before = 0;
  await expect.poll(async () => {
    const y1 = await page.evaluate(() => Math.round(window.scrollY));
    await page.waitForTimeout(180);
    const y2 = await page.evaluate(() => Math.round(window.scrollY));
    before = y2;
    return y1 === y2;
  }, { timeout: 8000 }).toBe(true);
  expect(before).toBeGreaterThan(400);

  await page.evaluate(() => {
    const el = document.querySelector('#browse-grid [data-details="mal-21"]');
    if (!el) throw new Error('mal-21 card not rendered in catalog');
    el.click();
  });
  await expect(page.locator('#anime-detail')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#detail-anime-name')).toContainText(/One Piece/i);
  expect(new URL(page.url()).pathname).toBe('/anime/mal-21');
  await expect(page.locator('#anime-dialog')).toHaveCount(0);
  expect(await page.evaluate(() => Math.round(window.scrollY))).toBeLessThanOrEqual(2);

  await page.goBack();
  await expect(page.locator('#browse-screen')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#anime-detail')).toBeHidden();
  await expect.poll(async () => Math.abs((await page.evaluate(() => Math.round(window.scrollY))) - before), { timeout: 8000 }).toBeLessThanOrEqual(6);

  await page.goForward();
  await expect(page.locator('#anime-detail')).toBeVisible({ timeout: 20000 });
  expect(new URL(page.url()).pathname).toBe('/anime/mal-21');

  // The detail page's own back control returns to the catalog, scroll intact.
  await page.locator('#anime-close').click();
  await expect(page.locator('#browse-screen')).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => Math.abs((await page.evaluate(() => Math.round(window.scrollY))) - before), { timeout: 8000 }).toBeLessThanOrEqual(6);
});

test('unknown id shows a graceful not-found view', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await prepare(page);
  await page.goto(ORIGIN + '/anime/mal-999999999', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#anime-detail')).toBeVisible({ timeout: 25000 });
  await expect(page.locator('.anime-not-found')).toBeVisible();
  await expect(page.locator('.anime-not-found h1')).toContainText(/no encontrado/i);
  await expect(page.locator('#anime-dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('mobile 390px: detail opens from a home rail with no modal, no overflow, no console errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded' });
  const card = page.locator('#trending-rail [data-details]').first();
  await expect(card).toBeVisible({ timeout: 20000 });
  const id = await card.getAttribute('data-details');
  await card.click();
  await expect(page.locator('#anime-detail')).toBeVisible({ timeout: 20000 });
  expect(new URL(page.url()).pathname).toBe('/anime/' + id);
  await expect(page.locator('#anime-dialog')).toHaveCount(0);
  await expect(page.locator('#oneup-comments-section')).toHaveCount(1);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('refresh on a detail URL reopens the same detail via the 404 pattern', async ({ page }) => {
  await prepare(page);
  await page.goto(ORIGIN + '/anime/mal-21', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#anime-detail')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#detail-anime-name')).toContainText(/One Piece/i);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#anime-detail')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#detail-anime-name')).toContainText(/One Piece/i);
  expect(new URL(page.url()).pathname).toBe('/anime/mal-21');
});
