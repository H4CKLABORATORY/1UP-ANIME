/* Regression checks for Rule 2 (everything automatic) in the episode player.
 * No network media is fetched: licensed-media.json is stubbed and the video
 * error is dispatched manually. Verifies: Spanish (Latino) is the default
 * language and the first server auto-plays with no click; a failed source
 * auto-switches to the next server with no click; when no Latino source
 * exists it falls back to all languages. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const MOCK = {
  entries: {
    'test-1': { episodes: [{ number: 1, title: 'Episodio 1', language: 'Español latino', sources: [
      { name: 'Servidor Latino', src: 'https://no-such-server-1up.example.com/latino.mp4', language: 'Español latino', rights: 'authorized' },
      { name: 'Servidor Sub', src: 'https://no-such-server-1up.example.com/sub.mp4', language: 'Japonés subtitulado', rights: 'authorized' },
    ] }] },
    'test-2': { episodes: [{ number: 1, title: 'Episodio 1', language: 'Japonés subtitulado', sources: [
      { name: 'Servidor Sub', src: 'https://no-such-server-1up.example.com/sub.mp4', language: 'Japonés subtitulado', rights: 'authorized' },
    ] }] },
  },
};

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // Hold media requests pending: the failure is dispatched manually below.
  // (Phase 4: the player now also listens for <source> errors, so aborting
  // the request would itself trigger the automatic failover under test and
  // race the first scenario's assertions.)
  await page.route('**/*.mp4', () => new Promise(() => {}));
  await page.setContent('<section id="oneup-player-section"></section>');
  // Install the fetch stub in this document (addInitScript does not survive
  // setContent here); it must be in place before the player fetches.
  await page.evaluate((mock) => {
    const origFetch = window.fetch.bind(window);
    window.fetch = (url, opts) => {
      if (String(url).includes('licensed-media.json')) {
        return Promise.resolve(new Response(JSON.stringify(mock), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }));
      }
      return origFetch(url, opts);
    };
  }, MOCK);
  await page.addScriptTag({ path: 'episode-player.js' });
  const currentSrc = () => page.evaluate(() => document.querySelector('#oneup-playback-display video source')?.src || '');

  // Scenario 1: Spanish default + first server auto-plays, no click.
  await page.evaluate(() => window.OneUpEpisodePlayer.show({ id: 'test-1', episodes: 1 }));
  await page.locator('#oneup-playback-display video').waitFor({ timeout: 9000 });
  assert.match(await currentSrc(), /latino\.mp4$/, 'Spanish (Latino) source must auto-play first');
  assert.equal(await page.locator('#oneup-watch-language').inputValue(), 'latino', 'Language must default to Spanish Latino');
  assert.equal(await page.evaluate(() => document.querySelector('[data-server-slot="0"]')?.classList.contains('active')), true, 'First server must be active without a click');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.oneup-source-retry').length), 0, 'No manual retry button before any failure');

  // Scenario 2: a failed source auto-switches to the next server, no click.
  await page.evaluate(() => {
    document.querySelector('#oneup-playback-display video').dispatchEvent(new Event('error'));
  });
  assert.match(await currentSrc(), /sub\.mp4$/, 'Failed source must auto-switch to the next server');
  assert.equal(await page.locator('#oneup-watch-language').inputValue(), 'all', 'Failover widens the language when no Latino server remains');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.oneup-source-retry').length), 0, 'Failover must be automatic, not a manual retry button');
  assert.match(await page.locator('#oneup-player-message').textContent(), /Fuente seleccionada: Servidor Sub/, 'Auto-failover must land on the next source');

  // Scenario 3: no Latino source -> fall back to all languages.
  await page.evaluate(() => window.OneUpEpisodePlayer.show({ id: 'test-2', episodes: 1 }));
  await page.locator('#oneup-playback-display video').waitFor({ timeout: 9000 });
  assert.match(await currentSrc(), /sub\.mp4$/, 'Without a Latino source the available source must play');
  assert.equal(await page.locator('#oneup-watch-language').inputValue(), 'all', 'Language must fall back to all when no Latino source exists');

  assert.deepEqual(errors, []);
  console.log('PASS episode player: Spanish default, auto server, automatic failover');
} finally { await browser.close(); }
