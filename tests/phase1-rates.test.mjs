/* Phase 1 - AniList rate limits + refresh-catalog robustness.
   Tests the browser loaders (studio.js, catalog-plus.js) in a vm sandbox
   with stubbed fetch/storage/DOM, and scripts/refresh-catalog.mjs as a
   child process against a local fake AniList endpoint. Metadata only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';

const run = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));

function storageStub() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: k => { m.delete(k); },
    _map: m,
  };
}

function resp({status = 200, data = null, headers = {}}) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {get: n => h.get(String(n).toLowerCase()) ?? null},
    json: async () => data,
  };
}

const aniMedia = id => ({
  id, idMal: id,
  title: {english: 'Test ' + id, romaji: 'Test ' + id, native: ''},
  synonyms: [], description: 'Desc ' + id,
  coverImage: {extraLarge: 'https://example.test/c.jpg', large: ''},
  bannerImage: '', averageScore: 80, episodes: 12, format: 'TV',
  status: 'FINISHED', seasonYear: 2024, startDate: {year: 2024},
  genres: ['Action'], siteUrl: 'https://anilist.co/anime/' + id,
  externalLinks: [], nextAiringEpisode: null,
});
const aniPage = items => ({data: {Page: {media: items, pageInfo: {hasNextPage: false}}}});

function loadStudio(fetchImpl) {
  const sandbox = {
    console, setTimeout, clearTimeout,
    AbortController, URL, performance,
    navigator: {}, location: {hash: '', protocol: 'https:'},
    localStorage: storageStub(),
    sessionStorage: storageStub(),
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      createElement: () => ({style: {}}),
    },
    window: {},
  };
  sandbox.window.window = sandbox.window;
  sandbox.fetch = fetchImpl;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'studio.js'), 'utf8'), sandbox, {filename: 'studio.js'});
  return sandbox.window.OneUpRateLimits;
}

function loadCatalogPlus(fetchImpl) {
  const sandbox = {
    console, setTimeout, clearTimeout,
    AbortController, URL, performance,
    navigator: {}, location: {hash: '', protocol: 'https:'},
    localStorage: storageStub(),
    sessionStorage: storageStub(),
    document: {
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      createElement: () => ({style: {}}),
    },
    window: {},
    state: {catalogSource: ''},
    sections: {},
    getJson: async () => { throw Error('legacy provider down'); },
    loadHome: async () => {},
    switchView: () => {},
    paint: () => {},
    rememberAll: () => {},
    setFeatured: () => {},
  };
  sandbox.window.window = sandbox.window;
  sandbox.fetch = fetchImpl;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'catalog-plus.js'), 'utf8'), sandbox, {filename: 'catalog-plus.js'});
  return {plus: sandbox.window.OneUpCatalogPlus, sandbox};
}

// --- studio.js: AniList ---

test('AniList: concurrent burst is serialized (max 1 in flight) and spaced >=2.1s', async () => {
  let concurrent = 0, maxConcurrent = 0, calls = 0;
  const hook = loadStudio(async () => {
    calls++; concurrent++; maxConcurrent = Math.max(maxConcurrent, concurrent);
    await sleep(50);
    concurrent--;
    return resp({data: aniPage([aniMedia(1)])});
  });
  assert.ok(hook.ani.minGapMs >= 2000, 'AniList gap must be >= 2s (degraded 30/min cap)');
  const start = Date.now();
  const results = await Promise.all([hook.callAni({}), hook.callAni({}), hook.callAni({})]);
  const elapsed = Date.now() - start;
  assert.equal(calls, 3);
  assert.equal(maxConcurrent, 1, 'no parallel AniList bursts');
  assert.ok(elapsed >= 3900, '3 calls need 2 gaps of >=2.1s, took ' + elapsed + 'ms');
  assert.equal(results[0].source, 'anilist');
  assert.equal(results[0].items.length, 1);
});

test('AniList: 429 with Retry-After is retried and succeeds', async () => {
  let calls = 0;
  const hook = loadStudio(async () => {
    calls++;
    if (calls === 1) return resp({status: 429, data: {data: null, errors: [{message: 'Too Many Requests.', status: 429}]}, headers: {'Retry-After': '1'}});
    return resp({data: aniPage([aniMedia(2)])});
  });
  const start = Date.now();
  const r = await hook.callAni({});
  const elapsed = Date.now() - start;
  assert.equal(calls, 2);
  assert.equal(r.items.length, 1);
  assert.ok(elapsed >= 900, 'Retry-After 1s must be honoured, took ' + elapsed + 'ms');
});

test('AniList: repeated 429 throws after 3 attempts', async () => {
  let calls = 0;
  const hook = loadStudio(async () => {
    calls++;
    return resp({status: 429, data: {data: null}, headers: {'Retry-After': '1'}});
  });
  await assert.rejects(() => hook.callAni({}), /429/);
  assert.equal(calls, 3, 'max 3 attempts');
});

test('AniList: X-RateLimit-Remaining<=2 waits until the reset window', async () => {
  let calls = 0;
  const resetSeconds = Math.floor(Date.now() / 1000) + 4;
  const hook = loadStudio(async () => {
    calls++;
    return resp({data: aniPage([aniMedia(3)]), headers: {'X-RateLimit-Remaining': '1', 'X-RateLimit-Limit': '30', 'X-RateLimit-Reset': String(resetSeconds)}});
  });
  const first = await hook.callAni({});
  assert.equal(first.items.length, 1);
  assert.equal(hook.ani.state.remaining, 1, 'remaining header must be recorded');
  const start = Date.now();
  await hook.callAni({});
  const elapsed = Date.now() - start;
  assert.equal(calls, 2);
  // Reset is whole epoch seconds, so the wait is 3-4s depending on the
  // sub-second phase; anything clearly above the plain 2100ms gap proves
  // the header-driven wait fired.
  assert.ok(elapsed >= 2800, 'must wait for the reset window (~3-4s), took ' + elapsed + 'ms');
});

// --- studio.js: no Jikan (removed 2026-11-07; its API died 2026-10-01) ---

test('No Jikan: studio hook exposes AniList only, no Jikan loader remains', async () => {
  const hook = loadStudio(async () => resp({data: aniPage([aniMedia(1)])}));
  assert.equal(hook.jikan, undefined, 'no Jikan rate-limit entry may remain');
  assert.equal(hook.callJikan, undefined, 'no Jikan loader may remain');
  assert.equal(typeof hook.callAni, 'function');
  const r = await hook.callAni({});
  assert.equal(r.source, 'anilist');
});

test('No Jikan: no runtime file references the dead Jikan API host', () => {
  const needle = 'api.' + 'jikan' + '.moe';
  const runtimeFiles = [
    'studio.js', 'catalog-plus.js', 'franchise-explorer.mjs',
    'anime1v-discovery.js', 'anime-title-search.js',
    'render/anime1v-gateway.js', 'render/anime1v-adapter.js',
    'scripts/scrape-anime-metadata.py', 'scripts/refresh-catalog.mjs',
    'scripts/refresh-airing.mjs', 'index.html', 'studio.html',
  ];
  for (const rel of runtimeFiles) {
    const src = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
    assert.ok(!src.includes(needle), rel + ' must not reference ' + needle);
  }
});

// --- catalog-plus.js: ask() ---

test('ask(): live success is cached; later 429s fall back to the snapshot', async () => {
  let mode = 'ok';
  const {plus, sandbox} = loadCatalogPlus(async () => {
    if (mode === 'ok') return resp({data: aniPage([aniMedia(7)])});
    return resp({status: 429, data: {data: null}, headers: {'Retry-After': '1'}});
  });
  const vars = {page: 1, perPage: 24, sort: ['POPULARITY_DESC']};
  const live = await plus.ask('query Q', vars);
  assert.equal(live.Page.media.length, 1);
  assert.ok([...sandbox.sessionStorage._map.keys()].some(k => k.startsWith('oneup_anilist_snapshot_')), 'snapshot must be cached on success');
  mode = 'rate-limited';
  const fallback = await plus.ask('query Q', vars);
  // JSON compare: the snapshot round-trips through JSON.parse inside the
  // vm sandbox, so its objects carry that realm's prototypes and
  // deepStrictEqual would fail on prototypes despite identical content.
  assert.equal(JSON.stringify(fallback), JSON.stringify(live), 'same query must return its cached snapshot');
  assert.equal(plus.fellBack, true);
});

test('ask(): no snapshot exists -> failure still throws', async () => {
  loadCatalogPlus(async () => resp({status: 500, data: {}}));
  const {plus} = loadCatalogPlus(async () => resp({status: 500, data: {}}));
  await assert.rejects(() => plus.ask('query NEVER-CACHED', {page: 1}), /AniList 500/);
});

test('getJson(): snapshot fallback is labelled Caché, live success AniList', async () => {
  let mode = 'ok';
  const {plus, sandbox} = loadCatalogPlus(async () => {
    if (mode === 'ok') return resp({data: aniPage([aniMedia(9)])});
    return resp({status: 429, data: {data: null}, headers: {'Retry-After': '1'}});
  });
  const first = await sandbox.getJson('/top/anime');
  assert.equal(first.data.length, 1);
  assert.equal(sandbox.state.catalogSource, 'AniList');
  mode = 'rate-limited';
  const second = await sandbox.getJson('/top/anime');
  assert.equal(second.data.length, 1);
  assert.equal(second.data[0].title, 'Test 9');
  assert.equal(sandbox.state.catalogSource, 'Caché');
  assert.equal(plus.fellBack, true);
});

// --- scripts/refresh-catalog.mjs ---

const fakeMedia = (section, i) => ({
  id: 1000 + i, idMal: 2000 + i,
  title: {english: section + '-' + i, romaji: section + '-' + i, native: ''},
  synonyms: [], description: 'D',
  coverImage: {extraLarge: 'https://example.test/c.jpg'},
  bannerImage: '', averageScore: 80, episodes: 12, format: 'TV',
  status: 'FINISHED', seasonYear: 2024, startDate: {year: 2024},
  genres: ['Action'], siteUrl: 'https://example.test/' + i,
  nextAiringEpisode: null, externalLinks: [],
});

function sectionOf(vars) {
  if (vars.status === 'RELEASING') return 'season';
  if (vars.format === 'MOVIE') return 'movies';
  if (vars.sort?.[0] === 'START_DATE_DESC') return 'recent';
  if (vars.sort?.[0] === 'POPULARITY_DESC') return 'popular';
  return 'trending';
}

async function withFakeAniList(handler) {
  const server = http.createServer(async (req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const out = handler(JSON.parse(body || '{}'));
      res.writeHead(out.status, {'Content-Type': 'application/json', ...(out.headers || {})});
      res.end(JSON.stringify(out.data));
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  return {server, endpoint: 'http://127.0.0.1:' + port};
}

async function runRefresh({endpoint, catalogPath, gapMs = '30'}) {
  try {
    const r = await run(process.execPath, [path.join(repoRoot, 'scripts/refresh-catalog.mjs')], {
      env: {...process.env, ONEUP_ANILIST_ENDPOINT: endpoint, ONEUP_CATALOG_PATH: catalogPath, ONEUP_REFRESH_GAP_MS: gapMs},
      timeout: 120000,
    });
    return {code: 0, stdout: r.stdout, stderr: r.stderr};
  } catch (e) {
    return {code: e.code ?? 1, stdout: e.stdout || '', stderr: e.stderr || ''};
  }
}

function prevSnapshot() {
  const groups = {};
  for (const s of ['trending', 'popular', 'season', 'recent', 'movies']) {
    groups[s] = Array.from({length: 6}, (_, i) => ({id: 'mal-' + (9000 + i), title: 'OLD-' + s + '-' + i}));
  }
  return {updated: '2026-11-01T00:00:00.000Z', source: 'AniList public GraphQL', groups};
}

test('refresh-catalog: failed section reuses previous snapshot, writes atomically', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-refresh-'));
  const catalogPath = path.join(dir, 'catalog.json');
  fs.writeFileSync(catalogPath, JSON.stringify(prevSnapshot()));
  const {server, endpoint} = await withFakeAniList(({variables}) => {
    const section = sectionOf(variables);
    if (section === 'season') return {status: 500, data: {}};
    return {status: 200, data: {data: {Page: {media: Array.from({length: 6}, (_, i) => fakeMedia(section, i))}}}};
  });
  try {
    const r = await runRefresh({endpoint, catalogPath});
    assert.equal(r.code, 0, 'run must succeed with a section fallback: ' + r.stderr);
    assert.ok(!fs.existsSync(catalogPath + '.tmp'), 'no tmp file may remain (atomic write)');
    const out = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    assert.equal(out.groups.season[0].title, 'OLD-season-0', 'failed section reused from previous snapshot');
    assert.equal(out.groups.trending[0].title, 'trending-0', 'healthy sections are fresh');
    assert.equal(out.groups.trending.length, 6);
    assert.ok(Array.isArray(out.warnings) && out.warnings.length === 1 && /season/.test(out.warnings[0]), 'fallback must be recorded in warnings');
    assert.ok(Date.parse(out.updated) > Date.now() - 60000, 'updated must be fresh');
  } finally { server.close(); }
});

test('refresh-catalog: 429 with Retry-After is retried and the run succeeds', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-refresh-'));
  const catalogPath = path.join(dir, 'catalog.json');
  let calls = 0;
  const {server, endpoint} = await withFakeAniList(({variables}) => {
    calls++;
    const section = sectionOf(variables);
    if (calls === 1) return {status: 429, data: {data: null}, headers: {'Retry-After': '1'}};
    return {status: 200, data: {data: {Page: {media: Array.from({length: 6}, (_, i) => fakeMedia(section, i))}}}};
  });
  try {
    const r = await runRefresh({endpoint, catalogPath});
    assert.equal(r.code, 0, '429 then success must pass: ' + r.stderr);
    const out = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    assert.equal(Object.keys(out.groups).length, 5);
    assert.equal(out.groups.trending.length, 6);
  } finally { server.close(); }
});

test('refresh-catalog: total failure with no previous snapshot fails WITHOUT creating a catalog', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-refresh-'));
  const catalogPath = path.join(dir, 'catalog.json');
  const {server, endpoint} = await withFakeAniList(() => ({status: 500, data: {}}));
  try {
    const r = await runRefresh({endpoint, catalogPath});
    assert.notEqual(r.code, 0, 'total failure must exit non-zero');
    assert.ok(!fs.existsSync(catalogPath), 'no catalog file may be created from nothing');
    assert.ok(!fs.existsSync(catalogPath + '.tmp'), 'no tmp file may remain');
  } finally { server.close(); }
});

test('refresh-catalog: total failure WITH a previous snapshot keeps the old catalog', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-refresh-'));
  const catalogPath = path.join(dir, 'catalog.json');
  const prev = prevSnapshot();
  fs.writeFileSync(catalogPath, JSON.stringify(prev));
  const {server, endpoint} = await withFakeAniList(() => ({status: 500, data: {}}));
  try {
    const r = await runRefresh({endpoint, catalogPath});
    assert.equal(r.code, 0, 'all-section fallback must succeed: ' + r.stderr);
    const out = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    assert.deepEqual(out.groups, prev.groups, 'catalog must be the previous snapshot, never empty');
    assert.equal(out.warnings.length, 5, 'one warning per reused section');
  } finally { server.close(); }
});
