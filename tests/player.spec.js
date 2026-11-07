/* Phase 4 — episode player verification with OUR OWN synthetic fixtures.
 * Fixtures: tests/fixtures/player-fixture.webm (VP9/Opus test pattern+tone,
 * generated locally with ffmpeg) and player-fixture.es.vtt (two Spanish
 * cues written for this test). They are served ONLY through Playwright
 * route interception under the fake host fixtures.example.com and through a
 * test-only licensed-media manifest fulfilled in memory. The production
 * data/licensed-media.json is never touched and the fixtures are never
 * catalog content (Rule 12).
 * The player's URL gate requires public https URLs, so interception is how
 * a local fixture reaches the unmodified production code path.
 * HLS note: the HLS fixture is H.264/AAC in MPEG-TS. Dexter's Chromium has
 * no H.264/AAC codecs (Phase 1 finding), so the HLS test asserts the full
 * plumbing (adapter -> hls.js -> manifest parsed) and records the codec
 * limitation instead of faking playback. */
const { test, expect } = require('@playwright/test');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures');
const PORT = 8773;
const ORIGIN = 'http://127.0.0.1:' + PORT;
const ANIME_ID = 'mal-999001';
const FIXTURE_HOST = 'https://fixtures.example.com';
const MIMES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.vtt': 'text/vtt; charset=utf-8',
  '.m3u8': 'application/vnd.apple.mpegurl', '.ts': 'video/mp2t', '.woff2': 'font/woff2'
};

let server;
test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, ORIGIN).pathname);
      const file = path.resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname));
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
      const size = fs.statSync(file).size;
      const type = MIMES[path.extname(file)] || 'application/octet-stream';
      const range = req.headers.range;
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        const start = m && m[1] ? Number(m[1]) : 0;
        const end = m && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
        res.writeHead(206, { 'content-type': type, 'content-range': 'bytes ' + start + '-' + end + '/' + size, 'accept-ranges': 'bytes', 'content-length': end - start + 1, 'cache-control': 'no-store' });
        fs.createReadStream(file, { start, end }).pipe(res);
        return;
      }
      res.writeHead(200, { 'content-type': type, 'content-length': size, 'accept-ranges': 'bytes', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    } catch { res.writeHead(500).end(); }
  });
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
});
test.afterAll(async () => { await new Promise((resolve) => server.close(resolve)); });

function manifestWith(sources) {
  return JSON.stringify({
    version: 1,
    entries: {
      [ANIME_ID]: {
        title: 'Player Fixture (test only)',
        episodes: [{ season: 1, number: 1, title: 'Fixture', language: 'es-419', sources }]
      }
    }
  });
}
const webmSource = (name, file) => ({
  name, src: FIXTURE_HOST + '/' + file, mime: 'video/webm', rights: 'authorized',
  language: 'es-419', quality: '180p',
  tracks: [{ url: FIXTURE_HOST + '/player-fixture.es.vtt', lang: 'es', label: 'Espanol' }]
});

const fixtureRequests = [];
async function openPlayer(page, sources, { allowHlsCdn = false } = {}) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('oneup-v3-opening-seen-v1', 'yes');
      sessionStorage.setItem('oneup_intro_seen', 'v5');
    } catch {}
  });
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/data/licensed-media.json')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: manifestWith(sources) });
    }
    if (url.startsWith(FIXTURE_HOST + '/')) {
      const rel = decodeURIComponent(new URL(url).pathname).replace(/^\//, '');
      fixtureRequests.push(rel);
      if (rel.includes('dead')) return route.abort('connectionrefused');
      const file = path.join(FIXTURES, rel);
      if (!file.startsWith(FIXTURES) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'no fixture' });
      // Serve like a real file host: without Accept-Ranges / 206 answers
      // Chromium treats the response as unseekable and silently drops
      // currentTime seeks, which would hide whether resume really works.
      const bodyBuf = fs.readFileSync(file);
      const cors = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'Content-Length, Content-Range, Accept-Ranges' };
      const range = route.request().headers()['range'];
      const rm = range ? /bytes=(\d*)-(\d*)/.exec(range) : null;
      if (rm) {
        const start = rm[1] ? Number(rm[1]) : 0;
        const end = rm[2] ? Math.min(Number(rm[2]), bodyBuf.length - 1) : bodyBuf.length - 1;
        return route.fulfill({
          status: 206, body: bodyBuf.subarray(start, end + 1),
          headers: {
            'content-type': MIMES[path.extname(file)] || 'application/octet-stream',
            'content-range': 'bytes ' + start + '-' + end + '/' + bodyBuf.length,
            'accept-ranges': 'bytes', 'content-length': String(end - start + 1), ...cors
          }
        });
      }
      return route.fulfill({
        status: 200, body: bodyBuf,
        headers: {
          'content-type': MIMES[path.extname(file)] || 'application/octet-stream',
          'accept-ranges': 'bytes', 'content-length': String(bodyBuf.length), ...cors
        }
      });
    }
    if (url.startsWith(ORIGIN + '/')) return route.continue();
    if (allowHlsCdn && url.includes('cdn.jsdelivr.net')) return route.continue();
    return route.abort();
  });
  await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.OneUpEpisodePlayer), null, { timeout: 20000 });
  await page.evaluate(async (id) => {
    const root = document.createElement('section');
    root.id = 'phase4-player-root';
    document.body.appendChild(root);
    await window.OneUpEpisodePlayer.show({ id, episodes: 1 }, { root });
  }, ANIME_ID);
}

test('direct WebM fixture plays and the Spanish VTT track is showing with cues', async ({ page }) => {
  await openPlayer(page, [webmSource('Fixture WebM', 'player-fixture.webm')]);
  const video = page.locator('#phase4-player-root video');
  await expect(video).toHaveCount(1, { timeout: 15000 });
  const state = await video.evaluate(async (v) => {
    v.muted = true;
    await v.play();
    return { paused: v.paused, readyState: v.readyState, duration: v.duration };
  });
  expect(state.paused).toBe(false);
  expect(state.readyState).toBeGreaterThanOrEqual(3);
  expect(state.duration).toBeGreaterThan(5);
  // The site renders captions itself (Subtitle Studio): it keeps the
  // chosen track in 'hidden' mode so it can read activeCues, and paints
  // the cue text into its styled overlay. Assert that whole chain: the
  // Spanish track loads its 2 cues AND the overlay shows the cue text
  // while the video plays through the first cue's window.
  await expect.poll(async () => video.evaluate((v) => {
    const t = v.textTracks && v.textTracks[0];
    return t ? (t.cues ? t.cues.length : -1) : -2;
  }), { timeout: 15000 }).toBe(2);
  await video.evaluate((v) => { v.currentTime = 0; });
  await expect(page.locator('#phase4-player-root .oneup-subtitle-overlay')).toContainText('prueba uno', { timeout: 15000 });
  const active = await video.evaluate((v) => {
    const t = v.textTracks[0];
    return t && t.activeCues && t.activeCues.length ? t.activeCues[0].text : '';
  });
  expect(active).toContain('prueba');
});

test('automatic failover: dead first server switches to the working fixture with no user action', async ({ page }) => {
  await openPlayer(page, [
    webmSource('Servidor muerto (fixture)', 'dead.webm'),
    webmSource('Fixture WebM', 'player-fixture.webm')
  ]);
  const root = page.locator('#phase4-player-root');
  // No click anywhere: the player must abandon the dead slot on its own.
  await expect.poll(async () => page.evaluate(() => {
    const src = document.querySelector('#phase4-player-root video source');
    return src ? src.getAttribute('src') : '';
  }), { timeout: 20000 }).toContain('player-fixture.webm');
  await expect(root.locator('[data-server-slot="1"]')).toHaveClass(/active/);
  const video = page.locator('#phase4-player-root video');
  const paused = await video.evaluate(async (v) => { v.muted = true; await v.play(); return v.paused; });
  expect(paused).toBe(false);
});

test('resume: guest progress is saved to localStorage and restored after a full reload', async ({ page }) => {
  await openPlayer(page, [webmSource('Fixture WebM', 'player-fixture.webm')]);
  const video = page.locator('#phase4-player-root video');
  await expect(video).toHaveCount(1, { timeout: 15000 });
  await video.evaluate(async (v) => { v.muted = true; await v.play(); });
  await expect.poll(async () => video.evaluate((v) => v.currentTime), { timeout: 15000 }).toBeGreaterThan(2.5);
  await video.evaluate((v) => v.pause());
  const key = 'oneup-player-progress-v1:' + ANIME_ID + ':s1:e1';
  const saved = await page.evaluate((k) => {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw).t : 0;
  }, key);
  expect(saved).toBeGreaterThan(2.3);
  // Full reload: a brand-new page + player instance must offer the resume.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.OneUpEpisodePlayer), null, { timeout: 20000 });
  await page.evaluate(async (id) => {
    const root = document.createElement('section');
    root.id = 'phase4-player-root';
    document.body.appendChild(root);
    await window.OneUpEpisodePlayer.show({ id, episodes: 1 }, { root });
  }, ANIME_ID);
  const video2 = page.locator('#phase4-player-root video');
  await expect(video2).toHaveCount(1, { timeout: 15000 });
  await expect.poll(async () => video2.evaluate((v) => v.currentTime), { timeout: 15000 }).toBeGreaterThan(saved - 0.75);
  await expect(page.locator('#phase4-player-root #oneup-player-message')).toContainText('Reanudando donde lo dejaste', { timeout: 15000 });
});

test('HLS fixture: adapter loads hls.js and parses the manifest (decode is codec-blocked in dexter)', async ({ page }, testInfo) => {
  await openPlayer(page, [{
    name: 'Fixture HLS', src: FIXTURE_HOST + '/hls/player-fixture.m3u8',
    mime: 'application/vnd.apple.mpegurl', rights: 'authorized', language: 'es-419', quality: '180p'
  }], { allowHlsCdn: true });
  const video = page.locator('#phase4-player-root video');
  await expect(video).toHaveCount(1, { timeout: 15000 });
  // Evidence the whole pipeline engaged: hls.js parsed the playlist and
  // came back for the segment. (The status line alone races: with an
  // undecodable codec the fatal-error message can replace the
  // 'Lista HLS recibida' message before a poll observes it.)
  await expect.poll(() => fixtureRequests.includes('hls/player-fixture-seg00.ts'), { timeout: 30000 }).toBe(true);
  await expect(page.locator('#phase4-player-root #oneup-player-message')).toContainText(/Lista HLS recibida|HLS nativo|No se pudo reproducir HLS/, { timeout: 30000 });
  const codecs = await video.evaluate((v) => ({
    h264: v.canPlayType('video/mp4; codecs="avc1.42E01E,mp4a.40.2"'),
    webmVp9: v.canPlayType('video/webm; codecs="vp9,opus"')
  }));
  testInfo.annotations.push({ type: 'hls-codecs', description: JSON.stringify(codecs) });
  // WebM/VP9 works in this Chromium; H.264 (the HLS fixture's codec) does not.
  expect(codecs.webmVp9).not.toBe('');
  expect(codecs.h264).toBe('');
});
