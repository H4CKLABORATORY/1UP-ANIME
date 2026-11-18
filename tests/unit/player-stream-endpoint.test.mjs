import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { handleRequest } = require('../../server/src/catalog-service.js');

function mockReq(url, body) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.url = url;
  req.headers = {};
  process.nextTick(() => {
    if (body !== undefined) req.emit('data', JSON.stringify(body));
    req.emit('end');
  });
  return req;
}

function mockRes() {
  const out = { status: null, headers: {}, body: '' };
  const res = {
    setHeader: (k, v) => { out.headers[k] = v; },
    writeHead(status, headers) {
      out.status = status;
      if (headers) Object.assign(out.headers, headers);
      return res;
    },
    end(body) { out.body = body || ''; return res; }
  };
  return { res, out };
}

test('POST /player-stream valida la URL del reproductor', async () => {
  const { res, out } = mockRes();
  await handleRequest(mockReq('/api/animes/jk-1/episodes/1/player-stream', {}), res);
  assert.equal(out.status, 400);
  assert.match(out.body, /Falta la URL/);
});

test('POST /player-stream resuelve HLS y marca browserPlayable', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => {
    if (String(url).includes('jkplayer/')) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => null, getSetCookie: () => [] },
        text: async () => "<source src='https://cdn.example.com/v/master.m3u8'>"
      };
    }
    return { ok: true, status: 200 };
  };
  try {
    const { res, out } = mockRes();
    await handleRequest(mockReq('/api/animes/jk-1/episodes/1/player-stream', {
      url: 'https://jkanime.org/jkplayer/um?e=abc'
    }), res);
    assert.equal(out.status, 200);
    assert.equal(out.headers['Cache-Control'], 'no-store');
    const json = JSON.parse(out.body);
    assert.equal(json.url, 'https://cdn.example.com/v/master.m3u8');
    assert.equal(json.type, 'hls');
    assert.equal(json.browserPlayable, true);
    assert.equal(json.cached, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
