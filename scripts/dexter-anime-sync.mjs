/* DexterAnimeSync v1 - incremental adapter engine for authorized public metadata
   and owner-licensed media. GitHub Actions is the durable scheduled worker.
   No stream scraping, DRM handling, reverse proxies or private video extraction.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {normalizeEpisodeSources, validAnimeId} from './media-source-contract.mjs';

const SUPPORTED=new Set(['anilist_schedule','licensed_library','jkanime_external','youtube_trailers']);
const fileOf={
 anilist_schedule:'data/airing.json',
 licensed_library:'data/licensed-media.json',
 jkanime_external:'data/external-providers.json',
 youtube_trailers:'data/airing.json'
};
const safeText=(value,limit=500)=>String(value??'').trim().slice(0,limit);
const uniq=arr=>[...new Set(arr)];
const yesURL=value=>{
 try{const u=new URL(String(value||''));return u.protocol==='https:'&&u.username===''&&u.password===''?u.href:null}catch{return null}
};
const hash=value=>crypto.createHash('sha256').update(value).digest('hex').slice(0,16);
const number=(v,min,max)=>Number.isSafeInteger(Number(v)) && Number(v)>=min && Number(v)<=max?Number(v):null;
const dateISO=ms=>new Date(ms).toISOString();
async function readJSON(root,file,{optional=false}={}){
 try{return JSON.parse(await fs.readFile(path.join(root,file),'utf8'))}
 catch(e){
  if(optional&&(e.code==='ENOENT'||e instanceof SyntaxError))return null;
  throw new Error('No se pudo leer '+file+': '+e.message);
 }
}
async function writeJSON(root,file,data){
 const full=path.join(root,file);
 await fs.mkdir(path.dirname(full),{recursive:true});
 const temp=full+'.tmp';
 await fs.writeFile(temp,JSON.stringify(data,null,2)+'\n','utf8');
 await fs.rename(temp,full);
}
function animeFrom(a,stamp,existing){
 const id=safeText(a?.id,64);
 if(!/^(mal|al)-\d+$/.test(id))return null;
 return {id,title:safeText(a.title||existing?.title||'Anime',220),
  image:yesURL(a.image)||existing?.image||null,
  banner:yesURL(a.banner)||existing?.banner||null,
  year:number(a.year,1900,2200)||existing?.year||null,
  format:safeText(a.format||existing?.format||'TV',24),
  description_es:safeText(a.description_es||existing?.description_es||'',1300),
  genres:uniq(Array.isArray(a.genres)?a.genres.filter(x=>typeof x==='string').map(x=>safeText(x,45)):existing?.genres||[]).slice(0,20),
  firstSeenAt:existing?.firstSeenAt||stamp,lastSeenAt:stamp};
}
function episodeFrom(a,nowMs,stamp,existing,provider){
 const animeId=safeText(a.id,64),episode=number(a.episode,1,9999),airing=number(a.airingAt,1000000000,9999999999);
 if(!/^(mal|al)-\d+$/.test(animeId)||!episode||!airing)return null;
 const id=animeId+':ep:'+episode;
 const published=airing*1000<=nowMs;
 return {id,animeId,seasonId:existing?.seasonId||null,
   episodeNumber:episode,title:existing?.title||null,
   language:existing?.language||null,
   scheduledAt:dateISO(airing*1000),
   publishedAt:null, // Broadcast time != video publication time.
   airedStatus:published?'fecha_de_emision_pasada':'proxima_emision_programada',
   playbackStatus:existing?.playbackStatus||'sin_fuente_autorizada',
   playbackSourceIds:existing?.playbackSourceIds||[],
   metadataSource:provider,firstSeenAt:existing?.firstSeenAt||stamp,lastSeenAt:stamp};
}
function fromVideoEpisode(animeId,item,index,stamp,existing){
 const numberId=number(item.episode||item.number||index+1,1,9999);
 if(!numberId)return null;
 const id=animeId+':ep:'+numberId;
 return {id,animeId,seasonId:existing?.seasonId||null,episodeNumber:numberId,
   title:safeText(item.title||existing?.title||'Episodio '+numberId,220),
   language:safeText(item.language||existing?.language||'No especificado',40),
   scheduledAt:existing?.scheduledAt||null,publishedAt:existing?.publishedAt||null,
   airedStatus:existing?.airedStatus||'sin_horario_publico',
   playbackStatus:'fuente_configurada_sin_verificar',
   playbackSourceIds:[],metadataSource:existing?.metadataSource||'licensed_library',
   firstSeenAt:existing?.firstSeenAt||stamp,lastSeenAt:stamp};
}
export async function syncDexter({root=process.cwd(),now=new Date(),force=false,persist=true}={}){
 const nowMs=now.getTime(),stamp=now.toISOString(),engineVersion=1;
 const config=await readJSON(root,'config/dexter-providers.json');
 const settings=config.settings||{};
 const maxEpisodes=number(settings.maxEpisodes,20,10000)||1500;
 const historyLimit=number(settings.historyLimit,10,500)||60;
 const previous=await readJSON(root,'data/dexter/records.json',{optional:true})||{};
 const oldHistory=await readJSON(root,'data/dexter/history.json',{optional:true})||{items:[]};
 const by={
  anime:new Map((previous.anime||[]).map(x=>[x.id,x])),
  seasons:new Map((previous.seasons||[]).map(x=>[x.id,x])),
  episodes:new Map((previous.episodes||[]).map(x=>[x.id,x])),
  sources:new Map((previous.sources||[]).map(x=>[x.id,x])),
  providers:new Map()
 };
 const counters={animes:0,episodesDetected:0,episodesNew:0,playbackSources:0,errors:0};
 const providerStatus=[],events=[];
 const pSettings=Array.isArray(config.providers)?config.providers:[];
 const activeDefs=pSettings.filter(x=>SUPPORTED.has(x.id));
 const runsByProvider=new Map();
 for(const event of (oldHistory.items||[])){
  if(event.result==='success'&&!runsByProvider.has(event.providerId))runsByProvider.set(event.providerId,event);
 }
 const appendError=(provider,error)=>{
  counters.errors++;
  events.push({providerId:provider,at:stamp,message:safeText(error?.message||error,240)});
 };
 const touchAnime=a=>{
  const existing=by.anime.get(a?.id),record=animeFrom(a,stamp,existing);
  if(!record)return null;
  if(!existing)counters.animes++;
  by.anime.set(record.id,record);
  return record;
 };
 const touchEpisode=a=>{
  const id=a.id+':ep:'+a.episode;
  const old=by.episodes.get(id),ep=episodeFrom(a,nowMs,stamp,old,'anilist_schedule');
  if(!ep)return null;
  counters.episodesDetected++;
  if(!old)counters.episodesNew++;
  by.episodes.set(id,ep);
  return ep;
 };
 for(const def of activeDefs){
  const id=def.id, interval=number(def.syncIntervalHours,1,168)||6;
  const last=runsByProvider.get(id);
  const status={id,name:safeText(def.displayName||id,120),mode:safeText(def.mode,40),
    enabled:!!def.enabled,sourceType:safeText(def.type,50),intervalHours:interval,
    lastRunAt:last?.at||null,runAt:null,state:'pendiente',observed:0,created:0,
    playback:0,error:null};
  providerStatus.push(status);
  if(!def.enabled){status.state='desactivada';continue}
  if(!force && last?.at && nowMs-Date.parse(last.at)<interval*3600000){
   status.state='en_espera';continue;
  }
  const beforeEpisodes=counters.episodesNew;
  status.runAt=stamp;
  try{
   const data=await readJSON(root,fileOf[id]);
   if(id==='anilist_schedule'){
    if(!Array.isArray(data.airing))throw Error('El calendario no contiene emisiones.');
    if(!data.updated)throw Error('El calendario no tiene fecha de actualización.');
    const age=nowMs-Date.parse(data.updated);
    if(!Number.isFinite(age)||age>48*3600000)status.state='desactualizada';
    const items=data.airing.slice(0,Math.max(25,maxEpisodes));
    for(const item of items){
     if(!touchAnime(item))continue;
     if(touchEpisode(item))status.observed++;
    }
    const section=data.seasonal;
    if(section?.year&&section.season){
     const seasonId='anilist-'+section.year+'-'+section.season;
     by.seasons.set(seasonId,{id:seasonId,source:'anilist_schedule',year:section.year,
       label:safeText(section.season,30),animeIds:[],updatedAt:stamp});
     const season=by.seasons.get(seasonId);
     for(const a of section.entries||[]){
      const anime=touchAnime(a);if(!anime)continue;
      season.animeIds.push(anime.id);
     }
     season.animeIds=uniq(season.animeIds);
    }
   }else if(id==='licensed_library'){
    const entries=data.entries||{};
    if(!entries||typeof entries!=='object'||Array.isArray(entries))throw Error('Biblioteca inválida.');
    for(const key of [...by.sources.keys()])if(by.sources.get(key).providerId==='licensed_library')by.sources.delete(key);
    status.rejected=0;
    for(const [animeId,record] of Object.entries(entries)){
     if(!validAnimeId(animeId))continue;
     // A licensed title may not appear in the public broadcast schedule.
     if(!touchAnime({id:animeId,title:record?.title||'Anime autorizado'}))continue;
     const episodes=Array.isArray(record?.episodes)?record.episodes:[];
     for(const [index,item] of episodes.entries()){
      const checked=normalizeEpisodeSources(item);
      status.rejected+=checked.rejected.length;
      if(!checked.sources.length)continue;
      const old=by.episodes.get(animeId+':ep:'+(item.episode||item.number||index+1));
      const ep=fromVideoEpisode(animeId,item,index,stamp,old);
      if(!ep)continue;
      const valid=[];
      for(const source of checked.sources){
       const identity=source.src||source.embedUrl;
       const sid='licensed_library:'+ep.id+':'+hash(identity);
       by.sources.set(sid,{
        id:sid,episodeId:ep.id,providerId:id,
        mode:source.mode==='official_embed'?'official_embed':'self_hosted',
        status:'configurada_sin_verificar',name:source.name,
        language:source.language,quality:source.quality,
        mime:source.mime,src:source.src,
        provider:source.provider,videoId:source.videoId,embedUrl:source.embedUrl,
        declaredRights:source.rights,
        subtitleUrl:source.subtitleUrl,lastSeenAt:stamp
       });
       valid.push(sid);
       status.playback++;
      }
      if(!valid.length)continue;
      const exists=by.episodes.has(ep.id);
      ep.playbackSourceIds=valid;by.episodes.set(ep.id,ep);
      status.observed++;
      if(!exists)counters.episodesNew++;
     }
    }
    if(!status.observed)status.state='sin_contenido_autorizado';
   }else if(id==='jkanime_external'){
    const items=data.external_series||{};
    for(const [animeId,p] of Object.entries(items)){
     if(!/^(mal|al)-\d+$/.test(animeId))continue;
     const url=yesURL(p?.url);
     if(!url||new URL(url).hostname!=='jkanime.net')continue;
     const record=by.anime.get(animeId);
     if(record)by.anime.set(animeId,{...record,externalLinks:uniq([...(record.externalLinks||[]),url])});
     status.observed++;
    }
    if(!status.observed)status.state='sin_paginas_verificadas';
   }else if(id==='youtube_trailers'){
    const source=(data.seasonal?.entries||[]).concat(data.airing||[]);
    const used=new Set();
    for(const entry of source){
     const idYouTube=entry.trailer?.id;
     if(entry.trailer?.site!=='youtube'||!/^[A-Za-z0-9_-]{11}$/.test(idYouTube||'')||used.has(entry.id))continue;
     used.add(entry.id);
     const record=touchAnime(entry);
     if(!record)continue;
     by.anime.set(entry.id,{...record,trailer:{platform:'youtube',id:idYouTube,mode:'embed_al_hacer_clic'}});
     status.observed++;
    }
    if(!status.observed)status.state='sin_trailers_disponibles';
   }
   if(status.state==='pendiente')status.state='conectada';
   status.created=counters.episodesNew-beforeEpisodes;
   events.push({providerId:id,at:stamp,result:'success',observed:status.observed,
     created:status.created,playback:status.playback,detail:status.state});
  }catch(e){
   status.state='error';status.error=safeText(e.message,280);
   appendError(id,e);
   events.push({providerId:id,at:stamp,result:'error',message:status.error});
  }
 }
 // Keep only known live media sources; metadata episodes remain retained to preserve history.
 for(const [id,ep] of by.episodes){
  const allowed=(ep.playbackSourceIds||[]).filter(x=>by.sources.has(x));
  by.episodes.set(id,{...ep,playbackSourceIds:allowed,
    playbackStatus:allowed.length?'fuente_configurada_sin_verificar':'sin_fuente_autorizada'});
 }
 counters.playbackSources=by.sources.size;
 const history=[...events,...(oldHistory.items||[])].slice(0,historyLimit);
 const summary={schemaVersion:engineVersion,engine:'DexterAnimeSync',updatedAt:stamp,
  job:{id:'sync-'+hash(stamp),startedAt:stamp,completedAt:stamp,mode:force?'manual_forzada':'programada',
   status:counters.errors?(counters.errors<activeDefs.filter(x=>x.enabled).length?'parcial':'error'):'correcta',
   counters},providers:providerStatus,externalIntegrations:config.externalIntegrations||[],
   errors:events.filter(e=>e.result==='error'),historySize:history.length,
   records:{anime:by.anime.size,seasons:by.seasons.size,episodes:by.episodes.size,
    sources:by.sources.size}};
 const sort=x=>[...x.values()].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const records={schemaVersion:engineVersion,updatedAt:stamp,
  anime:sort(by.anime),seasons:sort(by.seasons),episodes:sort(by.episodes),sources:sort(by.sources)};
 const output={summary,records,history:{schemaVersion:engineVersion,items:history}};
 if(persist){
  await writeJSON(root,'data/dexter/records.json',records);
  await writeJSON(root,'data/dexter/status.json',summary);
  await writeJSON(root,'data/dexter/history.json',output.history);
 }
 return output;
}
const isCLI=process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href;
if(isCLI){
 const options={root:process.cwd(),force:process.argv.includes('--force'),persist:!process.argv.includes('--dry-run')};
 syncDexter(options).then(x=>{
  console.log('DexterAnimeSync: '+JSON.stringify(x.summary));
  if(x.summary.job.status==='error'){process.exitCode=1}
 }).catch(e=>{console.error('DexterAnimeSync failed: '+e.stack);process.exitCode=1});
}
