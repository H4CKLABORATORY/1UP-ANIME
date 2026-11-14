// @ts-check
/**
 * 1UP Anime — Micro-API y Visor de Catálogo de Anime
 * Extrae y sirve exclusivamente:
 *  1. Catálogo de animes (títulos, tipo, estado, año)
 *  2. Pósteres oficiales (CDN de JkAnime)
 *  3. Descripción / Sinopsis en español
 *  4. Reproductores de video (embeds/iframes de Desu, Magi, Desuka, Streamwish, etc.)
 *  5. Enlaces de descarga directa (Mediafire, Mega con peso en MB y directos)
 *
 * Sin dependencias externas: utiliza node:sqlite y node:http nativos de Node.js.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.PORT) || 4050;
const DB_PATHS = [
  process.env.JKANIME_DB_PATH,
  'C:/Users/Marco/Desktop/script_prueba/jkanime_app/data/jkanime.db',
  path.resolve('data/jkanime.db'),
  path.resolve('../jkanime_app/data/jkanime.db')
].filter(Boolean);

let db = null;
let activeDbPath = null;

for (const p of DB_PATHS) {
  if (p && fs.existsSync(p)) {
    try {
      const stat = fs.statSync(p);
      if (stat.size < 1024) continue;
      db = new DatabaseSync(p);
      db.exec('PRAGMA journal_mode = WAL');
      db.exec('PRAGMA busy_timeout = 5000');
      activeDbPath = p;
      console.log(`[Database] Conectado exitosamente a SQLite en: ${p}`);
      break;
    } catch (e) {
      console.warn(`[Database] Error abriendo ${p}: ${e.message}`);
    }
  }
}

if (!db) {
  console.error('[Database] ATENCIÓN: No se encontró archivo jkanime.db válido.');
}

// ==========================================
// 1. CONSULTAS A BASE DE DATOS
// ==========================================

function getStats() {
  if (!db) return { animes: 0, airing: 0, episodes: 0, links: 0 };
  const animes = db.prepare('SELECT count(*) as c FROM animes').get().c;
  const airing = db.prepare("SELECT count(*) as c FROM animes WHERE status = 'currently' OR estado LIKE '%emision%'").get().c;
  const finished = db.prepare("SELECT count(*) as c FROM animes WHERE status = 'finished' OR estado LIKE '%finalizado%'").get().c;
  const episodes = db.prepare('SELECT count(*) as c FROM episodes').get().c;
  const links = db.prepare('SELECT count(*) as c FROM episode_links').get().c;
  const players = db.prepare("SELECT count(*) as c FROM episode_links WHERE kind = 'player'").get().c;
  const downloads = db.prepare("SELECT count(*) as c FROM episode_links WHERE kind = 'download'").get().c;
  return { animes, airing, finished, episodes, links, players, downloads, dbPath: activeDbPath };
}

function listCatalog({ search = '', status = 'all', type = 'all', letter = 'ALL', page = 1, limit = 36 }) {
  if (!db) return { total: 0, page: 1, limit, totalPages: 0, items: [] };

  const where = [];
  const params = [];

  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    where.push('(title LIKE ? OR short_title LIKE ? OR slug LIKE ?)');
    params.push(q, q, q);
  }

  if (status === 'airing') {
    where.push("(status = 'currently' OR estado LIKE '%emision%')");
  } else if (status === 'finished') {
    where.push("(status = 'finished' OR estado LIKE '%finalizado%' OR estado LIKE '%concluido%')");
  }

  if (type && type !== 'all') {
    where.push('type = ?');
    params.push(type);
  }

  if (letter && letter !== 'ALL') {
    if (letter === '#') {
      where.push("substr(title, 1, 1) NOT GLOB '[a-zA-Z]'");
    } else {
      where.push('(substr(title, 1, 1) = ? OR substr(title, 1, 1) = ?)');
      params.push(letter.toUpperCase(), letter.toLowerCase());
    }
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const countSql = `SELECT count(*) as c FROM animes ${whereClause}`;
  const total = db.prepare(countSql).get(...params).c;

  const validLimit = Math.min(10000, Math.max(1, Number(limit) || 36));
  const validPage = Math.max(1, Number(page) || 1);
  const offset = (validPage - 1) * validLimit;

  const sql = `
    SELECT id, slug, title, short_title, image, type, status, estado, year, episodes_total
    FROM animes
    ${whereClause}
    ORDER BY 
      CASE WHEN status = 'currently' OR estado LIKE '%emision%' THEN 0 ELSE 1 END,
      title COLLATE NOCASE ASC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(sql).all(...params, validLimit, offset);
  const items = rows.map(r => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    short_title: r.short_title,
    poster: r.image || `https://cdn.jkdesa.com/assets/images/animes/image/${r.slug}.jpg`,
    type: r.type || 'Serie',
    status: (r.status === 'currently' || (r.estado && r.estado.toLowerCase().includes('emision'))) ? 'airing' : 'finished',
    status_label: (r.status === 'currently' || (r.estado && r.estado.toLowerCase().includes('emision'))) ? 'En emisión' : 'Finalizado',
    year: r.year,
    episodes_total: r.episodes_total
  }));

  return {
    total,
    page: validPage,
    limit: validLimit,
    totalPages: Math.ceil(total / validLimit),
    items
  };
}

function getAnimeDetail(target) {
  if (!db) return null;
  const isNumeric = /^\d+$/.test(String(target));
  const row = isNumeric
    ? db.prepare('SELECT * FROM animes WHERE id = ?').get(Number(target))
    : db.prepare('SELECT * FROM animes WHERE slug = ?').get(String(target));

  if (!row) return null;

  const episodes = db.prepare('SELECT number, title FROM episodes WHERE anime_id = ? ORDER BY number ASC').all(row.id);

  let genresList = [];
  try {
    if (row.genres) {
      genresList = row.genres.startsWith('[') ? JSON.parse(row.genres) : row.genres.split(',').map(s => s.trim());
    }
  } catch {}

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    short_title: row.short_title,
    poster: row.image || `https://cdn.jkdesa.com/assets/images/animes/image/${row.slug}.jpg`,
    synopsis: row.synopsis || 'Sin descripción disponible.',
    type: row.type || 'Serie',
    status: (row.status === 'currently' || (row.estado && row.estado.toLowerCase().includes('emision'))) ? 'airing' : 'finished',
    status_label: (row.status === 'currently' || (row.estado && row.estado.toLowerCase().includes('emision'))) ? 'En emisión' : 'Finalizado',
    year: row.year,
    season: row.season,
    studios: row.studios,
    genres: genresList,
    episodes_count: episodes.length,
    episodes: episodes.map(e => ({ number: e.number, title: e.title || `Capítulo ${e.number}` }))
  };
}

function getEpisodeLinksFromDb(animeId, num) {
  if (!db) return [];
  return db.prepare('SELECT kind, server, size, player_url, embed_url, download_url, quality FROM episode_links WHERE anime_id = ? AND number = ?').all(animeId, num);
}

function saveEpisodeLinksToDb(animeId, num, links) {
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
        l.player_url || null,
        l.embed_url || null,
        l.download_url || null,
        l.quality || 'HD'
      );
    } catch {}
  }
}

// ==========================================
// 2. SCRAPER EN CALIENTE (FALLBACK ON-DEMAND)
// ==========================================

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

    // 1) Buttons map
    const buttonMap = new Map();
    const btnRegex = /<a[^>]*data-id="(\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let btnM;
    while ((btnM = btnRegex.exec(html)) !== null) {
      const id = btnM[1];
      const label = btnM[2].replace(/<[^>]+>/g, '').trim();
      if (label) buttonMap.set(id, label);
    }

    // 2) video[i] = '<iframe src="...">';
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

    // 3) var servers = [ { remote: base64, server: '...', size: '...' } ]
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

    // 4) Enlaces directos c1.jkplayers.com/d/...
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
    console.warn(`[Scraper] Fallo raspando ${slug} cap ${number}: ${err.message}`);
  }

  return { players, downloads };
}

// ==========================================
// 3. FRONTEND INTEGRADO (VISOR COMPLETO)
// ==========================================

const HTML_VIEWER = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>1UP Anime — Catálogo y Streaming</title>
  <link rel="preconnect" href="https://cdn.jkdesa.com">
  <style>
    :root {
      --bg: #0b0e14;
      --bg-surface: #151922;
      --bg-card: #1c2230;
      --bg-card-hover: #262e42;
      --primary: #38bdf8;
      --primary-hover: #0ea5e9;
      --accent: #ec4899;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
      --border: rgba(255, 255, 255, 0.08);
      --radius: 12px;
      --shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding-bottom: 60px;
    }
    a { color: inherit; text-decoration: none; }
    button { font-family: inherit; cursor: pointer; border: none; outline: none; }

    /* Header */
    .header {
      background: rgba(21, 25, 34, 0.95);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 14px 20px;
    }
    .header-inner {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-badge {
      background: linear-gradient(135deg, #38bdf8, #ec4899);
      color: #fff;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 0.9rem;
      letter-spacing: 0.5px;
    }
    .brand-title {
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .brand-sub {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    /* Filters Bar */
    .filters-bar {
      max-width: 1400px;
      margin: 20px auto;
      padding: 0 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .search-row {
      display: flex;
      gap: 10px;
    }
    .search-input {
      flex: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 12px 18px;
      border-radius: var(--radius);
      font-size: 0.95rem;
      transition: all 0.2s ease;
    }
    .search-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.2);
    }
    .pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .filter-pill {
      background: var(--bg-surface);
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.2s;
    }
    .filter-pill:hover, .filter-pill.active {
      background: var(--primary);
      color: #0b0e14;
      border-color: var(--primary);
      font-weight: 600;
    }
    .dot-airing {
      display: inline-block;
      width: 8px;
      height: 8px;
      background: #10b981;
      border-radius: 50%;
      margin-right: 4px;
      box-shadow: 0 0 8px #10b981;
    }

    /* Alphabet bar */
    .alphabet-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }
    .alpha-btn {
      background: transparent;
      color: var(--text-muted);
      font-size: 0.75rem;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .alpha-btn:hover, .alpha-btn.active {
      background: var(--bg-card-hover);
      color: var(--primary);
      font-weight: 700;
    }

    /* Stats summary */
    .summary-text {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 4px;
    }

    /* Catalog Grid */
    .grid-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 0 20px;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 20px;
    }
    @media (max-width: 640px) {
      .grid-container {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 12px;
        padding: 0 12px;
      }
    }

    /* Anime Card */
    .anime-card {
      background: var(--bg-card);
      border-radius: var(--radius);
      overflow: hidden;
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
      position: relative;
    }
    .anime-card:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow);
      border-color: rgba(56, 189, 248, 0.4);
    }
    .poster-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 2 / 2.9;
      background: #11141c;
      overflow: hidden;
    }
    .poster-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.35s ease;
    }
    .anime-card:hover .poster-img {
      transform: scale(1.05);
    }
    .card-badge {
      position: absolute;
      top: 8px;
      left: 8px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
    }
    .badge-airing {
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.4);
    }
    .badge-finished {
      color: #94a3b8;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
    .card-type {
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 3px 6px;
      border-radius: 6px;
      font-size: 0.65rem;
      font-weight: 600;
      background: rgba(14, 165, 233, 0.85);
      color: #fff;
    }
    .card-body {
      padding: 12px;
      display: flex;
      flex-direction: column;
      flex: 1;
      justify-content: space-between;
    }
    .card-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text);
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      margin-bottom: 6px;
    }
    .card-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
    }

    /* Pagination */
    .pagination-bar {
      max-width: 1400px;
      margin: 30px auto;
      padding: 0 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
    }
    .btn-page {
      background: var(--bg-surface);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 8px 16px;
      border-radius: var(--radius);
      font-size: 0.85rem;
      transition: background 0.2s;
    }
    .btn-page:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .btn-page:not(:disabled):hover {
      background: var(--primary);
      color: #0b0e14;
      font-weight: 600;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      z-index: 200;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      overflow-y: auto;
    }
    .modal-content {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      width: 100%;
      max-width: 900px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
    }
    .modal-close {
      position: absolute;
      top: 14px;
      right: 14px;
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      z-index: 10;
      transition: background 0.2s;
    }
    .modal-close:hover {
      background: rgba(236, 72, 153, 0.8);
    }
    .modal-scroll {
      overflow-y: auto;
      padding: 24px;
    }

    /* Modal Hero */
    .anime-hero {
      display: flex;
      gap: 20px;
      margin-bottom: 24px;
    }
    @media (max-width: 640px) {
      .anime-hero {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
    }
    .hero-poster {
      width: 150px;
      aspect-ratio: 2 / 2.9;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid var(--border);
      flex-shrink: 0;
    }
    .hero-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .hero-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
    }
    .hero-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .hero-tag {
      background: rgba(255, 255, 255, 0.08);
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .hero-synopsis {
      font-size: 0.88rem;
      color: #cbd5e1;
      line-height: 1.6;
      margin-top: 6px;
      max-height: 130px;
      overflow-y: auto;
      padding-right: 6px;
    }

    /* Episodes Selector */
    .episodes-block {
      border-top: 1px solid var(--border);
      padding-top: 20px;
    }
    .episodes-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .episodes-title {
      font-size: 1rem;
      font-weight: 600;
    }
    .input-ep-filter {
      background: var(--bg-card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      width: 140px;
    }
    .episodes-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-height: 140px;
      overflow-y: auto;
      padding: 4px 0 12px;
    }
    .ep-pill {
      background: var(--bg-card);
      color: var(--text-muted);
      border: 1px solid var(--border);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .ep-pill:hover, .ep-pill.active {
      background: var(--primary);
      color: #0b0e14;
      border-color: var(--primary);
    }

    /* Media Player & Downloads Section */
    .player-section {
      background: #0f131a;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      margin-top: 16px;
    }
    .player-tabs {
      display: flex;
      gap: 10px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .tab-btn {
      background: transparent;
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: var(--bg-card);
      color: var(--primary);
      border: 1px solid var(--border);
    }
    .servers-picker {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 12px;
      align-items: center;
    }
    .server-label {
      font-size: 0.78rem;
      color: var(--text-muted);
      margin-right: 4px;
    }
    .server-btn {
      background: var(--bg-card);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      transition: all 0.2s;
    }
    .server-btn:hover, .server-btn.active {
      background: var(--primary);
      color: #0b0e14;
      border-color: var(--primary);
    }

    /* Video Embed Container */
    .iframe-holder {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .iframe-holder iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
    .player-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 8px;
    }
    .btn-external {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(56, 189, 248, 0.15);
      color: var(--primary);
      border: 1px solid rgba(56, 189, 248, 0.3);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .btn-external:hover {
      background: var(--primary);
      color: #0b0e14;
    }
    .btn-refresh-links {
      background: transparent;
      color: var(--text-muted);
      font-size: 0.78rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-refresh-links:hover {
      color: var(--text);
    }

    /* Downloads List */
    .downloads-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .download-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
    }
    .dl-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .dl-server {
      font-weight: 700;
      font-size: 0.9rem;
      color: #fff;
    }
    .dl-size {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text-muted);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    .dl-actions {
      display: flex;
      gap: 8px;
    }
    .btn-copy {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.78rem;
    }
    .btn-copy:hover {
      background: var(--bg-card-hover);
    }
    .btn-dl {
      background: #10b981;
      color: #fff;
      font-weight: 700;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.78rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-dl:hover {
      background: #059669;
    }

    /* Spinner */
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 40px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>

  <!-- Header -->
  <header class="header">
    <div class="header-inner">
      <div class="brand">
        <span class="brand-badge">1UP</span>
        <div>
          <div class="brand-title">1UP Streaming &amp; Catálogo</div>
          <div class="brand-sub">Catálogo completo, reproductores oficiales y enlaces directos</div>
        </div>
      </div>
      <div id="statsSummary" class="summary-text">Cargando métricas...</div>
    </div>
  </header>

  <!-- Filtros -->
  <section class="filters-bar">
    <div class="search-row">
      <input
        id="searchInput"
        type="text"
        class="search-input"
        placeholder="Buscar anime por título o palabra clave... (ej. Naruto, Frieren, Bleach)"
      />
    </div>
    <div class="pills-row">
      <button class="filter-pill active" data-status="all">Todos</button>
      <button class="filter-pill" data-status="airing">
        <span class="dot-airing"></span>En emisión
      </button>
      <button class="filter-pill" data-status="finished">Finalizados</button>
      <span style="color: var(--border); margin: 0 4px;">|</span>
      <button class="filter-pill" data-type="all">Todos los tipos</button>
      <button class="filter-pill" data-type="Serie">Series</button>
      <button class="filter-pill" data-type="Pelicula">Películas</button>
    </div>
    <div id="alphaBar" class="alphabet-bar"></div>
    <div id="resultsCount" class="summary-text">Mostrando resultados...</div>
  </section>

  <!-- Grid de Anime -->
  <main class="grid-container" id="animeGrid">
    <div class="spinner"></div>
  </main>

  <!-- Paginación -->
  <div class="pagination-bar" id="paginationBar">
    <button id="btnPrev" class="btn-page" disabled>&larr; Anterior</button>
    <span id="pageIndicator" class="summary-text">Página 1</span>
    <button id="btnNext" class="btn-page">Siguiente &rarr;</button>
  </div>

  <!-- Modal de Detalle / Reproductor / Descargas -->
  <div id="animeModal" class="modal-backdrop" style="display: none;">
    <div class="modal-content">
      <button id="btnCloseModal" class="modal-close">&times;</button>
      <div class="modal-scroll" id="modalBody">
        <div class="spinner"></div>
      </div>
    </div>
  </div>

  <script>
    let state = {
      search: '',
      status: 'all',
      type: 'all',
      letter: 'ALL',
      page: 1,
      limit: 36,
      totalPages: 1,
      currentAnime: null,
      currentEpisode: 1,
      currentLinks: null,
      activeTab: 'players',
      activePlayerIndex: 0
    };

    const searchInput = document.getElementById('searchInput');
    const animeGrid = document.getElementById('animeGrid');
    const resultsCount = document.getElementById('resultsCount');
    const paginationBar = document.getElementById('paginationBar');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const pageIndicator = document.getElementById('pageIndicator');
    const animeModal = document.getElementById('animeModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const modalBody = document.getElementById('modalBody');
    const statsSummary = document.getElementById('statsSummary');

    // Inicializar barra A-Z
    const alphaBar = document.getElementById('alphaBar');
    const letters = ['ALL', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
    letters.forEach(l => {
      const b = document.createElement('button');
      b.className = 'alpha-btn' + (l === 'ALL' ? ' active' : '');
      b.textContent = l;
      b.onclick = () => {
        document.querySelectorAll('.alpha-btn').forEach(el => el.classList.remove('active'));
        b.classList.add('active');
        state.letter = l;
        state.page = 1;
        loadCatalog();
      };
      alphaBar.appendChild(b);
    });

    // Filtros de estado y tipo
    document.querySelectorAll('.filter-pill[data-status]').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.filter-pill[data-status]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.status = btn.dataset.status;
        state.page = 1;
        loadCatalog();
      };
    });
    document.querySelectorAll('.filter-pill[data-type]').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.filter-pill[data-type]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.type = btn.dataset.type;
        state.page = 1;
        loadCatalog();
      };
    });

    // Buscador con debounce
    let searchDebounce;
    searchInput.oninput = (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 1;
        loadCatalog();
      }, 300);
    };

    // Paginación
    btnPrev.onclick = () => { if (state.page > 1) { state.page--; loadCatalog(); } };
    btnNext.onclick = () => { if (state.page < state.totalPages) { state.page++; loadCatalog(); } };

    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        const d = await res.json();
        statsSummary.innerHTML = \`<strong>\${d.animes.toLocaleString()}</strong> animes · <strong>\${d.episodes.toLocaleString()}</strong> episodios · <strong>\${d.links.toLocaleString()}</strong> enlaces\`;
      } catch {}
    }

    async function loadCatalog() {
      animeGrid.innerHTML = '<div class="spinner"></div>';
      const q = new URLSearchParams({
        search: state.search,
        status: state.status,
        type: state.type,
        letter: state.letter,
        page: state.page,
        limit: state.limit
      });

      try {
        const res = await fetch('/api/catalog?' + q.toString());
        const data = await res.json();
        state.totalPages = data.totalPages || 1;
        resultsCount.textContent = \`Mostrando \${data.items.length} de \${data.total.toLocaleString()} animes disponibles\`;
        pageIndicator.textContent = \`Página \${data.page} de \${data.totalPages || 1}\`;
        btnPrev.disabled = data.page <= 1;
        btnNext.disabled = data.page >= data.totalPages;

        if (data.items.length === 0) {
          animeGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">No se encontraron animes con los filtros seleccionados.</div>';
          return;
        }

        animeGrid.innerHTML = data.items.map(a => \`
          <div class="anime-card" onclick="openAnime('\${a.slug}')">
            <div class="poster-wrap">
              <img
                src="\${a.poster}"
                alt="\${a.title}"
                class="poster-img"
                loading="lazy"
                onerror="this.src='https://cdn.jkdesa.com/assets/images/animes/image/default.jpg'"
              />
              <span class="card-badge \${a.status === 'airing' ? 'badge-airing' : 'badge-finished'}">
                \${a.status === 'airing' ? '● En emisión' : 'Finalizado'}
              </span>
              <span class="card-type">\${a.type}</span>
            </div>
            <div class="card-body">
              <h3 class="card-title" title="\${a.title}">\${a.title}</h3>
              <div class="card-meta">
                <span>\${a.year || ''}</span>
                <span>\${a.episodes_total ? a.episodes_total + ' caps' : 'Ver caps'}</span>
              </div>
            </div>
          </div>
        \`).join('');
      } catch (err) {
        animeGrid.innerHTML = \`<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">Error al cargar el catálogo: \${err.message}</div>\`;
      }
    }

    // Modal de Anime
    window.openAnime = async (slug) => {
      animeModal.style.display = 'flex';
      modalBody.innerHTML = '<div class="spinner"></div>';

      try {
        const res = await fetch('/api/anime/' + slug);
        if (!res.ok) throw new Error('No se pudo cargar la información del anime');
        const anime = await res.json();
        state.currentAnime = anime;
        state.currentEpisode = anime.episodes.length > 0 ? anime.episodes[0].number : 1;
        state.activeTab = 'players';
        state.activePlayerIndex = 0;
        renderModal();
        loadEpisodeLinks(anime.slug, state.currentEpisode);
      } catch (err) {
        modalBody.innerHTML = \`<div style="text-align: center; color: #ef4444; padding: 40px;">\${err.message}</div>\`;
      }
    };

    function renderModal() {
      const a = state.currentAnime;
      if (!a) return;

      modalBody.innerHTML = \`
        <div class="anime-hero">
          <img src="\${a.poster}" alt="\${a.title}" class="hero-poster" onerror="this.src='https://cdn.jkdesa.com/assets/images/animes/image/default.jpg'"/>
          <div class="hero-details">
            <h2 class="hero-title">\${a.title}</h2>
            <div class="hero-tags">
              <span class="hero-tag" style="color: \${a.status === 'airing' ? '#34d399' : '#94a3b8'}">
                \${a.status_label}
              </span>
              <span class="hero-tag">\${a.type}</span>
              \${a.year ? \`<span class="hero-tag">\${a.year}</span>\` : ''}
              \${a.studios ? \`<span class="hero-tag">\${a.studios}</span>\` : ''}
            </div>
            <p class="hero-synopsis">\${a.synopsis}</p>
          </div>
        </div>

        <div class="episodes-block">
          <div class="episodes-header">
            <div class="episodes-title">Capítulos disponibles (\${a.episodes.length})</div>
            <input id="modalEpSearch" type="text" placeholder="Filtrar cap..." class="input-ep-filter" oninput="filterModalEpisodes(this.value)"/>
          </div>
          <div class="episodes-grid" id="modalEpList">
            \${a.episodes.map(e => \`
              <button class="ep-pill \${e.number === state.currentEpisode ? 'active' : ''}" onclick="selectEpisode(\${e.number})">
                Cap. \${e.number}
              </button>
            \`).join('')}
          </div>

          <div class="player-section" id="playerSection">
            <div class="spinner"></div>
          </div>
        </div>
      \`;
    }

    window.filterModalEpisodes = (val) => {
      const container = document.getElementById('modalEpList');
      if (!container || !state.currentAnime) return;
      const v = val.trim().toLowerCase();
      container.innerHTML = state.currentAnime.episodes
        .filter(e => String(e.number).includes(v) || (e.title && e.title.toLowerCase().includes(v)))
        .map(e => \`
          <button class="ep-pill \${e.number === state.currentEpisode ? 'active' : ''}" onclick="selectEpisode(\${e.number})">
            Cap. \${e.number}
          </button>
        \`).join('');
    };

    window.selectEpisode = (num) => {
      state.currentEpisode = num;
      state.activePlayerIndex = 0;
      document.querySelectorAll('#modalEpList .ep-pill').forEach(b => {
        b.classList.toggle('active', b.textContent.includes('Cap. ' + num));
      });
      loadEpisodeLinks(state.currentAnime.slug, num);
    };

    async function loadEpisodeLinks(slug, num, refresh = false) {
      const container = document.getElementById('playerSection');
      if (!container) return;
      container.innerHTML = '<div class="spinner"></div>';

      try {
        const url = \`/api/anime/\${slug}/episodes/\${num}/links\${refresh ? '?refresh=1' : ''}\`;
        const res = await fetch(url);
        const data = await res.json();
        state.currentLinks = data;
        renderEpisodeLinks();
      } catch (err) {
        container.innerHTML = \`<div style="color: #ef4444; padding: 20px; text-align: center;">Error al obtener enlaces: \${err.message}</div>\`;
      }
    }

    function renderEpisodeLinks() {
      const container = document.getElementById('playerSection');
      if (!container || !state.currentLinks) return;
      const { players, downloads, episode } = state.currentLinks;

      container.innerHTML = \`
        <div class="player-tabs">
          <button class="tab-btn \${state.activeTab === 'players' ? 'active' : ''}" onclick="switchTab('players')">
            🎬 Reproductores (\${players.length})
          </button>
          <button class="tab-btn \${state.activeTab === 'downloads' ? 'active' : ''}" onclick="switchTab('downloads')">
            📥 Enlaces de Descarga (\${downloads.length})
          </button>
          <div style="margin-left: auto; font-size: 0.8rem; font-weight: 700; color: var(--primary);">
            Capítulo \${episode}
          </div>
        </div>

        <div id="tabContent"></div>
      \`;

      renderTabContent();
    }

    window.switchTab = (tab) => {
      state.activeTab = tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.querySelector(\`.tab-btn[onclick="switchTab('\${tab}')"]\`);
      if (activeBtn) activeBtn.classList.add('active');
      renderTabContent();
    };

    function renderTabContent() {
      const tabContent = document.getElementById('tabContent');
      if (!tabContent || !state.currentLinks) return;
      const { players, downloads } = state.currentLinks;

      if (state.activeTab === 'players') {
        if (players.length === 0) {
          tabContent.innerHTML = \`
            <div style="text-align: center; padding: 20px; color: var(--text-muted);">
              No hay reproductores guardados para este capítulo.
              <br/><br/>
              <button class="btn-external" onclick="loadEpisodeLinks('\${state.currentAnime.slug}', \${state.currentEpisode}, true)">
                ⚡ Extraer reproductores en caliente de JkAnime
              </button>
            </div>
          \`;
          return;
        }

        const currentP = players[state.activePlayerIndex] || players[0];
        const pUrl = currentP.player_url || currentP.embed_url;

        tabContent.innerHTML = \`
          <div class="servers-picker">
            <span class="server-label">Servidores:</span>
            \${players.map((p, idx) => \`
              <button class="server-btn \${idx === state.activePlayerIndex ? 'active' : ''}" onclick="selectServer(\${idx})">
                \${p.server}
              </button>
            \`).join('')}
          </div>

          <div class="iframe-holder">
            <iframe
              src="\${pUrl}"
              allowfullscreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            ></iframe>
          </div>

          <div class="player-actions">
            <a href="\${pUrl}" target="_blank" rel="noopener noreferrer" class="btn-external">
              Abrir reproductor en pestaña nueva ↗
            </a>
            <button class="btn-refresh-links" onclick="loadEpisodeLinks('\${state.currentAnime.slug}', \${state.currentEpisode}, true)">
              🔄 Forzar actualización
            </button>
          </div>
        \`;
      } else {
        if (downloads.length === 0) {
          tabContent.innerHTML = \`
            <div style="text-align: center; padding: 20px; color: var(--text-muted);">
              No se han encontrado enlaces de descarga directa para este capítulo.
              <br/><br/>
              <button class="btn-external" onclick="loadEpisodeLinks('\${state.currentAnime.slug}', \${state.currentEpisode}, true)">
                ⚡ Extraer descargas en caliente de JkAnime
              </button>
            </div>
          \`;
          return;
        }

        tabContent.innerHTML = \`
          <div class="downloads-list">
            \${downloads.map((d, idx) => \`
              <div class="download-card">
                <div class="dl-info">
                  <span style="font-size: 1.2rem;">💾</span>
                  <div>
                    <div class="dl-server">\${d.server}</div>
                    <span class="dl-size">\${d.size || 'Calidad HD'}</span>
                  </div>
                </div>
                <div class="dl-actions">
                  <button class="btn-copy" id="copyBtn_\${idx}" onclick="copyDownloadUrl('\${d.download_url}', \${idx})">
                    📋 Copiar
                  </button>
                  <a href="\${d.download_url}" target="_blank" rel="noopener noreferrer" class="btn-dl">
                    Descargar ⤓
                  </a>
                </div>
              </div>
            \`).join('')}
          </div>
        \`;
      }
    }

    window.selectServer = (idx) => {
      state.activePlayerIndex = idx;
      renderTabContent();
    };

    window.copyDownloadUrl = (url, idx) => {
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('copyBtn_' + idx);
        if (btn) {
          const original = btn.textContent;
          btn.textContent = '✓ Copiado';
          setTimeout(() => { btn.textContent = original; }, 2000);
        }
      });
    };

    btnCloseModal.onclick = () => { animeModal.style.display = 'none'; };
    window.onclick = (e) => { if (e.target === animeModal) animeModal.style.display = 'none'; };
    window.onkeydown = (e) => { if (e.key === 'Escape') animeModal.style.display = 'none'; };

    // Inicio
    loadStats();
    loadCatalog();
  </script>
</body>
</html>
`;

// ==========================================
// 4. ROUTER HTTP PRINCIPAL
// ==========================================

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
    const pathname = url.pathname;

    // 1. Estadísticas
    if (pathname === '/api/stats') {
      const stats = getStats();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(stats));
      return;
    }

    // 2. Catálogo paginado con filtros
    if (pathname === '/api/catalog' || pathname === '/api/animes') {
      const search = url.searchParams.get('search') || '';
      const status = url.searchParams.get('status') || 'all';
      const type = url.searchParams.get('type') || 'all';
      const letter = url.searchParams.get('letter') || 'ALL';
      const page = Number(url.searchParams.get('page')) || 1;
      const limit = Number(url.searchParams.get('limit')) || 36;

      const result = listCatalog({ search, status, type, letter, page, limit });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
      return;
    }

    // 3. Detalle de anime y episodios
    const animeDetailMatch = pathname.match(/^\/api\/anime\/([a-zA-Z0-9_-]+)$/);
    if (animeDetailMatch) {
      const target = animeDetailMatch[1];
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

    // 4. Enlaces de reproducción y descarga de un episodio
    const linksMatch = pathname.match(/^\/api\/anime\/([a-zA-Z0-9_-]+)\/episodes\/(\d+(?:\.\d+)?)\/links$/);
    if (linksMatch) {
      const slugOrId = linksMatch[1];
      const epNum = parseFloat(linksMatch[2]);
      const forceRefresh = url.searchParams.get('refresh') === '1';

      const anime = getAnimeDetail(slugOrId);
      if (!anime) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'Anime no encontrado' }));
        return;
      }

      let dbLinks = forceRefresh ? [] : getEpisodeLinksFromDb(anime.id, epNum);

      // Si no hay links en la base de datos o se pidió refresh, raspamos en caliente
      if (dbLinks.length === 0) {
        const live = await liveScrapeEpisode(anime.slug, epNum);
        const allLive = [...live.players, ...live.downloads];
        if (allLive.length > 0) {
          saveEpisodeLinksToDb(anime.id, epNum, allLive);
          dbLinks = getEpisodeLinksFromDb(anime.id, epNum);
        }
      }

      const players = dbLinks.filter(l => l.kind === 'player');
      const downloads = dbLinks.filter(l => l.kind === 'download');

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        anime_id: anime.id,
        slug: anime.slug,
        episode: epNum,
        players,
        downloads
      }));
      return;
    }

    // 5. Visor Web Frontend
    if (pathname === '/' || pathname === '/index.html' || pathname === '/viewer') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(HTML_VIEWER);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log(' 🌸 1UP Anime — Micro-API de Catálogo, Players y Descargas');
  console.log(` -> Visor Web:       http://localhost:${PORT}/`);
  console.log(` -> API Catálogo:    http://localhost:${PORT}/api/catalog?limit=12`);
  console.log(` -> API Estadísticas: http://localhost:${PORT}/api/stats`);
  console.log(' Presiona Ctrl + C para detener.');
  console.log('================================================================');
});
