/* Phase 3 — catalog robustness: concurrency lock (audit gap 6), AniList
   403/5xx outage handling (gap 7), refresh-airing rate-header discipline,
   and ONE coherent client cache policy (snapshot-first + SWR).
   Everything runs offline against fake AniList endpoints / stubbed fetch.
   Metadata only. */
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
import {acquireLock, createRateState, isOutageStatus, noteRateHeaders, rateWaitMs, retryDelayMs} from '../scripts/refresh-common.mjs';

const run = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- refresh-common: lock ----------

test('lock: acquire, conflict while held, release frees it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-lock-'));
  const lockPath = path.join(dir, 'refresh.lock');
  const release = acquireLock(lockPath, {label: 'test'});
  assert.equal(typeof release, 'function');
  assert.equal(acquireLock(lockPath, {label: 'test'}), null, 'second acquire must be refused while fresh');
  release();
  assert.ok(!fs.existsSync(lockPath), 'release removes the lockfile');
  const again = acquireLock(lockPath, {label: 'test'});
  assert.equal(typeof again, 'function');
  again();
});

test('lock: a stale lock (older than staleMs) is taken over', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-lock-'));
  const lockPath = path.join(dir, 'refresh.lock');
  fs.writeFileSync(lockPath, JSON.stringify({pid: 999999, label: 'dead', startedAt: Date.now() - 60 * 60 * 1000}) + '\n');
  const release = acquireLock(lockPath, {label: 'test', staleMs: 5 * 60 * 1000});
  assert.equal(typeof release, 'function', 'stale lock must not block a new run');
  release();
});

test('lock: release does not remove a lock owned by someone else', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-lock-'));
  const lockPath = path.join(dir, 'refresh.lock');
  const release = acquireLock(lockPath, {label: 'mine'});
  fs.writeFileSync(lockPath, JSON.stringify({pid: 1, label: 'other', startedAt: Date.now()}) + '\n');
  release();
  assert.ok(fs.existsSync(lockPath), 'foreign lock must survive my release');
});

// ---------- refresh-common: outage + rate helpers ----------

test('outage classification: 403 and 5xx retriable, 404/400/429 handled distinctly', () => {
  assert.equal(isOutageStatus(403), true);
  assert.equal(isOutageStatus(500), true);
  assert.equal(isOutageStatus(503), true);
  assert.equal(isOutageStatus(404), false);
  assert.equal(isOutageStatus(400), false);
  assert.equal(isOutageStatus(200), false);
  const headers = {get: n => (n === 'Retry-After' ? '3' : null)};
  assert.equal(retryDelayMs(headers, 1), 3000, 'Retry-After honoured');
  assert.equal(retryDelayMs({get: () => null}, 2), 4000, 'attempt backoff fallback');
});

test('rate state: remaining<=2 waits for the reset window', () => {
  const state = createRateState();
  const resetSec = Math.floor(Date.now() / 1000) + 10;
  noteRateHeaders(state, {get: n => ({'x-ratelimit-remaining': '1', 'x-ratelimit-limit': '30', 'x-ratelimit-reset': String(resetSec)}[String(n).toLowerCase()] ?? null)});
  assert.equal(state.remaining, 1);
  assert.ok(rateWaitMs(state) >= 8000, 'must wait ~until reset, got ' + rateWaitMs(state));
  const rich = createRateState();
  noteRateHeaders(rich, {get: n => (String(n).toLowerCase() === 'x-ratelimit-remaining' ? '25' : null)});
  assert.equal(rateWaitMs(rich), 0, 'plenty of budget: no wait');
});

// ---------- fake AniList servers for the refresh scripts ----------

function fakeMedia(section, i) {
  return {
    id: 1000 + i, idMal: 2000 + i,
    title: {english: section + '-' + i, romaji: section + '-' + i, native: ''},
    synonyms: [], description: 'D',
    coverImage: {extraLarge: 'https://example.test/c.jpg'}, bannerImage: '',
    averageScore: 80, episodes: 12, format: 'TV', status: 'FINISHED',
    seasonYear: 2024, startDate: {year: 2024}, genres: ['Action'],
    siteUrl: 'https://example.test/' + i, nextAiringEpisode: null, externalLinks: [],
  };
}
function sectionOf(vars) {
  if (vars.status === 'RELEASING') return 'season';
  if (vars.format === 'MOVIE') return 'movies';
  if (vars.sort?.[0] === 'START_DATE_DESC') return 'recent';
  if (vars.sort?.[0] === 'POPULARITY_DESC') return 'popular';
  return 'trending';
}
async function withServer(handler) {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const out = handler(JSON.parse(body || '{}'), body);
      res.writeHead(out.status, {'Content-Type': 'application/json', ...(out.headers || {})});
      res.end(JSON.stringify(out.data));
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return {server, endpoint: 'http://127.0.0.1:' + server.address().port};
}
async function runScript(script, env) {
  try {
    const r = await run(process.execPath, [path.join(repoRoot, 'scripts', script)], {env: {...process.env, ...env}, timeout: 120000});
    return {code: 0, stdout: r.stdout, stderr: r.stderr};
  } catch (e) {
    return {code: e.code ?? 1, stdout: e.stdout || '', stderr: e.stderr || ''};
  }
}
const okCatalog = ({variables}) => {
  const section = sectionOf(variables);
  return {status: 200, data: {data: {Page: {media: Array.from({length: 6}, (_, i) => fakeMedia(section, i))}}}};
};

// ---------- refresh-catalog: outage + lock integration ----------

test('refresh-catalog: 403 is retried as an outage and the run succeeds', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-p3-'));
  const catalogPath = path.join(dir, 'catalog.json');
  let calls = 0;
  const {server, endpoint} = await withServer(body => {
    calls++;
    if (calls <= 2) return {status: 403, data: {}, headers: {'Retry-After': '1'}};
    return okCatalog(body);
  });
  try {
    const r = await runScript('refresh-catalog.mjs', {ONEUP_ANILIST_ENDPOINT: endpoint, ONEUP_CATALOG_PATH: catalogPath, ONEUP_REFRESH_GAP_MS: '30', ONEUP_LOCK_PATH: path.join(dir, 'l.lock')});
    assert.equal(r.code, 0, '403-then-ok must pass: ' + r.stderr);
    assert.ok(calls >= 7, 'first section needed 3 attempts, got ' + calls + ' calls');
    const out = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    assert.equal(Object.keys(out.groups).length, 5);
  } finally { server.close(); }
});

test('refresh-catalog: persistent 503 reuses the previous snapshot per section', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-p3-'));
  const catalogPath = path.join(dir, 'catalog.json');
  const groups = {};
  for (const s of ['trending', 'popular', 'season', 'recent', 'movies']) groups[s] = Array.from({length: 6}, (_, i) => ({id: 'mal-' + (7000 + i), title: 'OLD-' + s + '-' + i}));
  fs.writeFileSync(catalogPath, JSON.stringify({updated: '2026-11-01T00:00:00.000Z', source: 'AniList public GraphQL', groups}));
  const {server, endpoint} = await withServer(() => ({status: 503, data: {}, headers: {'Retry-After': '1'}}));
  try {
    const r = await runScript('refresh-catalog.mjs', {ONEUP_ANILIST_ENDPOINT: endpoint, ONEUP_CATALOG_PATH: catalogPath, ONEUP_REFRESH_GAP_MS: '30', ONEUP_LOCK_PATH: path.join(dir, 'l.lock')});
    assert.equal(r.code, 0, 'outage with snapshot fallback must pass: ' + r.stderr);
    const out = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    assert.deepEqual(out.groups, groups);
    assert.equal(out.warnings.length, 5);
  } finally { server.close(); }
});

test('refresh-catalog: a fresh lock makes the run exit cleanly (code 0) without any request', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-p3-'));
  const catalogPath = path.join(dir, 'catalog.json');
  const lockPath = path.join(dir, 'shared.lock');
  fs.writeFileSync(lockPath, JSON.stringify({pid: process.pid, label: 'other-run', startedAt: Date.now()}) + '\n');
  let calls = 0;
  const {server, endpoint} = await withServer(body => { calls++; return okCatalog(body); });
  try {
    const r = await runScript('refresh-catalog.mjs', {ONEUP_ANILIST_ENDPOINT: endpoint, ONEUP_CATALOG_PATH: catalogPath, ONEUP_REFRESH_GAP_MS: '30', ONEUP_LOCK_PATH: lockPath});
    assert.equal(r.code, 0, 'lock conflict is a clean skip, not a failure');
    assert.match(r.stdout, /\[refresh-lock\] Another refresh-catalog run is already in progress/);
    assert.equal(calls, 0, 'no AniList request may fire while locked');
    assert.ok(!fs.existsSync(catalogPath), 'catalog untouched while locked');
  } finally { server.close(); }
});

test('refresh-catalog: a stale lock does not block the run', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-p3-'));
  const catalogPath = path.join(dir, 'catalog.json');
  const lockPath = path.join(dir, 'shared.lock');
  fs.writeFileSync(lockPath, JSON.stringify({pid: 999999, label: 'dead-run', startedAt: Date.now() - 2 * 60 * 60 * 1000}) + '\n');
  const {server, endpoint} = await withServer(okCatalog);
  try {
    const r = await runScript('refresh-catalog.mjs', {ONEUP_ANILIST_ENDPOINT: endpoint, ONEUP_CATALOG_PATH: catalogPath, ONEUP_REFRESH_GAP_MS: '30', ONEUP_LOCK_PATH: lockPath, ONEUP_LOCK_STALE_MS: '60000'});
    assert.equal(r.code, 0, 'stale lock takeover must pass: ' + r.stderr);
    assert.ok(fs.existsSync(catalogPath));
    assert.ok(!fs.existsSync(lockPath), 'lock released after the run');
  } finally { server.close(); }
});

// ---------- refresh-airing: rate headers, outage retry, scratch paths ----------

const airingMedia = (id) => ({
  id, idMal: id, type: 'ANIME', isAdult: false, format: 'TV',
  title: {romaji: 'Air ' + id, english: 'Air ' + id, native: ''},
  coverImage: {extraLarge: 'https://example.test/a.jpg', large: ''}, bannerImage: '',
  description: 'D', episodes: 12, averageScore: 80, status: 'RELEASING',
  startDate: {year: 2026, month: 11, day: 1}, season: 'FALL', seasonYear: 2026,
  trailer: null, siteUrl: 'https://example.test/' + id, genres: ['Action'],
  nextAiringEpisode: null, externalLinks: [],
});
function airingHandler({failFirstSchedule403 = false, rateHeadersOnFirst = false} = {}) {
  let scheduleCalls = 0;
  return (parsed, raw) => {
    if (raw.includes('airingSchedules')) {
      scheduleCalls++;
      if (failFirstSchedule403 && scheduleCalls === 1) return {status: 403, data: {}, headers: {'Retry-After': '1'}};
      const headers = rateHeadersOnFirst && scheduleCalls === 1
        ? {'X-RateLimit-Remaining': '1', 'X-RateLimit-Limit': '30', 'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 4)}
        : {};
      return {status: 200, headers, data: {data: {Page: {pageInfo: {hasNextPage: false}, airingSchedules: [{id: 11, airingAt: Math.floor(Date.now() / 1000) + 3600, episode: 3, media: airingMedia(501)}]}}}};
    }
    return {status: 200, data: {data: {Page: {pageInfo: {hasNextPage: false}, media: [airingMedia(601)]}}}};
  };
}
function airingEnv(dir, endpoint) {
  return {
    ONEUP_ANILIST_ENDPOINT: endpoint,
    ONEUP_AIRING_PATH: path.join(dir, 'airing.json'),
    ONEUP_TRANSLATIONS_PATH: path.join(dir, 'no-translations.json'),
    ONEUP_REFRESH_GAP_MS: '30',
    ONEUP_LOCK_PATH: path.join(dir, 'l.lock'),
  };
}

test('refresh-airing: writes to the scratch path only, reuses nothing, atomic', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-p3-air-'));
  const {server, endpoint} = await withServer(airingHandler());
  try {
    const r = await runScript('refresh-airing.mjs', airingEnv(dir, endpoint));
    assert.equal(r.code, 0, r.stderr);
    const out = JSON.parse(fs.readFileSync(path.join(dir, 'airing.json'), 'utf8'));
    assert.equal(out.airing.length, 1);
    assert.equal(out.airing[0].id, 'mal-501');
    assert.equal(out.seasonal.entries.length, 1);
    assert.ok(!fs.existsSync(path.join(dir, 'airing.json.tmp')), 'no tmp file may remain');
  } finally { server.close(); }
});

test('refresh-airing: 403 on the schedule call is retried as an outage', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-p3-air-'));
  const {server, endpoint} = await withServer(airingHandler({failFirstSchedule403: true}));
  try {
    const r = await runScript('refresh-airing.mjs', airingEnv(dir, endpoint));
    assert.equal(r.code, 0, r.stderr);
    const out = JSON.parse(fs.readFileSync(path.join(dir, 'airing.json'), 'utf8'));
    assert.equal(out.airing.length, 1, 'schedule recovered after the 403 retry');
  } finally { server.close(); }
});

test('refresh-airing: X-RateLimit-Remaining<=2 makes the next call wait for reset', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-p3-air-'));
  const {server, endpoint} = await withServer(airingHandler({rateHeadersOnFirst: true}));
  try {
    const start = Date.now();
    const r = await runScript('refresh-airing.mjs', airingEnv(dir, endpoint));
    const elapsed = Date.now() - start;
    assert.equal(r.code, 0, r.stderr);
    assert.ok(elapsed >= 2600, 'season call must wait for the reset window (~3-4s), took ' + elapsed + 'ms');
  } finally { server.close(); }
});

test('refresh-airing: a fresh lock makes the run exit cleanly without writing', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oneup-p3-air-'));
  const lockPath = path.join(dir, 'l.lock');
  fs.writeFileSync(lockPath, JSON.stringify({pid: process.pid, label: 'other-run', startedAt: Date.now()}) + '\n');
  const {server, endpoint} = await withServer(airingHandler());
  try {
    const env = airingEnv(dir, endpoint);
    const r = await runScript('refresh-airing.mjs', env);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /\[refresh-lock\] Another refresh-airing run is already in progress/);
    assert.ok(!fs.existsSync(env.ONEUP_AIRING_PATH));
  } finally { server.close(); }
});

// ---------- browser clients: outage handling + cache policy ----------

function storageStub() {
  const m = new Map();
  return {getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => { m.delete(k); }, _map: m};
}
function resp({status = 200, data = null, headers = {}}) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return {status, ok: status >= 200 && status < 300, headers: {get: n => h.get(String(n).toLowerCase()) ?? null}, json: async () => data};
}
const aniMedia = id => ({
  id, idMal: id, title: {english: 'Test ' + id, romaji: 'Test ' + id, native: ''},
  synonyms: [], description: 'Desc ' + id, coverImage: {extraLarge: 'https://example.test/c.jpg', large: ''},
  bannerImage: '', averageScore: 80, episodes: 12, format: 'TV', status: 'FINISHED',
  seasonYear: 2024, startDate: {year: 2024}, genres: ['Action'], siteUrl: 'https://anilist.co/anime/' + id,
  externalLinks: [], nextAiringEpisode: null,
});
const aniPage = items => ({data: {Page: {media: items, pageInfo: {hasNextPage: false}}}});

function loadPolicy() {
  const sandbox = {window: {}, console, setTimeout, clearTimeout};
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'catalog-cache-policy.js'), 'utf8'), sandbox, {filename: 'catalog-cache-policy.js'});
  return sandbox.window.OneUpCachePolicy;
}
function loadStudio(fetchImpl, policy) {
  const sandbox = {
    console, setTimeout, clearTimeout, AbortController, URL, performance,
    navigator: {}, location: {hash: '', protocol: 'https:'},
    localStorage: storageStub(), sessionStorage: storageStub(),
    document: {querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, createElement: () => ({style: {}})},
    window: {},
  };
  if (policy) sandbox.window.OneUpCachePolicy = policy;
  sandbox.window.window = sandbox.window;
  sandbox.fetch = fetchImpl;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'studio.js'), 'utf8'), sandbox, {filename: 'studio.js'});
  return {hook: sandbox.window.OneUpRateLimits, sandbox};
}
function loadCatalogPlus(fetchImpl, policy) {
  const sandbox = {
    console, setTimeout, clearTimeout, AbortController, URL, performance,
    navigator: {}, location: {hash: '', protocol: 'https:'},
    localStorage: storageStub(), sessionStorage: storageStub(),
    document: {querySelector: () => null, querySelectorAll: () => [], addEventListener: () => {}, createElement: () => ({style: {}})},
    window: {}, state: {catalogSource: ''}, sections: {},
    getJson: async () => { throw Error('legacy provider down'); },
    loadHome: async () => {}, switchView: () => {}, paint: () => {}, rememberAll: () => {}, setFeatured: () => {},
  };
  if (policy) sandbox.window.OneUpCachePolicy = policy;
  sandbox.window.window = sandbox.window;
  sandbox.fetch = fetchImpl;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, 'catalog-plus.js'), 'utf8'), sandbox, {filename: 'catalog-plus.js'});
  return {plus: sandbox.window.OneUpCatalogPlus, sandbox};
}

test('cache policy: ONE version, matching sw.js, TTLs per data type', () => {
  const policy = loadPolicy();
  assert.ok(policy, 'policy must be published on window');
  const sw = fs.readFileSync(path.join(repoRoot, 'sw.js'), 'utf8');
  assert.ok(sw.includes("CACHE_PREFIX+'" + policy.version + "'"), 'sw.js cache version must equal the policy version');
  assert.ok(policy.catalogListTtlMs > 0 && policy.askSnapshotTtlMs > 0 && policy.routeCacheTtlMs > 0 && policy.catalogListStaleMaxMs >= policy.catalogListTtlMs);
  const studio = fs.readFileSync(path.join(repoRoot, 'studio.js'), 'utf8');
  assert.ok(!studio.includes('3600000*8'), 'the old scattered 8h literal must be gone from studio.js');
  for (const html of ['index.html', 'studio.html']) {
    const src = fs.readFileSync(path.join(repoRoot, html), 'utf8');
    assert.ok(src.indexOf('catalog-cache-policy.js') > -1 && src.indexOf('catalog-cache-policy.js') < src.indexOf('studio.js'), html + ' must load the policy before studio.js');
  }
  assert.equal(policy.fingerprint([{id: 'a'}, {id: 'b'}]), policy.fingerprint([{id: 'a'}, {id: 'b'}]));
  assert.notEqual(policy.fingerprint([{id: 'a'}]), policy.fingerprint([{id: 'b'}]));
});

test('studio ani(): 403 is retried with backoff and then succeeds', async () => {
  let calls = 0;
  const {hook} = loadStudio(async () => {
    calls++;
    if (calls === 1) return resp({status: 403, data: {}, headers: {'Retry-After': '1'}});
    return resp({data: aniPage([aniMedia(31)])});
  }, loadPolicy());
  const r = await hook.callAni({});
  assert.equal(calls, 2, '403 must be retried, not thrown immediately');
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].id, 'mal-31');
});

test('studio ani(): persistent 503 exhausts retries and throws for the snapshot fallback', async () => {
  let calls = 0;
  const {hook} = loadStudio(async () => { calls++; return resp({status: 503, data: {}, headers: {'Retry-After': '1'}}); }, loadPolicy());
  await assert.rejects(() => hook.callAni({}), /AniList 503/);
  assert.equal(calls, 3, 'max 3 attempts on an outage');
});

test('studio fetchCatalog: AniList down -> snapshot data, never an error', async () => {
  const snapshot = {updated: '2026-11-07T00:00:00.000Z', groups: {trending: [1, 2, 3].map(i => ({id: 'mal-' + (400 + i), mal_id: 400 + i, title: 'Snap ' + i, image: '', banner: '', description: '', averageScore: 80, year: 2024, genres: ['Action'], format: 'TV', episodes: 12, status: 'FINISHED', siteUrl: '', streaming: [], next: null, source: 'snapshot'}))}};
  const {hook} = loadStudio(async (url) => {
    if (String(url).includes('catalog.json')) return resp({data: JSON.parse(JSON.stringify(snapshot))});
    return resp({status: 403, data: {}, headers: {'Retry-After': '1'}});
  }, loadPolicy());
  const r = await hook.fetchCatalog({sort: 'TRENDING_DESC', perPage: 18});
  assert.equal(r.source, 'snapshot');
  assert.equal(r.items.length, 3);
  assert.equal(r.items[0].title, 'Snap 1');
});

test('studio fetchCatalog SWR: stale list renders instantly, onUpdate fires only on change', async () => {
  const policy = loadPolicy();
  const staleItems = [aniMedia(41), aniMedia(42)].map(m => ({id: 'mal-' + m.id, mal_id: m.id, title: m.title.english, image: '', banner: '', description: '', averageScore: 80, year: 2024, genres: ['Action'], format: 'TV', episodes: 12, status: 'FINISHED', siteUrl: '', streaming: [], next: null, source: 'anilist'}));
  const freshRaw = [aniMedia(43)];
  const {hook, sandbox} = loadStudio(async () => resp({data: aniPage(freshRaw)}), policy);
  const options = {sort: 'POPULARITY_DESC', perPage: 18, page: 1};
  const key = policy.catalogKeyPrefix + JSON.stringify(options);
  sandbox.localStorage.setItem(key, JSON.stringify({items: staleItems, at: Date.now() - 12 * 3600000, source: 'anilist', next: false}));
  let updated = null;
  options.onUpdate = r => { updated = r; };
  const first = await hook.fetchCatalog(options);
  // JSON compare: vm-realm arrays fail deepStrictEqual on prototypes.
  assert.equal(JSON.stringify(first.items.map(x => x.id)), JSON.stringify(['mal-41', 'mal-42']), 'stale list is returned immediately');
  for (let i = 0; i < 150 && updated === null; i++) await sleep(100);
  assert.ok(updated !== null, 'background revalidation must call onUpdate within ~15s');
  // JSON-compare: vm-realm objects have different prototypes.
  assert.equal(JSON.stringify(updated.items.map(x => x.id)), JSON.stringify(['mal-43']), 'background refresh delivers the changed data');
});

test('catalog-plus ask(): 403 retried, then persistent 503 falls back to the snapshot', async () => {
  let mode = 'ok';
  const {plus} = loadCatalogPlus(async () => {
    if (mode === 'ok' || mode === 'ok-after-403') return resp({data: aniPage([aniMedia(51)])});
    if (mode === 'forbidden-once') { mode = 'ok-after-403'; return resp({status: 403, data: {}, headers: {'Retry-After': '1'}}); }
    return resp({status: 503, data: {}, headers: {'Retry-After': '1'}});
  }, loadPolicy());
  const vars = {page: 1, perPage: 24, sort: ['POPULARITY_DESC']};
  const live = await plus.ask('query P3', vars);
  assert.equal(live.Page.media.length, 1);
  mode = 'forbidden-once';
  const after403 = await plus.ask('query P3', {page: 2, perPage: 24});
  assert.equal(after403.Page.media.length, 1, 'a single 403 must be transparently retried');
  mode = 'down';
  const fallback = await plus.ask('query P3', vars);
  assert.equal(JSON.stringify(fallback), JSON.stringify(live), 'persistent outage serves the last good snapshot');
  assert.equal(plus.fellBack, true);
});
