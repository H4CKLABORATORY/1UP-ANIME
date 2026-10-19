/* 1UP Anime — deterministic local-time premiere prioritization (no invented release data).
 * No network access. Native browser dates follow the visitor's current time zone.
 */
(function(root){
 'use strict';
 const dateKey=date=>{
  const d=new Date(date);
  if(!Number.isFinite(d.getTime()))return '';
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 };
 const dayStart=date=>new Date(date.getFullYear(),date.getMonth(),date.getDate()).getTime();
 const hasArt=item=>Boolean(item&&typeof item.image==='string'&&/^https:\/\//.test(item.image));
 const valid=item=>Boolean(item&&typeof item.id==='string'&&/^(?:mal|al)-[0-9]+$/.test(item.id)&&
  typeof item.title==='string'&&item.title.trim()&&hasArt(item));
 function select(schedule,nowInput=Date.now(),limit=7){
  const now=Number(nowInput),moment=Number.isFinite(now)?now:Date.now();
  const today=dateKey(moment),start=dayStart(new Date(moment));
  const airing=Array.isArray(schedule?.airing)?schedule.airing:[];
  const seasons=Array.isArray(schedule?.seasonal?.entries)?schedule.seasonal.entries:[];
  const candidates=new Map();
  const add=(raw,group,when,episode)=>{
   if(!valid(raw)||raw.status==='FINISHED'||raw.status==='CANCELLED'||raw.status==='NOT_YET_RELEASED'&&group!==2)return;
   const time=Number(when),releaseDay=Number.isFinite(time)&&time>0?dateKey(time):'';
   const freshStart=typeof raw.startDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.startDate)&&
    ((start-new Date(raw.startDate+'T12:00:00').getTime())/86400000>=-1)&&
    ((start-new Date(raw.startDate+'T12:00:00').getTime())/86400000<=14);
   let tier=group===2?2:group===1?3:4;
   if(group===0&&releaseDay===today)tier=0;
   else if(freshStart)tier=Math.min(tier,2);
   else if(group===0&&time>moment)tier=3;
   if(group===0&&tier>=4)return;
   const diff=Math.abs((time||moment)-moment);
   const score=(100-tier*24)+(raw.banner?5:0)+(raw.averageScore||0)/100-
    (group===0?Math.min(diff/86400000,8)/10:0);
   const previous=candidates.get(raw.id);
   if(previous&&previous.score>=score)return;
   candidates.set(raw.id,{anime:raw,tier,score,at:group===0?time:null,
    episode:group===0?Number(episode)||null:null});
  };
  // A broadcast record is a schedule, not a verified playable upload.
  for(const item of airing){
   const t=Number(item.airingAt);
   if(!Number.isFinite(t)||t<=0)continue;
   const ms=t*1000,day=dateKey(ms),range=(ms-moment)/86400000;
   if(day===today&&item.status==='RELEASING')add(item,0,ms,item.episode);
   else if(range>0&&range<10&&item.status==='RELEASING')add(item,0,ms,item.episode);
  }
  for(const item of seasons){
   if(item.status!=='RELEASING')continue;
   const startDate=typeof item.startDate==='string'?item.startDate:'';
   const ms=startDate?Date.parse(startDate+'T12:00:00'):NaN;
   const newWithin=Number.isFinite(ms)&&(start-ms>=-86400000)&&(start-ms<=14*86400000);
   if(newWithin)add(item,2,ms,null);
   else add(item,4,null,null);
  }
  return [...candidates.values()]
   .sort((a,b)=>a.tier-b.tier||b.score-a.score||(a.anime.title||'').localeCompare(b.anime.title||''))
   .slice(0,Math.min(8,Math.max(1,Number(limit)||7)));
 }
 function label(item,when=Date.now()){
  if(!item)return '';
  if(item.tier===0)return 'EMISIÓN DE HOY';
  if(item.tier===2)return 'NUEVA TEMPORADA';
  if(item.tier===3)return 'PRÓXIMO EPISODIO';
  return 'EN EMISIÓN';
 }
 root.OneUpPremiereRanking=Object.freeze({select,dateKey,label});
})(typeof window!=='undefined'?window:globalThis);
