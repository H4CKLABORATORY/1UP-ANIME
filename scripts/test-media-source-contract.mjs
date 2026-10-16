/* Node >=18; run node scripts/test-media-source-contract.mjs */
import assert from 'node:assert/strict';
import fs from 'node:fs';
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
console.log('Media contract checks passed; licensed episodes inspected:',inspected);
