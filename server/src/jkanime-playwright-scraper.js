// @ts-check
/**
 * 1UP Anime — JkAnime Playwright Scraper Engine
 * Integración unificada inspirada en MediaHub (server/plugins/sources/jkanime)
 * y jkanime_app (server/src/scraper.js) con Playwright para sortear límites
 * de petición y manejar perfiles de navegador persistentes.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE_URL = 'https://jkanime.net';
// Let Chromium send its own matching UA unless the caller explicitly overrides it.
const DEFAULT_USER_AGENT = null;
const IPHONE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

// -------------------------------------------------------------
// Utilidades de Normalización y URL
// -------------------------------------------------------------

function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  if (trimmed.startsWith('/')) return BASE_URL + trimmed;
  return trimmed;
}

function decodeBase64(str) {
  if (!str || typeof str !== 'string') return null;
  const cleaned = str.trim().replace(/^['"]|['"]$/g, '');
  if (!/^[A-Za-z0-9+/=_-]{4,}$/.test(cleaned)) return null;
  try {
    const decoded = Buffer.from(cleaned, 'base64').toString('utf8').trim();
    // Validar que el texto decodificado contenga caracteres legibles (evita bytes aleatorios binarios)
    if (/[\x00-\x08\x0E-\x1F]/.test(decoded)) return null;
    return decoded || null;
  } catch {
    return null;
  }
}

function isChallengePage(html, title = '') {
  const text = (String(html || '') + ' ' + String(title || '')).toLowerCase();
  return (
    text.includes('just a moment...') ||
    text.includes('un momento…') ||
    text.includes('checking your browser') ||
    text.includes('challenge-running') ||
    text.includes('cf-turnstile') ||
    text.includes('turnstile') ||
    text.includes('attention required') ||
    text.includes('atención requerida') ||
    text.includes('cloudflare') && (text.includes('ray id') || text.includes('challenge') || text.includes('verificar')) ||
    text.includes('verificar que eres humano') ||
    text.includes('verify you are human')
  );
}

// -------------------------------------------------------------
// Parsers HTML (MediaHub + jkanime_app Parity)
// -------------------------------------------------------------

function parseCatalogHtml(html) {
  if (!html || typeof html !== 'string') return { data: [], current_page: 1, last_page: 1 };

  // 1) Intentar variable JS: var animes = ({...}); var mode
  const jsonMatch = html.match(/var\s+animes\s*=\s*(\{[\s\S]*?\});\s*(?:\n|var\s+mode|$)/i) ||
                    html.match(/var\s+animes\s*=\s*(\[[^;]+\]);/i);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) {
        return { data: parsed.map(normalizeCatalogItem), current_page: 1, last_page: 1 };
      }
      if (parsed && Array.isArray(parsed.data)) {
        return {
          data: parsed.data.map(normalizeCatalogItem),
          current_page: Number(parsed.current_page) || 1,
          last_page: Number(parsed.last_page) || 1,
          total: Number(parsed.total) || parsed.data.length
        };
      }
    } catch {}
  }

  // 2) Fallback DOM: .anime__item cards (MediaHub parity)
  const items = [];
  const cardRegex = /<div[^>]*class="[^"]*\banime__item\b(?![_\w])[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*\banime__item\b(?![_\w])|$)/gi;
  let cardM;
  while ((cardM = cardRegex.exec(html)) !== null) {
    const cardContent = cardM[1];
    const linkMatch = cardContent.match(/<a[^>]*href=["'](?:https:\/\/jkanime\.net)?\/([a-zA-Z0-9_-]+)\/?["'][^>]*>([\s\S]*?)<\/a>/i);
    const imgMatch = cardContent.match(/data-setbg=["']([^"']+)["']/i) || cardContent.match(/src=["']([^"']+)["']/i);
    if (linkMatch) {
      const slug = linkMatch[1];
      const title = linkMatch[2].replace(/<[^>]+>/g, '').trim();
      if (slug && !['directorio', 'buscar', 'horario', 'top'].includes(slug)) {
        items.push(normalizeCatalogItem({
          slug,
          title,
          image: imgMatch ? imgMatch[1] : null
        }));
      }
    }
  }

  return { data: items, current_page: 1, last_page: 1 };
}

function normalizeCatalogItem(item) {
  if (!item || typeof item !== 'object') return null;
  const slug = String(item.slug || '').trim();
  let studios = null;
  if (item.studios && typeof item.studios === 'object') {
    studios = item.studios.nombre || null;
  } else if (typeof item.studios === 'string' && item.studios && item.studios !== 'ABC') {
    studios = item.studios;
  }

  const title = String(item.title || item.short_title || slug).trim();
  const rawImage = item.image || (slug ? `https://cdn.jkdesu.com/assets/images/animes/video/image/${slug}.jpg` : null);

  return {
    id: item.id ? Number(item.id) : null,
    slug,
    title,
    short_title: item.short_title || title,
    synopsis: item.synopsis || null,
    image: normalizeUrl(rawImage),
    banner: normalizeUrl(item.banner) || null,
    type: item.type || 'Serie',
    status: item.status || null,
    estado: item.estado || null,
    studios,
    episodes_total: item.episodes ? Number(item.episodes) : null,
    year: item.year ? Number(item.year) : null,
    season: item.season || null,
    genres: typeof item.genres === 'string' ? item.genres : (Array.isArray(item.genres) ? JSON.stringify(item.genres) : null),
    scraped_at: new Date().toISOString()
  };
}

function parseDetailHtml(html) {
  const meta = {
    id: null,
    csrf_token: null,
    title: null,
    short_title: null,
    synopsis: null,
    image: null,
    banner: null,
    type: 'Serie',
    status: null,
    estado: null,
    studios: null,
    episodes_total: null,
    year: null,
    season: null,
    duration: null,
    quality: null,
    first_aired: null,
    genres: [],
    vote_count: null
  };

  if (!html || typeof html !== 'string') return meta;

  // ID de anime
  const idMatch = html.match(/\/ajax\/episodes\/(\d+)/i) ||
                  html.match(/data-anime(?:-id)?=["']?(\d+)["']?/i) ||
                  html.match(/id_anime\s*[:=]\s*["']?(\d+)["']?/i);
  if (idMatch) meta.id = parseInt(idMatch[1], 10);

  // CSRF token
  const csrfMatch = html.match(/<meta[^>]*name=["']csrf-token["'][^>]*content=["']([^"']+)["']/i);
  if (csrfMatch) meta.csrf_token = csrfMatch[1];

  // Título
  const titleMatch = html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                     html.match(/<div[^>]*class="anime__details__title"[^>]*>\s*<h3>([\s\S]*?)<\/h3>/i);
  if (titleMatch) meta.title = titleMatch[1].replace(/<[^>]+>/g, '').trim();

  // Sinopsis
  const synMatch = html.match(/<p[^>]*class="[^"]*(?:sinopsis|anime__details__text)[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
  if (synMatch) meta.synopsis = synMatch[1].replace(/<[^>]+>/g, '').trim();

  // Imagen / Portada
  const imgMatch = html.match(/<div[^>]*class="anime__details__pic[^"]*"[^>]*data-setbg="([^"]+)"/i) ||
                   html.match(/<img[^>]*class="[^"]*poster[^"]*"[^>]*src="([^"]+)"/i) ||
                   html.match(/meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (imgMatch) meta.image = normalizeUrl(imgMatch[1]);

  // Metadatos en listas: <span>clave:</span> valor
  const infoRegex = /<span>([^<:]+):<\/span>\s*([\s\S]*?)<\/(?:li|div)>/gi;
  let infoM;
  while ((infoM = infoRegex.exec(html)) !== null) {
    const key = infoM[1].trim().toLowerCase();
    const val = infoM[2].replace(/<[^>]+>/g, '').trim();
    if (key.includes('tipo')) meta.type = val;
    else if (key.includes('estudio')) meta.studios = val;
    else if (key.includes('episodio')) meta.episodes_total = parseInt(val, 10) || null;
    else if (key.includes('estado')) {
      meta.estado = val;
      if (/emisi[oó]n/i.test(val)) meta.status = 'currently';
      else if (/finalizado|concluido/i.test(val)) meta.status = 'finished';
      else if (/estrenar/i.test(val)) meta.status = 'upcoming';
    }
    else if (key.includes('duraci')) meta.duration = val;
    else if (key.includes('calidad')) meta.quality = val;
    else if (key.includes('emitido')) {
      meta.first_aired = val;
      const y = val.match(/\b(19|20)\d{2}\b/);
      if (y) meta.year = parseInt(y[0], 10);
    }
  }

  // Géneros
  const genreRegex = /<a[^>]*href="[^"]*\/genero\/([^"\/]+)\/?"[^>]*>([^<]+)<\/a>/gi;
  let gMatch;
  while ((gMatch = genreRegex.exec(html)) !== null) {
    const g = gMatch[2].trim();
    if (g && !meta.genres.includes(g)) meta.genres.push(g);
  }

  return meta;
}

function parseEpisodeHtml(html) {
  const players = [];
  const downloads = [];
  const seenPlayers = new Set();
  const seenDownloads = new Set();

  if (!html || typeof html !== 'string') return { players, downloads };

  function addPlayer(p) {
    if (!p || !p.player_url) return;
    const normPlayer = normalizeUrl(p.player_url);
    const normEmbed = normalizeUrl(p.embed_url || p.player_url);
    const key = `${p.server}:${normPlayer}`;
    if (seenPlayers.has(key)) return;
    seenPlayers.add(key);
    players.push({
      kind: 'player',
      server: p.server || 'Servidor',
      player_url: normPlayer,
      embed_url: normEmbed,
      quality: p.quality || 'HD',
      is_protected: Boolean(!normEmbed || normEmbed.includes('jkanime.net') || ['desu', 'magi', 'desuka'].includes(String(p.server || '').toLowerCase())),
      embeddable: Boolean(normEmbed && !normEmbed.includes('jkanime.net'))
    });
  }

  function addDownload(d) {
    if (!d || !d.download_url) return;
    const normDl = normalizeUrl(d.download_url);
    const key = `${d.server}:${normDl}`;
    if (seenDownloads.has(key)) return;
    seenDownloads.add(key);
    downloads.push({
      kind: 'download',
      server: d.server || 'Descarga',
      size: d.size || null,
      download_url: normDl,
      quality: d.quality || 'HD'
    });
  }

  // 1) Legacy JSON: var video = [ { server: 'Desu', code: '...' }, ... ];
  const videoVarMatch = html.match(/var\s+video\s*=\s*(\[[\s\S]*?\]);\s*(?:var|$)/i) ||
                        html.match(/var\s+video\s*=\s*(\[[\s\S]*?\]);/i);
  if (videoVarMatch) {
    try {
      const rawPlayers = JSON.parse(videoVarMatch[1]);
      if (Array.isArray(rawPlayers)) {
        for (const p of rawPlayers) {
          if (!p || !p.server) continue;
          const serverName = p.server.trim();
          const lower = serverName.toLowerCase();
          let playerUrl = null;
          if (lower === 'desu') playerUrl = `${BASE_URL}/jkplayer/um?e=${p.code}`;
          else if (lower === 'magi') playerUrl = `${BASE_URL}/jkplayer/mg?e=${p.code}`;
          else if (lower === 'desuka') playerUrl = `${BASE_URL}/jkplayer/jk?u=${p.code}`;
          else if (p.code) {
            playerUrl = p.code.startsWith('http') ? p.code : `${BASE_URL}/jkplayer/${p.server}?u=${p.code}`;
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
          const decoded = decodeBase64(s.remote);
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
  let extM;
  while ((extM = extRegex.exec(html)) !== null) {
    const url = extM[1];
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

  return { players, downloads };
}

// -------------------------------------------------------------
// Playwright Scraper Engine
// -------------------------------------------------------------

function resolveBrowserExecutable() {
  for (const envName of ['JKANIME_CHROMIUM_PATH', 'PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH', 'CHROMIUM_PATH']) {
    const configuredPath = process.env[envName];
    if (!configuredPath) continue;
    if (!fs.existsSync(configuredPath)) {
      throw new Error(`${envName} apunta a un navegador inexistente: ${configuredPath}`);
    }
    return { executablePath: configuredPath };
  }

  // Prefer the exact browser revision installed for this Playwright package.
  const bundledPath = chromium.executablePath();
  if (fs.existsSync(bundledPath)) return { executablePath: bundledPath };

  const candidates = process.platform === 'win32'
    ? [
        path.join(process.env.LOCALAPPDATA || '', 'Microsoft/Edge/Application/msedge.exe'),
        path.join(process.env.ProgramFiles || 'C:/Program Files', 'Microsoft/Edge/Application/msedge.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env.ProgramFiles || 'C:/Program Files', 'Google/Chrome/Application/chrome.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Google/Chrome/Application/chrome.exe')
      ]
    : process.platform === 'darwin'
      ? [
          '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium'
        ]
      : ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/microsoft-edge'];

  for (const cand of candidates) {
    if (cand && fs.existsSync(cand)) return { executablePath: cand };
  }

  // Keep the expected path so init() can report the exact install command if it is absent.
  return { executablePath: bundledPath };
}

class JkanimePlaywrightScraper {
  /**
   * @param {Object} [options]
   * @param {string} [options.userAgent]
   * @param {string} [options.userDataDir]
   * @param {boolean} [options.headless]
   * @param {boolean} [options.interactive]
   * @param {number} [options.timeoutMs]
   * @param {number} [options.delayMs]
   */
  constructor(options = {}) {
    this.userAgent = options.userAgent || process.env.JKANIME_USER_AGENT || DEFAULT_USER_AGENT;
    this.headless = options.interactive ? false : (options.headless !== undefined ? options.headless : true);
    this.interactive = Boolean(options.interactive);
    this.timeoutMs = options.timeoutMs || 25000;
    this.delayMs = options.delayMs || 800;
    this.lastRequestTime = 0;

    const defaultProfile = path.resolve(process.cwd(), 'data/browser_profile/jkanime');
    this.userDataDir = options.userDataDir || process.env.JKANIME_USER_DATA_DIR || defaultProfile;

    this.context = null;
    this.page = null;
    this.initPromise = null;
  }

  async _delay() {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.delayMs) {
      await new Promise(r => setTimeout(r, this.delayMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  async init() {
    if (this.context && this.page) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      fs.mkdirSync(this.userDataDir, { recursive: true });
      const browserSpec = resolveBrowserExecutable();
      if (browserSpec.executablePath && !fs.existsSync(browserSpec.executablePath)) {
        throw new Error(
          `No se encontró Chromium para Playwright en ${browserSpec.executablePath}. ` +
          'Ejecuta "npx playwright install chromium" o configura PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.'
        );
      }

      const contextOptions = {
        ...browserSpec,
        headless: this.headless,
        viewport: { width: 1280, height: 720 },
        locale: 'es-ES',
        ...(this.userAgent ? { userAgent: this.userAgent } : {})
      };

      const context = await chromium.launchPersistentContext(this.userDataDir, contextOptions);
      try {
        const page = context.pages()[0] || await context.newPage();

        // The scraper needs HTML and scripts, not page artwork or embedded media.
        // Aborting those assets reduces transfer size without removing page logic.
        await page.route('**/*', route => {
          const request = route.request();
          const url = request.url().toLowerCase();
          const isTracker = [
            'google-analytics', 'googletagmanager', 'doubleclick', 'adservice',
            'adsystem', 'popads', 'exoclick'
          ].some(host => url.includes(host));
          const isHeavyAsset = ['image', 'font', 'media'].includes(request.resourceType());
          return isTracker || isHeavyAsset ? route.abort() : route.continue();
        });
        this.context = context;
        this.page = page;
      } catch (error) {
        await context.close().catch(() => {});
        throw error;
      }
    })();

    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  async close() {
    if (this.context) {
      await this.context.close().catch(() => {});
      this.context = null;
      this.page = null;
    }
  }

  async navigateWithAntiBotCheck(url, { referer = `${BASE_URL}/` } = {}) {
    await this.init();
    await this._delay();

    const page = this.page;
    await page.setExtraHTTPHeaders({
      'Referer': referer,
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    });

    const res = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: this.timeoutMs
    });

    const status = res ? res.status() : 0;
    const title = await page.title();
    const html = await page.content();

    const isChallenge = isChallengePage(html, title) || status === 403;

    if (isChallenge) {
      if (!this.interactive) {
        const error = new Error(
          `[Cloudflare / Anti-Bot Gate Detectado] La URL ${url} está protegida por un desafío Cloudflare (Status: ${status}, Título: "${title}"). ` +
          `Para resolverlo legítimamente y guardar la sesión persistente, ejecuta el scraper con --interactive (modo con ventana visible).`
        );
        error.isChallenge = true;
        error.status = status;
        error.url = url;
        throw error;
      }

      console.log(`\n======================================================`);
      console.log(`[ATENCIÓN] Desafío anti-bot detectado en: ${url}`);
      console.log(`Por favor, completa la verificación humana en la ventana abierta de Edge/Chromium.`);
      console.log(`Esperando a que la página cargue el contenido real de JkAnime...`);
      console.log(`======================================================\n`);

      // Esperar hasta que el título cambie y ya no sea la página de verificación
      await page.waitForFunction(
        () => !document.title.toLowerCase().includes('just a moment') &&
              !document.title.toLowerCase().includes('un momento') &&
              !document.body.innerText.toLowerCase().includes('checking your browser'),
        { timeout: 120000 }
      );

      // Esperar brevemente para asentar cookies
      await page.waitForTimeout(2000);
      return await page.content();
    }

    return html;
  }

  // ---------- 1. Catálogo ----------

  async scrapeCatalogPage(page = 1, { estado = null } = {}) {
    const query = estado != null ? `estado=${estado}&p=${page}` : `p=${page}`;
    const url = `${BASE_URL}/directorio?${query}`;
    const html = await this.navigateWithAntiBotCheck(url, { referer: `${BASE_URL}/directorio` });
    return parseCatalogHtml(html);
  }

  // ---------- 2. Búsqueda ----------

  async search(query) {
    const clean = String(query || '').trim();
    if (!clean) return [];
    const url = `${BASE_URL}/buscar/${encodeURIComponent(clean)}/1/`;
    const html = await this.navigateWithAntiBotCheck(url, { referer: BASE_URL });
    const parsed = parseCatalogHtml(html);
    return parsed.data;
  }

  // ---------- 3. Detalle de Anime ----------

  async scrapeDetail(slug) {
    const cleanSlug = String(slug || '').trim();
    if (!cleanSlug) throw new Error('Se requiere un slug válido.');
    const url = `${BASE_URL}/${cleanSlug}/`;
    const html = await this.navigateWithAntiBotCheck(url, { referer: `${BASE_URL}/directorio` });
    const meta = parseDetailHtml(html);
    return {
      slug: cleanSlug,
      ...meta,
      title: meta.title || cleanSlug,
      scraped_at: new Date().toISOString()
    };
  }

  // ---------- 4. Episodios ----------

  async scrapeEpisodes(animeOrSlug) {
    let anime = typeof animeOrSlug === 'string' ? { slug: animeOrSlug } : { ...animeOrSlug };
    if (!anime.id || !anime.csrf_token) {
      const detail = await this.scrapeDetail(anime.slug);
      anime = { ...anime, ...detail };
    }

    if (!anime.id) return [];

    await this.init();
    const page = this.page;

    // Ejecutar llamada AJAX dentro del contexto de navegación de la página (reutiliza cookies, CSRF y sesión)
    const episodes = [];
    let curPage = 1;
    let lastPage = 1;

    while (curPage <= lastPage) {
      await this._delay();
      const ajaxResult = await page.evaluate(async ({ animeId, pageNum, csrf }) => {
        try {
          const res = await fetch(`/ajax/episodes/${animeId}/${pageNum}`, {
            method: 'POST',
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-CSRF-TOKEN': csrf || ''
            },
            body: csrf ? `_token=${encodeURIComponent(csrf)}` : undefined
          });
          if (!res.ok) return null;
          return await res.json();
        } catch {
          return null;
        }
      }, { animeId: anime.id, pageNum: curPage, csrf: anime.csrf_token });

      if (!ajaxResult || !Array.isArray(ajaxResult.data)) {
        throw new Error(`La respuesta AJAX de episodios no es válida para ${anime.slug} (página ${curPage}).`);
      }
      lastPage = Number(ajaxResult.last_page) || 1;

      for (const ep of ajaxResult.data) {
        const num = parseFloat(ep.number);
        if (Number.isFinite(num)) {
          episodes.push({
            anime_id: anime.id,
            number: num,
            jk_ep_id: ep.id ? Number(ep.id) : null,
            title: ep.title || `Capítulo ${num}`,
            image: normalizeUrl(ep.image) || null,
            timestamp: ep.created_at || null
          });
        }
      }
      curPage++;
    }

    episodes.sort((a, b) => a.number - b.number);
    return episodes;
  }

  // ---------- 5. Enlaces de Episodio (Players & Downloads) ----------

  async scrapeEpisodeLinks(slug, number) {
    const url = `${BASE_URL}/${slug}/${number}/`;
    const html = await this.navigateWithAntiBotCheck(url, { referer: `${BASE_URL}/${slug}/` });
    const { players, downloads } = parseEpisodeHtml(html);
    return {
      slug,
      number: parseFloat(String(number)),
      players,
      downloads
    };
  }

  // ---------- 6. Sincronización SQLite (1UP-ANIME Parity) ----------

  async syncAnimeToDb(db, slug) {
    if (!db) throw new Error('Se requiere una instancia válida de node:sqlite DatabaseSync.');
    const detail = await this.scrapeDetail(slug);
    if (!detail.id) throw new Error(`No se pudo obtener el ID del anime para "${slug}".`);
    const episodes = await this.scrapeEpisodes(detail);
    if (episodes.length === 0) {
      throw new Error(`La fuente no devolvió episodios para "${slug}"; no se guardaron cambios.`);
    }

    // Save metadata and chapters together so an AJAX failure cannot leave a false-success sync.
    db.exec('BEGIN IMMEDIATE');
    try {
      const animeStmt = db.prepare(`
        INSERT INTO animes (
          id, slug, title, short_title, synopsis, image, banner, type,
          status, estado, studios, episodes_total, year, season, genres,
          duration, quality, first_aired, scraped_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          slug = excluded.slug,
          title = excluded.title,
          short_title = excluded.short_title,
          synopsis = excluded.synopsis,
          image = excluded.image,
          banner = excluded.banner,
          type = excluded.type,
          status = excluded.status,
          estado = excluded.estado,
          studios = excluded.studios,
          episodes_total = excluded.episodes_total,
          year = excluded.year,
          season = excluded.season,
          genres = excluded.genres,
          duration = excluded.duration,
          quality = excluded.quality,
          first_aired = excluded.first_aired,
          scraped_at = excluded.scraped_at
      `);

      animeStmt.run(
        detail.id,
        detail.slug,
        detail.title,
        detail.short_title,
        detail.synopsis,
        detail.image,
        detail.banner,
        detail.type,
        detail.status,
        detail.estado,
        detail.studios,
        detail.episodes_total,
        detail.year,
        detail.season,
        typeof detail.genres === 'string' ? detail.genres : JSON.stringify(detail.genres || []),
        detail.duration,
        detail.quality,
        detail.first_aired,
        detail.scraped_at
      );

      const epStmt = db.prepare(`
        INSERT INTO episodes (anime_id, number, jk_ep_id, title, image, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(anime_id, number) DO UPDATE SET
          jk_ep_id = excluded.jk_ep_id,
          title = excluded.title,
          image = excluded.image,
          timestamp = excluded.timestamp
      `);

      for (const ep of episodes) {
        epStmt.run(detail.id, ep.number, ep.jk_ep_id, ep.title, ep.image, ep.timestamp);
      }
      db.exec('COMMIT');
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch {}
      throw error;
    }

    return {
      anime: detail,
      episodes_count: episodes.length,
      links_synced: false,
      links_note: 'Este comando sincroniza capítulos.'
    };
  }
}

module.exports = {
  BASE_URL,
  DEFAULT_USER_AGENT,
  IPHONE_USER_AGENT,
  normalizeUrl,
  decodeBase64,
  isChallengePage,
  parseCatalogHtml,
  normalizeCatalogItem,
  parseDetailHtml,
  parseEpisodeHtml,
  resolveBrowserExecutable,
  JkanimePlaywrightScraper
};
