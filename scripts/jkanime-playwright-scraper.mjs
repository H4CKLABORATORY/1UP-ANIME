#!/usr/bin/env node
// @ts-check
/**
 * 1UP Anime — CLI JkAnime Playwright Scraper
 * Permite ejecutar extracciones directas usando Playwright con rotación o personalización
 * de User Agent, perfil de navegador persistente y soporte para resolución interactiva
 * de desafíos Cloudflare si fuera requerido.
 *
 * Ejemplos:
 *   node scripts/jkanime-playwright-scraper.mjs verify
 *   node scripts/jkanime-playwright-scraper.mjs verify --interactive
 *   node scripts/jkanime-playwright-scraper.mjs detail solo-leveling
 *   node scripts/jkanime-playwright-scraper.mjs episode solo-leveling 1
 *   node scripts/jkanime-playwright-scraper.mjs episodes solo-leveling
 *   node scripts/jkanime-playwright-scraper.mjs catalog 1
 *   node scripts/jkanime-playwright-scraper.mjs sync solo-leveling
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  JkanimePlaywrightScraper,
  DEFAULT_USER_AGENT,
  IPHONE_USER_AGENT,
  resolveBrowserExecutable
} = require('../server/src/jkanime-playwright-scraper.js');

const catalogService = require('../server/src/catalog-service.js');

const argv = process.argv.slice(2);

function getArg(flag, fallback = null) {
  const idx = argv.indexOf(flag);
  return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : fallback;
}

const hasFlag = flag => argv.includes(flag);

const isInteractive = hasFlag('--interactive') || process.env.HEADLESS === 'false';
const useIphoneUa = hasFlag('--iphone');
const customUa = getArg('--user-agent') || (useIphoneUa ? IPHONE_USER_AGENT : DEFAULT_USER_AGENT);
const command = argv[0] && !argv[0].startsWith('--') ? argv[0] : 'help';

async function main() {
  if (command === 'help') {
    console.log(`
1UP Anime — CLI JkAnime Playwright Scraper
-----------------------------------------------------------
Comandos disponibles:
  verify                   Comprueba conexión a JkAnime e inspecciona protección Cloudflare
  catalog [pagina]         Extrae una página del catálogo (/directorio)
  detail <slug>            Extrae metadatos de ficha (/slug/)
  episodes <slug>          Extrae la lista de episodios mediante AJAX
  episode <slug> <num>     Extrae servidores de reproducción y descarga de un episodio
  sync <slug>              Sincroniza ficha + capítulos en data/jkanime.db

Opciones:
  --interactive            Abre navegador visible (no headless) para resolver desafíos Cloudflare
  --iphone                 Usa User-Agent de iPhone Safari
  --user-agent "<ua>"      Especifica un User-Agent personalizado
`);
    return;
  }

  const scraper = new JkanimePlaywrightScraper({
    userAgent: customUa,
    interactive: isInteractive,
    headless: !isInteractive
  });

  const browserInfo = resolveBrowserExecutable();
  console.log(`[Playwright Scraper] Iniciando motor (${browserInfo.executablePath || browserInfo.channel || 'Chromium'})...`);
  console.log(`[Playwright Scraper] Modo interactivo (UI visible): ${isInteractive ? 'SÍ' : 'NO'}`);
  console.log(`[Playwright Scraper] User Agent: ${customUa ? `${customUa.slice(0, 70)}... (personalizado)` : 'nativo del navegador instalado'}`);

  try {
    if (command === 'verify') {
      console.log('[Playwright Scraper] Navegando a https://jkanime.net/ para verificar estado...');
      const html = await scraper.navigateWithAntiBotCheck('https://jkanime.net/');
      console.log(`[Playwright Scraper] Conexión exitosa. Tamaño de respuesta: ${html.length} bytes.`);
      console.log(`[Playwright Scraper] Título detectado: ${await scraper.page.title()}`);
    } else if (command === 'catalog') {
      const pageNum = Number(argv[1]) || 1;
      console.log(`[Playwright Scraper] Extrayendo catálogo página ${pageNum}...`);
      const res = await scraper.scrapeCatalogPage(pageNum);
      console.log(`[Playwright Scraper] Se extrajeron ${res.data.length} animes (Página ${res.current_page} de ${res.last_page}).`);
      console.log(JSON.stringify(res.data.slice(0, 5), null, 2));
    } else if (command === 'detail') {
      const slug = argv[1];
      if (!slug) throw new Error('Debes indicar el slug del anime (ej. "solo-leveling").');
      console.log(`[Playwright Scraper] Extrayendo ficha de "${slug}"...`);
      const detail = await scraper.scrapeDetail(slug);
      console.log(JSON.stringify(detail, null, 2));
    } else if (command === 'episodes') {
      const slug = argv[1];
      if (!slug) throw new Error('Debes indicar el slug del anime.');
      console.log(`[Playwright Scraper] Extrayendo episodios de "${slug}"...`);
      const eps = await scraper.scrapeEpisodes(slug);
      console.log(`[Playwright Scraper] Total episodios detectados: ${eps.length}`);
      console.log(JSON.stringify(eps.slice(0, 10), null, 2));
    } else if (command === 'episode') {
      const slug = argv[1];
      const num = argv[2] || 1;
      if (!slug) throw new Error('Debes indicar slug y número de episodio (ej. "solo-leveling 1").');
      console.log(`[Playwright Scraper] Extrayendo enlaces de "${slug}" capítulo ${num}...`);
      const links = await scraper.scrapeEpisodeLinks(slug, num);
      console.log(`[Playwright Scraper] Reproductores encontrados: ${links.players.length}`);
      console.log(`[Playwright Scraper] Descargas encontradas: ${links.downloads.length}`);
      console.log(JSON.stringify(links, null, 2));
    } else if (command === 'sync') {
      const slug = argv[1];
      if (!slug) throw new Error('Debes indicar el slug del anime.');
      console.log(`[Playwright Scraper] Sincronizando "${slug}" en SQLite...`);
      const db = catalogService.getDb();
      if (!db) throw new Error('No se pudo acceder a la base de datos data/jkanime.db.');
      const syncResult = await scraper.syncAnimeToDb(db, slug);
      console.log(`[Playwright Scraper] Sincronización completada.`);
      console.log(`[Playwright Scraper] Anime: ${syncResult.anime.title} (ID: ${syncResult.anime.id})`);
      console.log(`[Playwright Scraper] Episodios sincronizados: ${syncResult.episodes_count}`);
      console.log(`[Playwright Scraper] Enlaces sincronizados: ${syncResult.links_synced ? 'SÍ' : 'NO'}`);
      if (syncResult.links_note) console.log(`[Playwright Scraper] ${syncResult.links_note}`);
    } else {
      console.error(`Comando desconocido: ${command}. Ejecuta con 'help' para ver opciones.`);
    }
  } catch (err) {
    console.error(`\n[ERROR]: ${err.message}`);
    if (err.isChallenge) {
      console.error(`\n[SUGERENCIA DE DESAFÍO]:`);
      console.error(`JkAnime ha presentado un desafío de protección Cloudflare.`);
      console.error(`Ejecuta nuevamente con el flag --interactive para resolverlo manualmente en la ventana visible:`);
      console.error(`  node scripts/jkanime-playwright-scraper.mjs ${command} ${argv.slice(1).join(' ')} --interactive\n`);
    }
    process.exitCode = 1;
  } finally {
    await scraper.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
