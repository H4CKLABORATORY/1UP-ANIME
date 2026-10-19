import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const ctx={};
vm.runInNewContext(read('anime-title-search.js'),ctx,{timeout:1500});
const {normalize,collectAliases,names,matches}=ctx.OneUpAnimeSearch;

test('búsqueda con normalización de acentos, signos, Unicode y mayúsculas',()=>{
 assert.equal(normalize(' POKÉMON: ¡El origen! '),'pokemon el origen');
 assert.equal(normalize('Ｂｌａｃｋ　Ｃｌｏｖｅｒ'),'black clover');
 assert.equal(normalize('進撃の巨人'),'進撃の巨人');
 assert.equal(normalize('Ao no Exorcist / Blue Exorcist'),'ao no exorcist blue exorcist');
});
test('busca por títulos ingleses, romaji, japoneses y nombres alternativos',()=>{
 const title={
  title:'Attack on Titan',title_romaji:'Shingeki no Kyojin',
  title_native:'進撃の巨人',aliases:['Ataque a los Titanes','Attack on Titan','Shingeki no Kyojin']
 };
 for(const q of ['attack on titan','ShInGeKi NO KYOJIN','進撃の巨人','ataque a los titanes','titan attack']){
  assert.equal(matches(title,q),true,q);
 }
 assert.equal(matches(title,'dragon ball'),false);
 assert.equal(matches(title,'attack titan'),true);
 assert.equal(matches(title,'attack new'),false);
});
test('el conjunto de alias es estable, limitado y evita objetos inesperados',()=>{
 const a=collectAliases({english:'Frieren: Beyond Journey’s End',romaji:'Sousou no Frieren',native:'葬送のフリーレン'},
  ['Sousou no Frieren','  Frieren  ',null,42,...Array.from({length:50},(_,i)=>'Alias '+i)]);
 assert.equal(a[0],'Frieren: Beyond Journey’s End');
 assert.ok(a.includes('葬送のフリーレン'));
 assert.equal(a.filter(x=>x==='Sousou no Frieren').length,1);
 assert.ok(a.length<=16);
 assert.ok(a.every(x=>typeof x==='string'&&x.length<=150));
 assert.equal(names(null).length,0);
 assert.equal(matches({title:'One Piece'},''),true);
 assert.equal(matches({title:'One Piece'},'naruto'),false);
});
test('el sitio carga los alias antes del catálogo y conserva el reproductor',()=>{
 for(const page of ['index.html','studio.html']){
  const html=read(page);
  assert.ok(html.includes('anime-title-search.js'));
  assert.ok(html.indexOf('anime-title-search.js')<html.indexOf('studio.js'));
 }
 const studio=read('studio.js');
 assert.ok(studio.includes('OneUpAnimeSearch?.matches'));
 assert.ok(studio.includes('OneUpEpisodePlayer'));
 assert.ok(studio.includes('licensed-media.json'));
 const sw=read('sw.js');
 assert.ok(sw.includes("'./anime-title-search.js'"));
 assert.match(sw, /const CACHE=CACHE_PREFIX\+'v[0-9]+-[a-z0-9-]+';/);
});
test('el refresco conserva claves MyAnimeList/AniList y obtiene sinónimos públicos',()=>{
 const script=read('scripts/refresh-catalog.mjs');
 assert.ok(script.includes('title{english romaji native} synonyms'));
 assert.ok(script.includes('titleAliases(m)'));
 assert.ok(script.includes("m.idMal?'mal-'+m.idMal:'al-'+m.id"));
 assert.ok(!script.includes('downloadVideo('));
});
