// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  parseCatalogHtml,
  normalizeCatalogItem,
  parseDetailHtml,
  parseEpisodeHtml,
  isChallengePage,
  normalizeUrl,
  decodeBase64,
  resolveBrowserExecutable,
  JkanimePlaywrightScraper
} = require('../../server/src/jkanime-playwright-scraper.js');

test('Playwright Scraper: isChallengePage detection', () => {
  assert.equal(isChallengePage('<html><head><title>Just a moment...</title></head><body>Checking your browser</body></html>'), true);
  assert.equal(isChallengePage('<html><head><title>Un momento…</title></head><body>Verificar que eres humano</body></html>'), true);
  assert.equal(isChallengePage('<html><head><title>Atención requerida | Cloudflare</title></head></html>'), true);
  assert.equal(isChallengePage('<html><body><div id="cf-turnstile"></div></body></html>'), true);
  assert.equal(isChallengePage('<html><head><title>Karin 1 - JkAnime</title></head><body>Contenido normal</body></html>'), false);
});

test('Playwright Scraper: normalizeUrl and decodeBase64', () => {
  assert.equal(normalizeUrl('//cdn.jkdesa.com/image.jpg'), 'https://cdn.jkdesa.com/image.jpg');
  assert.equal(normalizeUrl('/directorio/1'), 'https://jkanime.net/directorio/1');
  assert.equal(normalizeUrl('https://jkanime.net/slug/'), 'https://jkanime.net/slug/');
  assert.equal(normalizeUrl(null), null);

  const testStr = 'https://streamwish.to/e/test_123';
  const b64 = Buffer.from(testStr).toString('base64');
  assert.equal(decodeBase64(b64), testStr);
  assert.equal(decodeBase64('invalid!@@#'), null);
});

test('Playwright Scraper: parseCatalogHtml extracts embedded JSON and fallback cards', () => {
  const mockJsonCatalogHtml = `
    <html>
      <head><title>Directorio - JkAnime</title></head>
      <body>
        <script>
          var animes = {
            "current_page": 1,
            "last_page": 10,
            "total": 240,
            "data": [
              {
                "id": 101,
                "slug": "solo-leveling-2",
                "title": "Solo Leveling Season 2",
                "synopsis": "Arise sung jinwoo",
                "image": "https://cdn.jkdesu.com/assets/images/animes/video/image/solo-leveling-2.jpg",
                "type": "Serie",
                "status": "currently",
                "year": 2025
              }
            ]
          };
          var mode = "list";
        </script>
      </body>
    </html>
  `;

  const parsed = parseCatalogHtml(mockJsonCatalogHtml);
  assert.equal(parsed.current_page, 1);
  assert.equal(parsed.last_page, 10);
  assert.equal(parsed.data.length, 1);
  assert.equal(parsed.data[0].id, 101);
  assert.equal(parsed.data[0].slug, 'solo-leveling-2');
  assert.equal(parsed.data[0].title, 'Solo Leveling Season 2');
  assert.equal(parsed.data[0].year, 2025);

  // Fallback cards parsing
  const mockCardsHtml = `
    <html>
      <body>
        <div class="anime__item">
          <div class="anime__item__pic" data-setbg="https://cdn.jkdesu.com/img/item1.jpg"></div>
          <div class="anime__item__text">
            <h5><a href="https://jkanime.net/bleach-tybw/">Bleach TYBW</a></h5>
          </div>
        </div>
      </body>
    </html>
  `;
  const parsedCards = parseCatalogHtml(mockCardsHtml);
  assert.equal(parsedCards.data.length, 1);
  assert.equal(parsedCards.data[0].slug, 'bleach-tybw');
  assert.equal(parsedCards.data[0].title, 'Bleach TYBW');
  assert.equal(parsedCards.data[0].image, 'https://cdn.jkdesu.com/img/item1.jpg');
});

test('Playwright Scraper: parseDetailHtml extracts full metadata and CSRF token', () => {
  const mockDetailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="csrf-token" content="mock_csrf_token_98765">
        <title>Frieren - JkAnime</title>
      </head>
      <body>
        <div class="anime__details__title">
          <h3>Sousou no Frieren</h3>
        </div>
        <p class="anime__details__text">La maga elfa emprende un viaje para comprender a los humanos.</p>
        <div class="anime__details__pic" data-setbg="https://cdn.jkdesu.com/frieren.jpg"></div>
        <ul>
          <li><span>Tipo:</span> Serie</li>
          <li><span>Estudio:</span> Madhouse</li>
          <li><span>Episodios:</span> 28</li>
          <li><span>Estado:</span> Finalizado</li>
          <li><span>Duración:</span> 24 min por episodio</li>
          <li><span>Emitido:</span> 29 de Sep de 2023</li>
        </ul>
        <div class="genres">
          <a href="https://jkanime.net/genero/aventura/">Aventura</a>
          <a href="https://jkanime.net/genero/fantasia/">Fantasía</a>
        </div>
        <div data-anime-id="4521"></div>
      </body>
    </html>
  `;

  const meta = parseDetailHtml(mockDetailHtml);
  assert.equal(meta.id, 4521);
  assert.equal(meta.csrf_token, 'mock_csrf_token_98765');
  assert.equal(meta.title, 'Sousou no Frieren');
  assert.equal(meta.synopsis, 'La maga elfa emprende un viaje para comprender a los humanos.');
  assert.equal(meta.image, 'https://cdn.jkdesu.com/frieren.jpg');
  assert.equal(meta.type, 'Serie');
  assert.equal(meta.studios, 'Madhouse');
  assert.equal(meta.episodes_total, 28);
  assert.equal(meta.status, 'finished');
  assert.equal(meta.year, 2023);
  assert.deepEqual(meta.genres, ['Aventura', 'Fantasía']);
});

test('Playwright Scraper: parseEpisodeHtml multi-pattern parity', () => {
  const b64Streamwish = Buffer.from('https://streamwish.to/e/pw_sw_token').toString('base64');
  const b64Mega = Buffer.from('https://mega.nz/file/pw_mega_token').toString('base64');

  const mockEpisodeHtml = `
    <!DOCTYPE html>
    <html>
      <body>
        <!-- Pattern 1: Legacy var video -->
        <script>
          var video = [
            {"server":"Desu","code":"legacy_desu_code"},
            {"server":"Magi","code":"legacy_magi_code"}
          ];
        </script>

        <!-- Pattern 2: Modern iframe with button mapping -->
        <div class="bg-servers">
          <a data-id="0" class="servers">Principal HD</a>
        </div>
        <script>
          video[0] = '<iframe src="https://jkanime.net/jkplayer/um?e=modern_code_1">';
        </script>

        <!-- Pattern 3: Base64 servers -->
        <script>
          var servers = [
            {"remote":"${b64Streamwish}","server":"Streamwish","size":"700 MB"},
            {"remote":"${b64Mega}","server":"Mega","size":"750 MB"}
          ];
        </script>

        <!-- Pattern 4: Direct c1.jkplayers.com download -->
        <a href="https://c1.jkplayers.com/d/direct_jk_pw.mp4">Descarga Directa</a>

        <!-- Pattern 5: External anchors -->
        <a href="https://vidhide.com/v/pw_vidhide_1">Vidhide Player</a>
        <a href="https://mediafire.com/file/pw_mediafire_1.rar">Mediafire Descarga</a>
      </body>
    </html>
  `;

  const { players, downloads } = parseEpisodeHtml(mockEpisodeHtml);

  // Assertions for players
  assert.ok(players.length >= 4, `Expected at least 4 players, got ${players.length}`);
  const desu = players.find(p => p.server === 'Desu');
  assert.ok(desu, 'Must find legacy Desu player');
  assert.equal(desu.player_url, 'https://jkanime.net/jkplayer/um?e=legacy_desu_code');
  assert.equal(desu.is_protected, true);

  const principal = players.find(p => p.server === 'Principal HD');
  assert.ok(principal, 'Must find modern button-mapped player');
  assert.equal(principal.player_url, 'https://jkanime.net/jkplayer/um?e=modern_code_1');

  const sw = players.find(p => p.server === 'Streamwish');
  assert.ok(sw, 'Must find Base64 decoded Streamwish player');
  assert.equal(sw.player_url, 'https://streamwish.to/e/pw_sw_token');
  assert.equal(sw.embeddable, true);

  const vidhide = players.find(p => p.server === 'Vidhide');
  assert.ok(vidhide, 'Must find external Vidhide player');
  assert.equal(vidhide.player_url, 'https://vidhide.com/v/pw_vidhide_1');

  // Assertions for downloads
  assert.ok(downloads.length >= 3, `Expected at least 3 downloads, got ${downloads.length}`);
  const megaDl = downloads.find(d => d.server === 'Mega');
  assert.ok(megaDl, 'Must find Base64 Mega download');
  assert.equal(megaDl.download_url, 'https://mega.nz/file/pw_mega_token');

  const directDl = downloads.find(d => d.server === 'Directo');
  assert.ok(directDl, 'Must find c1.jkplayers.com direct download');
  assert.equal(directDl.download_url, 'https://c1.jkplayers.com/d/direct_jk_pw.mp4');

  const mf = downloads.find(d => d.server === 'Mediafire');
  assert.ok(mf, 'Must find Mediafire download link');
  assert.equal(mf.download_url, 'https://mediafire.com/file/pw_mediafire_1.rar');
});

test('Playwright Scraper: resolveBrowserExecutable and engine configuration', () => {
  const browserConfig = resolveBrowserExecutable();
  assert.ok(browserConfig, 'Must return browser configuration');
  assert.ok(browserConfig.executablePath || browserConfig.channel, 'Must specify executablePath or channel');

  const scraper = new JkanimePlaywrightScraper({
    userAgent: 'Custom-Test-UA',
    interactive: false,
    headless: true
  });

  assert.equal(scraper.userAgent, 'Custom-Test-UA');
  assert.equal(scraper.headless, true);
  assert.equal(scraper.interactive, false);
});
