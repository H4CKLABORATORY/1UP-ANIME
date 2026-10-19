/* Verificación offline de fuentes editoriales de video, sin copiar flujos externos. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeEpisodeSources,validAnimeId} from './media-source-contract.mjs';

const library=JSON.parse(readFileSync(new URL('../data/licensed-media.json',import.meta.url),'utf8'));
assert.equal(library.version,1);
let episodes=0;
for(const [id,series] of Object.entries(library.entries||{})){
 assert(validAnimeId(id),'ID anime inválido: '+id);
 assert(Array.isArray(series.episodes),'Faltan episodios para '+id);
 const visited=new Set();
 for(const episode of series.episodes){
  assert(Number.isInteger(episode.number)&&episode.number>=1,'Número inválido');
  const key=(episode.season||1)+':'+episode.number;
  assert(!visited.has(key),'Episodio duplicado '+key);
  visited.add(key);
  const validated=normalizeEpisodeSources(episode);
  assert(validated.sources.length>0&&validated.sources.length<=7,'Fuentes incorrectas');
  assert.equal(validated.rejected.length,0,'Fuente rechazada: '+validated.rejected.join(','));
  for(const source of validated.sources){
   assert(['authorized','owned'].includes(source.rights),'Faltan permisos declarados');
   if(source.mode==='official_embed'){
    assert.equal(source.provider,'youtube','Solo YouTube oficial se incrusta');
    assert.equal(source.src,null,'No se deben copiar archivos del proveedor');
    assert.equal(source.embedUrl,'https://www.youtube-nocookie.com/embed/'+source.videoId);
   }
  }
  episodes++;
 }
}
assert(episodes>0,'No hay episodios oficiales configurados');
const lupin=library.entries['mal-27947'];
assert(lupin?.sourcePage==='https://tmsanime.com/anime-on-tms-official-channel');
assert.equal(lupin.episodes[0].sources[0].videoId,'K8LrLO_omys');
console.log('Fuente oficial lista a nivel de contrato: '+episodes+' episodio(s).');
console.log('PENDIENTE: prueba externa de reproductor/territorio/Safari y CI; no certifica video reproduciéndose.');
