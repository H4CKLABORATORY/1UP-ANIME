// @ts-check
/**
 * 1UP Anime — Authorized media resolver.
 *
 * Reads data/licensed-media.json (owned/authorized sources declared by the editor),
 * matches the requested anime/episode and, on refresh, checks every direct URL with
 * a short HEAD request (GET Range fallback) so the player never shows a dead link
 * as "ready". Third-party embeds are never probed: their own provider decides.
 *
 * This module never scrapes, extracts or proxies streams from other sites.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MANIFEST_CANDIDATES = [
  process.env.ONEUP_LICENSED_MEDIA,
  path.resolve(process.cwd(), 'data/licensed-media.json'),
  path.resolve(__dirname, '../../data/licensed-media.json')
].filter(Boolean);

const PROBE_TTL_MS = 10 * 60 * 1000;
const PROBE_TIMEOUT_MS = 6000;
const PROBE_HEADERS = {
  'User-Agent': '1UP-Anime-Authorized-Media-Check/1.0 (+https://h4cklaboratory.github.io/1UP-ANIME/)',
  'Accept': 'video/*,application/vnd.apple.mpegurl,audio/*;q=0.8,*/*;q=0.5'
};

const probeCache = new Map();
let manifestCache = null;

/** Normalize text for tolerant matching (accents, punctuation and case). */
function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Identifier variants: keep jk- ids intact; MAL/AL prefixes are optional. */
function identifierVariants(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return [];
  const variants = new Set([raw]);
  const stripped = raw.replace(/^(mal|al|anilist)[-_ ]/, '');
  if (stripped && stripped !== raw) variants.add(stripped);
  return [...variants];
}

function titleVariants(entry, key) {
  const values = [key, entry?.title];
  if (Array.isArray(entry?.aliases)) values.push(...entry.aliases);
  return new Set(values.map(normalize).filter(Boolean));
}

/** Locate a manifest entry by identifier, slug or exact normalized title (no fuzzy title words). */
function findEntry(manifest, target, anime) {
  const entries = manifest && typeof manifest.entries === 'object' && manifest.entries !== null ? manifest.entries : {};
  const wantedIds = new Set(
    [target, anime?.id, anime?.raw_id, anime?.slug, anime?.malId, anime?.anilistId]
      .flatMap(identifierVariants)
  );

  for (const [key, entry] of Object.entries(entries)) {
    const entryIds = [key, entry?.id, entry?.raw_id, entry?.slug, entry?.malId, entry?.anilistId]
      .flatMap(identifierVariants);
    if (entryIds.some(id => wantedIds.has(id))) return { key, entry };
  }

  const wantedTitles = new Set([target, anime?.title].map(normalize).filter(Boolean));
  if (wantedTitles.size === 0) return null;
  for (const [key, entry] of Object.entries(entries)) {
    if ([...titleVariants(entry, key)].some(title => wantedTitles.has(title))) return { key, entry };
  }
  return null;
}

function episodeNumber(episode) {
  const raw = episode?.number ?? episode?.episode ?? episode?.ep ?? episode?.n;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function episodeSeason(episode) {
  const value = Number(episode?.season);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function findEpisode(entry, number, season) {
  const list = Array.isArray(entry?.episodes) ? entry.episodes : [];
  const exact = list.find(episode => episodeNumber(episode) === number && episodeSeason(episode) === season);
  if (exact) return exact;
  if (list.length === 1 && episodeNumber(list[0]) === null) return list[0];
  return null;
}

/** Only public HTTPS URLs without credentials or custom ports. Hashes are opt-in (Mega). */
function safeHttpsUrl(value, { allowHash = false } = {}) {
  try {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password || (!allowHash && url.hash)) return null;
    if (url.port && url.port !== '443') return null;
    if (!host.includes('.') || host.includes(':')) return null;
    if (/(^|\.)(localhost|local|internal|test|invalid)$/.test(host)) return null;
    if (/^[0-9.]+$/.test(host)) return null;
    return url;
  } catch {
    return null;
  }
}

function isProbeable(value) {
  const raw = String(value ?? '').trim();
  if (!raw || /^(\.\/|\/)/.test(raw)) return false;
  return Boolean(safeHttpsUrl(raw));
}

function isVideoContentType(value) {
  const type = String(value || '').toLowerCase();
  if (!type) return true;
  if (type.includes('text/html')) return false;
  return /^(video\/|audio\/|application\/(vnd\.apple\.mpegurl|x-mpegurl|octet-stream)|binary\/octet-stream)/.test(type);
}

/** Downloads may be ZIP/PDF/7z; only an HTML error page proves the link is dead. */
function isDownloadContentType(value) {
  const type = String(value || '').toLowerCase();
  return !/^(text\/html|application\/xhtml\+xml)/.test(type);
}

async function timedFetch(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function discardBody(response) {
  try {
    if (response?.body && typeof response.body.cancel === 'function') await response.body.cancel();
  } catch {
    /* the response is intentionally left unread */
  }
}

async function doProbe(url, { fetchImpl, timeoutMs, expect }) {
  const headers = { ...PROBE_HEADERS };
  let headError = null;
  let response = null;

  try {
    response = await timedFetch(fetchImpl, url, { method: 'HEAD', redirect: 'follow', headers }, timeoutMs);
  } catch (error) {
    headError = error;
  }

  if (response && response.ok) {
    return probeSuccess(response, expect);
  }

  const retryWithGet = !response || [400, 403, 405, 501].includes(response.status);
  if (retryWithGet) {
    try {
      const getResponse = await timedFetch(
        fetchImpl,
        url,
        { method: 'GET', redirect: 'follow', headers: { ...PROBE_HEADERS, Range: 'bytes=0-0' } },
        timeoutMs
      );
      await discardBody(getResponse);
      if (getResponse.ok || getResponse.status === 206) return probeSuccess(getResponse, expect);
      return probeFailure(getResponse.status, `HTTP ${getResponse.status}`, getResponse);
    } catch (error) {
      return probeFailure(0, headError?.name === 'AbortError' || error?.name === 'AbortError' ? 'Sin respuesta (tiempo agotado)' : String(error?.message || error));
    }
  }

  return probeFailure(response.status, `HTTP ${response.status}`, response, headError);
}

function probeSuccess(response, expect = 'media') {
  const contentType = String(response.headers?.get?.('content-type') || '').toLowerCase();
  const length = Number(response.headers?.get?.('content-length') || 0) || null;
  const result = {
    ok: true,
    code: response.status,
    contentType: contentType || null,
    bytes: length,
    checkedAt: new Date().toISOString()
  };
  const valid = expect === 'download' ? isDownloadContentType(contentType) : isVideoContentType(contentType);
  if (!valid) {
    return {
      ok: false,
      code: response.status,
      contentType,
      bytes: length,
      checkedAt: result.checkedAt,
      error: expect === 'download'
        ? 'El enlace devuelve HTML, no un archivo descargable'
        : 'El enlace devuelve HTML, no un archivo de vídeo'
    };
  }
  return result;
}

function probeFailure(code, message, response, headError) {
  return {
    ok: false,
    code: Number(code) || 0,
    contentType: response ? String(response.headers?.get?.('content-type') || '') || null : null,
    bytes: null,
    checkedAt: new Date().toISOString(),
    error: message || (headError ? 'El servidor no respondió' : 'Enlace no disponible')
  };
}

/**
 * Validate and (optionally cached) check one direct URL.
 * @returns {Promise<{ok:boolean, code:number, contentType:string|null, bytes:number|null, checkedAt:string, error?:string, cached?:boolean}>}
 */
async function probeSource(url, options = {}) {
  if (!isProbeable(url)) {
    return { ok: false, code: 0, contentType: null, bytes: null, checkedAt: new Date().toISOString(), error: 'URL no permitida: solo HTTPS público' };
  }
  const href = safeHttpsUrl(url).href;
  const expect = options.expect === 'download' ? 'download' : 'media';
  const cacheKey = href + '|' + expect;
  const ttl = Number(options.ttlMs) > 0 ? Number(options.ttlMs) : PROBE_TTL_MS;
  const now = Date.now();
  const cached = probeCache.get(cacheKey);
  if (!options.refresh && cached && now - cached.at < ttl) {
    return { ...cached.result, cached: true };
  }
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return { ok: false, code: 0, contentType: null, bytes: null, checkedAt: new Date().toISOString(), error: 'fetch no está disponible en este runtime' };
  }
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : PROBE_TIMEOUT_MS;
  const result = await doProbe(href, { fetchImpl, timeoutMs, expect });
  probeCache.set(cacheKey, { at: now, result });
  return result;
}

/** Read the manifest, reusing the parsed copy until the file changes. */
function loadManifest(filePath) {
  const candidate = filePath || MANIFEST_CANDIDATES.find(item => item && fs.existsSync(item));
  if (!candidate) return { version: 1, entries: {} };
  try {
    const stat = fs.statSync(candidate);
    if (manifestCache && manifestCache.path === candidate && manifestCache.mtimeMs === stat.mtimeMs) {
      return manifestCache.data;
    }
    const parsed = JSON.parse(fs.readFileSync(candidate, 'utf8').replace(/^\uFEFF/, ''));
    const data = parsed && typeof parsed === 'object' ? parsed : { version: 1, entries: {} };
    if (!data.entries || typeof data.entries !== 'object') data.entries = {};
    manifestCache = { path: candidate, mtimeMs: stat.mtimeMs, data };
    return data;
  } catch {
    return { version: 1, entries: {} };
  }
}

function toPlayer(source, index) {
  if (!source || typeof source !== 'object') return null;
  const name = String(source.name || source.server || source.label || `Fuente ${index + 1}`).slice(0, 60);
  const rights = String(source.rights || 'authorized').toLowerCase();
  if (!['owned', 'authorized'].includes(rights)) return null;

  const mode = source.mode ? String(source.mode) : '';
  const provider = source.provider ? String(source.provider) : '';
  const videoId = source.videoId ? String(source.videoId) : '';
  const isOfficialYouTube = mode === 'official_embed' && provider === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(videoId);
  const declaredEmbed = source.embed || source.embedUrl || source.embed_url;
  const isEmbed = Boolean(isOfficialYouTube || declaredEmbed || mode === 'official_embed' || source.kind === 'embed' || source.type === 'embed');
  const direct = isEmbed ? '' : String(source.src || source.url || '').trim();
  const embed = isOfficialYouTube
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : isEmbed
      ? String(declaredEmbed || source.url || '').trim()
      : '';
  if (!direct && !embed) return null;

  return {
    kind: 'player',
    server: name,
    player_url: embed || direct,
    embed_url: embed || undefined,
    src: direct || undefined,
    mime: direct ? String(source.mime || '').trim() || null : null,
    language: String(source.language || source.lang || 'Idioma no especificado').slice(0, 35),
    quality: String(source.quality || 'HD').slice(0, 35),
    rights,
    mode: mode || undefined,
    provider: provider || undefined,
    videoId: videoId || undefined,
    subtitles_es: source.subtitles_es || undefined,
    tracks: Array.isArray(source.tracks) ? source.tracks.slice(0, 8) : undefined,
    probeable: Boolean(direct),
    status: null
  };
}

function toDownload(source, index) {
  if (!source || typeof source !== 'object') return null;
  const url = String(source.src || source.download_url || source.url || '').trim();
  if (!url) return null;
  return {
    kind: 'download',
    server: String(source.name || source.server || `Descarga ${index + 1}`).slice(0, 60),
    size: source.size ? String(source.size).slice(0, 40) : null,
    quality: String(source.quality || 'HD').slice(0, 35),
    mime: source.mime ? String(source.mime) : null,
    download_url: url,
    probeable: isProbeable(url),
    status: null
  };
}

/**
 * Resolve authorized sources for one episode.
 * Returns null when the anime is not declared in the manifest.
 *
 * @param {string} target catalog id, AniList/MAL id, slug or title
 * @param {number|string} number episode number
 * @param {{refresh?:boolean, probe?:boolean, season?:number, anime?:object, manifest?:object, fetchImpl?:Function, timeoutMs?:number, ttlMs?:number}} options
 */
async function resolveAuthorizedEpisode(target, number, options = {}) {
  const manifest = options.manifest || loadManifest();
  const anime = options.anime || null;
  const match = findEntry(manifest, target, anime);
  if (!match) return null;

  const episodeNumberValue = Number(number);
  const season = Number(options.season) > 0 ? Number(options.season) : 1;
  const episode = findEpisode(match.entry, episodeNumberValue, season);

  const declaredSources = episode && Array.isArray(episode.sources)
    ? episode.sources
    : episode && (episode.src || episode.embed || episode.url)
      ? [episode]
      : [];
  const declaredDownloads = episode && Array.isArray(episode.downloads) ? episode.downloads : [];

  const players = declaredSources.map(toPlayer).filter(Boolean);
  const downloads = declaredDownloads.map(toDownload).filter(Boolean);

  const probeTargets = options.probe === false
    ? []
    : [...players.filter(player => player.probeable), ...downloads.filter(item => item.probeable)];
  await Promise.all(probeTargets.map(async item => {
    const url = item.kind === 'download' ? item.download_url : item.src;
    item.status = await probeSource(url, {
      ...options,
      refresh: Boolean(options.refresh),
      expect: item.kind === 'download' ? 'download' : 'media'
    });
  }));

  // Keep declared order but surface verified sources first.
  players.sort((a, b) => Number(b.status?.ok || false) - Number(a.status?.ok || false));
  downloads.sort((a, b) => Number(b.status?.ok || false) - Number(a.status?.ok || false));

  return {
    found: true,
    source: 'authorized',
    manifest_key: match.key,
    anime_id: String(target),
    title: String(match.entry?.title || anime?.title || target),
    slug: match.entry?.slug || null,
    episode: episodeNumberValue,
    season,
    episode_declared: Boolean(episode),
    episode_title: episode?.title ? String(episode.title) : null,
    revalidated: probeTargets.length > 0,
    checked_sources: probeTargets.length,
    players,
    downloads
  };
}

function clearProbeCache() {
  probeCache.clear();
  manifestCache = null;
}

module.exports = {
  resolveAuthorizedEpisode,
  probeSource,
  loadManifest,
  findEntry,
  findEpisode,
  safeHttpsUrl,
  normalize,
  clearProbeCache,
  PROBE_TTL_MS,
  PROBE_TIMEOUT_MS
};
