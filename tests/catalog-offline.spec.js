/* Phase 3 — offline proof: with the network fully blocked for anything
 * outside this origin (AniList included), the first-click experience
 * still works from the shipped snapshot: home renders real catalog
 * items, the catalog view renders, and a detail page opens from
 * snapshot data. 0 page errors, no dead-end error screen.
 * The snapshot (data/catalog.json) is a same-origin static file, which
 * is exactly what the service worker caches in production. */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'catalog.json'), 'utf8'));
const firstTrending = catalog.groups.trending[0];

test('offline: home, catalog and a detail page render from the snapshot', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    // Aborted external requests (posters, AniList) log resource errors;
    // anything else is a real console error.
    if (m.type() === 'error' && !/Failed to load resource/i.test(m.text())) errors.push(m.text());
  });
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('oneup-v3-opening-seen-v1', 'yes');
      sessionStorage.setItem('oneup_intro_seen', 'v5');
    } catch {}
  });
  // Fully block the network beyond this origin.
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith('http://127.0.0.1:8765/')) return route.continue();
    return route.abort();
  });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });

  // Home: real snapshot items in the trending rail, not the samples.
  const trendingCards = page.locator('#trending-rail .anime-card');
  await expect(trendingCards.first()).toBeVisible({ timeout: 20000 });
  expect(await trendingCards.count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('#trending-rail')).not.toContainText('Fuentes no disponibles');
  await expect.poll(async () => (await page.locator('#hero-title').textContent() || '').trim().length).toBeGreaterThan(2);

  // Catalog view: renders snapshot items and says where they came from.
  await page.locator('.desktop-links [data-route="catalogo"]').click();
  const gridCards = page.locator('#browse-grid .anime-card');
  await expect(gridCards.first()).toBeVisible({ timeout: 20000 });
  expect(await gridCards.count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('#browse-status')).toContainText(/Catálogo guardado|AniList/);
  await expect(page.locator('#browse-grid')).not.toContainText('Fuentes no disponibles');

  // Detail page: open the first trending snapshot item in-app.
  await page.evaluate((id) => {
    const el = document.querySelector('#browse-grid [data-details="' + id + '"]') || document.querySelector('[data-details="' + id + '"]');
    if (!el) throw new Error('snapshot card not rendered: ' + id);
    el.click();
  }, firstTrending.id);
  await expect(page.locator('#anime-detail')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#detail-anime-name')).toContainText(firstTrending.title.slice(0, 12), { timeout: 10000 });
  expect(new URL(page.url()).pathname).toBe('/anime/' + firstTrending.id);
  await expect(page.locator('.anime-not-found')).toHaveCount(0);

  expect(errors).toEqual([]);
});
