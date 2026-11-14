// @ts-check
/**
 * 1UP Anime — Production Catalog Backend Service
 * Serves indexed metadata, catalog, episodes, video players, and download links from jkanime.db.
 * Built with native node:sqlite (DatabaseSync) and node:http.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DEFAULT_PORT = Number(process.env.ONEUP_CATALOG_PORT || process.env.PORT) || 4050;
const DEFAULT_HOST = process.env.HOST || '0.0.0.0';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const DB_CANDIDATES = [
  process.env.JKANIME_DB_PATH,
  'C:/Users/Marco/Desktop/script_prueba/jkanime_app/data/jkanime.db',
  path.resolve(process.cwd(), 'data/jkanime.db'),
  path.resolve(process.cwd(), '../jkanime_app/data/jkanime.db'),
  path.resolve(__dirname, '../../data/jkanime.db'),
  path.resolve(__dirname, '../../../jkanime_app/data/jkanime.db')
].filter(Boolean);

let dbInstance = null;
let activeDbPath = null;

function resolveDatabase(customPath) {
  if (dbInstance) return dbInstance;
  const list = customPath ? [customPath, ...DB_CANDIDATES] : DB_CANDIDATES;
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

function getAnimeDetail(target) {
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
  } else {
    targetSlug = str;
  }

  const row = targetId !== null
    ? db.prepare('SELECT * FROM animes WHERE id = ?').get(targetId)
    : db.prepare('SELECT * FROM animes WHERE slug = ?').get(targetSlug);

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
  if (trimmed.startsWith('/jkokru')) {
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
        normalizeLinkUrl(l.player_url),
        normalizeLinkUrl(l.embed_url),
        normalizeLinkUrl(l.download_url),
        l.quality || 'HD'
      );
    } catch {}
  }
}

// -------------------------------------------------------------
// Live Scraper Fallback On-Demand
// -------------------------------------------------------------

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function liveScrapeEpisode(slug, number) {
  const url = `https://jkanime.net/${slug}/${number}/`;
  const players = [];
  const downloads = [];
  const seenPlayer = new Set();
  const seenDl = new Set();

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': UA_IPHONE,
        'Referer': `https://jkanime.net/${slug}/`
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!res.ok) return { players, downloads };
    const html = await res.text();

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
      if (!seenPlayer.has(src)) {
        seenPlayer.add(src);
        players.push({ kind: 'player', server: sName, player_url: src, embed_url: src, quality: 'HD' });
      }
    }

    const serversMatch = html.match(/var\s+servers\s*=\s*(\[[\s\S]*?\]);/i);
    if (serversMatch) {
      try {
        const list = JSON.parse(serversMatch[1]);
        for (const s of list) {
          if (!s?.remote) continue;
          let decoded = '';
          try {
            decoded = Buffer.from(s.remote, 'base64').toString('utf8').trim();
          } catch {}
          if (!decoded || !decoded.startsWith('http')) continue;

          const sName = (s.server || 'Servidor').trim();
          const isDownload = /mediafire|mega|drive|dropbox|1fichier/i.test(sName) || /mediafire\.com|mega\.nz/i.test(decoded);

          if (isDownload) {
            if (!seenDl.has(decoded)) {
              seenDl.add(decoded);
              downloads.push({
                kind: 'download',
                server: sName,
                size: s.size || null,
                download_url: decoded,
                quality: 'HD'
              });
            }
            if (/mega/i.test(sName) && decoded.includes('/embed/') && !seenPlayer.has(decoded)) {
              seenPlayer.add(decoded);
              players.push({ kind: 'player', server: 'Mega Player', player_url: decoded, embed_url: decoded, quality: 'HD' });
            }
          } else {
            if (!seenPlayer.has(decoded)) {
              seenPlayer.add(decoded);
              players.push({ kind: 'player', server: sName, player_url: decoded, embed_url: decoded, quality: 'HD' });
            }
          }
        }
      } catch {}
    }

    const dlRegex = /<a[^>]*href="([^"]*c1\.jkplayers\.com\/d\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let dM;
    while ((dM = dlRegex.exec(html)) !== null) {
      const dUrl = dM[1];
      if (!seenDl.has(dUrl)) {
        seenDl.add(dUrl);
        downloads.push({ kind: 'download', server: 'Directo', size: null, download_url: dUrl, quality: 'HD' });
      }
    }
  } catch (err) {
    // Scraper network failure fallback
  }

  return { players, downloads };
}

async function getEpisodeLinks(target, num, { refresh = false } = {}) {
  const anime = getAnimeDetail(target);
  if (!anime) return null;

  const animeId = anime.raw_id || anime.id;
  const epNum = parseFloat(String(num));

  let dbLinks = refresh ? [] : getEpisodeLinksFromDb(animeId, epNum);

  if (dbLinks.length === 0) {
    const live = await liveScrapeEpisode(anime.slug, epNum);
    const allLive = [...live.players, ...live.downloads];
    if (allLive.length > 0) {
      saveEpisodeLinksToDb(animeId, epNum, allLive);
      dbLinks = getEpisodeLinksFromDb(animeId, epNum);
    }
  }

  const players = dbLinks.filter(l => l.kind === 'player');
  const downloads = dbLinks.filter(l => l.kind === 'download');

  return {
    anime_id: anime.id,
    raw_id: anime.raw_id,
    slug: anime.slug,
    title: anime.title,
    episode: epNum,
    players,
    downloads
  };
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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
      const refresh = parsedUrl.searchParams.get('refresh') === '1';

      const data = await getEpisodeLinks(target, num, { refresh });
      if (!data) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Anime o episodio no encontrado' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(data));
      return;
    }

    // 7. Episodes List: /api/animes/:id/episodes or /api/anime/:id/episodes
    const episodesMatch = pathname.match(/^\/api\/anime(?:s)?\/([a-zA-Z0-9_-]+)\/episodes$/);
    if (episodesMatch) {
      const target = episodesMatch[1];
      const detail = getAnimeDetail(target);
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
      const detail = getAnimeDetail(target);
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
  getHomeSections,
  getGenres,
  handleRequest,
  startServer
};
