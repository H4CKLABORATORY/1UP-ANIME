import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const context={};
vm.runInNewContext(read('premiere-ranking.js'),context,{timeout:2000});
const rank=context.OneUpPremiereRanking;
const now=new Date(2026,9,19,13,0,0,0).getTime();
const time=(day,hour)=>new Date(2026,9,19+day,hour,0,0,0).getTime();
const entry=(id,title,extra={})=>({id:'mal-'+id,title,image:'https://example.org/art/'+id+'.jpg',
 status:'RELEASING',averageScore:80,format:'TV',...extra});

test('ranks broadcasts scheduled today before future and seasonal entries',()=>{
 const a=entry(1,'Anime today');
 const b=entry(2,'Anime tonight');
 const c=entry(3,'Anime tomorrow');
 const d=entry(4,'Anime season');
 const result=rank.select({airing:[
  {...a,airingAt:time(0,9)/1000,episode:3},
  {...b,airingAt:time(0,22)/1000,episode:2},
  {...c,airingAt:time(1,16)/1000,episode:5}
 ],seasonal:{entries:[d]}},now);
 assert.equal(result.length,4);
 assert.equal(result[0].tier,0);
 assert.equal(result[1].tier,0);
 assert.equal(result[2].tier,3);
 assert.equal(result[3].tier,4);
 assert.equal(result[0].episode,3);
 assert.equal(rank.label(result[0]),'EMISIÓN DE HOY');
 assert.equal(rank.label(result[2]),'PRÓXIMO EPISODIO');
});
test('uses visitor-local calendar dates, filters duplicates and incomplete entries',()=>{
 const list=rank.select({airing:[
  {...entry(101,'Day'),airingAt:time(0,23)/1000,episode:1},
  {...entry(101,'Day'),airingAt:time(0,17)/1000,episode:2},
  {...entry(102,'Finished',{status:'FINISHED'}),airingAt:time(0,15)/1000,episode:3},
  {...entry(103,'Missing',{image:''}),airingAt:time(0,16)/1000,episode:4},
  {...entry(104,'Later'),airingAt:time(16,14)/1000,episode:3}
 ],seasonal:{entries:[entry(105,'Premiere',{startDate:'2026-10-17'})]}},now);
 assert.equal(list.filter(x=>x.anime.id==='mal-101').length,1);
 assert.ok(list.some(x=>x.anime.id==='mal-105'&&x.tier===2));
 assert.ok(!list.some(x=>x.anime.id==='mal-102'||x.anime.id==='mal-103'||x.anime.id==='mal-104'));
 assert.equal(rank.dateKey(time(0,23)),rank.dateKey(time(0,9)));
 assert.notEqual(rank.dateKey(time(1,0)),rank.dateKey(time(0,23)));
});
test('never describes broadcasting as an unlocked episode and limits to eight',()=>{
 const schedule={airing:Array.from({length:30},(_,i)=>({
  ...entry(300+i,'Episode '+i),airingAt:time(0,16)/1000,episode:i+1
 })),seasonal:{entries:[]}};
 const result=rank.select(schedule,now,7);
 assert.equal(result.length,7);
 assert.ok(result.every(x=>x.at&&x.episode>0));
 const source=read('premiere-hero.js');
 assert.match(source,/Emisión de AniList; no garantiza reproducción/);
 assert.ok(!/descarg|drm|pirate|iframe\.src\s*=/.test(source.toLowerCase()));
});
test('matches actual UI and existing authorized player rather than replacing it',()=>{
 const html=read('index.html'),studio=read('studio.js'),schedule=read('airing-ui.js');
 assert.ok(html.includes('premiere-hero.js')&&html.includes('premiere-hero.css'));
 assert.ok(html.indexOf('premiere-ranking.js')<html.indexOf('premiere-hero.js'));
 for(const id of ['premiere-controls','premiere-progress','premiere-prev','premiere-next','premiere-status','hero-crunchyroll'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(studio,/feature\(id\)/);
 assert.match(studio,/state\.selectedId=null/);
 assert.match(schedule,/oneup-airing-ready/);
 assert.ok(read('sw.js').includes("'./premiere-hero.js'"));
 assert.ok(read('studio.js').includes('licensed-media.json'));
});
