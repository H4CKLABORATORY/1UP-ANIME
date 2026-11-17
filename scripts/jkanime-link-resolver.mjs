#!/usr/bin/env node
/**
 * 1UP Anime — CLI del resolvedor eficiente de enlaces de JkAnime.
 *
 *   node scripts/jkanime-link-resolver.mjs stream <playerUrl> [--browser] [--refresh]
 *   node scripts/jkanime-link-resolver.mjs links <slug> <numero>
 *   node scripts/jkanime-link-resolver.mjs probe <streamUrl>
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const resolver = require('../server/src/jkanime-link-resolver.js');
const argv = process.argv.slice(2);
const command = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'help';
const flag = name => argv.includes(name);
const argAfter = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const http = resolver.createHttpClient({ delayMs: Number(process.env.JKANIME_HTTP_DELAY_MS) || 600 });
const cache = resolver.createStreamCache();

function help() {
  console.log(`
1UP Anime — Resolvedor de enlaces JkAnime (HTTP primero, navegador como respaldo)

Comandos:
  stream <playerUrl>        Resuelve el HLS/MP4 real de un reproductor interno
    --browser               Si falla HTTP, usa Playwright (más lento)
    --refresh               Ignora la caché de 30 min
    --referer <url>         Referer a usar en la petición
  links <slug> <numero>     Lista reproductores y descargas de un capítulo
  probe <streamUrl>         Comprueba si un flujo responde (Range bytes=0-1)

Variables: JKANIME_HTTP_DELAY_MS, JKANIME_HTTP_TIMEOUT_MS, JKANIME_HTTP_RETRIES,
JKANIME_USER_AGENT, JKANIME_DEBUG=1
`);
}

async function browserResolver(playerUrl, ctx) {
  const { JkanimePlaywrightScraper } = require('../server/src/jkanime-playwright-scraper.js');
  const scraper = new JkanimePlaywrightScraper({ headless: true });
  try {
    await scraper.navigateWithAntiBotCheck(playerUrl);
    const url = await scraper.page.evaluate(() => {
      const video = document.querySelector('video:not([data-jkanime-probe])');
      return video?.currentSrc || video?.src ||
        document.querySelector('source')?.src || null;
    });
    if (!url) throw new Error('El navegador no expuso un flujo multimedia.');
    const type = url.includes('.m3u8') ? 'hls' : 'file';
    return { url, type };
  } finally {
    await scraper.close();
  }
}

async function main() {
  if (command === 'help') return help();

  if (command === 'probe') {
    const url = argv[1];
    if (!url) throw new Error('Indica la URL del flujo.');
    const alive = await resolver.probePlayerStream(url);
    console.log(alive ? `OK: ${url}` : `SIN RESPUESTA: ${url}`);
    process.exitCode = alive ? 0 : 2;
    return;
  }

  if (command === 'links') {
    const slug = argv[1];
    const num = argv[2];
    if (!slug || !num) throw new Error('Indica slug y número: links <slug> <numero>');
    const url = `${resolver.getBase()}/${slug}/${num}/`;
    const html = await resolver.getTextWithMirror((u, o) => http.getText(u, o), url, { referer: resolver.getBase() });
    const { players, downloads } = resolver.parseEpisodeLinks(html);
    console.log(JSON.stringify({ source: url, players, downloads }, null, 2));
    console.error(`Reproductores: ${players.length} · Descargas: ${downloads.length}`);
    return;
  }

  if (command === 'stream') {
    const playerUrl = argv[1];
    if (!playerUrl) throw new Error('Indica la URL del reproductor interno.');
    const stream = await resolver.resolveJkAnimePlayerStream(playerUrl, {
      referer: argAfter('--referer'),
      forceRefresh: flag('--refresh'),
      http,
      cache,
      browserResolver: flag('--browser') ? browserResolver : null
    });
    console.log(JSON.stringify(stream, null, 2));
    return;
  }

  throw new Error(`Comando desconocido: ${command}. Usa 'help'.`);
}

main().catch(error => {
  console.error(`[resolver] ${error.message}`);
  process.exitCode = 1;
});
