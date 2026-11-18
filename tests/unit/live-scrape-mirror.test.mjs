import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalog = require('../../server/src/catalog-service.js');
const resolver = require('../../server/src/jkanime-link-resolver.js');

function response({ ok = true, status = 200, cf = '', body = '' } = {}) {
  return {
    ok, status, statusText: ok ? 'OK' : 'Error',
    headers: {
      get: name => name === 'cf-mitigated' ? cf : (name === 'set-cookie' ? null : ''),
      getSetCookie: () => []
    },
    text: async () => body
  };
}

test('liveScrapeEpisode conmuta a jkanime.org y genera URLs del espejo', async () => {
  resolver.resetBase();
  const originalFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async url => {
    seen.push(String(url));
    if (String(url).includes('jkanime.net')) {
      return response({ ok: false, status: 403, cf: 'challenge' });
    }
    const html = 'var video = [{"server":"Desu","code":"d1"},{"server":"Magi","code":"m1"},{"server":"Desuka","code":"u1"}];';
    return response({ body: html });
  };
  try {
    const result = await catalog.liveScrapeEpisode('solo-leveling', 1, { force: true });
    assert.ok(seen.some(u => u.includes('jkanime.net/solo-leveling/1/')), 'intenta el dominio principal');
    assert.ok(seen.some(u => u.includes('jkanime.org/solo-leveling/1/')), 'reintenta en el espejo');
    assert.equal(resolver.getBase(), resolver.MIRROR_BASE);
    assert.equal(result.players.length, 3);
    for (const p of result.players) {
      assert.ok(p.player_url.startsWith('https://jkanime.org/jkplayer/'), 'URL del espejo: ' + p.player_url);
    }
    assert.ok(result.players.some(p => p.server === 'Desu'));
    assert.ok(result.players.some(p => p.server === 'Magi'));
    assert.ok(result.players.some(p => p.server === 'Desuka'));
  } finally {
    globalThis.fetch = originalFetch;
    resolver.resetBase();
  }
});
