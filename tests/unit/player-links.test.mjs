import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const links = require('../../client/src/js/player-links.js');

const internal = server => ({ kind: 'player', server, embed_url: `https://jkanime.org/jkplayer/um?e=${server}` });
const external = server => ({ kind: 'player', server, embed_url: `https://streamwish.com/e/${server}` });

test('isInternalPlayer y splitLinks separan pacientes de externos', () => {
  assert.equal(links.isInternalPlayer(internal('Desu')), true);
  assert.equal(links.isInternalPlayer({ kind: 'player', embed_url: 'https://jkanime.net/jkplayer/mg?e=a' }), true);
  assert.equal(links.isInternalPlayer(external('Streamwish')), false);
  assert.equal(links.isInternalPlayer({ kind: 'download', server: 'Desu' }), false);
  const { internal: i, external: e } = links.splitLinks([internal('Desu'), external('Streamwish')]);
  assert.equal(i.length, 1);
  assert.equal(e.length, 1);
});

test('mergePlayerLinks sustituye internos por los del cliente y conserva warning', () => {
  const server = [internal('Desu'), external('Streamwish')];
  const client = [{ ...internal('Desu'), embed_url: 'https://jkanime.org/jkplayer/um?e=TEST' }, internal('Magi')];
  server.warning = 'reto Cloudflare';
  const merged = links.mergePlayerLinks(server, client);
  assert.ok(merged.some(l => l.embed_url.includes('e=TEST')), 'usa la URL del cliente');
  assert.ok(merged.some(l => l.server === 'Magi'), 'añade internos extra del cliente');
  assert.ok(merged.some(l => l.server === 'Streamwish'), 'conserva externos del servidor');
  assert.equal(merged.warning, 'reto Cloudflare');
});

test('el almacén local guarda solo enlaces internos y migra entradas antiguas', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v)
  };
  store.set(links.STORAGE_KEY, JSON.stringify({
    'jk-1': { id: 'jk-1', episodes: { 1: { links: [internal('Desu'), external('Streamwish')] } } }
  }));
  const stored = links.getStoredEpisodeLinks('jk-1', 1);
  assert.equal(stored.length, 1, 'filtra el externo guardado antes');
  assert.equal(stored[0].server, 'Desu');

  links.saveLocalAnime({ id: 'jk-2', title: 'Serie' });
  links.saveStoredEpisodeLinks('jk-2', 1, [internal('Magi'), external('VOE')], { source: 'sync' });
  assert.equal(links.getStoredEpisodeLinks('jk-2', 1).length, 1);
  links.updateLocalAnime('jk-2', { selectedPlayer: 'Magi' });
  assert.equal(links.getLocalAnime('jk-2').selectedPlayer, 'Magi');
});

test('fetchEpisodeLinks lee la cabecera de advertencia', async () => {
  globalThis.fetch = async () => ({
    ok: true,
    headers: { get: name => name === 'x-jkanime-warning' ? encodeURIComponent('sin enlaces nuevos') : null },
    json: async () => [{ kind: 'player', server: 'Desu' }]
  });
  const result = await links.fetchEpisodeLinks('jk-1', 1, { bases: ['/api'] });
  assert.equal(result.warning, 'sin enlaces nuevos');
});

test('resolveStream envía la URL del reproductor por POST', async () => {
  let body = null;
  globalThis.fetch = async (_url, options) => {
    body = JSON.parse(options.body);
    return { ok: true, json: async () => ({ url: 'https://cdn.example.com/v.m3u8', type: 'hls', browserPlayable: true }) };
  };
  const stream = await links.resolveStream('jk-1', 1, 'https://jkanime.org/jkplayer/um?e=a', { bases: ['/api'] });
  assert.equal(body.url, 'https://jkanime.org/jkplayer/um?e=a');
  assert.equal(body.refresh, false);
  assert.equal(stream.browserPlayable, true);
});
