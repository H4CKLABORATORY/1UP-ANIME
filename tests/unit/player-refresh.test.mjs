// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const catalogService = require('../../server/src/catalog-service.js');

test('R3 Automated Verification: Reproduce stale stream, verify refresh purge, re-scraping and cache update', async (t) => {
  const db = catalogService.getDb();
  assert.ok(db, 'SQLite Database must be accessible');

  const TEST_ANIME_ID = 999998;
  const TEST_SLUG = 'test-refresh-anime-r3';
  const TEST_EP = 1;

  // Clean previous test artifacts
  db.prepare('DELETE FROM episode_links WHERE anime_id = ?').run(TEST_ANIME_ID);
  db.prepare('DELETE FROM animes WHERE id = ?').run(TEST_ANIME_ID);

  // Setup test anime
  db.prepare(`
    INSERT INTO animes (id, slug, title, status, type, episodes_total)
    VALUES (?, ?, 'Test Refresh Anime R3', 'currently', 'TV', 12)
  `).run(TEST_ANIME_ID, TEST_SLUG);

  // 1. Reproduce failure condition: Seed SQLite with an expired/stale IP-bound stream token
  const STALE_TOKEN_URL = 'https://streamwish.to/e/stale_token_ip_1';
  db.prepare(`
    INSERT INTO episode_links (anime_id, number, kind, server, player_url, embed_url, quality)
    VALUES (?, ?, 'player', 'Streamwish', ?, ?, 'HD')
  `).run(TEST_ANIME_ID, TEST_EP, STALE_TOKEN_URL, STALE_TOKEN_URL);

  // Mock upstream fetch for JkAnime
  const FRESH_TOKEN_URL = 'https://streamwish.to/e/fresh_token_ip_2';
  const b64FreshStreamwish = Buffer.from(FRESH_TOKEN_URL).toString('base64');
  const mockJkAnimeHtml = `
    <!DOCTYPE html>
    <html>
      <head><title>Test Anime 1 - JkAnime</title></head>
      <body>
        <div class="bg-servers">
          <a data-id="0" class="servers">Streamwish</a>
        </div>
        <script>
          var servers = [
            {"remote":"${b64FreshStreamwish}","server":"Streamwish","size":"700 MB"}
          ];
        </script>
      </body>
    </html>
  `;

  let upstreamScrapeCalls = 0;
  let lastCapturedHeaders = null;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, opts = {}) => {
    const urlStr = String(url);
    if (urlStr.includes('jkanime.net')) {
      upstreamScrapeCalls++;
      lastCapturedHeaders = opts.headers || {};
      return new Response(mockJkAnimeHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }
    return originalFetch(url, opts);
  };

  try {
    // A) Standard read (refresh: false) must serve cached stale stream without scraping
    const initialLinks = await catalogService.getEpisodeLinks(TEST_SLUG, TEST_EP, { refresh: false });
    assert.equal(upstreamScrapeCalls, 0, 'Standard read must NOT trigger live scrape');
    assert.ok(initialLinks.players.length > 0, 'Must return cached players');
    assert.equal(initialLinks.players[0].embed_url, STALE_TOKEN_URL, 'Must return stale cached stream');

    // B) Trigger refresh=1 action with client IP forwarding
    const TEST_CLIENT_IP = '198.51.100.42';
    const refreshedLinks = await catalogService.getEpisodeLinks(TEST_SLUG, TEST_EP, {
      refresh: true,
      clientIp: TEST_CLIENT_IP
    });

    // Verify re-scraping was actively initiated
    assert.equal(upstreamScrapeCalls, 1, 'Refresh action must actively trigger live scrape');
    assert.ok(lastCapturedHeaders, 'Must have passed headers to live scraper');
    assert.equal(lastCapturedHeaders['X-Forwarded-For'], TEST_CLIENT_IP, 'Client IP must be forwarded in X-Forwarded-For');
    assert.equal(lastCapturedHeaders['X-Real-IP'], TEST_CLIENT_IP, 'Client IP must be forwarded in X-Real-IP');

    // Verify response contains fresh stream and eviction of stale stream
    assert.equal(refreshedLinks.refreshed, true, 'Response must indicate refreshed: true');
    assert.equal(refreshedLinks.players[0].embed_url, FRESH_TOKEN_URL, 'Refreshed links must contain fresh stream URL');
    assert.ok(!refreshedLinks.players.some(p => p.embed_url === STALE_TOKEN_URL), 'Stale stream must be evicted from response');

    // C) Verify database state: stale row was purged and only fresh row exists
    const dbRows = db.prepare('SELECT embed_url FROM episode_links WHERE anime_id = ? AND number = ?').all(TEST_ANIME_ID, TEST_EP);
    assert.equal(dbRows.length, 1, 'Database must contain exactly 1 row (stale row deleted)');
    assert.equal(dbRows[0].embed_url, FRESH_TOKEN_URL, 'Database must store the fresh token URL');

    // D) Verify subsequent standard request serves fresh token from cache
    const cachedFresh = await catalogService.getEpisodeLinks(TEST_SLUG, TEST_EP, { refresh: false });
    assert.equal(upstreamScrapeCalls, 1, 'No new scrape should occur on subsequent reads');
    assert.equal(cachedFresh.players[0].embed_url, FRESH_TOKEN_URL, 'Subsequent read must serve fresh token from cache');
  } finally {
    globalThis.fetch = originalFetch;
    db.prepare('DELETE FROM episode_links WHERE anime_id = ?').run(TEST_ANIME_ID);
    db.prepare('DELETE FROM animes WHERE id = ?').run(TEST_ANIME_ID);
  }
});

test('R3 Automated Verification: Multi-pattern extraction parity with jkanime_app', async () => {
  const originalFetch = globalThis.fetch;

  const mockMultiPatternHtml = `
    <!DOCTYPE html>
    <html>
      <body>
        <!-- Pattern 1: Legacy var video -->
        <script>
          var video = [
            {"server":"Desu","code":"desu_token_123"},
            {"server":"Magi","code":"magi_token_456"}
          ];
        </script>

        <!-- Pattern 2: Modern iframe with button mapping -->
        <div class="bg-servers">
          <a data-id="0" class="servers">Reproductor Principal</a>
        </div>
        <script>
          video[0] = '<iframe src="/jkplayer/um?e=modern_token_789">';
        </script>

        <!-- Pattern 3: Base64 servers (Streamwish player + Mega download) -->
        <script>
          var servers = [
            {"remote":"${Buffer.from('https://streamwish.to/e/streamwish_sw1').toString('base64')}","server":"Streamwish","size":"650 MB"},
            {"remote":"${Buffer.from('https://mega.nz/file/mega_dl1').toString('base64')}","server":"Mega","size":"720 MB"}
          ];
        </script>

        <!-- Pattern 4: Direct download anchor -->
        <a href="https://c1.jkplayers.com/d/direct_dl_file.mp4">Descargar Directo</a>

        <!-- Pattern 5: External anchors -->
        <a href="https://vidhide.com/v/vidhide_stream1">Vidhide</a>
        <a href="https://mediafire.com/file/mf_download.rar">Mediafire</a>
      </body>
    </html>
  `;

  globalThis.fetch = async (url) => {
    return new Response(mockMultiPatternHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  };

  try {
    const scraped = await catalogService.liveScrapeEpisode('multi-pattern-test', 1);

    // Verify Pattern 1 (Legacy Desu/Magi)
    const desu = scraped.players.find(p => p.server === 'Desu');
    assert.ok(desu, 'Must extract legacy Desu player');
    assert.equal(desu.player_url, 'https://jkanime.net/jkplayer/um?e=desu_token_123');

    // Verify Pattern 2 (Modern iframe with relative URL normalized)
    const modern = scraped.players.find(p => p.server === 'Reproductor Principal');
    assert.ok(modern, 'Must extract modern iframe player');
    assert.equal(modern.player_url, 'https://jkanime.net/jkplayer/um?e=modern_token_789');

    // Verify Pattern 3 (Base64 Streamwish player and Mega download)
    const streamwish = scraped.players.find(p => p.server === 'Streamwish');
    assert.ok(streamwish, 'Must decode Base64 Streamwish player');
    assert.equal(streamwish.player_url, 'https://streamwish.to/e/streamwish_sw1');

    const megaDl = scraped.downloads.find(d => d.server === 'Mega');
    assert.ok(megaDl, 'Must decode Base64 Mega download');
    assert.equal(megaDl.download_url, 'https://mega.nz/file/mega_dl1');

    // Verify Pattern 4 (Direct c1.jkplayers.com download)
    const directDl = scraped.downloads.find(d => d.server === 'Directo');
    assert.ok(directDl, 'Must extract direct download');
    assert.equal(directDl.download_url, 'https://c1.jkplayers.com/d/direct_dl_file.mp4');

    // Verify Pattern 5 (External Vidhide player and Mediafire download)
    const vidhide = scraped.players.find(p => p.server === 'Vidhide');
    assert.ok(vidhide, 'Must extract external Vidhide player');
    assert.equal(vidhide.player_url, 'https://vidhide.com/v/vidhide_stream1');

    const mf = scraped.downloads.find(d => d.server === 'Mediafire');
    assert.ok(mf, 'Must extract external Mediafire download');
    assert.equal(mf.download_url, 'https://mediafire.com/file/mf_download.rar');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('R3 Automated Verification: HTTP API refresh=1 and non-destructive warning on failed live scrape', async () => {
  const db = catalogService.getDb();
  const TEST_ANIME_ID = 999997;
  const TEST_SLUG = 'test-refresh-api-r3';
  const TEST_EP = 1;

  db.prepare('DELETE FROM episode_links WHERE anime_id = ?').run(TEST_ANIME_ID);
  db.prepare('DELETE FROM animes WHERE id = ?').run(TEST_ANIME_ID);

  db.prepare(`
    INSERT INTO animes (id, slug, title, status, type, episodes_total)
    VALUES (?, ?, 'Test Refresh API R3', 'currently', 'TV', 12)
  `).run(TEST_ANIME_ID, TEST_SLUG);

  const CACHED_STREAM = 'https://streamwish.to/e/cached_stream_1';
  db.prepare(`
    INSERT INTO episode_links (anime_id, number, kind, server, player_url, embed_url, quality)
    VALUES (?, ?, 'player', 'Streamwish', ?, ?, 'HD')
  `).run(TEST_ANIME_ID, TEST_EP, CACHED_STREAM, CACHED_STREAM);

  const originalFetch = globalThis.fetch;
  // Simulate live scrape failure (e.g. HTTP 503 or Turnstile challenge)
  globalThis.fetch = async () => {
    return new Response('Cloudflare Turnstile challenge', { status: 403 });
  };

  try {
    // When explicit refresh=true is requested but live scrape fails:
    // It must NOT silently pretend all is well; it should indicate refreshed: false with warning
    const result = await catalogService.getEpisodeLinks(TEST_SLUG, TEST_EP, { refresh: true });
    assert.equal(result.refreshed, false, 'Must indicate refreshed: false when scrape fails');
    assert.equal(result.stale, true, 'Must indicate stale: true');
    assert.ok(result.warning, 'Must provide warning explaining cached links are served');
    assert.equal(result.players[0].embed_url, CACHED_STREAM, 'Must preserve cached links non-destructively');
  } finally {
    globalThis.fetch = originalFetch;
    db.prepare('DELETE FROM episode_links WHERE anime_id = ?').run(TEST_ANIME_ID);
    db.prepare('DELETE FROM animes WHERE id = ?').run(TEST_ANIME_ID);
  }
});

test('R3 Automated Verification: Client episode-player DOM double refresh lifecycle and iframe update', async () => {
  class MockElement {
   constructor(tag='div') {
     this.tag = tag;
     this.children = [];
     this.dataset = {};
     this.style = {};
     this.isConnected = true;
     this.classList = {
       classes: new Set(),
       toggle(c, val) {
         if (val === undefined) {
           if (this.classes.has(c)) this.classes.delete(c);
           else this.classes.add(c);
         } else if (val) {
           this.classes.add(c);
         } else {
           this.classes.delete(c);
         }
       },
       add(c) { this.classes.add(c); },
       remove(c) { this.classes.delete(c); },
       contains(c) { return this.classes.has(c); }
     };
     this.attributes = {};
     this.listeners = {};
   }
   appendChild(node) { this.children.push(node); return node; }
   append(...nodes) { this.children.push(...nodes); }
   after(node) { (this.afterChildren ??= []).push(node); }
   replaceChildren() { this.children = []; }
   setAttribute(k, v) { this.attributes[k] = v; }
   removeAttribute(k) { delete this.attributes[k]; if (k === 'src') this.src = ''; }
   addEventListener(event, fn) { this.listeners[event] = fn; }
   querySelector(selector) {
     if (selector === '#oneup-sync-links') {
       return this.children.find(c => c.id === 'oneup-sync-links') || null;
     }
     return null;
   }
   querySelectorAll(selector) {
     if (selector === 'button[data-server-slot]') {
       return this.children.filter(c => c.dataset && c.dataset.serverSlot !== undefined);
     }
     return [];
   }
  }

  const nodes = new Map();
  const root = new MockElement();
  root.querySelector = (selector) => {
    if (selector === '#oneup-sync-links') {
      const group = nodes.get('.oneup-server-selector:not(.oneup-download-group)');
      return group?.children?.find(c => c.id === 'oneup-sync-links') || null;
    }
    return nodes.get(selector) || null;
  };
  root.querySelectorAll = (selector) => {
    if (selector === '[data-server-slot]') {
      const group = nodes.get('.oneup-server-selector:not(.oneup-download-group)');
      return group ? group.querySelectorAll('button[data-server-slot]') : [];
    }
    return [];
  };

  Object.defineProperty(root, 'innerHTML', {
    set() {
      nodes.clear();
      for (const id of ['oneup-watch-episode', 'oneup-watch-language', 'oneup-playback-display', 'oneup-player-message', 'oneup-now-watching']) {
        nodes.set('#' + id, new MockElement());
      }
      const selectorGroup = new MockElement();
      selectorGroup.className = 'oneup-server-selector';
      nodes.set('.oneup-server-selector:not(.oneup-download-group)', selectorGroup);
    }
  });

  const document = {
    querySelector: () => root,
    createElement: (tag) => new MockElement(tag),
    addEventListener: () => {},
    dispatchEvent: () => {}
  };

  const STALE_STREAM = 'https://streamwish.to/e/stale_token_ip1';
  const FRESH_STREAM = 'https://streamwish.to/e/fresh_token_ip2';

  let fetchCallCount = 0;
  let lastFetchUrl = '';

  const mockFetch = async (url) => {
    fetchCallCount++;
    lastFetchUrl = String(url);
    if (lastFetchUrl.includes('refresh=1')) {
      return {
        ok: true,
        json: async () => ({
          anime_id: 101,
          episode: 1,
          refreshed: true,
          players: [
            { server: 'Streamwish', player_url: FRESH_STREAM, embed_url: FRESH_STREAM, quality: 'HD' }
          ],
          downloads: []
        })
      };
    }
    return {
      ok: true,
      json: async () => ({
        anime_id: 101,
        episode: 1,
        refreshed: false,
        players: [
          { server: 'Streamwish', player_url: STALE_STREAM, embed_url: STALE_STREAM, quality: 'HD' }
        ],
        downloads: []
      })
    };
  };

  const window = {
    ONEUP_API_BASE: 'https://1up-anime.test/api',
    OneUpHLS: { attach: () => () => {} }
  };

  vm.runInNewContext(
    fs.readFileSync('client/src/js/episode-player.js', 'utf8'),
    {
      window,
      document,
      fetch: mockFetch,
      URL,
      location: { href: 'https://anime.example.com/' },
      AbortController,
      setTimeout,
      clearTimeout,
      CustomEvent: class {}
    }
  );

  // 1. Initial player mount
  await window.OneUpEpisodePlayer.show({ id: '101', slug: 'test-show', episodes: 1 });
  await new Promise(r => setTimeout(r, 60));

  const stage = nodes.get('#oneup-playback-display');
  const initialIframe = stage.children.find(n => n.tag === 'iframe');
  assert.ok(initialIframe, 'Iframe should be mounted initially');
  assert.equal(initialIframe.src, STALE_STREAM, 'Initial iframe must point to stale/cached stream');

  // 2. Click "#oneup-sync-links" ("⚡ Actualizar")
  const selectorGroup = nodes.get('.oneup-server-selector:not(.oneup-download-group)');
  const syncBtn = selectorGroup.children.find(c => c.id === 'oneup-sync-links');
  assert.ok(syncBtn, 'Sync button #oneup-sync-links must exist');

  // Trigger click
  const clickPromise = syncBtn.listeners['click']();
  // While in flight, button state must indicate loading
  assert.equal(syncBtn.textContent, '⏳ Actualizando…', 'Button must transition to loading state');
  assert.equal(syncBtn.disabled, true, 'Button must be disabled during refresh');

  await clickPromise;
  await new Promise(r => setTimeout(r, 60));

  // 3. Verify refresh lifecycle completion
  assert.ok(lastFetchUrl.includes('refresh=1'), 'Request must include refresh=1 query parameter');
  assert.equal(syncBtn.disabled, false, 'Button must be re-enabled after refresh');
  assert.equal(syncBtn.textContent, '⚡ Actualizar', 'Button text must reset to ⚡ Actualizar');

  const refreshedIframe = stage.children.find(n => n.tag === 'iframe');
  assert.ok(refreshedIframe, 'Refreshed iframe must be present');
  assert.equal(refreshedIframe.src, FRESH_STREAM, 'Iframe src must be updated to fresh stream');

  const statusEl = nodes.get('#oneup-player-message');
  assert.equal(statusEl.textContent, 'Servidores actualizados para episodio 1', 'Status message must confirm refresh');
});

test('R4 Verification: Desu protected player card rendering and fallback to direct embed on refresh', async () => {
  const db = catalogService.getDb();
  const TEST_ANIME_ID = 999996;
  const TEST_SLUG = 'test-desu-protected-r4';
  const TEST_EP = 1;

  db.prepare('DELETE FROM episode_links WHERE anime_id = ?').run(TEST_ANIME_ID);
  db.prepare('DELETE FROM animes WHERE id = ?').run(TEST_ANIME_ID);

  db.prepare(`
    INSERT INTO animes (id, slug, title, status, type, episodes_total)
    VALUES (?, ?, 'Test Desu Protected Anime R4', 'currently', 'TV', 12)
  `).run(TEST_ANIME_ID, TEST_SLUG);

  const DESU_URL = 'https://jkanime.net/jkplayer/um?e=desu_enc_token_123';
  const STREAMWISH_URL = 'https://streamwish.to/e/sw_direct_stream';

  db.prepare(`
    INSERT INTO episode_links (anime_id, number, kind, server, player_url, embed_url, quality)
    VALUES (?, ?, 'player', 'Desu', ?, NULL, 'HD')
  `).run(TEST_ANIME_ID, TEST_EP, DESU_URL);

  db.prepare(`
    INSERT INTO episode_links (anime_id, number, kind, server, player_url, embed_url, quality)
    VALUES (?, ?, 'player', 'Streamwish', ?, ?, 'HD')
  `).run(TEST_ANIME_ID, TEST_EP, STREAMWISH_URL, STREAMWISH_URL);

  try {
    const data = await catalogService.getEpisodeLinks(TEST_SLUG, TEST_EP);
    assert.ok(data.players.length >= 2, 'Must have at least 2 players');

    // 1. Streamwish must sort before Desu because Desu is protected
    assert.equal(data.players[0].server, 'Streamwish', 'Embeddable server Streamwish must sort first');
    assert.equal(data.players[0].is_protected, false, 'Streamwish must not be protected');
    assert.equal(data.players[0].embeddable, true, 'Streamwish must be embeddable');

    const desuPlayer = data.players.find(p => p.server === 'Desu');
    assert.ok(desuPlayer, 'Desu player must be present');
    assert.equal(desuPlayer.is_protected, true, 'Desu player must be marked is_protected: true');
    assert.equal(desuPlayer.embeddable, false, 'Desu player must be marked embeddable: false');
  } finally {
    db.prepare('DELETE FROM episode_links WHERE anime_id = ?').run(TEST_ANIME_ID);
    db.prepare('DELETE FROM animes WHERE id = ?').run(TEST_ANIME_ID);
  }
});

test('R5 Verification: Clicking on Desu explicitly selects Desu, displays protected card, and provides force embed action', async () => {
  class MockElement {
   constructor(tag='div') {
     this.tag = tag;
     this.children = [];
     this.dataset = {};
     this.style = {};
     this.isConnected = true;
     this.classList = {
       classes: new Set(),
       toggle(c, val) {
         if (val === undefined) {
           if (this.classes.has(c)) this.classes.delete(c);
           else this.classes.add(c);
         } else if (val) {
           this.classes.add(c);
         } else {
           this.classes.delete(c);
         }
       },
       add(c) { this.classes.add(c); },
       remove(c) { this.classes.delete(c); },
       contains(c) { return this.classes.has(c); }
     };
     this.attributes = {};
     this.listeners = {};
   }
   get className() { return Array.from(this.classList.classes).join(' '); }
   set className(val) {
     this.classList.classes.clear();
     String(val || '').split(/\s+/).filter(Boolean).forEach(c => this.classList.classes.add(c));
   }
   appendChild(node) { node.parent = this; this.children.push(node); return node; }
   append(...nodes) { nodes.forEach(n => n.parent = this); this.children.push(...nodes); }
   after(node) { (this.afterChildren ??= []).push(node); }
   replaceChildren() { this.children = []; }
   remove() {
     if (this.parent) {
       this.parent.children = this.parent.children.filter(c => c !== this);
     }
   }
   setAttribute(k, v) { this.attributes[k] = v; }
   removeAttribute(k) { delete this.attributes[k]; if (k === 'src') this.src = ''; }
   addEventListener(event, fn) { this.listeners[event] = fn; }
   querySelector(selector) {
     if (selector === '#oneup-sync-links') {
       return this.children.find(c => c.id === 'oneup-sync-links') || null;
     }
     return null;
   }
   querySelectorAll(selector) {
     if (selector === 'button[data-server-slot]') {
       return this.children.filter(c => c.dataset && c.dataset.serverSlot !== undefined);
     }
     return [];
   }
  }

  const nodes = new Map();
  const root = new MockElement();
  root.querySelector = (selector) => nodes.get(selector) || null;
  root.querySelectorAll = (selector) => {
    if (selector === '[data-server-slot]') {
      const group = nodes.get('.oneup-server-selector:not(.oneup-download-group)');
      return group ? group.querySelectorAll('button[data-server-slot]') : [];
    }
    return [];
  };

  Object.defineProperty(root, 'innerHTML', {
    set() {
      nodes.clear();
      for (const id of ['oneup-watch-episode', 'oneup-watch-language', 'oneup-playback-display', 'oneup-player-message', 'oneup-now-watching']) {
        nodes.set('#' + id, new MockElement());
      }
      const selectorGroup = new MockElement();
      selectorGroup.className = 'oneup-server-selector';
      nodes.set('.oneup-server-selector:not(.oneup-download-group)', selectorGroup);
    }
  });

  const document = {
    querySelector: () => root,
    createElement: (tag) => new MockElement(tag),
    addEventListener: () => {},
    dispatchEvent: () => {}
  };

  const DESU_URL = 'https://jkanime.net/jkplayer/um?e=desu_enc_token_123';
  const STREAMWISH_URL = 'https://streamwish.to/e/sw_direct_stream';

  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      anime_id: 102,
      episode: 1,
      players: [
        { server: 'Streamwish', player_url: STREAMWISH_URL, embed_url: STREAMWISH_URL, quality: 'HD' },
        { server: 'Desu', player_url: DESU_URL, embed_url: null, quality: 'HD' }
      ],
      downloads: []
    })
  });

  const window = {
    ONEUP_API_BASE: 'https://1up-anime.test/api',
    OneUpHLS: { attach: () => () => {} }
  };

  vm.runInNewContext(
    fs.readFileSync('client/src/js/episode-player.js', 'utf8'),
    {
      window,
      document,
      fetch: mockFetch,
      URL,
      location: { href: 'https://anime.example.com/' },
      AbortController,
      setTimeout,
      clearTimeout,
      CustomEvent: class {}
    }
  );

  await window.OneUpEpisodePlayer.show({ id: '102', slug: 'test-desu-select', episodes: 1 });
  await new Promise(r => setTimeout(r, 60));

  const selectorGroup = nodes.get('.oneup-server-selector:not(.oneup-download-group)');
  const buttons = selectorGroup.querySelectorAll('button[data-server-slot]');
  assert.equal(buttons.length >= 2, true, 'Must have at least 2 server buttons');

  // Initial selection: Streamwish (index 0) is active
  assert.equal(buttons[0].classList.contains('active'), true, 'Streamwish button must be active initially');
  assert.equal(buttons[1].classList.contains('active'), false, 'Desu button must not be active initially');

  // Verify Desu button exists and has label with ↗ indicator
  assert.ok(buttons[1].textContent.includes('Desu ↗'), 'Desu button must display Desu ↗ label');

  // User clicks on Desu (index 1)
  buttons[1].listeners['click']();
  await new Promise(r => setTimeout(r, 60));

  // Now Desu must be active!
  assert.equal(buttons[1].classList.contains('active'), true, 'Desu button must be active after clicking');
  assert.equal(buttons[0].classList.contains('active'), false, 'Streamwish must no longer be active');

  // Playback stage must render protected player card for Desu
  const stage = nodes.get('#oneup-playback-display');
  const card = stage.children.find(n => n.classList?.contains('oneup-protected-player-card'));
  assert.ok(card, 'Protected player card must be rendered when Desu is selected');

  const titleNode = card.children.find(n => n.classList?.contains('oneup-protected-title'));
  assert.ok(titleNode.textContent.includes('Desu (Protegido)'), 'Card title must indicate Desu (Protegido)');

  const actions = card.children.find(n => n.classList?.contains('oneup-protected-actions'));
  assert.ok(actions, 'Protected actions must be rendered');

  const openExt = actions.children.find(n => n.classList?.contains('oneup-btn-primary-ext'));
  assert.ok(openExt, 'External link button must exist');
  assert.equal(openExt.href, DESU_URL, 'External link must point to Desu URL');

  const switchBack = actions.children.find(n => n.textContent?.includes('Reproducir aquí con Streamwish'));
  assert.ok(switchBack, 'Switch button to Streamwish must exist');

  const forceBtn = actions.children.find(n => n.textContent?.includes('Forzar carga en marco'));
  assert.ok(forceBtn, 'Force embed button must exist');
});

