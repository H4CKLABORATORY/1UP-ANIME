#!/usr/bin/env node
/**
 * 1UP Anime — Authorized media checker.
 *
 * Reads data/licensed-media.json, lists every declared episode and, unless
 * --no-probe is used, revalidates each direct HTTPS media/download URL with a
 * short HTTP request. It never scrapes or extracts third-party streams.
 *
 * Usage:
 *   node scripts/check-authorized-media.mjs
 *   node scripts/check-authorized-media.mjs --no-probe
 *   node scripts/check-authorized-media.mjs --json
 *   node scripts/check-authorized-media.mjs --file ./data/licensed-media.json
 *
 * Exit codes: 0 = manifest structurally valid (and probes passed), 1 = problems.
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const { loadManifest, resolveAuthorizedEpisode, PROBE_TTL_MS } = require('../server/src/authorized-media.js');

const args = process.argv.slice(2);
const has = flag => args.includes(flag);
const valueOf = flag => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const asJson = has('--json');
const probe = !has('--no-probe');
const manifestPath = valueOf('--file');
const timeoutMs = Number(valueOf('--timeout')) || undefined;
const manifest = loadManifest(manifestPath);

function clientCopyState() {
  if (manifestPath) return { checked: false };
  try {
    const root = JSON.parse(fs.readFileSync('data/licensed-media.json', 'utf8'));
    const client = JSON.parse(fs.readFileSync('client/data/licensed-media.json', 'utf8'));
    return { checked: true, synced: JSON.stringify(root) === JSON.stringify(client) };
  } catch {
    return { checked: true, synced: false, error: 'No se pudo leer una de las copias.' };
  }
}

const clientCopy = clientCopyState();

function episodeNumber(episode, index) {
  const raw = episode?.number ?? episode?.episode ?? episode?.ep ?? episode?.n;
  const value = Number(raw);
  return Number.isFinite(value) ? value : index + 1;
}

function describeStatus(source) {
  const status = source.status;
  if (!status) return source.probeable ? 'pendiente' : 'no verificable';
  if (status.ok) return `HTTP ${status.code}${status.contentType ? ' · ' + status.contentType : ''}`;
  return status.error || `HTTP ${status.code || 0}`;
}

async function main() {
  const entries = Object.entries(manifest.entries || {});
  if (entries.length === 0) {
    const payload = {
      manifest: manifestPath || 'data/licensed-media.json',
      entries: 0,
      episodes: 0,
      sources: 0,
      failures: 0,
      probed: false,
      client_copy: clientCopy,
      message: 'El manifiesto no declara entradas. Añade solo contenido propio o con permiso de distribución.'
    };
    if (asJson) console.log(JSON.stringify(payload, null, 2));
    else {
      console.log(payload.message);
      if (clientCopy.checked && !clientCopy.synced) {
        console.log('AVISO: data/licensed-media.json y client/data/licensed-media.json difieren; GitHub Pages lee la copia de client/data.');
      }
    }
    return 0;
  }

  const results = [];
  let failures = 0;
  let declaredEpisodes = 0;
  let declaredSources = 0;

  for (const [key, entry] of entries) {
    const episodes = Array.isArray(entry?.episodes) ? entry.episodes : [];
    if (episodes.length === 0) {
      failures++;
      results.push({
        key,
        title: entry?.title || key,
        episode: null,
        season: null,
        error: 'La entrada no declara episodios.',
        players: [],
        downloads: []
      });
      continue;
    }

    for (const [index, episode] of episodes.entries()) {
      const number = episodeNumber(episode, index);
      const season = Number(episode?.season) || 1;
      const resolved = await resolveAuthorizedEpisode(key, number, {
        manifest,
        season,
        refresh: probe,
        probe,
        timeoutMs
      });
      declaredEpisodes++;
      declaredSources += resolved.players.length + resolved.downloads.length;

      const broken = resolved.players.filter(source => source.status && source.status.ok === false);
      const brokenDownloads = resolved.downloads.filter(source => source.status && source.status.ok === false);
      const noSources = resolved.players.length === 0 && resolved.downloads.length === 0;
      if (noSources || broken.length > 0 || brokenDownloads.length > 0) failures++;

      results.push({
        key,
        title: resolved.title,
        episode: number,
        season,
        episode_title: resolved.episode_title,
        error: noSources ? 'El episodio no declara fuentes utilizables.' : null,
        players: resolved.players.map(source => ({
          server: source.server,
          language: source.language,
          quality: source.quality,
          mode: source.mode,
          src: source.src || null,
          embed_url: source.embed_url || null,
          status: source.status,
          detail: describeStatus(source)
        })),
        downloads: resolved.downloads.map(source => ({
          server: source.server,
          quality: source.quality,
          download_url: source.download_url,
          status: source.status,
          detail: describeStatus(source)
        }))
      });
    }
  }

  if (asJson) {
    console.log(JSON.stringify({
      manifest: manifestPath || 'data/licensed-media.json',
      entries: entries.length,
      episodes: declaredEpisodes,
      sources: declaredSources,
      failures,
      probed: probe,
      client_copy: clientCopy,
      ttl_seconds: Math.round(PROBE_TTL_MS / 1000),
      results
    }, null, 2));
  } else {
    console.log(`1UP Anime · fuentes autorizadas (${probe ? 'revalidación HTTP activa' : 'sin sondeo de red'})`);
    for (const result of results) {
      const heading = `${result.key} · ${result.title} · T${result.season} E${result.episode}${result.episode_title ? ' · ' + result.episode_title : ''}`;
      console.log('\n' + heading);
      if (result.error) console.log(`  ERROR: ${result.error}`);
      for (const source of result.players) {
        const mark = source.status ? (source.status.ok ? 'OK   ' : 'ERROR') : 'SKIP ';
        console.log(`  ${mark} ${source.server} · ${source.quality} · ${source.detail}`);
      }
      for (const source of result.downloads) {
        const mark = source.status ? (source.status.ok ? 'OK   ' : 'ERROR') : 'SKIP ';
        console.log(`  ${mark} ${source.server} (descarga) · ${source.detail}`);
      }
    }
    console.log(`\nEntradas: ${entries.length} · Episodios: ${declaredEpisodes} · Fuentes: ${declaredSources} · Con problemas: ${failures}`);
    if (!probe) console.log('Sondeo omitido con --no-probe: los estados HTTP no se verificaron.');
    if (clientCopy.checked && !clientCopy.synced) {
      console.log('AVISO: data/licensed-media.json y client/data/licensed-media.json difieren; GitHub Pages lee la copia de client/data.');
    }
  }

  return failures > 0 ? 1 : 0;
}

main().then(code => {
  process.exitCode = code;
}).catch(error => {
  console.error('No se pudo comprobar el manifiesto:', error?.message || error);
  process.exitCode = 1;
});
