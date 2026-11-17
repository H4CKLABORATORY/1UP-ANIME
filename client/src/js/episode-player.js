/* 1UP Anime: seven server slots and per-episode playback for authorized media.
 * The player only loads configured HTTPS video files or embeds from specifically
 * supported providers. It does not discover, scrape, proxy or download streams.
 */
(()=>{
'use strict';
const MAX_SERVERS=7;
let requestId=0,activeAnime='',activeAnimeContext=null,activeSeason=1,selectedEpisode=1,episodeCount=1;
let mediaByEpisode=new Map(),playerRoot=null;
let disposeActiveVideo=null;
let selectedLanguage='all';
const LANGUAGE_LABELS={latino:'Español latino',castellano:'Español castellano',sub:'Japonés subtitulado',original:'Japonés original',other:'Otros idiomas'};
function languageGroup(source){
 const lang=source.lang.toLowerCase().trim();
 if(/^(es-(la|419)|español latino|latino)$/.test(lang))return 'latino';
 if(/^(es-es|español castellano|castellano)$/.test(lang))return 'castellano';
 if(/^(ja|ja-jp|japonés|japanese|japonés subtitulado|japonés original)$/.test(lang))return source.captions||lang==='japonés subtitulado'?'sub':'original';
 return 'other';
}
function closeVideo(){
 if(typeof disposeActiveVideo==='function')disposeActiveVideo();
 disposeActiveVideo=null;
 if(playerRoot){
  const iframes=playerRoot.querySelectorAll('iframe');
  iframes.forEach(iframe=>{
   try{iframe.src='about:blank';}catch(e){}
   iframe.remove();
  });
 }
}

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeNumber=(value,fallback=1)=>{const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=9999?n:fallback};

function safeUrl(value,{allowHash=false}={}){
 try{
  let raw=String(value??'').trim();if(!raw)return null;
  if(raw.startsWith('/jkokru'))raw='https://jkanime.net'+raw;
  const u=new URL(raw,location.href);
  const host=u.hostname.toLowerCase();
  const hashAllowed=allowHash||host==='mega.nz'||host.endsWith('.mega.nz');
  if(u.protocol!=='https:'||u.username||u.password||(!hashAllowed&&u.hash)||
     (u.port&&u.port!=='443')||!host.includes('.')||host.includes(':')||
     /(^|\.)(localhost|local|internal|test|invalid)$/.test(host)||
     /^[0-9.]+$/.test(host))return null;
  return u;
 }catch{return null}
}
function safeEmbedUrl(raw){
 const u=safeUrl(raw,{allowHash:true});if(!u)return '';
 const h=u.hostname.toLowerCase(),p=u.pathname;
 if((h==='www.youtube-nocookie.com'||h==='www.youtube.com')&&new RegExp('^/embed/[A-Za-z0-9_-]{11}$').test(p)){
  return 'https://www.youtube-nocookie.com'+p;
 }
 if(h==='player.vimeo.com'&&new RegExp('^/video/[0-9]+$').test(p))return 'https://player.vimeo.com'+p;
 if(h==='archive.org'&&new RegExp('^/embed/[a-zA-Z0-9_.-]+$').test(p))return 'https://archive.org'+p;
 return u.href;
}
function subtitleUrl(value){
 if(typeof value!=='string')return '';
 // Local WebVTT files must stay within media/; reject encoded traversal too.
 if(/^\.\/media\/[A-Za-z0-9_./-]+\.vtt$/.test(value)&&!value.split('/').includes('..'))return value;
 if(!/^https:\/\//i.test(value))return '';
 return safeUrl(value)?.href||'';
}
function sourceOf(source,index,item){
 if(!source||typeof source!=='object')return null;
 // A URL does not itself establish authorization; the catalog editor must declare rights or backend provider.
 const isAuthorized=['owned','authorized'].includes(String(source.rights||item?.rights||'').toLowerCase())||Boolean(source.backend||item?.backend);
 if(!isAuthorized)return null;
 const label=String(source.name||source.label||source.server||'Servidor '+(index+1)).slice(0,45);
 const lang=String(source.language||source.lang||item?.language||'Japonés subtitulado').slice(0,35);
 const quality=String(source.quality||item?.quality||'HD').slice(0,35);
 const captions=subtitleUrl(source.subtitles_es||item?.subtitles_es);
 const officialYouTube=source.mode==='official_embed'&&source.provider==='youtube'&&
  /^[A-Za-z0-9_-]{11}$/.test(source.videoId||'')?
   'https://www.youtube-nocookie.com/embed/'+source.videoId:'';
 const embed=safeEmbedUrl(officialYouTube||source.embed||source.embedUrl||source.embed_url||source.iframe||source.player_url||((source.type==='embed'||source.kind==='embed')?source.url:''));
 // A third-party iframe cannot consume our external WebVTT tracks.
 if(embed)return {kind:'embed',url:embed,label,lang,quality,captions:'',mode:source.mode,provider:source.provider,backend:Boolean(source.backend||item?.backend)};
 const u=safeUrl(source.src||source.video_url||((source.type!=='embed'&&source.kind!=='embed')?source.url:''));
 if(!u)return null;
 const supported={'video/mp4':1,'video/webm':1,'application/vnd.apple.mpegurl':1};
 const guessed=u.pathname.toLowerCase().endsWith('.m3u8')?'application/vnd.apple.mpegurl':u.pathname.toLowerCase().endsWith('.webm')?'video/webm':'video/mp4';
 if(source.mime&&!supported[source.mime])return null;
 const mime=source.mime||guessed;
 const tracks=Array.isArray(source.tracks)?source.tracks.slice(0,8).map(track=>{
  if(!track||typeof track!=='object')return null;
  const url=subtitleUrl(track.url||track.src);
  const language=String(track.lang||'').trim().slice(0,15);
  if(!url||!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(language))return null;
  return {url,lang:language,label:String(track.label||language).slice(0,35)};
 }).filter(Boolean):[];
 if(captions&&!tracks.some(track=>track.lang==='es'))tracks.unshift({url:captions,lang:'es',label:'Español'});
 return {kind:'video',url:u.href,label,lang,quality,mime,captions,tracks:tracks.slice(0,8)};
}
function configuredSources(item){
 const raw=Array.isArray(item.sources)?item.sources:[{name:'Servidor 1',src:item.src,mime:item.mime}];
 return Array.from({length:MAX_SERVERS},(_,i)=>sourceOf(raw[i],i,item));
}
async function fetchBackendAnimeEpisodes(id){
 const bases=[
  (typeof window!=='undefined'&&window.ONEUP_API_BASE),
  '/api',
  'http://127.0.0.1:4050/api',
  'http://localhost:4050/api'
 ].filter(Boolean);
 const qParts=[];
 if(activeAnimeContext){
  if(activeAnimeContext.slug)qParts.push('slug='+encodeURIComponent(activeAnimeContext.slug));
  if(activeAnimeContext.title)qParts.push('title='+encodeURIComponent(activeAnimeContext.title));
  if(activeAnimeContext.title_romaji)qParts.push('romaji='+encodeURIComponent(activeAnimeContext.title_romaji));
  if(activeAnimeContext.raw_id)qParts.push('raw_id='+encodeURIComponent(String(activeAnimeContext.raw_id)));
 }
 const q=qParts.length?'?'+qParts.join('&'):'';
 for(const base of bases){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),3500);
  try{
   const url=base.replace(/\/$/,'')+'/anime/'+encodeURIComponent(id)+q;
   const res=await fetch(url,{cache:'no-cache',signal:ctrl.signal});
   if(!res.ok)continue;
   const json=await res.json();
   const list=Array.isArray(json?.episodes_list)?json.episodes_list:(Array.isArray(json?.episodesList)?json.episodesList:(Array.isArray(json?.episodes)?json.episodes:[]));
   if(json&&(list.length>0||Array.isArray(json.episodes))){
    if(!Array.isArray(json.episodes))json.episodes=list;
    json.episodes_list=list;
    return json;
   }
  }catch(e){}finally{clearTimeout(timer)}
 }
 return null;
}
async function configuredEpisodes(id,season){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
 try{
  const r=await fetch('./data/licensed-media.json',{cache:'no-cache',signal:ctrl.signal});
  if(r.ok){
   const json=await r.json();
   const records=json?.entries?.[id]?.episodes;
   if(Array.isArray(records)&&records.length>0){
    const map=new Map();
    records.slice(0,9999).forEach((item,index)=>{
     if(!item||typeof item!=='object')return;
     if(safeNumber(item.season,1)!==season)return;
     const no=safeNumber(item.number??item.episode,index+1);
     map.set(no,{title:String(item.title||'Episodio '+no).slice(0,120),sources:configuredSources(item)});
    });
    return map;
   }
  }
 }catch(e){}finally{clearTimeout(timer)}

 try{
  const backendAnime=await fetchBackendAnimeEpisodes(id);
  const map=new Map();
  const list=Array.isArray(backendAnime?.episodes_list)?backendAnime.episodes_list:(Array.isArray(backendAnime?.episodes)?backendAnime.episodes:[]);
  if(backendAnime&&list.length>0){
   list.forEach((e,index)=>{
    const no=safeNumber(e.number??e.episode,index+1);
    map.set(no,{title:String(e.title||'Episodio '+no).slice(0,120),sources:[],backend:true,downloads:[]});
   });
   return map;
  }
  if(backendAnime){
   const epCount=safeNumber(backendAnime.episodes_total||backendAnime.episodes,0);
   if(epCount>0){
    for(let i=1;i<=epCount;i++){
     map.set(i,{title:'Episodio '+i,sources:[],backend:true,downloads:[]});
    }
    return map;
   }
  }
 }catch(e){}
 return new Map();
}
function updateEpisodeSelect(){
 const select=playerRoot?.querySelector('#oneup-watch-episode');
 const input=playerRoot?.querySelector('#oneup-watch-episode-number');
 if(!select)return;
 select.querySelector('[data-custom-episode]')?.remove();
 if(selectedEpisode>120){
  const opt=document.createElement('option');
  opt.value=String(selectedEpisode);
  opt.textContent='Episodio '+selectedEpisode;
  opt.dataset.customEpisode='true';
  select.appendChild(opt);
 }
 select.value=String(selectedEpisode);
 if(input)input.value=String(selectedEpisode);
}
function showVideo(slot,serverIndex=-1){
 document.dispatchEvent(new CustomEvent('oneup-video-removed'));
 // Release prior MediaSource buffers before replacing DOM (critical on iPhone).
 closeVideo();
 const stage=playerRoot.querySelector('#oneup-playback-display');
 const status=playerRoot.querySelector('#oneup-player-message');
 stage.replaceChildren();
 playerRoot.querySelector('.oneup-embed-external')?.remove();
 playerRoot.querySelector('.oneup-source-retry')?.remove();
 let retryOffered=false;
 const offerRetry=()=>{
  if(retryOffered||!playerRoot?.isConnected)return;
  retryOffered=true;
  const sources=mediaByEpisode.get(selectedEpisode)?.sources||[];
  const indices=sources.map((source,i)=>source&&(selectedLanguage==='all'||languageGroup(source)===selectedLanguage)?i:-1).filter(i=>i>=0&&i!==serverIndex);
  if(!indices.length)return;
  const fallback=indices.find(i=>i>serverIndex)??indices[0];
  const button=document.createElement('button');
  button.type='button';button.className='oneup-source-retry';
  button.textContent='Probar servidor '+(fallback+1)+' ↻';
  button.setAttribute('aria-label','Intentar otro servidor disponible para este episodio');
  button.addEventListener('click',()=>renderSources(fallback),{once:true});
  stage.after(button);
 };
 if(!slot){
  const placeholder=document.createElement('div');
  placeholder.className='oneup-player-placeholder';
  placeholder.textContent='Todavía no hay una fuente de reproducción disponible para este episodio.';
  stage.appendChild(placeholder);
  status.textContent='Solo se habilitan servidores configurados con permiso de integración.';
  return;
 }
 if(slot.kind==='embed'){
  if(slot.mode==='official_embed'){
   // Require an explicit click before a third party receives requests or cookies (e2e fixture).
   const wrapper=document.createElement('div');wrapper.className='oneup-embed-stage';
   const action=document.createElement('button');action.id='oneup-embed-play';action.type='button';
   action.setAttribute('aria-label','Abrir reproductor externo oficial');
   const icon=document.createElement('span');icon.className='oneup-embed-play-icon';icon.textContent='▷';
   const words=document.createElement('strong');words.textContent='ABRIR REPRODUCTOR';
   action.append(icon,words);
   const frame=document.createElement('div');frame.id='oneup-embed-frame';frame.hidden=true;
   wrapper.append(action,frame);stage.appendChild(wrapper);
   const link=document.createElement('a');link.className='oneup-embed-external';
   const yt=slot.url.match(/^https:\/\/www\.youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})$/);
   link.href=yt?'https://www.youtube.com/watch?v='+yt[1]:slot.url;
   link.target='_blank';link.rel='noopener noreferrer';link.textContent='Abrir en el proveedor oficial ↗';
   stage.after(link);
   action.addEventListener('click',()=>{
    if(!stage.isConnected)return;
    const iframe=document.createElement('iframe');
    iframe.src=slot.url;
    iframe.title='Reproductor autorizado · '+slot.label+' · Episodio '+selectedEpisode;
    iframe.loading='eager';
    iframe.referrerPolicy='no-referrer';
    iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');
    iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen=true;
    frame.hidden=false;frame.appendChild(iframe);action.hidden=true;
    status.textContent='Reproductor externo abierto: '+slot.label+'. Su disponibilidad depende del proveedor.';
   },{once:true});
   status.textContent='Reproductor oficial configurado. Pulsa abrir para conectar con el proveedor.';
  }else{
   // Catalog & streaming servers (Streamwish, Vidhide, Mega, VOE, etc.):
   // Direct seamless iframe embed with privacy no-referrer and sandbox
   const iframe=document.createElement('iframe');
   iframe.src=slot.url;
   iframe.title='Reproductor · '+(slot.label||'Servidor')+' · Episodio '+selectedEpisode;
   iframe.loading='eager';
   iframe.referrerPolicy='no-referrer';
   iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');
   iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
   iframe.allowFullscreen=true;
   stage.appendChild(iframe);

   const link=document.createElement('a');
   link.className='oneup-embed-external';
   const yt=slot.url.match(/^https:\/\/www\.youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})$/);
   link.href=yt?'https://www.youtube.com/watch?v='+yt[1]:slot.url;
   link.target='_blank';link.rel='noopener noreferrer';link.textContent='Abrir reproductor en pestaña nueva ↗';
   stage.after(link);

   const sources=mediaByEpisode.get(selectedEpisode)?.sources||[];
   const nonNullIndices=sources.map((s,i)=>s?i:-1).filter(i=>i>=0);
   if(nonNullIndices.length>1){
    const curPos=nonNullIndices.indexOf(serverIndex);
    const nextIdx=nonNullIndices[(curPos+1)%nonNullIndices.length];
    const nextServer=sources[nextIdx]?.label||('Servidor '+(nextIdx+1));
    const altBtn=document.createElement('button');
    altBtn.type='button';altBtn.className='oneup-source-retry';
    altBtn.textContent='¿No carga? Probar '+nextServer+' ↻';
    altBtn.setAttribute('aria-label','Intentar otro servidor disponible');
    altBtn.addEventListener('click',()=>renderSources(nextIdx));
    stage.after(altBtn);
   }

   status.textContent='Reproduciendo desde '+(slot.label||'servidor')+' · Episodio '+selectedEpisode;
  }
 }else{
  const video=document.createElement('video');
  video.controls=true;video.playsInline=true;video.preload='metadata';
  video.setAttribute('aria-label','Episodio '+selectedEpisode+' desde '+slot.label);
  if(slot.mime!=='application/vnd.apple.mpegurl'){
   const source=document.createElement('source');source.src=slot.url;source.type=slot.mime;
   video.appendChild(source);
  }
  for(const entry of slot.tracks||[]){
   const track=document.createElement('track');
   track.kind='subtitles';track.srclang=entry.lang;track.label=entry.label;track.src=entry.url;
   video.appendChild(track);
  }
  video.addEventListener('loadedmetadata',()=>{if(video.isConnected)status.textContent='Fuente cargada · '+slot.label});
  video.addEventListener('playing',()=>{if(video.isConnected)status.textContent='Reproduciendo desde '+slot.label});
  video.addEventListener('error',()=>{if(video.isConnected){status.textContent='No se pudo reproducir esta fuente. Puedes intentar otro servidor.';offerRetry()}});
  stage.appendChild(video);
  document.dispatchEvent(new CustomEvent('oneup-video-ready',{detail:{video,tracks:slot.tracks||[]}}));
  // Detached media may continue playing/downloading; release direct files too.
  disposeActiveVideo=()=>{
   video.pause();
   video.removeAttribute('src');
   video.querySelectorAll('source').forEach(source=>source.removeAttribute('src'));
   video.load();
  };
  status.textContent='Fuente seleccionada: '+slot.label+' · '+slot.lang+' · '+slot.quality;
  if(slot.mime==='application/vnd.apple.mpegurl'){
   if(!window.OneUpHLS?.attach){
    status.textContent='El módulo HLS no está disponible. Prueba otro servidor.';
   }else{
    disposeActiveVideo=window.OneUpHLS.attach(video,slot.url,{
     onStatus:message=>{if(video.isConnected)status.textContent=message},
     onError:message=>{if(video.isConnected){status.textContent=message+' Puedes intentar otra fuente.';offerRetry()}}
    });
   }
  }
 }
}
let currentLinksToken=0;
async function loadLinksForEpisode(targetAnimeId,epNum,forceRefresh=false){
 const token=++currentLinksToken;
 const bases=[
  (typeof window!=='undefined'&&window.ONEUP_API_BASE),
  '/api',
  'http://127.0.0.1:4050/api',
  'http://localhost:4050/api'
 ].filter(Boolean);

 const qParts=[];
 if(forceRefresh)qParts.push('refresh=1');
 if(activeAnimeContext){
  if(activeAnimeContext.slug)qParts.push('slug='+encodeURIComponent(activeAnimeContext.slug));
  if(activeAnimeContext.title)qParts.push('title='+encodeURIComponent(activeAnimeContext.title));
  if(activeAnimeContext.title_romaji)qParts.push('romaji='+encodeURIComponent(activeAnimeContext.title_romaji));
  if(activeAnimeContext.raw_id)qParts.push('raw_id='+encodeURIComponent(String(activeAnimeContext.raw_id)));
 }
 const q=qParts.length?'?'+qParts.join('&'):'';

 for(const base of bases){
  const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),7000);
  try{
   const url=base.replace(/\/$/,'')+'/anime/'+encodeURIComponent(targetAnimeId)+'/episodes/'+encodeURIComponent(epNum)+'/links'+q;
   const res=await fetch(url,{cache:'no-cache',signal:ctrl.signal});
   if(!res.ok)continue;
   const json=await res.json();
   if(token!==currentLinksToken||activeAnime!==targetAnimeId)return null;
   return json;
  }catch(e){}finally{clearTimeout(t)}
 }
 return null;
}

function renderDownloads(downloads){
 if(!playerRoot)return;
 playerRoot.querySelector('.oneup-download-group')?.remove();
 if(!Array.isArray(downloads)||downloads.length===0)return;

 const group=document.createElement('div');
 group.className='oneup-server-selector oneup-download-group';
 group.setAttribute('role','group');
 group.setAttribute('aria-label','Enlaces de descarga para este episodio');

 const heading=document.createElement('strong');
 heading.textContent='ENLACES DE DESCARGA';
 group.appendChild(heading);

 for(const dl of downloads){
  const directUrl=safeUrl(dl.download_url||dl.remote,{allowHash:true});
  if(!directUrl)continue;
  const a=document.createElement('a');
  a.className='oneup-server-choice';
  a.href=directUrl.href;
  a.target='_blank';
  a.rel='noopener noreferrer';
  const sizeBadge=dl.size?` (${dl.size})`:'' ;
  a.textContent=`${dl.server||'Descarga'}${sizeBadge} ⤓`;
  group.appendChild(a);
 }

 const stage=playerRoot.querySelector('#oneup-playback-display');
 if(stage){
  stage.after(group);
 }else{
  playerRoot.appendChild(group);
 }
}

function renderSources(preferred=0){
 if(!playerRoot)return;
 const item=mediaByEpisode.get(selectedEpisode);
 const allSources=Array.isArray(item?.sources)&&item.sources.length>0?item.sources:Array(MAX_SERVERS).fill(null);
 const languageSelect=playerRoot.querySelector('#oneup-watch-language');
 const groups=new Set(allSources.filter(Boolean).map(languageGroup));
 if(selectedLanguage!=='all'&&!groups.has(selectedLanguage))selectedLanguage='all';
 if(languageSelect){
  languageSelect.innerHTML='<option value="all">Todos los idiomas disponibles</option>'+Object.entries(LANGUAGE_LABELS).filter(([key])=>groups.has(key)).map(([key,label])=>'<option value="'+key+'">'+label+'</option>').join('');
  languageSelect.value=selectedLanguage;
  languageSelect.disabled=groups.size===0;
 }
 const sources=allSources.map(source=>source&&(selectedLanguage==='all'||languageGroup(source)===selectedLanguage)?source:null);
 const selected=sources[preferred]?preferred:sources.findIndex(Boolean);

 const selector=playerRoot.querySelector('.oneup-server-selector:not(.oneup-download-group)');
 if(selector){
  const targetCount=Math.max(MAX_SERVERS,allSources.length);
  const currentButtons=selector.querySelectorAll('button[data-server-slot]');
  for(let idx=currentButtons.length;idx<targetCount;idx++){
   const btn=document.createElement('button');
   btn.type='button';
   btn.dataset.serverSlot=String(idx);
   btn.className='oneup-server-choice';
   btn.addEventListener('click',()=>{
    const src=mediaByEpisode.get(selectedEpisode)?.sources?.[idx];
    if(src)renderSources(idx);
   });
   selector.appendChild(btn);
  }

  let syncBtn=selector.querySelector('#oneup-sync-links');
  if(!syncBtn){
   syncBtn=document.createElement('button');
   syncBtn.type='button';
   syncBtn.id='oneup-sync-links';
   syncBtn.className='oneup-server-choice oneup-server-sync';
   syncBtn.textContent='⚡ Actualizar';
   syncBtn.title='Sincronizar enlaces actualizados desde JkAnime';
   syncBtn.addEventListener('click',()=>chooseEpisode(selectedEpisode,true,true));
  }
  if(syncBtn.parentElement!==selector||selector.lastElementChild!==syncBtn){
   selector.appendChild(syncBtn);
  }
 }

 const hasValidSources=allSources.some(Boolean);
 playerRoot.querySelectorAll?.('[data-server-slot]')?.forEach(button=>{
  const i=Number(button.dataset.serverSlot),source=sources[i];
  button.disabled=!source;
  button.textContent=source?.label||'Servidor '+(i+1);
  button.classList.toggle('active',Boolean(source&&i===selected));
  button.setAttribute('aria-pressed',String(Boolean(source&&i===selected)));
  button.title=source?'Cambiar a '+source.label:'Sin fuente configurada';
  if(!hasValidSources){
   button.style.display=i<MAX_SERVERS?'':'none';
  }else if(i>=sources.length){
   button.style.display='none';
  }else{
   button.style.display='';
  }
 });
 const heading=playerRoot.querySelector('#oneup-now-watching');
 if(heading)heading.textContent='Episodio '+selectedEpisode+(item?.title?' · '+item.title:'');
 showVideo(selected>=0?sources[selected]:null,selected);
}
function chooseEpisode(number,broadcast=true,forceRefresh=false){
 const next=safeNumber(number,selectedEpisode);
 if(next>episodeCount||!playerRoot?.isConnected)return;
 selectedEpisode=next;
 updateEpisodeSelect();

 const currentItem=mediaByEpisode.get(next);
 const needsFetch=forceRefresh||(!currentItem?.sources||currentItem.sources.length===0)&&(currentItem?.backend||Boolean(activeAnime));

 if(needsFetch){
  const status=playerRoot.querySelector('#oneup-player-message');
  const syncBtn=playerRoot.querySelector('#oneup-sync-links');
  if(syncBtn){
   syncBtn.disabled=true;
   syncBtn.textContent='⏳ Actualizando…';
  }
  if(status)status.textContent=forceRefresh?'Sincronizando enlaces en vivo desde JkAnime…':'Cargando servidores del episodio '+next+'…';
  loadLinksForEpisode(activeAnime,next,forceRefresh).then(linksData=>{
   if(syncBtn){
    syncBtn.disabled=false;
    syncBtn.textContent='⚡ Actualizar';
   }
   if(!playerRoot?.isConnected)return;
   if(!linksData){
    if(status)status.textContent=forceRefresh?'No se pudo sincronizar en vivo. Se conservan los servidores disponibles.':'No se encontraron servidores configurados para este episodio.';
    return;
   }
   const playerSources=(linksData.players||[]).map((p,i)=>{
    const playerUrl = p.embed_url && safeEmbedUrl(p.embed_url) ? p.embed_url : (p.player_url && safeEmbedUrl(p.player_url) ? p.player_url : p.embed_url);
    return sourceOf({
     backend:true,
     rights:'authorized',
     kind:'embed',
     name:p.server||'Servidor '+(i+1),
     label:p.server||'Servidor '+(i+1),
     url:playerUrl,
     quality:p.quality||'HD',
     language:'Japonés subtitulado'
    },i,{backend:true});
   }).filter(Boolean);

   const item=mediaByEpisode.get(next)||{title:'Episodio '+next};
   if(playerSources.length>0||!item.sources||item.sources.length===0){
    item.sources=playerSources;
   }
   if(linksData.downloads?.length>0||!item.downloads||item.downloads.length===0){
    item.downloads=linksData.downloads||[];
   }
   item.backend=true;
   mediaByEpisode.set(next,item);
   renderSources(0);
   renderDownloads(item.downloads);
   if(status){
    if(playerSources.length){
     status.textContent=forceRefresh?'Servidores actualizados para episodio '+next:'Servidores listos para episodio '+next;
    }else if(item.sources?.length){
     status.textContent='Servidores listos para episodio '+next;
    }else{
     status.textContent='No se encontraron servidores para este episodio.';
    }
   }
  }).catch(()=>{
   if(syncBtn){
    syncBtn.disabled=false;
    syncBtn.textContent='⚡ Actualizar';
   }
   if(status)status.textContent='No se pudo conectar con el servidor para actualizar.';
  });
 }

 renderSources();
 renderDownloads(mediaByEpisode.get(next)?.downloads||[]);
 if(broadcast)document.dispatchEvent(new CustomEvent('oneup-episode-selected',{detail:{animeId:activeAnime,season:activeSeason,episode:next}}));
}
async function show(anime,{root,season=1}={}){
 if(!anime?.id)return;
 // Stop the previous anime before fetching, even if the next request fails.
 closeVideo();
 const id=String(anime.id),token=++requestId;
 activeAnime=id;
 activeAnimeContext={
  id,
  slug:anime.slug||'',
  raw_id:anime.raw_id||null,
  title:typeof anime.title==='string'?anime.title:(anime.title?.romaji||anime.title?.english||''),
  title_romaji:anime.title_romaji||(anime.title?.romaji||''),
  aliases:Array.isArray(anime.aliases)?anime.aliases:[]
 };
 activeAnime=id;activeSeason=safeNumber(season,1);selectedEpisode=1;episodeCount=1;selectedLanguage='all';mediaByEpisode=new Map();
 playerRoot=root||document.querySelector('#oneup-player-section');
 if(!playerRoot)return;
 playerRoot.hidden=false;
 playerRoot.innerHTML='<div class="oneup-detail-section"><h3>VER EPISODIOS</h3><p>Preparando opciones de reproducción…</p></div>';
 let map;
 try{map=await configuredEpisodes(id,activeSeason)}
 catch{map=new Map()}
 if(token!==requestId||activeAnime!==id||!playerRoot?.isConnected)return;
 mediaByEpisode=map;
 const backendTotal=anime.episodes_total||(typeof anime.episodes==='number'?anime.episodes:0)||anime.episodes_count||(Array.isArray(anime.episodes)?anime.episodes.length:0)||0;
 episodeCount=Math.min(9999,Math.max(1,safeNumber(backendTotal,1),...map.keys()));
 if(mediaByEpisode.size===0){
  for(let i=1;i<=episodeCount;i++){
   mediaByEpisode.set(i,{title:'Episodio '+i,sources:[],backend:true,downloads:[]});
  }
 }
 const visible=Math.min(episodeCount,120);
 playerRoot.innerHTML='<div class="oneup-detail-section oneup-watch-panel">'+
  '<div class="oneup-watch-title"><div><span class="micro">1UP ANIME · EPISODIOS</span><h3>VER EPISODIOS</h3></div><span class="oneup-watch-counter">Opciones de servidor</span></div>'+
  '<div class="oneup-watch-controls"><label for="oneup-watch-episode">Selecciona un episodio</label>'+
  '<select id="oneup-watch-episode" aria-label="Seleccionar episodio para ver">'+
  Array.from({length:visible},(_,i)=>'<option value="'+(i+1)+'">Episodio '+(i+1)+'</option>').join('')+'</select>'+
  (episodeCount>120?'<label class="oneup-watch-jump" for="oneup-watch-episode-number">Ir al episodio <input id="oneup-watch-episode-number" type="number" min="1" max="'+episodeCount+'" value="1"></label>':'')+
  '<label for="oneup-watch-language">Idioma de reproducción</label><select id="oneup-watch-language" aria-label="Idioma de reproducción"></select></div>'+
  '<h4 id="oneup-now-watching">Episodio 1</h4>'+
  '<div class="oneup-server-selector" role="group" aria-label="Siete servidores disponibles si están configurados"><strong>ELEGIR SERVIDOR</strong>'+
  Array.from({length:MAX_SERVERS},(_,i)=>'<button type="button" data-server-slot="'+i+'" class="oneup-server-choice" disabled>Servidor '+(i+1)+'</button>').join('')+'</div>'+
  '<div id="oneup-playback-display" class="oneup-playback-stage"></div>'+
  '<p id="oneup-player-message" class="oneup-player-state" role="status" aria-live="polite"></p>'+
  '<p class="oneup-playback-hint">Las opciones se habilitan únicamente cuando existe una fuente HTTPS válida con permiso de distribución o inserción.</p></div>';
 playerRoot.querySelector('#oneup-watch-episode')?.addEventListener('change',e=>chooseEpisode(Number(e.target.value)));
 playerRoot.querySelector('#oneup-watch-episode-number')?.addEventListener('change',e=>chooseEpisode(Number(e.target.value)));
 playerRoot.querySelector('#oneup-watch-language')?.addEventListener('change',e=>{selectedLanguage=e.target.value;renderSources()});
 playerRoot.querySelectorAll('[data-server-slot]').forEach(button=>button.addEventListener('click',()=>{
  const i=Number(button.dataset.serverSlot),source=mediaByEpisode.get(selectedEpisode)?.sources?.[i];
  if(source)renderSources(i);
 }));
 chooseEpisode(1,false);
}
document.addEventListener('oneup-episode-selected',e=>{
 const d=e.detail;
 if(d?.animeId===activeAnime&&safeNumber(d.season,1)===activeSeason&&Number(d.episode)!==selectedEpisode)chooseEpisode(Number(d.episode),false);
});
function close(){
 closeVideo();
 ++requestId;activeAnime='';activeAnimeContext=null;playerRoot=null;mediaByEpisode=new Map();
}
document.addEventListener('oneup-anime-closed',close);
window.OneUpEpisodePlayer={show,close};
})();
