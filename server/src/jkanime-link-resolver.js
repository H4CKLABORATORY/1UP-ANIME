'use strict';
/**
 * 1UP Anime — Resolvedor eficiente de enlaces de JkAnime.
 *
 * Integración del flujo probado en jkanime_app: resolución HTTP primero y
 * navegador solo como respaldo. Parsers de ficha/capítulo se reutilizan de
 * jkanime-playwright-scraper.js para no duplicar lógica.
 *
 * Sin dependencias nuevas: usa fetch/AbortSignal globales (Node >= 18).
 */

const { parseEpisodeHtml, isChallengePage } = require('./jkanime-playwright-scraper.js');

const PRIMARY_BASE = 'https://jkanime.net';
const MIRROR_BASE = 'https://jkanime.org';
const DEFAULT_STREAM_TTL_MS = 1800000; // 30 min
const DEFAULT_USER_AGENT = process.env.JKANIME_USER_AGENT ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const PLAYER_PATH_RE = /^\/jkplayer\/(?:um|umv|mg|jk)\/?$/i;
const PLAYER_HOSTS = ['jkanime.net', 'jkanime.org'];

let BASE = PRIMARY_BASE;

function getBase() { return BASE; }
function resetBase() { BASE = PRIMARY_BASE; }
function mirrorUrl(url) {
  return String(url).replace(/^https:\/\/(?:www\.)?jkanime\.net\b/i, MIRROR_BASE);
}
function switchToMirror(reason) {
  if (BASE === MIRROR_BASE) return false;
  BASE = MIRROR_BASE;
  if (reason && process.env.JKANIME_DEBUG === '1') {
    console.warn(`[JK resolver] dominio alternativo ${MIRROR_BASE} (${reason})`);
  }
  return true;
}

/** Tipo de medio reproducible a partir de extensión o Content-Type. */
function getPlayableMediaType(value, contentType = '') {
  try {
    const pathname = new URL(value).pathname.toLowerCase();
    if (/\.m3u8$/.test(pathname) || /mpegurl/i.test(contentType)) return 'hls';
    if (/\.mp4$/.test(pathname) || /video\/mp4/i.test(contentType)) return 'file';
  } catch { /* URL no válida */ }
  return null;
}

/** Valida un candidato y descarta esquemas no-http y direcciones privadas (SSRF). */
function classifyStreamCandidate(value, base = BASE) {
  if (!value || typeof value !== 'string') return null;
  let url;
  try {
    url = new URL(value.replace(/&amp;/g, '&').trim(), base);
  } catch { return null; }
  if (!/^https?:$/.test(url.protocol)) return null;

  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local') ||
      hostname === '::1' || hostname.startsWith('[') ||
      /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.)/.test(hostname) ||
      /^172\.(?:1[6-9]|2\d|3[01])\./.test(hostname)) {
    return null;
  }

  const type = getPlayableMediaType(url.href) ||
    (/\/stream\/jkmedia\//i.test(url.pathname) ? 'file' : null);
  return type ? { url: url.href, type } : null;
}

/**
 * Extrae el manifiesto HLS/MP4 del HTML del reproductor sin navegador.
 * Orden: atob(base64) -> <video>/<source src> -> url/src: -> loadSource() ->
 * cualquier .m3u8/.mp4 absoluto.
 */
function extractPlayerStreamFromHtml(html, base = BASE) {
  if (!html || typeof html !== 'string') return null;
  const candidates = [];
  const push = value => { if (value) candidates.push(value); };

  const atobRe = /atob\(\s*['"]([A-Za-z0-9+/=\s]+)['"]\s*\)/gi;
  let m;
  while ((m = atobRe.exec(html)) !== null) {
    try { push(Buffer.from(m[1].replace(/\s+/g, ''), 'base64').toString('utf8')); } catch { /* ignorar */ }
  }

  const srcRe = /<(?:video|source)[^>]*\bsrc\s*=\s*['"]([^'"]+)['"]/gi;
  while ((m = srcRe.exec(html)) !== null) push(m[1]);

  const urlRe = /\b(?:url|src)\s*:\s*['"]([^'"]+)['"]/gi;
  while ((m = urlRe.exec(html)) !== null) push(m[1]);

  const hlsRe = /loadSource\(\s*['"]([^'"]+)['"]\s*\)/gi;
  while ((m = hlsRe.exec(html)) !== null) push(m[1]);

  const absoluteRe = /https?:\/\/[^"'\s<>\\]+\.(?:m3u8|mp4)(?:\?[^"'\s<>\\]*)?/gi;
  while ((m = absoluteRe.exec(html)) !== null) push(m[0]);

  for (const candidate of candidates) {
    const stream = classifyStreamCandidate(candidate, base);
    if (stream) return stream;
  }
  return null;
}

/** Sonda Range bytes=0-1 con dos intentos (403/429 transitorios del CDN). */
async function probePlayerStream(url, timeoutMs = 6000, fetchImpl = fetch) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchImpl(url, {
        method: 'GET',
        headers: {
          'User-Agent': DEFAULT_USER_AGENT,
          Range: 'bytes=0-1'
        },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.ok || res.status === 416) return true;
    } catch { /* reintento */ }
    if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

/** El wrapper /jkplayer/jk (?u=...) apunta al CDN jkplayers.com. */
function getJkAnimeDirectStreamUrl(playerUrl) {
  try {
    const player = new URL(playerUrl);
    const host = player.hostname.toLowerCase().replace(/^www\./, '');
    if (!PLAYER_HOSTS.includes(host) || !/^\/jkplayer\/jk\/?$/i.test(player.pathname)) return null;
    const streamPath = player.searchParams.get('u')?.trim();
    if (!streamPath || !/^\/?stream\/jkmedia\//i.test(streamPath)) return null;
    const target = new URL(streamPath.replace(/^\/+/, ''), 'https://jkplayers.com/');
    if (!/^https?:$/.test(target.protocol) || !/\/stream\/jkmedia\//i.test(target.pathname)) return null;
    return target.href;
  } catch { return null; }
}

function isInternalPlayerUrl(playerUrl) {
  try {
    const url = new URL(playerUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return PLAYER_HOSTS.includes(host) && PLAYER_PATH_RE.test(url.pathname);
  } catch { return false; }
}

/**
 * Los dominios de jkanime NO envían Access-Control-Allow-Origin y añaden
 * X-Frame-Options: SAMEORIGIN y Cross-Origin-Embedder-Policy: require-corp:
 * el navegador no puede leerlos (fetch/iframe quedan bloqueados por CORS/SOP).
 * Por eso el raspado/resolución se hace en Node. En cambio el CDN de vídeo
 * (nika.playmudos.com, jkplayers.com, …) sí expone ACAO: *, así que un flujo
 * resuelto es directamente reproducible con hls.js / <video> en el cliente.
 */
function isBrowserPlayableStream(stream) {
  if (!stream || !stream.url) return false;
  try {
    const url = new URL(stream.url);
    if (url.protocol !== 'https:') return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (PLAYER_HOSTS.includes(host)) return false;
    return Boolean(getPlayableMediaType(url.href) || /\/stream\/jkmedia\//i.test(url.pathname));
  } catch { return false; }
}

/**
 * Cliente HTTP ligero: CookieJar por host, detección de reto Cloudflare,
 * conmutación al espejo, reintentos y retardo entre peticiones.
 */
function createHttpClient({ fetchImpl = fetch, delayMs = 600, timeoutMs = 12000, retries = 3, userAgent = DEFAULT_USER_AGENT } = {}) {
  const jar = new Map();
  let schedule = Promise.resolve();
  let nextAt = 0;

  function storeCookies(url, res) {
    let host;
    try { host = new URL(url).hostname.toLowerCase(); } catch { return; }
    const raw = typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie')].filter(Boolean);
    if (!raw.length) return;
    if (!jar.has(host)) jar.set(host, new Map());
    const cookies = jar.get(host);
    for (const entry of raw) {
      const [pair] = String(entry).split(';');
      const i = pair.indexOf('=');
      if (i <= 0) continue;
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (value) cookies.set(name, value);
      else cookies.delete(name);
    }
  }

  function cookieString(url) {
    try {
      const host = new URL(url).hostname.toLowerCase();
      const cookies = jar.get(host);
      return cookies ? [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') : '';
    } catch { return ''; }
  }

  async function waitTurn() {
    const turn = schedule.then(async () => {
      const now = Date.now();
      const wait = Math.max(0, nextAt - now);
      nextAt = Math.max(now, nextAt) + delayMs;
      if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    });
    schedule = turn.catch(() => {});
    return turn;
  }

  async function request(url, options = {}) {
    let attempt = 0;
    while (attempt <= retries) {
      attempt++;
      await waitTurn();
      const headers = {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        ...(cookieString(url) ? { Cookie: cookieString(url) } : {}),
        ...(options.referer ? { Referer: options.referer } : {}),
        ...(options.headers || {})
      };
      try {
        const res = await fetchImpl(url, {
          method: options.method || 'GET',
          headers,
          body: options.body,
          signal: AbortSignal.timeout(options.timeoutMs || timeoutMs)
        });
        storeCookies(url, res);
        const cf = /challenge/i.test(res.headers.get('cf-mitigated') || '') ||
          isChallengePage('', res.headers.get('title') || '');
        if (!res.ok || cf) {
          const error = new Error(cf
            ? `JkAnime pidió verificación de seguridad al consultar ${url}`
            : `HTTP ${res.status}: ${res.statusText} al consultar ${url}`);
          error.status = res.status;
          error.cfChallenge = cf;
          error.retryable = !cf && (res.status === 429 || res.status >= 500);
          throw error;
        }
        return res;
      } catch (error) {
        if (error.cfChallenge || (error.status && !error.retryable) || attempt > retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
      }
    }
    throw new Error('No se pudo completar la petición HTTP.');
  }

  return {
    request,
    getText: async (url, options = {}) => (await request(url, options)).text(),
    getJson: async (url, options = {}) => (await request(url, options)).json(),
    cookieString,
    setCookies(url, values) {
      let host;
      try { host = new URL(url).hostname.toLowerCase(); } catch { return; }
      if (!jar.has(host)) jar.set(host, new Map());
      const cookies = jar.get(host);
      for (const value of Array.isArray(values) ? values : [values]) {
        const [pair] = String(value).split(';');
        const i = pair.indexOf('=');
        if (i > 0) cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    },
    setUserAgent(value) { if (typeof value === 'string' && value.trim()) userAgent = value.trim(); }
  };
}

/** Texto con respaldo automático de dominio ante reto de Cloudflare. */
async function getTextWithMirror(getText, url, options = {}) {
  try {
    return await getText(url, options);
  } catch (error) {
    if (!error.cfChallenge || BASE === MIRROR_BASE) throw error;
    switchToMirror(error.message);
    const referer = options.referer ? mirrorUrl(options.referer) : undefined;
    return getText(mirrorUrl(url), { ...options, referer });
  }
}

/** Resolución HTTP pura (sin navegador): rápida y suficiente en la mayoría de casos. */
async function resolvePlayerStreamOverHttp(playerUrl, { referer, http, fetchImpl = fetch } = {}) {
  const client = http || createHttpClient({ fetchImpl });
  const html = await getTextWithMirror((url, opts) => client.getText(url, opts), playerUrl, { referer, cache: false });
  const stream = extractPlayerStreamFromHtml(html, getBase());
  if (!stream) {
    const error = new Error('La página del reproductor no expuso un flujo utilizable.');
    error.code = 'PLAYER_STREAM_NOT_FOUND';
    throw error;
  }
  if (!await probePlayerStream(stream.url, 6000, fetchImpl)) {
    const error = new Error('El flujo del reproductor no respondió (enlace caducado o restringido por red).');
    error.code = 'PLAYER_STREAM_UNREACHABLE';
    throw error;
  }
  return stream;
}

/** Caché de flujos con reutilización "stale while alive". */
function createStreamCache({ ttlMs = DEFAULT_STREAM_TTL_MS, maxEntries = 250, now = Date.now } = {}) {
  const store = new Map();
  return {
    get(key, { probe } = {}) {
      const entry = store.get(key);
      if (!entry) return null;
      const fresh = now() - entry.resolvedAt < ttlMs;
      if (fresh) return { ...entry.stream, cached: true, resolvedAt: entry.resolvedAt };
      if (typeof probe === 'function') {
        return Promise.resolve(probe(entry.stream.url)).then(alive => {
          if (!alive) { store.delete(key); return null; }
          entry.resolvedAt = now();
          return { ...entry.stream, cached: true, resolvedAt: entry.resolvedAt };
        });
      }
      return null;
    },
    set(key, stream) {
      while (store.size >= maxEntries) store.delete(store.keys().next().value);
      store.set(key, { stream: { url: stream.url, type: stream.type }, resolvedAt: now() });
      return stream;
    },
    delete(key) { return store.delete(key); },
    clear() { store.clear(); },
    get size() { return store.size; }
  };
}

/**
 * Resuelve el flujo real de un reproductor interno.
 * Orden: caché (stale revalidado) -> HTTP -> navegador (si se inyecta).
 * browserResolver(playerUrl, ctx) debe devolver { url, type } o lanzar error.
 */
async function resolveJkAnimePlayerStream(playerUrl, {
  referer, forceRefresh = false, cache = null, http = null,
  fetchImpl = fetch, browserResolver = null, probe = null
} = {}) {
  if (!isInternalPlayerUrl(playerUrl)) {
    throw new Error('Este reproductor no usa un enlace interno compatible de JkAnime.');
  }

  const withPlayable = stream => ({ ...stream, browserPlayable: isBrowserPlayableStream(stream) });

  const cacheKey = `${playerUrl}::${referer || ''}`;
  if (!forceRefresh && cache) {
    const hit = await cache.get(cacheKey, { probe: probe || (url => probePlayerStream(url, 5000, fetchImpl)) });
    if (hit) return withPlayable(hit);
  }

  let httpError;
  try {
    const stream = await resolvePlayerStreamOverHttp(playerUrl, { referer, http, fetchImpl });
    if (cache) cache.set(cacheKey, stream);
    return { ...withPlayable(stream), cached: false };
  } catch (error) {
    if (error.code === 'PLAYER_STREAM_UNREACHABLE') throw error;
    httpError = error;
  }

  if (typeof browserResolver === 'function') {
    const stream = await browserResolver(playerUrl, { referer, directStreamUrl: getJkAnimeDirectStreamUrl(playerUrl), httpError });
    if (cache) cache.set(cacheKey, stream);
    return { ...withPlayable(stream), cached: false };
  }
  throw httpError || new Error('No se pudo resolver el flujo del reproductor.');
}

module.exports = {
  PRIMARY_BASE, MIRROR_BASE, DEFAULT_STREAM_TTL_MS,
  getBase, resetBase, mirrorUrl, switchToMirror,
  getPlayableMediaType, classifyStreamCandidate, extractPlayerStreamFromHtml,
  probePlayerStream, getJkAnimeDirectStreamUrl, isInternalPlayerUrl,
  isBrowserPlayableStream,
  createHttpClient, getTextWithMirror, resolvePlayerStreamOverHttp,
  createStreamCache, resolveJkAnimePlayerStream,
  parseEpisodeLinks: parseEpisodeHtml
};
