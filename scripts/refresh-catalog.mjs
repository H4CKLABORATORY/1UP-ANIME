/* Refresh public anime metadata into a static catalog snapshot.
   Designed to run on GitHub Actions; no user credentials required.
   Phase 1: reads X-RateLimit-Remaining and slows down before the limit;
   keeps the last good snapshot (per section) when a live section fails;
   never leaves the catalog empty; writes atomically (tmp + rename). */
import fs from 'node:fs/promises';
import path from 'node:path';
const endpoint=process.env.ONEUP_ANILIST_ENDPOINT||'https://graphql.anilist.co';
const catalogPath=process.env.ONEUP_CATALOG_PATH||'data/catalog.json';
const gapMs=Number(process.env.ONEUP_REFRESH_GAP_MS)||2200;
const query=[
'query($sort:[MediaSort],$status:MediaStatus,$format:MediaFormat){',
'Page(page:1,perPage:24){media(type:ANIME,isAdult:false,sort:$sort,status:$status,format:$format){',
'id idMal title{english romaji native} synonyms description(asHtml:false) coverImage{extraLarge large} bannerImage',
'averageScore episodes format status seasonYear startDate{year} genres siteUrl',
'nextAiringEpisode{episode airingAt} externalLinks{site url type}',
'}}}'
].join(' ');
const sets={
 trending:{sort:['TRENDING_DESC']},
 popular:{sort:['POPULARITY_DESC']},
 season:{sort:['TRENDING_DESC'],status:'RELEASING'},
 recent:{sort:['START_DATE_DESC']},
 movies:{sort:['POPULARITY_DESC'],format:'MOVIE'}
};
const timeout=ms=>new Promise(r=>setTimeout(r,ms));
function titleAliases(m){
 const list=[m.title?.english,m.title?.romaji,m.title?.native,...(Array.isArray(m.synonyms)?m.synonyms:[])];
 const seen=new Set(),result=[];
 for(const raw of list){
  if(typeof raw!=='string')continue;
  const value=raw.trim().slice(0,150);
  const key=value.normalize('NFKC').toLocaleLowerCase('es');
  if(!value||seen.has(key))continue;
  seen.add(key);result.push(value);
  if(result.length>=16)break;
 }
 return result;
}
function norm(m){
 return {id:m.idMal?'mal-'+m.idMal:'al-'+m.id,mal_id:m.idMal||null,title:m.title?.english||m.title?.romaji||'Anime',title_romaji:m.title?.romaji||'',title_native:m.title?.native||'',aliases:titleAliases(m),image:m.coverImage?.extraLarge||m.coverImage?.large||'',banner:m.bannerImage||'',description:String(m.description||'').replace(/<[^>]*>/g,'').slice(0,450),averageScore:m.averageScore||0,year:m.seasonYear||m.startDate?.year||'',genres:m.genres||[],format:m.format||'TV',episodes:m.episodes||0,status:m.status||'',siteUrl:m.siteUrl||'',streaming:(m.externalLinks||[]).filter(x=>x.type==='STREAMING'&&/^https:\/\//.test(x.url||'')).map(x=>({name:x.site,url:x.url})),next:m.nextAiringEpisode?{at:m.nextAiringEpisode.airingAt,episode:m.nextAiringEpisode.episode}:null,source:'snapshot'};
}
let rateRemaining=null,rateResetAt=0;
async function get(vars){
 for(let attempt=1;attempt<=3;attempt++){
  // Slow down BEFORE the limit: with 2 or fewer requests left, wait until
  // the reset window instead of firing into a 429.
  if(rateRemaining!==null&&rateRemaining<=2&&rateResetAt>Date.now()){
   await timeout(rateResetAt-Date.now());
  }
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),16000);
  try{
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables:vars}),signal:ctrl.signal});
   const remaining=Number(r.headers.get('X-RateLimit-Remaining')??NaN);
   const reset=Number(r.headers.get('X-RateLimit-Reset')??NaN);
   if(Number.isFinite(remaining))rateRemaining=remaining;
   if(Number.isFinite(reset)&&reset>0)rateResetAt=reset*1000;
   if(r.status===429){
    const seconds=Number(r.headers.get('Retry-After'));
    const delay=Number.isFinite(seconds)&&seconds>0
      ? Math.min(65000,Math.ceil(seconds*1000)):10000*attempt;
    await timeout(delay);continue;
   }
   if(!r.ok)throw Error('AniList HTTP '+r.status);
   const json=await r.json();if(json.errors?.length)throw Error(json.errors[0].message);
   const list=(json.data?.Page?.media||[]).map(norm);
   if(list.length<5)throw Error('Unexpectedly small dataset');
   return list;
  }finally{clearTimeout(timer)}
 }
 throw Error('AniList rate limited after retries');
}
// Snapshot fallback: keep the last good catalog; never leave it empty.
// A failed section reuses its previous items; a section with no previous
// data still fails the run, and the old file is left untouched.
let previous=null;
try{previous=JSON.parse(await fs.readFile(catalogPath,'utf8'))}catch{previous=null}
const warnings=[];
const groups={};let total=0;
for(const [section,vars] of Object.entries(sets)){
 await timeout(gapMs);
 try{
  groups[section]=await get(vars);total+=groups[section].length;
  console.log('Fetched '+section+': '+groups[section].length);
 }catch(e){
  const old=Array.isArray(previous?.groups?.[section])?previous.groups[section]:[];
  if(old.length){
   groups[section]=old;total+=old.length;
   const msg=section+': live fetch failed ('+e.message+'), reused '+old.length+' items from previous snapshot';
   warnings.push(msg);console.warn(msg);
  }else{
   throw Error(section+': live fetch failed and no previous snapshot to fall back to ('+e.message+')');
  }
 }
}
if(total===0)throw Error('No catalog data: all sections empty and no previous snapshot');
const output={updated:new Date().toISOString(),source:'AniList public GraphQL',groups};
if(warnings.length)output.warnings=warnings;
await fs.mkdir(path.dirname(catalogPath),{recursive:true});
const tmp=catalogPath+'.tmp';
await fs.writeFile(tmp,JSON.stringify(output,null,2)+'\n');
await fs.rename(tmp,catalogPath);
console.log('Updated catalog snapshot: '+total+' anime cards'+(warnings.length?' ('+warnings.length+' section(s) reused from previous snapshot)':''));
