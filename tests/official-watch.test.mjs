import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const context={URL,window:{},document:{addEventListener(){}}};
vm.runInNewContext(read('official-watch.js'),context,{timeout:2000});
const official=context.window.OneUpOfficialWatch;

test('verificaciones oficiales: series conocidas y dos temporadas comparten ficha',()=>{
  for(const id of ['mal-61967','mal-34572','mal-61987','mal-64340','mal-63181']){
    const item=official.get({id});
    assert.equal(item?.provider,'Crunchyroll');
    assert.equal(item?.origin,'verified');
    assert.ok(item.url.startsWith('https://www.crunchyroll.com/'));
  }
  assert.equal(official.get({id:'mal-61967'}).url,official.get({id:'mal-34572'}).url);
  assert.equal(official.get({id:'mal-1234567'}),null);
});

test('seguridad: solo URLs HTTPS de una ficha de serie, sin host engañoso',()=>{
 const allowed=[
  'https://www.crunchyroll.com/series/GT00384004/overgeared',
  'https://www.crunchyroll.com/es/series/GT00384004/overgeared',
  'https://www.crunchyroll.com/es-es/series/GRE50KV36/black-clover'
 ];
 for(const url of allowed)assert.equal(official.safeSeriesUrl(url),url);
 const forbidden=[
  'http://www.crunchyroll.com/series/GT00384004/overgeared',
  'https://www.crunchyroll.com.evil.net/series/GT00384004/overgeared',
  'https://badcrunchyroll.com/series/GT00384004/overgeared',
  'https://www.crunchyroll.com/watch/GDBGBQ8KZ',
  'https://www.crunchyroll.com/series/',
  'https://www.crunchyroll.com/series/GT00384004/overgeared?token=test',
  'javascript:alert(1)'
 ];
 for(const url of forbidden.filter(u=>!u.includes('?token=')))assert.equal(official.safeSeriesUrl(url),'',url);
 assert.equal(official.safeSeriesUrl('https://www.crunchyroll.com/series/GT00384004/overgeared?token=test'),
 'https://www.crunchyroll.com/series/GT00384004/overgeared');
});

test('enlaces AniList seguros: acepta URL de Crunchyroll y rechaza otros destinos',()=>{
 const item=official.get({id:'mal-999999',streaming:[
   {name:'Crunchyroll',url:'https://crunchyroll.com/series/G3KHEVDJ7/the-apothecary-diaries'}
 ]});
 assert.equal(item?.origin,'catalog');
 assert.equal(item?.provider,'Crunchyroll');
 assert.equal(official.get({id:'al-3',streaming:[{url:'https://anime.example/series/G3KHEVDJ7'}]}),null);
});

test('la UI conserva el player integrado y no anida botones con enlaces externos',()=>{
 const html=read('index.html'),airing=read('airing-ui.js');
 assert.ok(html.includes('official-watch.css'));
 assert.ok(html.includes('official-watch.js'));
 assert.ok(html.indexOf('official-watch.js')<html.indexOf('airing-ui.js'));
 assert.match(airing,/airing-anime-card/);
 assert.match(airing,/airing-official-cta/);
 assert.match(airing,/streaming:Array\.isArray\(a\.streaming\)/);
 assert.match(read('episode-player.js'),/OneUpEpisodePlayer/);
 assert.match(read('data/licensed-media.json'),/"entries":\s*\{\s*\}/);
});
test('el refresco programado solicitará enlaces de AniList sin videos ni claves',()=>{
 const script=read('scripts/refresh-airing.mjs');
 assert.match(script,/externalLinks\{site url type\}/);
 assert.match(script,/streaming:\(m\.externalLinks\|\|\[\]\)/);
 assert.doesNotMatch(script,/service_role|sb_secret_|drm|manifest\.m3u8/i);
 const service=read('sw.js');
 assert.match(service,/official-watch\.js/);
 assert.match(service,/official-watch\.css/);
});
