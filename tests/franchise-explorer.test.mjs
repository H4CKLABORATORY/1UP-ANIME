import test from 'node:test';
import assert from 'node:assert/strict';
import {QUERY,animeIdentity,normalizeAni,parseAni,parseJikan,statusText} from '../franchise-explorer.mjs';
const anime=(id,idMal,title,more={})=>({id,idMal,type:'ANIME',isAdult:false,title:{english:title},coverImage:{large:'https://s4.anilist.co/example.jpg'},format:'TV',seasonYear:2026,...more});
test('Franquicias consultan un ID exacto sin confundir anime y manga',()=>{
 assert.deepEqual(animeIdentity({id:'mal-123'}),{idMal:123});
 assert.deepEqual(animeIdentity({id:'al-4'}),{id:4});
 for(const id of ['kitsu-3','mal-0','mal-foo','mal-01','al-999999999999'])assert.equal(animeIdentity({id}),null);
 assert.match(QUERY,/relations/);assert.match(QUERY,/recommendations/);
});
test('AniList deduplica, filtra manga/R18 y conserva tipos de relación',()=>{
 const payload={data:{Media:{
  relations:{edges:[{relationType:'PREQUEL',node:anime(1,10,'Primer anime')},{relationType:'SEQUEL',node:anime(2,20,'Temporada 2')},{relationType:'SEQUEL',node:anime(2,20,'Duplicado')},{relationType:'ADAPTATION',node:{...anime(3,30,'Manga'),type:'MANGA'}},{relationType:'SIDE_STORY',node:{...anime(4,40,'Adulto'),isAdult:true}}]},
  recommendations:{nodes:[{mediaRecommendation:anime(5,50,'Recomendada')},{mediaRecommendation:anime(2,20,'Duplicada')},{mediaRecommendation:{...anime(6,60,'R18'),isAdult:true}}]}
 }}};
 const data=parseAni(payload,'mal-99');
 assert.deepEqual(data.relations.map(x=>x.id),['mal-10','mal-20']);
 assert.deepEqual(data.recommendations.map(x=>x.id),['mal-50']);
 assert.equal(data.relations[0].relationLabel,'Precuela');
 assert.match(statusText(data),/AniList/);
});
test('No guarda imagen de esquema no seguro ni registros sin título',()=>{
 assert.equal(normalizeAni(anime(1,null,'')),null);
 const result=normalizeAni(anime(7,null,'Anime',{coverImage:{large:'javascript:alert(1)'}}));
 assert.equal(result.image,'');
 assert.equal(result.id,'al-7');
});
test('Jikan: sólo anime, sin duplicados, sin inventar datos ausentes',()=>{
 const data=parseJikan({data:[
  {relation:'Sequel',entry:[{type:'anime',mal_id:20,name:'Segunda'},{type:'manga',mal_id:30,name:'Manga'}]},
  {relation:'Prequel',entry:[{type:'anime',mal_id:20,name:'Duplicado'},{type:'anime',mal_id:10,name:'Primera'}]}
 ]},'mal-99');
 assert.deepEqual(data.relations.map(x=>x.id),['mal-10','mal-20']);
 assert.equal(data.recommendations.length,0);
 assert.equal(parseJikan({data:[]},'mal-1').relations.length,0);
});
