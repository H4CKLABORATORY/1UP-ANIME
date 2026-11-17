/* Authorized media resolver: matching, season handling, HTTP revalidation and cache.
 * No network: every probe uses an injected fake fetch. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { beforeEach } from 'node:test';

const require = createRequire(import.meta.url);
const {
  resolveAuthorizedEpisode,
  probeSource,
  loadManifest,
  findEntry,
  findEpisode,
  safeHttpsUrl,
  clearProbeCache
} = require('../../server/src/authorized-media.js');

function fakeResponse({ status = 200, type = 'video/mp4', length = '1024' } = {}) {
  const headers = new Map([
    ['content-type', type],
    ['content-length', length]
  ]);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: key => headers.get(String(key).toLowerCase()) ?? null },
    body: { cancel: async () => {} }
  };
}

function manifestFixture() {
  return {
    version: 1,
    entries: {
      'mal-59741': {
        title: 'Demo autorizado',
        slug: 'demo-show',
        aliases: ['demo show'],
        episodes: [
          {
            number: 1,
            season: 1,
            title: 'Inicio',
            sources: [
              {
                name: 'Principal',
                src: 'https://cdn.example.com/s1/ep1.mp4',
                mime: 'video/mp4',
                language: 'Español latino',
                quality: '1080p',
                rights: 'owned'
              },
              {
                mode: 'official_embed',
                provider: 'youtube',
                videoId: 'dQw4w9WgXcQ',
                name: 'YouTube oficial',
                rights: 'authorized'
              }
            ]
          },
          {
            number: 1,
            season: 2,
            sources: [
              {
                name: 'Temporada 2',
                src: 'https://cdn.example.com/s2/ep1.mp4',
                mime: 'video/mp4',
                rights: 'authorized'
              }
            ]
          },
          {
            number: 2,
            season: 1,
            sources: [
              {
                name: 'Directo',
                src: 'https://cdn.example.com/s1/ep2.mp4',
                mime: 'video/mp4',
                rights: 'owned'
              }
            ],
            downloads: [
              { name: 'Mega', src: 'https://mega.nz/file/abc#clave' },
              { name: 'CDN', src: 'https://cdn.example.com/s1/ep2.zip', size: '300 MB' }
            ]
          }
        ]
      }
    }
  };
}

beforeEach(() => clearProbeCache());

test('safeHttpsUrl only accepts public HTTPS without credentials or custom ports', () => {
  assert.equal(safeHttpsUrl('https://cdn.example.com/ep1.mp4').href, 'https://cdn.example.com/ep1.mp4');
  assert.equal(safeHttpsUrl('http://cdn.example.com/ep1.mp4'), null);
  assert.equal(safeHttpsUrl('https://localhost/ep1.mp4'), null);
  assert.equal(safeHttpsUrl('https://127.0.0.1/ep1.mp4'), null);
  assert.equal(safeHttpsUrl('https://media.local/ep1.mp4'), null);
  assert.equal(safeHttpsUrl('https://user:secret@cdn.example.com/ep1.mp4'), null);
  assert.equal(safeHttpsUrl('https://cdn.example.com:4443/ep1.mp4'), null);
  assert.equal(safeHttpsUrl('https://cdn.example.com/ep1.mp4#fragment'), null);
  assert.equal(safeHttpsUrl('https://mega.nz/file/abc#clave', { allowHash: true }).hash, '#clave');
});

test('findEntry matches key, slug, alias and title without false positives', () => {
  const manifest = manifestFixture();
  assert.equal(findEntry(manifest, 'mal-59741').key, 'mal-59741');
  assert.equal(findEntry(manifest, 'demo-show').key, 'mal-59741');
  assert.equal(findEntry(manifest, 'Demo Show').key, 'mal-59741');
  assert.equal(findEntry(manifest, 'Demo autorizado').key, 'mal-59741');
  assert.equal(findEntry(manifest, 'otro-anime'), null);
  assert.equal(findEntry({ entries: {} }, 'mal-59741'), null);
});

test('findEpisode requires the requested season and ignores missing episodes', () => {
  const entry = manifestFixture().entries['mal-59741'];
  assert.equal(findEpisode(entry, 1, 1).sources[0].src, 'https://cdn.example.com/s1/ep1.mp4');
  assert.equal(findEpisode(entry, 1, 2).sources[0].src, 'https://cdn.example.com/s2/ep1.mp4');
  assert.equal(findEpisode(entry, 9, 1), null);
});

test('an anime outside the manifest returns null so callers can decide their fallback', async () => {
  const result = await resolveAuthorizedEpisode('mal-00000', 1, {
    manifest: manifestFixture(),
    fetchImpl: async () => fakeResponse()
  });
  assert.equal(result, null);
});

test('declared direct sources are probed with HEAD and embeds are never probed', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options.method });
    return fakeResponse();
  };
  const result = await resolveAuthorizedEpisode('mal-59741', 1, {
    manifest: manifestFixture(),
    fetchImpl,
    refresh: true
  });

  assert.equal(result.found, true);
  assert.equal(result.source, 'authorized');
  assert.equal(result.episode_declared, true);
  assert.equal(result.players.length, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, 'HEAD');
  assert.equal(calls[0].url, 'https://cdn.example.com/s1/ep1.mp4');

  const direct = result.players.find(player => player.src);
  const embed = result.players.find(player => player.embed_url);
  assert.equal(direct.status.ok, true);
  assert.equal(direct.status.contentType, 'video/mp4');
  assert.equal(embed.status, null);
  assert.equal(embed.embed_url, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
});

test('successful probes are cached until refresh forces a new request', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return fakeResponse();
  };

  await resolveAuthorizedEpisode('mal-59741', 1, { manifest: manifestFixture(), fetchImpl });
  await resolveAuthorizedEpisode('mal-59741', 1, { manifest: manifestFixture(), fetchImpl });
  assert.equal(calls, 1, 'second resolution should use the cached probe');

  await resolveAuthorizedEpisode('mal-59741', 1, { manifest: manifestFixture(), fetchImpl, refresh: true });
  assert.equal(calls, 2, 'refresh must bypass the cache');
});

test('an HTML response is reported as a dead video link', async () => {
  const result = await resolveAuthorizedEpisode('mal-59741', 1, {
    manifest: manifestFixture(),
    fetchImpl: async () => fakeResponse({ type: 'text/html; charset=utf-8' }),
    refresh: true
  });
  const direct = result.players.find(player => player.src);
  assert.equal(direct.status.ok, false);
  assert.match(direct.status.error, /HTML/);
});

test('a non-HTTPS source is rejected without any network request', async () => {
  let calls = 0;
  const manifest = manifestFixture();
  manifest.entries['mal-59741'].episodes[0].sources = [
    { name: 'Insegura', src: 'http://cdn.example.com/ep1.mp4', mime: 'video/mp4', rights: 'owned' }
  ];
  const result = await resolveAuthorizedEpisode('mal-59741', 1, {
    manifest,
    fetchImpl: async () => {
      calls++;
      return fakeResponse();
    },
    refresh: true
  });
  assert.equal(calls, 0);
  assert.equal(result.players[0].status.ok, false);
  assert.match(result.players[0].status.error, /HTTPS/);
});

test('HEAD 405 falls back to a ranged GET and still verifies the media', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(options.method);
    if (options.method === 'HEAD') return fakeResponse({ status: 405, type: 'text/plain' });
    assert.equal(options.headers.Range, 'bytes=0-0');
    return fakeResponse({ status: 206 });
  };
  const result = await resolveAuthorizedEpisode('mal-59741', 1, {
    manifest: manifestFixture(),
    fetchImpl,
    refresh: true
  });
  const direct = result.players.find(player => player.src);
  assert.deepEqual(calls, ['HEAD', 'GET']);
  assert.equal(direct.status.ok, true);
  assert.equal(direct.status.code, 206);
});

test('missing episodes return found with no sources instead of falling back to scraping', async () => {
  const result = await resolveAuthorizedEpisode('mal-59741', 99, {
    manifest: manifestFixture(),
    fetchImpl: async () => fakeResponse()
  });
  assert.equal(result.found, true);
  assert.equal(result.episode_declared, false);
  assert.deepEqual(result.players, []);
  assert.deepEqual(result.downloads, []);
});

test('season selects the right episode with the same number', async () => {
  const result = await resolveAuthorizedEpisode('mal-59741', 1, {
    manifest: manifestFixture(),
    season: 2,
    fetchImpl: async () => fakeResponse(),
    refresh: true
  });
  assert.equal(result.season, 2);
  assert.equal(result.players[0].src, 'https://cdn.example.com/s2/ep1.mp4');
});

test('downloads are probed when possible and unprobeable hosts stay unknown', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, method: options.method });
    return fakeResponse({ type: 'application/zip' });
  };
  const result = await resolveAuthorizedEpisode('mal-59741', 2, {
    manifest: manifestFixture(),
    fetchImpl,
    refresh: true
  });

  assert.equal(result.downloads.length, 2);
  assert.deepEqual(calls.map(call => call.url).sort(), [
    'https://cdn.example.com/s1/ep2.mp4',
    'https://cdn.example.com/s1/ep2.zip'
  ]);
  assert.equal(result.downloads[0].server, 'CDN');
  assert.equal(result.downloads[0].status.ok, true);
  assert.equal(result.downloads[1].server, 'Mega');
  assert.equal(result.downloads[1].status, null);
});

test('probe:false disables all HTTP requests', async () => {
  let calls = 0;
  const result = await resolveAuthorizedEpisode('mal-59741', 1, {
    manifest: manifestFixture(),
    probe: false,
    fetchImpl: async () => {
      calls++;
      return fakeResponse();
    }
  });
  assert.equal(calls, 0);
  assert.equal(result.revalidated, false);
  assert.equal(result.players.find(player => player.src).status, null);
});

test('probeSource rejects non-public URLs without any network access', async () => {
  const result = await probeSource('https://localhost/ep1.mp4');
  assert.equal(result.ok, false);
  assert.match(result.error, /HTTPS/);
});

test('the public manifest stays readable and preserves empty entries', () => {
  const manifest = loadManifest('data/licensed-media.json');
  assert.ok(manifest.entries && typeof manifest.entries === 'object');
});
