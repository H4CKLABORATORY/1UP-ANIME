/* 1UP Anime schedule: historic airing data, upcoming slots & anime season previews.
 * An aired episode is not necessarily available on any particular streaming service.
 */
import fs from 'node:fs/promises';
const API='https://graphql.anilist.co';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let last=0;
async function call(query,variables){
 // AniList currently documents a temporary 30 requests/minute cap.
 const gap=Math.max(0,2300-(Date.now()-last));if(gap)await pause(gap);
 for(let trial=0;trial<3;trial++){
  last=Date.now();const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),14500);
  try{
   const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables}),signal:ctrl.signal});
   if(res.status===429){
    const retrySeconds=Number(res.headers.get('Retry-After'));
    const retryMs=Number.isFinite(retrySeconds)&&retrySeconds>0
      ? Math.min(65000,Math.ceil(retrySeconds*1000))
      : 10000*(trial+1);
    await pause(retryMs);continue;
   }
   if(!res.ok)throw Error('AniList HTTP '+res.status);
   const json=await res.json();if(json.errors?.length)throw Error(JSON.stringify(json.errors));
   return json.data;
  }finally{clearTimeout(timer)}
 }
 throw Error('AniList rate-limited after 3 retries');
}
const film='id idMal type isAdult format title{romaji english native} coverImage{extraLarge large} bannerImage description(asHtml:false) episodes averageScore status startDate{year month day} season seasonYear trailer{id site thumbnail} siteUrl genres nextAiringEpisode{airingAt episode} externalLinks{site url type}';
const schedQuery='query($page:Int,$start:Int,$end:Int){Page(page:$page,perPage:50){pageInfo{hasNextPage} airingSchedules(airingAt_greater:$start,airingAt_lesser:$end,sort:TIME){id airingAt episode media{'+film+'}}}}';
const seasonQuery='query($page:Int,$year:Int,$season:MediaSeason){Page(page:$page,perPage:40){pageInfo{hasNextPage} media(type:ANIME,season:$season,seasonYear:$year,isAdult:false,sort:[START_DATE,POPULARITY_DESC]){'+film+'}}}';
function norm(m){
 if(!m||m.type!=='ANIME'||m.isAdult)return null;
 const id=m.idMal?'mal-'+m.idMal:'al-'+m.id;
 return {id,mal_id:m.idMal||null,ani_id:m.id,title:m.title?.english||m.title?.romaji||m.title?.native||'Anime',
 image:m.coverImage?.extraLarge||m.coverImage?.large||'',banner:m.bannerImage||'',description:String(m.description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),
 year:m.seasonYear||m.startDate?.year||null,
 startDate:m.startDate?.year&&m.startDate?.month&&m.startDate?.day?
 (m.startDate.year+'-'+String(m.startDate.month).padStart(2,'0')+'-'+String(m.startDate.day).padStart(2,'0')):null,
 format:m.format||'TV',episodes:m.episodes||0,averageScore:m.averageScore||0,status:m.status||null,
 genres:m.genres||[],siteUrl:m.siteUrl||'',
 streaming:(m.externalLinks||[]).filter(l=>l.type==='STREAMING'&&/crunchyroll/i.test(l.site||'')).filter(l=>{
  try{const u=new URL(l.url);return u.protocol==='https:'&&['crunchyroll.com','www.crunchyroll.com'].includes(u.hostname)&&
   new RegExp('^/(?:[a-z]{2}(?:-[a-z]{2})?/)?series/[A-Za-z0-9]{8,}(?:/[A-Za-z0-9_-]+)?/?$').test(u.pathname)}
  catch{return false}
 }).map(l=>({name:'Crunchyroll',url:l.url})).slice(0,1),
 trailer:m.trailer?.site==='youtube'&&/^[\w-]{11}$/.test(m.trailer.id||'')?
 {site:'youtube',id:m.trailer.id}:null,
 next:m.nextAiringEpisode?.airingAt?{at:m.nextAiringEpisode.airingAt,episode:m.nextAiringEpisode.episode}:null};
}
async function schedules(start,end){
 const all=[];
 for(let p=1;p<=7;p++){
  const data=await call(schedQuery,{page:p,start,end});
  for(const a of (data?.Page?.airingSchedules||[])){
   const m=norm(a.media);if(m&&a.episode&&a.airingAt)all.push({...m,airingAt:a.airingAt,episode:a.episode,scheduleId:a.id});
  }
  if(!data?.Page?.pageInfo?.hasNextPage)break;
 }
 return [...new Map(all.map(a=>[a.scheduleId,a])).values()].sort((a,b)=>a.airingAt-b.airingAt);
}
async function seasonal(now){
 const year=now.getUTCFullYear(),season=['WINTER','SPRING','SUMMER','FALL'][Math.floor(now.getUTCMonth()/3)];
 const items=[];
 for(let p=1;p<=2;p++){
  const res=await call(seasonQuery,{page:p,year,season});
  items.push(...(res?.Page?.media||[]).map(norm).filter(Boolean));
  if(!res?.Page?.pageInfo?.hasNextPage)break;
 }
 return {season,year,entries:[...new Map(items.map(x=>[x.id,x])).values()].sort((a,b)=>(a.startDate||'9999').localeCompare(b.startDate||'9999'))};
}
const now=new Date(),sec=Math.floor(now.getTime()/1000),start=sec-60*60*55,end=sec+60*60*24*9;
const errors=[];let aired=[],seasonalData=null;
try{aired=await schedules(start,end)}catch(e){errors.push('schedule: '+e.message)}
try{seasonalData=await seasonal(now)}catch(e){errors.push('season: '+e.message)}
let existing=null;try{existing=JSON.parse(await fs.readFile('data/airing.json','utf8'))}catch{}
if(!aired.length&&existing?.airing?.length){console.warn('Reusing previous airing schedule');aired=existing.airing}
if(!seasonalData?.entries?.length&&existing?.seasonal?.entries?.length){console.warn('Reusing previous seasonal listings');seasonalData=existing.seasonal}
if(!aired.length&&!seasonalData?.entries?.length)throw Error('No fresh or previous schedule. '+errors.join('; '));
// Preserve existing Spanish translations when the 6-hour schedule refresh runs.
try{
 const translated=JSON.parse(await fs.readFile('data/translations-es.json','utf8')).translations||{};
 for(const a of aired){
  const row=translated[a.id];
  if(typeof row?.es==='string'&&row.es.length>=12)a.description_es=row.es;
 }
 for(const a of (seasonalData?.entries||[])){
  const row=translated[a.id];
  if(typeof row?.es==='string'&&row.es.length>=12)a.description_es=row.es;
 }
}catch(error){console.warn('Spanish schedule translations not available yet:',error.message)}
const output={updated:new Date().toISOString(),source:'AniList public GraphQL metadata',windowStart:start,windowEnd:end,airing:aired,seasonal:seasonalData||{season:'',year:now.getUTCFullYear(),entries:[]},warnings:errors};
await fs.mkdir('data',{recursive:true});
const tmp='data/airing.json.tmp';await fs.writeFile(tmp,JSON.stringify(output,null,2)+'\n');await fs.rename(tmp,'data/airing.json');
console.log('Saved '+aired.length+' airing dates, '+output.seasonal.entries.length+' seasonal titles. '+errors.join('; '));
).test(u.pathname)}
  catch{return false}
 }).map(l=>({name:'Crunchyroll',url:l.url})).slice(0,1),
 trailer:m.trailer?.site==='youtube'&&/^[\w-]{11}$/.test(m.trailer.id||'')?
 {site:'youtube',id:m.trailer.id}:null,
 next:m.nextAiringEpisode?.airingAt?{at:m.nextAiringEpisode.airingAt,episode:m.nextAiringEpisode.episode}:null};
}
async function schedules(start,end){
 const all=[];
 for(let p=1;p<=7;p++){
  const data=await call(schedQuery,{page:p,start,end});
  for(const a of (data?.Page?.airingSchedules||[])){
   const m=norm(a.media);if(m&&a.episode&&a.airingAt)all.push({...m,airingAt:a.airingAt,episode:a.episode,scheduleId:a.id});
  }
  if(!data?.Page?.pageInfo?.hasNextPage)break;
 }
 return [...new Map(all.map(a=>[a.scheduleId,a])).values()].sort((a,b)=>a.airingAt-b.airingAt);
}
async function seasonal(now){
 const year=now.getUTCFullYear(),season=['WINTER','SPRING','SUMMER','FALL'][Math.floor(now.getUTCMonth()/3)];
 const items=[];
 for(let p=1;p<=2;p++){
  const res=await call(seasonQuery,{page:p,year,season});
  items.push(...(res?.Page?.media||[]).map(norm).filter(Boolean));
  if(!res?.Page?.pageInfo?.hasNextPage)break;
 }
 return {season,year,entries:[...new Map(items.map(x=>[x.id,x])).values()].sort((a,b)=>(a.startDate||'9999').localeCompare(b.startDate||'9999'))};
}
const now=new Date(),sec=Math.floor(now.getTime()/1000),start=sec-60*60*55,end=sec+60*60*24*9;
const errors=[];let aired=[],seasonalData=null;
try{aired=await schedules(start,end)}catch(e){errors.push('schedule: '+e.message)}
try{seasonalData=await seasonal(now)}catch(e){errors.push('season: '+e.message)}
let existing=null;try{existing=JSON.parse(await fs.readFile('data/airing.json','utf8'))}catch{}
if(!aired.length&&existing?.airing?.length){console.warn('Reusing previous airing schedule');aired=existing.airing}
if(!seasonalData?.entries?.length&&existing?.seasonal?.entries?.length){console.warn('Reusing previous seasonal listings');seasonalData=existing.seasonal}
if(!aired.length&&!seasonalData?.entries?.length)throw Error('No fresh or previous schedule. '+errors.join('; '));
// Preserve existing Spanish translations when the 6-hour schedule refresh runs.
try{
 const translated=JSON.parse(await fs.readFile('data/translations-es.json','utf8')).translations||{};
 for(const a of aired){
  const row=translated[a.id];
  if(typeof row?.es==='string'&&row.es.length>=12)a.description_es=row.es;
 }
 for(const a of (seasonalData?.entries||[])){
  const row=translated[a.id];
  if(typeof row?.es==='string'&&row.es.length>=12)a.description_es=row.es;
 }
}catch(error){console.warn('Spanish schedule translations not available yet:',error.message)}
const output={updated:new Date().toISOString(),source:'AniList public GraphQL metadata',windowStart:start,windowEnd:end,airing:aired,seasonal:seasonalData||{season:'',year:now.getUTCFullYear(),entries:[]},warnings:errors};
await fs.mkdir('data',{recursive:true});
const tmp='data/airing.json.tmp';await fs.writeFile(tmp,JSON.stringify(output,null,2)+'\n');await fs.rename(tmp,'data/airing.json');
console.log('Saved '+aired.length+' airing dates, '+output.seasonal.entries.length+' seasonal titles. '+errors.join('; '));
