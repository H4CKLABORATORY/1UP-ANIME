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
 const library=JSON.parse(read('data/licensed-media.json'));
 assert.equal(library.version,1);
 assert.ok(library.entries && typeof library.entries==='object' && !Array.isArray(library.entries));
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


test('capítulos oficiales: rutas exactas y temporada sin equivalencias inventadas',()=>{
 const expected=[
  'G69P9MD9Y','G6DQG759R','GX9UQW5X0',
  'G31UX0X2D','G6XJJ2PMR','G4VUQXMMG'
 ];
 expected.forEach((id,i)=>{
  const entry=official.getEpisode('mal-34572',1,i+1);
  assert.equal(entry?.provider,'Crunchyroll');
  assert.equal(entry?.kind,'external_episode');
  assert.equal(entry?.episode,i+1);
  assert.equal(new URL(entry.url).pathname.split('/')[2],id);
 });
 assert.equal(official.getEpisode('mal-34572',2,1),null,'No confundir temporadas');
 assert.equal(official.getEpisode('mal-61967',1,1),null,'No atribuir un episodio viejo a nueva temporada');
 assert.equal(official.getEpisode('mal-34572',1,7),null,'Sin enlace no se debe inventar episodio');
 assert.equal(official.getEpisode('mal-34572',1,-1),null);
 assert.equal(official.getEpisode('mal-34572',1,'1.5'),null);
});

test('seguridad: solo URL canónica Crunchyroll /watch, sin tokens ni hosts ajenos',()=>{
 const approved='https://www.crunchyroll.com/watch/G69P9MD9Y/asta-and-yuno';
 assert.equal(official.safeEpisodeUrl(approved),approved);
 assert.equal(official.safeEpisodeUrl('https://www.crunchyroll.com/es-es/watch/G69P9MD9Y/asta-and-yuno'),
  'https://www.crunchyroll.com/es-es/watch/G69P9MD9Y/asta-and-yuno');
 for(const invalid of [
  'http://www.crunchyroll.com/watch/G69P9MD9Y/asta-and-yuno',
  'https://www.crunchyroll.com.evil.test/watch/G69P9MD9Y/asta-and-yuno',
  'https://www.crunchyroll.com/series/GRE50KV36',
  'https://www.crunchyroll.com/watch/G69P9MD9Y/asta-and-yuno?token=private',
  'https://www.crunchyroll.com/watch/G69P9MD9Y/asta-and-yuno#secret',
  'https://u:p@www.crunchyroll.com/watch/G69P9MD9Y',
  'https://www.crunchyroll.com:8080/watch/G69P9MD9Y',
  'javascript:alert(1)'
 ])assert.equal(official.safeEpisodeUrl(invalid),'',invalid);
});

test('cambio de episodio: actualizar CTA externo y borrar capítulo no verificado',()=>{
 const listeners=new Map();
 const target={children:[],replaceChildren(){this.children=[];},append(...items){this.children.push(...items);}};
 const section={dataset:{animeId:'mal-34572'},querySelector:s=>s==='[data-oneup-official-episode]'?target:null};
 const document={
  addEventListener(name,handler){listeners.set(name,handler);},
  querySelector(s){return s==='#oneup-official-watch'?section:null;},
  createElement(tag){return {tag,attributes:{},setAttribute(k,v){this.attributes[k]=v;}};}
 };
 const window={OneUpCatalog:{active:()=> 'mal-34572'}};
 vm.runInNewContext(read('official-watch.js'),{URL,document,window},{timeout:2000});
 const emit=(animeId,season,episode)=>listeners.get('oneup-episode-selected')({detail:{animeId,season,episode}});
 emit('mal-34572',1,3);
 assert.equal(target.children[0].tag,'a');
 assert.match(target.children[0].href,/\/watch\/GX9UQW5X0\//);
 assert.equal(target.children[0].target,'_blank');
 assert.equal(target.children[0].rel,'noopener noreferrer');
 emit('mal-34572',1,7);
 assert.equal(target.children.length,0,'No inventar enlaces de episodios desconocidos');
 emit('mal-99999',1,1);
 assert.equal(target.children.length,0,'No cambiar ficha de un anime por evento ajeno');
});
