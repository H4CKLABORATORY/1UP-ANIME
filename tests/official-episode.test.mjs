/**
 * Contrato del primer episodio completo con licencia verificada (TMS).
 * Origen: PR #61, rama feature/release-official-episode-qa-20261019.
 * Adaptación Fase 1 (feature/phase1-licensed-media): este archivo incorpora
 * SOLO las comprobaciones del manifiesto. Las aserciones de la interfaz del
 * PR #61 (index.html, official-episode-feature.js, sw.js) NO se traen aquí:
 * esa UI sigue perteneciendo al PR #61 y a la decisión de fusión de Douglas.
 * Cuando el PR #61 se fusione, sus aserciones de UI vuelven con su feature.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeEpisodeSources} from '../scripts/media-source-contract.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const manifest=JSON.parse(read('data/licensed-media.json'));
test('The first complete anime episode uses TMS original publisher only',()=>{
 const series=manifest.entries['mal-27947'];
 assert.equal(series.provider,'Anime! on TMS Official Channel');
 assert.equal(series.sourcePage,'https://tmsanime.com/anime-on-tms-official-channel');
 assert.equal(series.episodes.length,1);
 const episode=series.episodes[0];
 assert.equal(episode.number,1);
 assert.equal(episode.language,'en');
 assert.equal(episode.sources[0].provider,'youtube');
 assert.equal(episode.sources[0].videoId,'K8LrLO_omys');
 const checked=normalizeEpisodeSources(episode);
 assert.equal(checked.rejected.length,0);
 assert.equal(checked.sources[0].embedUrl,'https://www.youtube-nocookie.com/embed/K8LrLO_omys');
 assert.equal(checked.sources[0].src,null);
});
test('Only publisher iframe; no downloaded sources or fake translation',()=>{
 const source=JSON.stringify(manifest);
 assert.ok(!source.includes('.m3u8')&&!source.includes('.mp4'));
 assert.ok(!source.includes('subtitles_es'));
 assert.ok(source.includes('YouTube'));
 assert.ok(source.includes('K8LrLO_omys'));
 assert.ok(source.includes('https://tmsanime.com/anime-on-tms-official-channel'));
});
