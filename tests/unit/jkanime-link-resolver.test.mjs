import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const r = require('../../server/src/jkanime-link-resolver.js');

const mockResponse = (status = 200, { ok = status >= 200 && status < 300, text = '', cf = '' } = {}) => ({
  ok,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: {
    get: name => (name === 'cf-mitigated' ? cf : (name === 'set-cookie' ? null : '')),
    getSetCookie: () => []
  },
  text: async () => text
});

test('classifyStreamCandidate acepta HLS/MP4/jkmedia y rechaza SSRF', () => {
  assert.deepEqual(r.classifyStreamCandidate('https://cdn.example.com/v/master.m3u8'), { url: 'https://cdn.example.com/v/master.m3u8', type: 'hls' });
  assert.deepEqual(r.classifyStreamCandidate('https://cdn.example.com/v/ep.mp4'), { url: 'https://cdn.example.com/v/ep.mp4', type: 'file' });
  assert.equal(r.classifyStreamCandidate('https://jkplayers.com/stream/jkmedia/abc').type, 'file');
  for (const bad of ['https://127.0.0.1/a.mp4', 'http://localhost/a.m3u8', 'https://10.0.0.5/a.mp4',
    'https://192.168.1.2/a.mp4', 'https://172.16.0.1/a.mp4', 'file:///etc/passwd', 'javascript:alert(1)', '']) {
    assert.equal(r.classifyStreamCandidate(bad), null, 'Debe rechazar: ' + bad);
  }
  assert.equal(r.classifyStreamCandidate('/v/master.m3u8', 'https://jkanime.org').url, 'https://jkanime.org/v/master.m3u8');
});

test('extractPlayerStreamFromHtml cubre atob, source, config, loadSource y absoluto', () => {
  const atob = Buffer.from('https://cdn.example.com/v/atob.m3u8').toString('base64');
  assert.equal(r.extractPlayerStreamFromHtml(`atob('${atob}')`).url, 'https://cdn.example.com/v/atob.m3u8');
  assert.equal(r.extractPlayerStreamFromHtml('<video><source src="https://cdn.example.com/v/src.mp4"></video>').type, 'file');
  assert.equal(r.extractPlayerStreamFromHtml("video:{url:'https://cdn.example.com/v/cfg.m3u8'}").type, 'hls');
  assert.equal(r.extractPlayerStreamFromHtml("loadSource('https://cdn.example.com/v/hls.m3u8')").url, 'https://cdn.example.com/v/hls.m3u8');
  assert.equal(r.extractPlayerStreamFromHtml('ver https://cdn.example.com/v/raw.mp4?token=1 fin').url, 'https://cdn.example.com/v/raw.mp4?token=1');
  assert.equal(r.extractPlayerStreamFromHtml('<html>sin flujo</html>'), null);
});

test('parseEpisodeLinks reutiliza el parser de episodios', () => {
  const html = `
    <a data-id="0">Desu</a><a data-id="1">Magi</a>
    video[0] = '<iframe class="player_conte" src="https://jkanime.net/jkplayer/um?e=abc"></iframe>';
    video[1] = '<iframe class="player_conte" src="https://jkanime.net/jkplayer/mg?e=def"></iframe>';
    var servers = [{"remote":"${Buffer.from('https://mediafire.com/file/x').toString('base64')}","server":"Mediafire","size":"155 MB"}];
  `;
  const { players, downloads } = r.parseEpisodeLinks(html);
  assert.ok(players.length >= 2, 'debe extraer reproductores');
  assert.ok(players.some(p => /jkplayer/.test(p.player_url)), 'incluye reproductores internos');
  assert.ok(downloads.some(d => d.server === 'Mediafire'), 'decodifica servidores base64');
});

test('probePlayerStream reintenta una vez y acepta 200/206/416', async () => {
  let calls = 0;
  const flaky = async () => { calls++; return calls === 1 ? mockResponse(403, { ok: false }) : mockResponse(200); };
  assert.equal(await r.probePlayerStream('https://cdn.example.com/v.m3u8', 50, flaky), true);
  assert.equal(calls, 2);
  assert.equal(await r.probePlayerStream('https://cdn.example.com/v.m3u8', 50, async () => mockResponse(206)), true);
  assert.equal(await r.probePlayerStream('https://cdn.example.com/v.m3u8', 50, async () => mockResponse(416, { ok: false })), true);
  assert.equal(await r.probePlayerStream('https://cdn.example.com/v.m3u8', 50, async () => { throw new Error('down'); }), false);
});

test('createStreamCache reutiliza fresco y revalida caducado', async () => {
  let now = 1000;
  const cache = r.createStreamCache({ ttlMs: 100, now: () => now });
  cache.set('k', { url: 'https://cdn.example.com/v.m3u8', type: 'hls' });
  assert.equal((await cache.get('k')).cached, true);
  now = 1200;
  assert.equal((await cache.get('k', { probe: async () => true })).url, 'https://cdn.example.com/v.m3u8');
  now = 1400; // la revalidación refrescó resolvedAt; avanzamos el reloj
  assert.equal((await cache.get('k', { probe: async () => false })), null);
  assert.equal(cache.size, 0);
});

test('isBrowserPlayableStream distingue CDN reproducible de página JkAnime', () => {
  assert.equal(r.isBrowserPlayableStream({ url: 'https://nika.playmudos.com/v/master.m3u8', type: 'hls' }), true);
  assert.equal(r.isBrowserPlayableStream({ url: 'https://jkplayers.com/stream/jkmedia/abc', type: 'file' }), true);
  assert.equal(r.isBrowserPlayableStream({ url: 'https://jkanime.org/jkplayer/um?e=abc', type: 'hls' }), false);
  assert.equal(r.isBrowserPlayableStream({ url: 'http://cdn.example.com/v.mp4', type: 'file' }), false);
  assert.equal(r.isBrowserPlayableStream(null), false);
});

test('getJkAnimeDirectStreamUrl solo acepta /jkplayer/jk con stream de jkmedia', () => {
  assert.equal(r.getJkAnimeDirectStreamUrl('https://jkanime.net/jkplayer/jk?u=stream/jkmedia/abc'), 'https://jkplayers.com/stream/jkmedia/abc');
  assert.equal(r.getJkAnimeDirectStreamUrl('https://jkanime.net/jkplayer/um?e=abc'), null);
  assert.equal(r.getJkAnimeDirectStreamUrl('https://otro.com/jkplayer/jk?u=stream/jkmedia/abc'), null);
});

test('getTextWithMirror conmuta al espejo ante reto Cloudflare', async () => {
  r.resetBase();
  const urls = [];
  const getText = async url => {
    urls.push(url);
    if (url.includes('jkanime.net')) {
      const e = new Error('challenge'); e.cfChallenge = true; throw e;
    }
    return '<html>ok</html>';
  };
  assert.equal(await r.getTextWithMirror(getText, 'https://jkanime.net/slug/1/'), '<html>ok</html>');
  assert.equal(r.getBase(), r.MIRROR_BASE);
  assert.equal(urls[1], 'https://jkanime.org/slug/1/');
  r.resetBase();
});

test('resolveJkAnimePlayerStream usa HTTP primero y respeta caché', async () => {
  const playerUrl = 'https://jkanime.net/jkplayer/um?e=abc';
  assert.rejects(() => r.resolveJkAnimePlayerStream('https://otro.com/x.mp4'), /no usa un enlace interno/);

  const http = { getText: async () => "<source src='https://cdn.example.com/v/ep.m3u8'>" };
  const fetchImpl = async () => mockResponse(200);
  const cache = r.createStreamCache();
  const first = await r.resolveJkAnimePlayerStream(playerUrl, { http, fetchImpl, cache });
  assert.equal(first.type, 'hls');
  assert.equal(first.cached, false);
  assert.equal(first.browserPlayable, true);
  const second = await r.resolveJkAnimePlayerStream(playerUrl, { http, fetchImpl, cache });
  assert.equal(second.cached, true);
  assert.equal(second.browserPlayable, true);
});

test('resolveJkAnimePlayerStream recurre al navegador si HTTP falla', async () => {
  const playerUrl = 'https://jkanime.org/jkplayer/mg?e=abc';
  const http = { getText: async () => '<html>sin flujo</html>' };
  const browserResolver = async () => ({ url: 'https://cdn.example.com/v/browser.mp4', type: 'file' });
  const stream = await r.resolveJkAnimePlayerStream(playerUrl, { http, browserResolver });
  assert.equal(stream.url, 'https://cdn.example.com/v/browser.mp4');
});
