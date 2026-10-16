/* Node >=18; run node scripts/test-media-source-contract.mjs */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {syncDexter} from './dexter-anime-sync.mjs';
import {normalizeEpisodeSources,publicHttps,subtitleUrl,validAnimeId,MAX_SOURCES_PER_EPISODE} from './media-source-contract.mjs';
assert.equal(MAX_SOURCES_PER_EPISODE,7);
assert.equal(validAnimeId('mal-59741'),true);
assert.equal(validAnimeId('al-123'),true);
assert.equal(validAnimeId('mal-0'),false);
assert.equal(validAnimeId('../secrets'),false);
for (const bad of ['http://video.example.com/1.mp4','https://127.0.0.1/test.mp4',
 'https://localhost/video.mp4','https://internal.local/file.mp4',
 'https://user:password@media.example.com/test.mp4','file:///private/video.mp4',
 'javascript:alert(1)','https://[::1]/1.m3u8']) {
 assert.equal(publicHttps(bad),null,'Rejected unsafe URL: '+bad);
}
assert.equal(publicHttps('https://cdn.example.com/1.mp4'),'https://cdn.example.com/1.mp4');
assert.equal(subtitleUrl('./media/show.es.vtt'),'./media/show.es.vtt');
assert.equal(subtitleUrl('./media/../secrets.vtt'),null);
const seven=normalizeEpisodeSources({rights:'authorized',subtitles_es:'./media/show.es.vtt',
 sources:Array.from({length:9},(_,i)=>({name:'Servidor '+(i+1),
 src:'https://cdn.example.com/ep'+i+'.mp4',mime:'video/mp4',language:'es'}))});
assert.equal(seven.sources.length,7);
assert.equal(seven.rejected.length,2);
assert.equal(seven.sources[0].subtitleUrl,'./media/show.es.vtt');
assert.equal(seven.sources[0].tracks[0].lang,'es');
const multilingual=normalizeEpisodeSources({rights:'owned',sources:[{
 src:'https://media.example.com/movie.mp4',
 tracks:[
  {lang:'es',label:'Español',url:'./media/film.es.vtt'},
  {lang:'en',label:'English',url:'https://media.example.com/film.en.vtt'},
  {lang:'xx?',url:'javascript:alert(1)'}
 ]
}]});
assert.equal(multilingual.sources[0].tracks.length,2);
assert.deepEqual(multilingual.sources[0].tracks.map(t=>t.lang),['es','en']);
const hls=normalizeEpisodeSources({rights:'owned',sources:[
 {name:'Original',src:'https://media.example.com/master.m3u8'}]});
assert.equal(hls.sources[0].mime,'application/vnd.apple.mpegurl');
const embedded=normalizeEpisodeSources({sources:[{mode:'official_embed',
 provider:'youtube',videoId:'dQw4w9WgXcQ',rights:'authorized',name:'Canal oficial'}]});
assert.equal(embedded.sources.length,1);
assert.equal(embedded.sources[0].mode,'official_embed');
assert.equal(embedded.sources[0].embedUrl,'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
assert.equal(embedded.sources[0].src,null);
assert.deepEqual(normalizeEpisodeSources({src:'https://cdn.example.com/file.mp4'}).sources,[]);
assert.equal(normalizeEpisodeSources({sources:[{
 mode:'official_embed',provider:'other',videoId:'dQw4w9WgXcQ',rights:'authorized'}]}).sources.length,0);
const bad=normalizeEpisodeSources({rights:'authorized',sources:[
 {src:'http://cdn.example.com/file.mp4'},
 {src:'https://cdn.example.com/file.mp4',mime:'application/x-evil'},
 {src:'https://cdn.example.com/ok.mp4',mime:'video/mp4'}]});
assert.equal(bad.sources.length,1);
assert.equal(bad.rejected.length,2);
const manifest=JSON.parse(fs.readFileSync('data/licensed-media.json','utf8'));
assert.ok(manifest.entries && typeof manifest.entries==='object');
let inspected=0;
for(const [id,show] of Object.entries(manifest.entries)){
 assert.ok(validAnimeId(id),'Invalid anime identity '+id);
 for(const ep of show.episodes||[]){
  const checked=normalizeEpisodeSources(ep);
  assert.ok(checked.sources.length>0&&checked.sources.length<=7,'Invalid sources '+id);
  assert.equal(checked.rejected.length,0,'Rejected manifest sources '+id);
  inspected++;
 }
}
// End-to-end engine fixture; no network, paid services, or copyrighted media.
const temporary=await fsp.mkdtemp(path.join(os.tmpdir(),'oneup-media-test-'));
try{
 await fsp.mkdir(path.join(temporary,'config'),{recursive:true});
 await fsp.mkdir(path.join(temporary,'data'),{recursive:true});
 await fsp.writeFile(path.join(temporary,'config/dexter-providers.json'),
 JSON.stringify({settings:{maxEpisodes:100,historyLimit:15},providers:[{
  id:'licensed_library',displayName:'Biblioteca propia',
  enabled:true,type:'playback',mode:'self_hosted',syncIntervalHours:3
 }]}));
 await fsp.writeFile(path.join(temporary,'data/licensed-media.json'),
 JSON.stringify({version:1,entries:{'mal-59741':{title:'Demo autorizado',episodes:[
  {episode:1,rights:'owned',sources:[
   {src:'https://cdn.example.com/episode1.mp4',mime:'video/mp4'},
   {mode:'official_embed',provider:'youtube',videoId:'dQw4w9WgXcQ'}
  ]},
  {episode:2,src:'https://cdn.example.com/no-rights.mp4'}
 ]}}}));
 const synced=await syncDexter({root:temporary,now:new Date('2026-10-15T20:00:00Z'),
   force:true,persist:false});
 assert.equal(synced.summary.records.anime,1);
 assert.equal(synced.summary.records.episodes,1);
 assert.equal(synced.summary.records.sources,2);
 assert.equal(synced.summary.providers[0].rejected,1);
 const ep=synced.records.episodes[0];
 assert.equal(ep.animeId,'mal-59741');
 assert.equal(ep.playbackSourceIds.length,2);
 assert.equal(ep.playbackStatus,'fuente_configurada_sin_verificar');
 assert.equal(synced.records.sources.filter(x=>x.mode==='official_embed').length,1);
}finally{await fsp.rm(temporary,{recursive:true,force:true})}
console.log('Media contract and DexterAnimeSync fixture checks passed; licensed episodes in repo:',inspected);

