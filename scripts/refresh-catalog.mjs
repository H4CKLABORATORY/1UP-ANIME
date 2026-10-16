/* Refresh public anime metadata into a static catalog snapshot.
   Designed to run on GitHub Actions; no user credentials required. */
import fs from 'node:fs/promises';
const endpoint='https://graphql.anilist.co';
const query=[
'query($sort:[MediaSort],$status:MediaStatus,$format:MediaFormat){',
'Page(page:1,perPage:24){media(type:ANIME,isAdult:false,sort:$sort,status:$status,format:$format){',
'id idMal title{english romaji} description(asHtml:false) coverImage{extraLarge large} bannerImage',
'averageScore episodes format status seasonYear startDate{year} genres siteUrl',
'nextAiringEpisode{episode airingAt} externalLinks{site url type}',
'}}}'
].join(' ');
const sets={
 trending:{sort:['TRENDING_DESC']},
 season:{sort:['TRENDING_DESC'],status:'RELEASING'},
 recent:{sort:['START_DATE_DESC']},
 movies:{sort:['POPULARITY_DESC'],format:'MOVIE'}
};
const timeout=ms=>new Promise(r=>setTimeout(r,ms));
function norm(m){
 return {id:m.idMal?'mal-'+m.idMal:'al-'+m.id,mal_id:m.idMal||null,title:m.title?.english||m.title?.romaji||'Anime',image:m.coverImage?.extraLarge||m.coverImage?.large||'',banner:m.bannerImage||'',description:String(m.description||'').replace(/<[^>]*>/g,'').slice(0,450),averageScore:m.averageScore||0,year:m.seasonYear||m.startDate?.year||'',genres:m.genres||[],format:m.format||'TV',episodes:m.episodes||0,status:m.status||'',siteUrl:m.siteUrl||'',streaming:(m.externalLinks||[]).filter(x=>x.type==='STREAMING'&&/^https:\/\//.test(x.url||'')).map(x=>({name:x.site,url:x.url})),next:m.nextAiringEpisode?{at:m.nextAiringEpisode.airingAt,episode:m.nextAiringEpisode.episode}:null,source:'snapshot'};
}
async function get(vars){
 for(let attempt=1;attempt<=3;attempt++){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),16000);
  try{
   const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables:vars}),signal:ctrl.signal});
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
const groups={};let total=0;
for(const [section,vars] of Object.entries(sets)){
 await timeout(2200);
 groups[section]=await get(vars);total+=groups[section].length;
 console.log('Fetched '+section+': '+groups[section].length);
}
await fs.mkdir('data',{recursive:true});
await fs.writeFile('data/catalog.json',JSON.stringify({updated:new Date().toISOString(),source:'AniList public GraphQL',groups},null,2)+'\n');
console.log('Updated catalog snapshot: '+total+' anime cards');
