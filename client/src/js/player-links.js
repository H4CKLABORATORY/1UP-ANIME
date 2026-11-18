/* 1UP Anime — enlaces de reproductor por cliente, inspirado en jkanime_app.
 * Los reproductores internos (Desu/Desuka/Magi) tienen URLs firmadas por IP:
 * se guardan en localStorage. Los externos y las descargas se leen del API.
 * Expuesto como window.OneUpPlayerLinks (y globalThis en Node para pruebas).
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'oneup_jkanime_client_v1';
  const INTERNAL_SERVERS = ['desu', 'desuka', 'magi'];

  const readAll = () => {
    try {
      const raw = global.localStorage?.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  };
  const writeAll = map => {
    try { global.localStorage?.setItem(STORAGE_KEY, JSON.stringify(map)); return true; }
    catch { return false; }
  };

  function isInternalPlayer(link) {
    if (!link || (link.kind && link.kind !== 'player')) return false;
    const server = String(link.server || '').trim().toLowerCase();
    if (INTERNAL_SERVERS.includes(server)) return true;
    try {
      const url = new URL(link.embed_url || link.player_url || '');
      return /(^|\.)jkanime\.(net|org)$/i.test(url.hostname) && /^\/jkplayer\//i.test(url.pathname);
    } catch { return false; }
  }

  function splitLinks(links) {
    const internal = [], external = [];
    for (const link of Array.isArray(links) ? links : []) {
      (isInternalPlayer(link) ? internal : external).push(link);
    }
    return { internal, external };
  }

  function mergePlayerLinks(serverLinks, clientInternalLinks) {
    const links = Array.isArray(serverLinks) ? serverLinks.slice() : [];
    const replacements = new Map(
      (Array.isArray(clientInternalLinks) ? clientInternalLinks : [])
        .filter(isInternalPlayer)
        .map(link => [String(link.server).toLowerCase(), link])
    );
    if (replacements.size === 0) {
      if (serverLinks && serverLinks.warning) links.warning = serverLinks.warning;
      return links;
    }
    const merged = links.map(link => {
      if (!isInternalPlayer(link)) return link;
      const key = String(link.server || '').toLowerCase();
      const replacement = replacements.get(key);
      if (!replacement) return link;
      replacements.delete(key);
      return replacement;
    });
    for (const extra of replacements.values()) merged.push(extra);
    if (serverLinks && serverLinks.warning) merged.warning = serverLinks.warning;
    return merged;
  }

  function getLocalAnime(id) {
    if (id == null) return null;
    return readAll()[String(id)] || null;
  }

  function saveLocalAnime(meta) {
    if (!meta || meta.id == null) return null;
    const all = readAll();
    const key = String(meta.id);
    const prev = all[key] || {};
    const now = Date.now();
    all[key] = {
      id: meta.id,
      title: meta.title ?? prev.title ?? '',
      slug: meta.slug ?? prev.slug ?? null,
      lastEpisode: meta.lastEpisode ?? prev.lastEpisode ?? null,
      selectedPlayer: meta.selectedPlayer ?? prev.selectedPlayer ?? null,
      episodes: prev.episodes || {},
      savedAt: prev.savedAt || now,
      updatedAt: now
    };
    writeAll(all);
    return all[key];
  }

  function updateLocalAnime(id, patch) {
    if (id == null || !patch) return null;
    const all = readAll();
    const key = String(id);
    if (!all[key]) return null;
    all[key] = { ...all[key], ...patch, updatedAt: Date.now() };
    writeAll(all);
    return all[key];
  }

  function getStoredEpisodeLinks(id, num) {
    const record = getLocalAnime(id);
    const entry = record?.episodes?.[String(num)];
    if (!entry || !Array.isArray(entry.links)) return null;
    const internal = entry.links.filter(isInternalPlayer);
    return internal.length ? internal : null;
  }

  function saveStoredEpisodeLinks(id, num, links, meta = {}) {
    if (id == null || num == null) return null;
    const all = readAll();
    const key = String(id);
    if (!all[key]) all[key] = { id, episodes: {}, updatedAt: Date.now() };
    const internal = (Array.isArray(links) ? links : []).filter(isInternalPlayer);
    if (internal.length === 0) return all[key];
    const record = all[key];
    record.episodes = record.episodes || {};
    record.episodes[String(num)] = { links: internal, syncedAt: Date.now(), source: meta.source || 'api' };
    record.lastEpisode = Number(num);
    record.updatedAt = Date.now();
    all[key] = record;
    writeAll(all);
    return record;
  }

  function apiBases(explicit) {
    const extra = Array.isArray(explicit) ? explicit : [explicit];
    const bases = [...extra, global.ONEUP_API_BASE, '/api', 'http://127.0.0.1:4050/api', 'http://localhost:4050/api'];
    return bases.filter(Boolean);
  }

  async function fetchEpisodeLinks(animeId, num, { refresh = false, bases } = {}) {
    const query = refresh ? '?refresh=1' : '';
    let lastError = null;
    for (const base of apiBases(bases)) {
      const url = base.replace(/\/$/, '') + '/anime/' + encodeURIComponent(animeId) +
        '/episodes/' + encodeURIComponent(num) + '/links' + query;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      try {
        const res = await global.fetch(url, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) { lastError = new Error('HTTP ' + res.status); continue; }
        const links = await res.json();
        const header = res.headers?.get?.('x-jkanime-warning');
        if (header) {
          try { links.warning = decodeURIComponent(header); } catch { links.warning = header; }
        }
        return links;
      } catch (error) {
        lastError = error;
      } finally { clearTimeout(timer); }
    }
    if (refresh) {
      let last = null;
      for (const base of apiBases(bases)) {
        try {
          const res = await global.fetch(base.replace(/\/$/, '') + '/anime/' + encodeURIComponent(animeId) +
            '/episodes/' + encodeURIComponent(num) + '/links', { cache: 'no-store' });
          if (res.ok) {
            const saved = await res.json();
            saved.warning = saved.warning || (lastError?.message || 'No se pudieron obtener enlaces nuevos; se conservan los guardados.');
            return saved;
          }
        } catch (error) { last = error; }
      }
      if (last) lastError = last;
    }
    throw lastError || new Error('No se pudo conectar con el servidor de enlaces.');
  }

  async function resolveStream(animeId, num, url, { fresh = false, server = null, bases } = {}) {
    let lastError = null;
    for (const base of apiBases(bases)) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      try {
        const res = await global.fetch(base.replace(/\/$/, '') + '/anime/' + encodeURIComponent(animeId) +
          '/episodes/' + encodeURIComponent(num) + '/player-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, refresh: fresh, server }),
          cache: 'no-store',
          signal: ctrl.signal
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { lastError = new Error(json.error || 'HTTP ' + res.status); continue; }
        return json;
      } catch (error) { lastError = error; }
      finally { clearTimeout(timer); }
    }
    throw lastError || new Error('No se pudo resolver el flujo del reproductor.');
  }

  const api = {
    STORAGE_KEY, INTERNAL_SERVERS, isInternalPlayer, splitLinks, mergePlayerLinks,
    getLocalAnime, saveLocalAnime, updateLocalAnime, getStoredEpisodeLinks, saveStoredEpisodeLinks,
    fetchEpisodeLinks, resolveStream
  };
  global.OneUpPlayerLinks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
