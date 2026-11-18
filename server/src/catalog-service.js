// @ts-check
/**
 * 1UP Anime — Production Catalog Backend Service
 * Serves indexed metadata, catalog, episodes, video players, and download links from jkanime.db.
 * Built with native node:sqlite (DatabaseSync) and node:http.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { DatabaseSync } = require('node:sqlite');
const jkResolver = require('./jkanime-link-resolver.js');

const playerStreamCache = jkResolver.createStreamCache({
  ttlMs: Number(process.env.JKANIME_PLAYER_STREAM_TTL_MS) || jkResolver.DEFAULT_STREAM_TTL_MS
});

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 16384) req.destroy();
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

const DEFAULT_PORT = Number(process.env.ONEUP_CATALOG_PORT || process.env.PORT) || 4050;
const DEFAULT_HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const DB_CANDIDATES = [
  process.env.JKANIME_DB_PATH,
  path.resolve(process.cwd(), 'data/jkanime.db'),
  path.resolve(__dirname, '../../data/jkanime.db')
].filter(Boolean);

const GZ_CANDIDATES = [
  path.resolve(process.cwd(), 'data/jkanime.db.gz'),
  path.resolve(__dirname, '../../data/jkanime.db.gz')
].filter(Boolean);

let dbInstance = null;
let activeDbPath = null;

function resolveDatabase(customPath) {
  if (dbInstance) return dbInstance;
  const list = customPath ? [customPath, ...DB_CANDIDATES] : DB_CANDIDATES;

  // 1. Try existing uncompressed DB file
  for (const candidate of list) {
    if (candidate && fs.existsSync(candidate)) {
      try {
        const stat = fs.statSync(candidate);
        if (stat.size < 1024) continue;
        const db = new DatabaseSync(candidate);
        db.exec('PRAGMA journal_mode = WAL');
        db.exec('PRAGMA busy_timeout = 5000');
        dbInstance = db;
        activeDbPath = candidate;
        return dbInstance;
      } catch (err) {
        // Try next candidate if opening fails
      }
    }
  }

  // 2. If missing, auto-extract from in-repo data/jkanime.db.gz
  for (const gzCandidate of GZ_CANDIDATES) {
    if (gzCandidate && fs.existsSync(gzCandidate)) {
      try {
        const targetDb = gzCandidate.replace(/\.gz$/i, '');
        console.log(`[Catalog Service] Descomprimiendo base de datos local desde ${gzCandidate}...`);
        const gzBuf = fs.readFileSync(gzCandidate);
        const decompressed = zlib.gunzipSync(gzBuf);
        const tmpTarget = `${targetDb}.tmp-${Date.now()}`;
        fs.writeFileSync(tmpTarget, decompressed);
        fs.renameSync(tmpTarget, targetDb);

        const db = new DatabaseSync(targetDb);
        db.exec('PRAGMA journal_mode = WAL');
        db.exec('PRAGMA busy_timeout = 5000');
        dbInstance = db;
        activeDbPath = targetDb;
        console.log(`[Catalog Service] Base de datos SQLite lista en ${targetDb} (${(decompressed.length / (1024 * 1024)).toFixed(1)} MB)`);
        return dbInstance;
      } catch (err) {
        console.warn(`[Catalog Service] Error al descomprimir ${gzCandidate}: ${err.message}`);
      }
    }
  }

  return null;
}

function getDb() {
  if (!dbInstance) resolveDatabase();
  return dbInstance;
}

// -------------------------------------------------------------
// Metadata Normalization
// -------------------------------------------------------------

function parseGenres(raw) {
  if (!raw) return ['Anime'];
  try {
    const parsed = raw.startsWith('[') ? JSON.parse(raw) : raw.split(',').map(s => s.trim());
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['Anime'];
  } catch {
    return ['Anime'];
  }
}

function mapFormat(type) {
  const t = String(type || '').trim().toLowerCase();
  if (t === 'pelicula' || t === 'película') return 'MOVIE';
  if (t === 'ova') return 'OVA';
  if (t === 'ona') return 'ONA';
  if (t === 'especial' || t === 'special') return 'SPECIAL';
  return 'TV';
}

function mapStatus(status, estado) {
  const s = String(status || '').toLowerCase();
  const e = String(estado || '').toLowerCase();
  if (s === 'currently' || e.includes('emision') || e.includes('emisión')) {
    return 'RELEASING';
  }
  return 'FINISHED';
}

function calculateScore(voteCount) {
  if (!voteCount || voteCount <= 0) return 80;
  return Math.min(96, Math.max(68, Math.round(70 + Math.log10(voteCount + 1) * 8)));
}

function normalizeAnime(row) {
  if (!row) return null;
  const idStr = String(row.id);
  const formattedId = 'jk-' + idStr;
  const genres = parseGenres(row.genres);
  const format = mapFormat(row.type);
  const status = mapStatus(row.status, row.estado);
  const isAiring = status === 'RELEASING';
  const posterUrl = row.image || `https://cdn.jkdesa.com/assets/images/animes/image/${row.slug}.jpg`;
  const synopsis = row.synopsis || 'Sin descripción disponible.';
  const score = calculateScore(row.vote_count);

  return {
    id: formattedId,
    raw_id: row.id,
    slug: row.slug,
    title: row.title,
    short_title: row.short_title || row.title,
    title_romaji: row.title,
    title_native: '',
    aliases: [row.short_title, row.slug].filter(Boolean),
    image: posterUrl,
    poster: posterUrl,
    banner: row.banner || posterUrl,
    description: synopsis,
    description_es: synopsis,
    synopsis: synopsis,
    type: row.type || 'Serie',
    format: format,
    status: status,
    status_label: isAiring ? 'En emisión' : 'Finalizado',
    year: row.year || '',
    season: row.season || '',
    studios: row.studios || '',
    episodes: row.episodes_total || 0,
    episodes_total: row.episodes_total || 0,
    genres: genres,
    averageScore: score,
    siteUrl: `https://jkanime.net/${row.slug}/`,
    source: 'backend'
  };
}

// -------------------------------------------------------------
// Database Queries
// -------------------------------------------------------------

function getStats() {
  const db = getDb();
  if (!db) {
    return { animes: 0, airing: 0, finished: 0, episodes: 0, links: 0, players: 0, downloads: 0, dbPath: null };
  }
  const animes = db.prepare('SELECT count(*) as c FROM animes').get().c;
  const airing = db.prepare("SELECT count(*) as c FROM animes WHERE status = 'currently' OR estado LIKE '%emision%'").get().c;
  const finished = db.prepare("SELECT count(*) as c FROM animes WHERE status = 'finished' OR estado LIKE '%finalizado%' OR estado LIKE '%concluido%'").get().c;
  const episodes = db.prepare('SELECT count(*) as c FROM episodes').get().c;
  const links = db.prepare('SELECT count(*) as c FROM episode_links').get().c;
  const players = db.prepare("SELECT count(*) as c FROM episode_links WHERE kind = 'player'").get().c;
  const downloads = db.prepare("SELECT count(*) as c FROM episode_links WHERE kind = 'download'").get().c;

  return { animes, airing, finished, episodes, links, players, downloads, dbPath: activeDbPath };
}

function listCatalog({
  search = '',
  status = 'all',
  type = 'all',
  format = '',
  letter = 'ALL',
  genre = '',
  sort = 'POPULARITY_DESC',
  page = 1,
  limit = 24
} = {}) {
  const db = getDb();
  if (!db) return { total: 0, page: 1, limit, totalPages: 0, items: [], next: false };

  const where = [];
  const params = [];

  const q = String(search || '').trim();
  if (q) {
    where.push('(title LIKE ? OR short_title LIKE ? OR slug LIKE ?)');
    const term = `%${q}%`;
    params.push(term, term, term);
  }

  const s = String(status || '').toLowerCase();
  if (s === 'airing' || s === 'releasing' || s === 'currently') {
    where.push("(status = 'currently' OR estado LIKE '%emision%')");
  } else if (s === 'finished' || s === 'concluido') {
    where.push("(status = 'finished' OR estado LIKE '%finalizado%' OR estado LIKE '%concluido%')");
  }

  const effectiveType = type !== 'all' ? type : format;
  if (effectiveType && effectiveType !== 'all') {
    const fLower = effectiveType.toLowerCase();
    if (fLower === 'movie' || fLower === 'pelicula' || fLower === 'película') {
      where.push("(type LIKE '%pelicula%' OR type LIKE '%película%')");
    } else if (fLower === 'tv' || fLower === 'serie') {
      where.push("type = 'Serie'");
    } else if (fLower === 'ova') {
      where.push("type = 'OVA'");
    } else if (fLower === 'ona') {
      where.push("type = 'ONA'");
    } else if (fLower === 'special' || fLower === 'especial') {
      where.push("type = 'Especial'");
    } else {
      where.push('type = ?');
      params.push(effectiveType);
    }
  }

  if (letter && letter !== 'ALL') {
    if (letter === '#') {
      where.push("substr(title, 1, 1) NOT GLOB '[a-zA-Z]'");
    } else {
      where.push('(substr(title, 1, 1) = ? OR substr(title, 1, 1) = ?)');
      params.push(letter.toUpperCase(), letter.toLowerCase());
    }
  }

  if (genre && genre.trim()) {
    where.push('genres LIKE ?');
    params.push(`%${genre.trim()}%`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countSql = `SELECT count(*) as c FROM animes ${whereClause}`;
  const total = db.prepare(countSql).get(...params).c;

  const validLimit = Math.min(10000, Math.max(1, Number(limit) || 24));
  const validPage = Math.max(1, Number(page) || 1);
  const offset = (validPage - 1) * validLimit;

  let orderBy = 'CASE WHEN status = \'currently\' OR estado LIKE \'%emision%\' THEN 0 ELSE 1 END, id ASC';
  if (sort === 'POPULARITY_DESC') {
    orderBy = 'CASE WHEN status = \'currently\' OR estado LIKE \'%emision%\' THEN 0 ELSE 1 END, vote_count DESC, id ASC';
  } else if (sort === 'TRENDING_DESC') {
    orderBy = 'CASE WHEN status = \'currently\' OR estado LIKE \'%emision%\' THEN 0 ELSE 1 END, id DESC';
  } else if (sort === 'START_DATE_DESC') {
    orderBy = 'CASE WHEN year IS NOT NULL THEN year ELSE 0 END DESC, id DESC';
  } else if (sort === 'SCORE_DESC') {
    orderBy = 'vote_count DESC, id ASC';
  } else if (sort === 'TITLE_ASC') {
    orderBy = 'title COLLATE NOCASE ASC';
  }

  const sql = `
    SELECT id, slug, title, short_title, image, banner, synopsis, type, status, estado, year, season, studios, genres, vote_count, episodes_total
    FROM animes
    ${whereClause}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(sql).all(...params, validLimit, offset);
  const items = rows.map(normalizeAnime);

  return {
    total,
    page: validPage,
    limit: validLimit,
    totalPages: Math.ceil(total / validLimit),
    items,
    next: validPage * validLimit < total,
    source: 'backend'
  };
}

function getAnimeDetail(target, { title = '', slug = '', romaji = '', rawId = '' } = {}) {
  const db = getDb();
  if (!db || !target) return null;

  let targetId = null;
  let targetSlug = null;
  const str = String(target).trim();

  const jkMatch = str.match(/^jk-(\d+)$/i);
  if (jkMatch) {
    targetId = Number(jkMatch[1]);
  } else if (/^\d+$/.test(str)) {
    targetId = Number(str);
  } else if (rawId && /^\d+$/.test(String(rawId))) {
    targetId = Number(rawId);
  } else {
    targetSlug = str;
  }

  let row = targetId !== null
    ? db.prepare('SELECT * FROM animes WHERE id = ?').get(targetId)
    : db.prepare('SELECT * FROM animes WHERE slug = ?').get(targetSlug);

  // Fallback search if target is mal-XXXX, al-XXXX, or not matched by direct slug
  if (!row) {
    const candidates = [slug, romaji, title, targetSlug].filter(Boolean);
    for (const cand of candidates) {
      if (typeof cand !== 'string' || cand.trim().length < 2) continue;
      const clean = cand.trim();
      // Exact match on title, short_title or slug
      row = db.prepare('SELECT * FROM animes WHERE title = ? OR short_title = ? OR slug = ? COLLATE NOCASE LIMIT 1').get(clean, clean, clean);
      if (row) break;
      // Clean slug match
      const asSlug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (asSlug.length >= 3) {
        row = db.prepare('SELECT * FROM animes WHERE slug = ? OR slug LIKE ? LIMIT 1').get(asSlug, `%${asSlug}%`);
        if (row) break;
      }
      // Partial title match (only if not a synthetic prefix like mal-/al-)
      if (clean.length >= 3 && !/^mal-|^al-/i.test(clean)) {
        row = db.prepare('SELECT * FROM animes WHERE title LIKE ? OR short_title LIKE ? LIMIT 1').get(`%${clean}%`, `%${clean}%`);
        if (row) break;
      }
    }
  }

  if (!row) return null;

  const episodeRows = db.prepare('SELECT number, title FROM episodes WHERE anime_id = ? ORDER BY number ASC').all(row.id);
  const normalized = normalizeAnime(row);

  const episodesList = episodeRows.map(e => ({
    number: e.number,
    episode: e.number,
    title: e.title || `Capítulo ${e.number}`
  }));

  normalized.episodes_count = episodesList.length;
  if (!normalized.episodes || normalized.episodes === 0) {
    normalized.episodes = episodesList.length;
    normalized.episodes_total = episodesList.length;
  }
  normalized.episodes_list = episodesList;
  normalized.episodesList = episodesList;

  return normalized;
}

function normalizeLinkUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) {
    return 'https:' + trimmed;
  }
  if (trimmed.startsWith('/')) {
    return 'https://jkanime.net' + trimmed;
  }
  return trimmed;
}

function getEpisodeLinksFromDb(animeId, num) {
  const db = getDb();
  if (!db) return [];
  const rows = db.prepare('SELECT kind, server, size, player_url, embed_url, download_url, quality FROM episode_links WHERE anime_id = ? AND number = ?').all(animeId, num);
  return rows.map(r => ({
    ...r,
    player_url: normalizeLinkUrl(r.player_url),
    embed_url: normalizeLinkUrl(r.embed_url),
    download_url: normalizeLinkUrl(r.download_url)
  }));
}

function deleteEpisodeLinks(animeId, num) {
  const db = getDb();
  if (!db) return;
  db.prepare('DELETE FROM episode_links WHERE anime_id = ? AND number = ?').run(animeId, num);
}

function saveEpisodeLinksToDb(animeId, num, links) {
  const db = getDb();
  if (!db || !Array.isArray(links) || links.length === 0) return;
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO episode_links (anime_id, number, kind, server, size, player_url, embed_url, download_url, quality)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const l of links) {
    try {
      stmt.run(
        animeId,
        num,
        l.kind || 'player',
        l.server || 'Servidor',
        l.size || null,
        normalizeLinkUrl(l.player_url) || null,
        normalizeLinkUrl(l.embed_url) || null,
        normalizeLinkUrl(l.download_url) || null,
        l.quality || 'HD'
      );
    } catch {}
  }
}

// -------------------------------------------------------------
// Live Scraper Fallback On-Demand (Multi-pattern Parity)
// -------------------------------------------------------------

// Playwright uses one persistent context per service process. A single page cannot
// navigate concurrently, so queue requests and share duplicate in-flight work.
let jkanimePlaywrightScraper = null;
let jkanimePlaywrightQueue = Promise.resolve();
const jkanimePlaywrightInFlight = new Map();
const jkanimePlaywrightCache = new Map();
const PLAYWRIGHT_LINK_CACHE_TTL_MS = Math.max(30_000, Number(process.env.JKANIME_PLAYWRIGHT_CACHE_TTL_MS) || 300_000);
let jkanimeDirectFetchQueue = Promise.resolve();
let jkanimeDirectFetchLastAt = 0;
const jkanimeEmptyFetchCache = new Map();
const EMPTY_FETCH_COOLDOWN_MS = 30_000;

function waitForDirectFetchSlot() {
  const slot = jkanimeDirectFetchQueue.then(async () => {
    const configuredDelay = Number(process.env.JKANIME_REQUEST_DELAY_MS);
    const intervalMs = Number.isFinite(configuredDelay) && configuredDelay > 0 ? configuredDelay : 1200;
    const waitMs = intervalMs - (Date.now() - jkanimeDirectFetchLastAt);
    if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
    jkanimeDirectFetchLastAt = Date.now();
  });
  jkanimeDirectFetchQueue = slot.catch(() => {});
  return slot;
}

function rememberEmptyFetch(key) {
  jkanimeEmptyFetchCache.set(key, Date.now() + EMPTY_FETCH_COOLDOWN_MS);
  if (jkanimeEmptyFetchCache.size > 1000) {
    jkanimeEmptyFetchCache.delete(jkanimeEmptyFetchCache.keys().next().value);
  }
}

function isPlaywrightScraperEnabled() {
  return process.env.USE_PLAYWRIGHT_SCRAPER === '1' || process.env.USE_PLAYWRIGHT === 'true';
}

function scrapeEpisodeLinksWithPlaywright(slug, number, { force = false } = {}) {
  const key = `${slug}:${number}`;
  const cached = jkanimePlaywrightCache.get(key);
  if (!force && cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.result);
  if (!force && jkanimePlaywrightInFlight.has(key)) return jkanimePlaywrightInFlight.get(key);

  const task = jkanimePlaywrightQueue.then(async () => {
    const queuedCache = jkanimePlaywrightCache.get(key);
    if (!force && queuedCache && queuedCache.expiresAt > Date.now()) return queuedCache.result;

    if (!jkanimePlaywrightScraper) {
      const { JkanimePlaywrightScraper } = require('./jkanime-playwright-scraper.js');
      const configuredDelay = Number(process.env.JKANIME_REQUEST_DELAY_MS);
      jkanimePlaywrightScraper = new JkanimePlaywrightScraper({
        headless: true,
        delayMs: Number.isFinite(configuredDelay) && configuredDelay > 0 ? configuredDelay : 1200,
        userDataDir: process.env.JKANIME_SERVER_USER_DATA_DIR || process.env.JKANIME_USER_DATA_DIR
      });
    }

    const result = await jkanimePlaywrightScraper.scrapeEpisodeLinks(slug, number);
    if (result.players.length || result.downloads.length) {
      jkanimePlaywrightCache.set(key, { result, expiresAt: Date.now() + PLAYWRIGHT_LINK_CACHE_TTL_MS });
      if (jkanimePlaywrightCache.size > 500) {
        jkanimePlaywrightCache.delete(jkanimePlaywrightCache.keys().next().value);
      }
    }
    return result;
  });

  jkanimePlaywrightQueue = task.catch(() => {});
  jkanimePlaywrightInFlight.set(key, task);
  return task.finally(() => jkanimePlaywrightInFlight.delete(key));
}

async function closePlaywrightScraper() {
  await jkanimePlaywrightQueue.catch(() => {});
  if (!jkanimePlaywrightScraper) return;
  const scraper = jkanimePlaywrightScraper;
  jkanimePlaywrightScraper = null;
  await scraper.close();
}

async function liveScrapeEpisode(slug, number, { clientIp = '' } = {}) {
  const url = `https://jkanime.net/${slug}/${number}/`;
  const cacheKey = `${slug}:${number}`;
  const players = [];
  const downloads = [];
  const seenPlayer = new Set();
  const seenDl = new Set();

  if ((jkanimeEmptyFetchCache.get(cacheKey) || 0) > Date.now()) return { players, downloads };
  await waitForDirectFetchSlot();
  if ((jkanimeEmptyFetchCache.get(cacheKey) || 0) > Date.now()) return { players, downloads };

  function addPlayer(p) {
    if (!p || !p.player_url) return;
    const normPlayer = normalizeLinkUrl(p.player_url);
    const normEmbed = normalizeLinkUrl(p.embed_url || p.player_url);
    const key = `${p.server}:${normPlayer}`;
    if (seenPlayer.has(key)) return;
    seenPlayer.add(key);
    players.push({
      kind: 'player',
      server: p.server || 'Servidor',
      player_url: normPlayer,
      embed_url: normEmbed,
      quality: p.quality || 'HD'
    });
  }

  function addDownload(d) {
    if (!d || !d.download_url) return;
    const normDl = normalizeLinkUrl(d.download_url);
    const key = `${d.server}:${normDl}`;
    if (seenDl.has(key)) return;
    seenDl.add(key);
    downloads.push({
      kind: 'download',
      server: d.server || 'Descarga',
      size: d.size || null,
      download_url: normDl,
      quality: d.quality || 'HD'
    });
  }

  try {
    const headers = {
      'User-Agent': '1UP-Anime-Metadata-Sync/2.0',
      'Referer': `https://jkanime.net/${slug}/`,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    };
    if (clientIp) {
      headers['X-Forwarded-For'] = clientIp;
      headers['X-Real-IP'] = clientIp;
      headers['Client-IP'] = clientIp;
    }

    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) {
      rememberEmptyFetch(cacheKey);
      return { players, downloads };
    }
    const html = await res.text();

    // 1) Legacy JSON: var video = [ { server: 'Desu', code: '...' }, ... ];
    const videoVar = html.match(/var\s+video\s*=\s*(\[[\s\S]*?\]);\s*(?:var|$)/i) ||
                     html.match(/var\s+video\s*=\s*(\[[\s\S]*?\]);/i);
    if (videoVar) {
      try {
        const rawPlayers = JSON.parse(videoVar[1]);
        if (Array.isArray(rawPlayers)) {
          for (const p of rawPlayers) {
            if (!p || !p.server) continue;
            const serverName = p.server.trim();
            let playerUrl = null;
            const lower = serverName.toLowerCase();
            if (lower === 'desu') {
              playerUrl = `https://jkanime.net/jkplayer/um?e=${p.code}`;
            } else if (lower === 'magi') {
              playerUrl = `https://jkanime.net/jkplayer/mg?e=${p.code}`;
            } else if (lower === 'desuka') {
              playerUrl = `https://jkanime.net/jkplayer/jk?u=${p.code}`;
            } else if (p.code) {
              playerUrl = p.code.startsWith('http') ? p.code : `https://jkanime.net/jkplayer/${p.server}?u=${p.code}`;
            }

            if (playerUrl) {
              addPlayer({
                server: serverName,
                player_url: playerUrl,
                embed_url: p.code && p.code.startsWith('http') ? p.code : playerUrl,
                quality: 'HD'
              });
            }
          }
        }
      } catch {}
    }

    // 2) Modern iframes: video[0] = '<iframe ... src="..." ...>';
    const buttonMap = new Map();
    const btnRegex = /<a[^>]*data-id="(\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let btnM;
    while ((btnM = btnRegex.exec(html)) !== null) {
      const id = btnM[1];
      const label = btnM[2].replace(/<[^>]+>/g, '').trim();
      if (label) buttonMap.set(id, label);
    }

    const videoRegex = /video\[(\d+)\]\s*=\s*['"]<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let vM;
    while ((vM = videoRegex.exec(html)) !== null) {
      const idx = vM[1];
      const src = vM[2];
      const sName = buttonMap.get(idx) || (idx === '0' ? 'Desu' : idx === '1' ? 'Magi' : `Reproductor ${idx}`);
      addPlayer({
        server: sName,
        player_url: src,
        embed_url: src,
        quality: 'HD'
      });
    }

    // 3) Modern Base64 servers: var servers = [ { remote: base64, server: '...', size: '...' } ]
    const serversMatch = html.match(/var\s+servers\s*=\s*(\[[\s\S]*?\]);/i);
    if (serversMatch) {
      try {
        const list = JSON.parse(serversMatch[1]);
        if (Array.isArray(list)) {
          for (const s of list) {
            if (!s?.remote) continue;
            let decoded = '';
            try {
              decoded = Buffer.from(s.remote, 'base64').toString('utf8').trim();
            } catch {}
            if (!decoded || !decoded.startsWith('http')) continue;

            const sName = (s.server || 'Servidor').trim();
            const isDownload = /mediafire|mega|drive|dropbox|1fichier|rapidgator|zippyshare/i.test(sName) ||
                               /mediafire\.com|mega\.nz/i.test(decoded);

            if (isDownload) {
              addDownload({
                server: sName,
                size: s.size || null,
                download_url: decoded,
                quality: 'HD'
              });
              if (/mega/i.test(sName) && decoded.includes('/embed/')) {
                addPlayer({
                  server: 'Mega Player',
                  player_url: decoded,
                  embed_url: decoded,
                  quality: 'HD'
                });
              }
            } else {
              addPlayer({
                server: sName,
                player_url: decoded,
                embed_url: decoded,
                quality: 'HD'
              });
            }
          }
        }
      } catch {}
    }

    // 4) Direct download anchors: c1.jkplayers.com/d/...
    const dlRegex = /<a[^>]*href="([^"]*c1\.jkplayers\.com\/d\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let dM;
    while ((dM = dlRegex.exec(html)) !== null) {
      addDownload({
        server: 'Directo',
        size: null,
        download_url: dM[1],
        quality: 'HD'
      });
    }

    // 5) External anchors: mega.nz, mediafire.com, streamwish, voe.sx, vidhide
    const extRegex = /<a[^>]*href="([^"]*(?:mega\.nz|mediafire\.com|streamwish|voe\.sx|vidhide)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let extMatch;
    while ((extMatch = extRegex.exec(html)) !== null) {
      const url = extMatch[1];
      let server = 'Descarga';
      if (url.includes('mediafire')) server = 'Mediafire';
      else if (url.includes('mega')) server = 'Mega';
      else if (url.includes('voe')) server = 'VOE';
      else if (url.includes('streamwish')) server = 'Streamwish';
      else if (url.includes('vidhide')) server = 'Vidhide';

      if (/mediafire|mega/i.test(server)) {
        addDownload({
          server,
          size: null,
          download_url: url,
          quality: 'HD'
        });
      } else {
        addPlayer({
          server,
          player_url: url,
          embed_url: url,
          quality: 'HD'
        });
      }
    }
  } catch (err) {
    rememberEmptyFetch(cacheKey);
  }

  if (players.length === 0 && downloads.length === 0) rememberEmptyFetch(cacheKey);

  return { players, downloads };
}

async function getEpisodeLinks(target, num, { refresh = false, title = '', slug = '', romaji = '', rawId = '', clientIp = '' } = {}) {
  const anime = getAnimeDetail(target, { title, slug, romaji, rawId });
  if (!anime) return null;

  const animeId = anime.raw_id || anime.id;
  const epNum = parseFloat(String(num));

  let dbLinks = refresh ? [] : getEpisodeLinksFromDb(animeId, epNum);
  let liveSuccess = false;
  let playwrightError = null;

  if (dbLinks.length === 0) {
    const useBrowser = isPlaywrightScraperEnabled();
    // Avoid sending a raw HTTP request and then repeating it in Chromium when the
    // browser fallback is configured as the active fetch path.
    const live = useBrowser ? { players: [], downloads: [] } : await liveScrapeEpisode(anime.slug, epNum, { clientIp });
    let allLive = [...live.players, ...live.downloads];

    // Playwright is opt-in; reuse one browser and pace requests instead of launching
    // a new Chromium process for each episode request.
    if (allLive.length === 0 && useBrowser) {
      try {
        const pwResult = await scrapeEpisodeLinksWithPlaywright(anime.slug, epNum, { force: refresh });
        if (pwResult && (pwResult.players?.length || pwResult.downloads?.length)) {
          allLive = [...(pwResult.players || []), ...(pwResult.downloads || [])];
        }
      } catch (pwErr) {
        playwrightError = pwErr;
        console.warn(`[Catalog Service] Playwright falló para ${anime.slug} episodio ${epNum}: ${pwErr.message}`);
      }
    }

    if (allLive.length > 0) {
      liveSuccess = true;
      if (refresh) {
        deleteEpisodeLinks(animeId, epNum);
      }
      saveEpisodeLinksToDb(animeId, epNum, allLive);
      dbLinks = getEpisodeLinksFromDb(animeId, epNum);
      if (dbLinks.length === 0) {
        dbLinks = allLive;
      }
    } else if (refresh) {
      // Non-destructive fallback: if live scrape returned nothing or failed during refresh,
      // preserve existing DB links but indicate refreshed: false
      dbLinks = getEpisodeLinksFromDb(animeId, epNum);
    }
  }

  const priorityServers = ['Streamwish', 'Vidhide', 'Mega', 'Mega Player', 'VOE', 'Streamtape', 'Mp4upload', 'Mixdrop', 'Desu', 'Magi', 'Desuka', 'Okru', 'Doodstream'];
  const players = dbLinks.filter(l => l.kind === 'player' && l.server !== 'Mediafire' && !l.embed_url?.includes('mediafire.com'));
  players.sort((a, b) => {
    const isProtA = !a.embed_url || a.embed_url.includes('jkanime.net') || ['desu', 'magi', 'desuka'].includes(String(a.server || '').toLowerCase());
    const isProtB = !b.embed_url || b.embed_url.includes('jkanime.net') || ['desu', 'magi', 'desuka'].includes(String(b.server || '').toLowerCase());
    if (isProtA !== isProtB) return isProtA ? 1 : -1;
    const idxA = priorityServers.indexOf(a.server);
    const idxB = priorityServers.indexOf(b.server);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });
  const normalizedPlayers = players.map(p => ({
    ...p,
    is_protected: Boolean(!p.embed_url || p.embed_url.includes('jkanime.net') || ['desu', 'magi', 'desuka'].includes(String(p.server || '').toLowerCase())),
    embeddable: Boolean(p.embed_url && !p.embed_url.includes('jkanime.net'))
  }));
  const downloads = dbLinks.filter(l => l.kind === 'download');

  const result = {
    anime_id: anime.id,
    raw_id: anime.raw_id,
    slug: anime.slug,
    title: anime.title,
    episode: epNum,
    players: normalizedPlayers,
    downloads
  };

  if (refresh) {
    result.refreshed = liveSuccess;
    if (!liveSuccess) {
      result.stale = true;
      result.warning = 'No se pudieron obtener enlaces en vivo actualizados de JkAnime. Mostrando enlaces en caché.';
    }
  }

  if (playwrightError && normalizedPlayers.length === 0 && downloads.length === 0) {
    result.warning = 'Playwright no pudo recuperar los enlaces; revisa el log del servidor para ver el motivo.';
  }

  return result;
}

// -------------------------------------------------------------
// Composite Homepage Sections Cache
// -------------------------------------------------------------

let homeCache = null;
let homeCacheTime = 0;
const HOME_CACHE_TTL = 60 * 1000; // 60 seconds

function getHomeSections({ bypassCache = false } = {}) {
  const now = Date.now();
  if (!bypassCache && homeCache && (now - homeCacheTime < HOME_CACHE_TTL)) {
    return homeCache;
  }

  const trending = listCatalog({ sort: 'TRENDING_DESC', limit: 24 }).items;
  const popular = listCatalog({ sort: 'POPULARITY_DESC', limit: 24 }).items;
  const season = listCatalog({ status: 'airing', sort: 'TRENDING_DESC', limit: 24 }).items;
  const recent = listCatalog({ sort: 'START_DATE_DESC', limit: 24 }).items;
  const movies = listCatalog({ format: 'MOVIE', sort: 'POPULARITY_DESC', limit: 24 }).items;

  homeCache = {
    updated: new Date().toISOString(),
    source: 'backend',
    groups: {
      trending,
      popular,
      season,
      recent,
      movies
    }
  };
  homeCacheTime = now;
  return homeCache;
}

function getGenres() {
  const db = getDb();
  if (!db) return [];
  const rows = db.prepare('SELECT DISTINCT genres FROM animes WHERE genres IS NOT NULL').all();
  const set = new Set();
  for (const r of rows) {
    const parsed = parseGenres(r.genres);
    for (const g of parsed) {
      if (g && g !== 'Anime') set.add(g);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
}

// -------------------------------------------------------------
// HTTP Request Handler
// -------------------------------------------------------------

async function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  try {
    const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = parsedUrl.pathname;

    // 1. Health check
    if (pathname === '/api/health') {
      getDb();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        db: activeDbPath ? 'connected' : 'disconnected'
      }));
      return;
    }

    // 2. Database statistics
    if (pathname === '/api/stats') {
      const stats = getStats();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(stats));
      return;
    }

    // 3. Genres list
    if (pathname === '/api/genres') {
      const list = getGenres();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(list));
      return;
    }

    // 4. Homepage Composite Sections
    if (pathname === '/api/home' || pathname === '/api/sections/home') {
      const refresh = parsedUrl.searchParams.get('refresh') === '1';
      const home = getHomeSections({ bypassCache: refresh });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(home));
      return;
    }

    // 5. Paginated Catalog with Search & Filters
    if (pathname === '/api/animes' || pathname === '/api/catalog') {
      const search = parsedUrl.searchParams.get('search') || parsedUrl.searchParams.get('q') || '';
      const status = parsedUrl.searchParams.get('status') || 'all';
      const type = parsedUrl.searchParams.get('type') || parsedUrl.searchParams.get('format') || 'all';
      const letter = parsedUrl.searchParams.get('letter') || 'ALL';
      const genre = parsedUrl.searchParams.get('genre') || '';
      const sort = parsedUrl.searchParams.get('sort') || 'POPULARITY_DESC';
      const page = Number(parsedUrl.searchParams.get('page')) || 1;
      const limit = Number(parsedUrl.searchParams.get('limit') || parsedUrl.searchParams.get('perPage')) || 24;

      const result = listCatalog({ search, status, type, letter, genre, sort, page, limit });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
      return;
    }

    // 6. Episode Links & Downloads: /api/animes/:id/episodes/:num/links or /api/anime/:id/episodes/:num/links
    const linksMatch = pathname.match(/^\/api\/anime(?:s)?\/([a-zA-Z0-9_-]+)\/episodes\/(\d+(?:\.\d+)?)\/links$/);
    if (linksMatch) {
      const target = linksMatch[1];
      const num = parseFloat(linksMatch[2]);
      const refresh = parsedUrl.searchParams.get('refresh') === '1' || parsedUrl.searchParams.get('refresh') === 'true';
      const title = parsedUrl.searchParams.get('title') || '';
      const slug = parsedUrl.searchParams.get('slug') || '';
      const romaji = parsedUrl.searchParams.get('romaji') || '';
      const rawId = parsedUrl.searchParams.get('raw_id') || '';

      const forwardedFor = req.headers['x-forwarded-for'];
      const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : '') ||
                       req.headers['x-real-ip'] ||
                       req.headers['client-ip'] ||
                       req.socket?.remoteAddress || '';

      const data = await getEpisodeLinks(target, num, { refresh, title, slug, romaji, rawId, clientIp });
      if (!data) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Anime o episodio no encontrado' }));
        return;
      }

      const linksHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
      if (data && data.warning) {
        linksHeaders['X-JkAnime-Warning'] = encodeURIComponent(data.warning);
      }
      res.writeHead(200, linksHeaders);
      res.end(JSON.stringify(data));
      return;
    }

    // 6b. Player stream: POST /api/animes/:id/episodes/:num/player-stream
    const streamMatch = pathname.match(/^\/api\/anime(?:s)?\/([a-zA-Z0-9_-]+)\/episodes\/(\d+(?:\.\d+)?)\/player-stream$/);
    if (streamMatch && req.method === 'POST') {
      const target = streamMatch[1];
      const num = parseFloat(streamMatch[2]);
      const body = await readJsonBody(req);
      const playerUrl = typeof body?.url === 'string' ? body.url.trim() : '';
      if (!playerUrl) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Falta la URL del reproductor.' }));
        return;
      }
      const anime = getAnimeDetail(target, {
        slug: typeof body?.slug === 'string' ? body.slug : '',
        title: typeof body?.title === 'string' ? body.title : ''
      });
      const referer = anime?.slug ? `${jkResolver.getBase()}/${anime.slug}/${num}/` : undefined;
      const stream = await jkResolver.resolveJkAnimePlayerStream(playerUrl, {
        referer,
        forceRefresh: body.refresh === true || body.refresh === 1 || body.fresh === true,
        cache: playerStreamCache
      });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(stream));
      return;
    }

    // 7. Episodes List: /api/animes/:id/episodes or /api/anime/:id/episodes
    const episodesMatch = pathname.match(/^\/api\/anime(?:s)?\/([a-zA-Z0-9_-]+)\/episodes$/);
    if (episodesMatch) {
      const target = episodesMatch[1];
      const title = parsedUrl.searchParams.get('title') || '';
      const slug = parsedUrl.searchParams.get('slug') || '';
      const romaji = parsedUrl.searchParams.get('romaji') || '';
      const rawId = parsedUrl.searchParams.get('raw_id') || '';
      const detail = getAnimeDetail(target, { title, slug, romaji, rawId });
      if (!detail) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Anime no encontrado' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        anime_id: detail.id,
        raw_id: detail.raw_id,
        slug: detail.slug,
        title: detail.title,
        episodes: detail.episodes_list,
        episodes_list: detail.episodes_list,
        episodesList: detail.episodes_list,
        episodes_total: detail.episodes_total,
        episodes_count: detail.episodes_count
      }));
      return;
    }

    // 8. Anime Detail: /api/animes/:id or /api/anime/:id
    const detailMatch = pathname.match(/^\/api\/anime(?:s)?\/([a-zA-Z0-9_-]+)$/);
    if (detailMatch) {
      const target = detailMatch[1];
      const title = parsedUrl.searchParams.get('title') || '';
      const slug = parsedUrl.searchParams.get('slug') || '';
      const romaji = parsedUrl.searchParams.get('romaji') || '';
      const rawId = parsedUrl.searchParams.get('raw_id') || '';
      const detail = getAnimeDetail(target, { title, slug, romaji, rawId });
      if (!detail) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Anime no encontrado' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(detail));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Endpoint no encontrado' }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message || 'Error interno del servidor' }));
  }
}

function startServer(port = DEFAULT_PORT, host = DEFAULT_HOST) {
  resolveDatabase();
  const server = http.createServer(handleRequest);
  server.on('close', () => { void closePlaywrightScraper(); });
  server.listen(port, host, () => {
    console.log(`[1UP Catalog Service] Servidor activo en http://${host}:${port}/ (DB: ${activeDbPath || 'none'})`);
  });
  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  resolveDatabase,
  getDb,
  getStats,
  listCatalog,
  getAnimeDetail,
  getEpisodeLinks,
  deleteEpisodeLinks,
  saveEpisodeLinksToDb,
  liveScrapeEpisode,
  closePlaywrightScraper,
  getHomeSections,
  getGenres,
  handleRequest,
  startServer
};
