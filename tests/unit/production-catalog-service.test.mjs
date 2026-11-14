// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const catalogService = require('../../server/src/catalog-service.js');

test('Catalog Service: Data connection and statistics', () => {
  const stats = catalogService.getStats();
  assert.ok(stats, 'Stats object must be returned');
  assert.ok(stats.animes > 4000, `Expected >4000 animes, got ${stats.animes}`);
  assert.ok(stats.episodes > 50000, `Expected >50000 episodes, got ${stats.episodes}`);
  assert.ok(stats.links > 100000, `Expected >100000 links, got ${stats.links}`);
  assert.ok(stats.players > 50000, `Expected >50000 players, got ${stats.players}`);
  assert.ok(stats.downloads > 50000, `Expected >50000 downloads, got ${stats.downloads}`);
  assert.ok(stats.dbPath, 'Active dbPath must be non-null');
});

test('Catalog Service: Paginated catalog and schema normalization', () => {
  const result = catalogService.listCatalog({ limit: 12, page: 1 });
  assert.ok(result, 'List result must be returned');
  assert.equal(result.items.length, 12, 'Limit 12 should yield 12 items');
  assert.ok(result.total > 4000, 'Total should exceed 4000');
  assert.equal(result.page, 1);
  assert.equal(result.next, true);

  const sample = result.items[0];
  assert.ok(sample.id, 'Item must have an id');
  assert.ok(sample.title, 'Item must have a title');
  assert.ok(sample.image, 'Item must have an image poster URL');
  assert.ok(sample.poster, 'Item must have a poster URL');
  assert.ok(sample.description, 'Item must have description');
  assert.ok(sample.description_es, 'Item must have Spanish description');
  assert.ok(['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL'].includes(sample.format), `Invalid format: ${sample.format}`);
  assert.ok(['RELEASING', 'FINISHED'].includes(sample.status), `Invalid status: ${sample.status}`);
  assert.ok(Array.isArray(sample.genres), 'Genres must be an array');
  assert.ok(Number.isFinite(sample.averageScore), 'AverageScore must be a number');
});

test('Catalog Service: Filters (search, status, type)', () => {
  // Search filter
  const searchResult = catalogService.listCatalog({ search: 'frieren' });
  assert.ok(searchResult.items.length > 0, 'Search for frieren must find results');
  assert.ok(searchResult.items.some(x => x.slug === 'sousou-no-frieren'));

  // Airing filter
  const airingResult = catalogService.listCatalog({ status: 'airing', limit: 10 });
  assert.ok(airingResult.items.length > 0, 'Airing filter must return items');
  assert.ok(airingResult.items.every(x => x.status === 'RELEASING'), 'All items must have status RELEASING');

  // Movies filter
  const moviesResult = catalogService.listCatalog({ format: 'MOVIE', limit: 10 });
  assert.ok(moviesResult.items.length > 0, 'Movie filter must return items');
  assert.ok(moviesResult.items.every(x => x.format === 'MOVIE'), 'All items must have format MOVIE');
});

test('Catalog Service: Anime detail with episodes list by ID and slug', () => {
  // By numeric ID
  const detailById = catalogService.getAnimeDetail(1);
  assert.ok(detailById, 'Detail for id 1 must exist');
  assert.equal(detailById.id, 'jk-1');
  assert.ok(detailById.title, 'Must have title');
  assert.ok(Array.isArray(detailById.episodes_list), 'Must have episodes list');
  assert.ok(detailById.episodes_list.length > 0, 'Episodes list must not be empty');

  // By jk- prefixed ID
  const detailByJk = catalogService.getAnimeDetail('jk-1');
  assert.ok(detailByJk, 'Detail for jk-1 must exist');
  assert.equal(detailByJk.title, detailById.title);

  // By slug
  const detailBySlug = catalogService.getAnimeDetail('sousou-no-frieren');
  assert.ok(detailBySlug, 'Detail for sousou-no-frieren must exist');
  assert.equal(detailBySlug.title, 'Sousou no Frieren');
  assert.equal(detailBySlug.episodes, 28);
  assert.equal(detailBySlug.episodes_list.length, 28);
});

test('Catalog Service: Episode links (players and downloads)', async () => {
  const links = await catalogService.getEpisodeLinks('sousou-no-frieren', 1);
  assert.ok(links, 'Episode links must be returned');
  assert.equal(links.slug, 'sousou-no-frieren');
  assert.equal(links.episode, 1);
  assert.ok(Array.isArray(links.players), 'Players must be an array');
  assert.ok(Array.isArray(links.downloads), 'Downloads must be an array');
  assert.ok(links.players.length > 0, 'Must have active video players');
  assert.ok(links.downloads.length > 0, 'Must have direct download links');

  const player = links.players[0];
  assert.ok(player.server, 'Player must specify server provider');
  assert.ok(player.player_url || player.embed_url, 'Player must have embed/player url');

  const download = links.downloads[0];
  assert.ok(download.server, 'Download must specify server provider');
  assert.ok(download.download_url, 'Download must have download_url');
});

test('Catalog Service: Composite homepage sections', () => {
  const home = catalogService.getHomeSections();
  assert.ok(home, 'Home payload must exist');
  assert.ok(home.groups, 'Home must contain groups');
  assert.ok(Array.isArray(home.groups.trending) && home.groups.trending.length > 0, 'trending rail must have items');
  assert.ok(Array.isArray(home.groups.popular) && home.groups.popular.length > 0, 'popular rail must have items');
  assert.ok(Array.isArray(home.groups.season) && home.groups.season.length > 0, 'season rail must have items');
  assert.ok(Array.isArray(home.groups.recent) && home.groups.recent.length > 0, 'recent rail must have items');
  assert.ok(Array.isArray(home.groups.movies) && home.groups.movies.length > 0, 'movies rail must have items');
});

test('Catalog Service: HTTP Endpoints via internal server', async () => {
  const server = http.createServer(catalogService.handleRequest);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.ok, true);
    assert.equal(health.db, 'connected');

    // 2. Stats
    const statsRes = await fetch(`${baseUrl}/api/stats`);
    assert.equal(statsRes.status, 200);
    const stats = await statsRes.json();
    assert.ok(stats.animes > 4000);

    // 3. Catalog
    const catRes = await fetch(`${baseUrl}/api/catalog?limit=5`);
    assert.equal(catRes.status, 200);
    const cat = await catRes.json();
    assert.equal(cat.items.length, 5);

    // 4. Detail
    const detailRes = await fetch(`${baseUrl}/api/anime/sousou-no-frieren`);
    assert.equal(detailRes.status, 200);
    const detail = await detailRes.json();
    assert.equal(detail.slug, 'sousou-no-frieren');

    // 5. Episode links
    const linksRes = await fetch(`${baseUrl}/api/anime/sousou-no-frieren/episodes/1/links`);
    assert.equal(linksRes.status, 200);
    const links = await linksRes.json();
    assert.ok(links.players.length > 0);
    assert.ok(links.downloads.length > 0);
    // Relative okru URLs must be prefixed
    assert.ok(links.players.every(p => !p.player_url?.startsWith('/jkokru') && !p.embed_url?.startsWith('/jkokru')));

    // 6. Episodes list endpoint
    const epsRes = await fetch(`${baseUrl}/api/anime/sousou-no-frieren/episodes`);
    assert.equal(epsRes.status, 200);
    const epsData = await epsRes.json();
    assert.ok(Array.isArray(epsData.episodes), 'episodes must be an array in /episodes route');
    assert.ok(Array.isArray(epsData.episodes_list), 'episodes_list must be an array in /episodes route');
    assert.equal(epsData.episodes.length, 28);

    // 7. Home composite
    const homeRes = await fetch(`${baseUrl}/api/home`);
    assert.equal(homeRes.status, 200);
    const home = await homeRes.json();
    assert.ok(home.groups.trending.length > 0);
  } finally {
    server.close();
  }
});
