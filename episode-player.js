/* 1UP Anime: seven server slots and per-episode playback for authorized media.
 * The player only loads configured HTTPS video files or embeds from specifically
 * supported providers. It does not discover, scrape, proxy or download streams.
 */
(()=>{
'use strict';
const MAX_SERVERS=7;
let requestId=0,activeAnime='',selectedEpisode=1,episodeCount=1;
let mediaByEpisode=new Map(),playerRoot=null;
let disposeActiveVideo=null;
function closeVideo(){
 if(typeof disposeActiveVideo==='function')disposeActiveVideo();
 disposeActiveVideo=null;
}

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeNumber=(value,fallback=1)=>{const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=9999?n:fallback};

function safeUrl(value){
 try{
  const raw=String(value??'').trim();if(!raw)return null;
  const u=new URL(raw,location.href);
  if(u.protocol!=='https:'||u.username||u.password)return null;
  return u;
 }catch{return null}
}
function safeEmbedUrl(raw){
 const u=safeUrl(raw);if(!u)return '';
 const h=u.hostname.toLowerCase(),p=u.pathname;
 if((h==='www.youtube-nocookie.com'||h==='www.youtube.com')&&new RegExp('^/embed/[A-Za-z0-9_-]{11}$').test(p)){
  return 'https://www.youtube-nocookie.com'+p;
 }
 if(h==='player.vimeo.com'&&new RegExp('^/video/[0-9]+$').test(p))return 'https://player.vimeo.com'+p;
 if(h==='archive.org'&&new RegExp('^/embed/[a-zA-Z0-9_.-]+$').test(p))return 'https://archive.org'+p;
 return '';
}
function sourceOf(source,index,inheritedRights){
 if(!source||typeof source!=='object')return null;
 // A URL does not itself establish authorization; the catalog editor must declare rights.
 if(!['owned','authorized'].includes(String(source.rights||inheritedRights||'').toLowerCase()))return null;
 const label=String(source.name||source.label||'Servidor '+(index+1)).slice(0,45);
 const lang=String(source.language||'No especificado').slice(0,35);
 const quality=String(source.quality||'No especificada').slice(0,35);
 const officialYouTube=source.mode==='official_embed'&&source.provider==='youtube'&&
  /^[A-Za-z0-9_-]{11}$/.test(source.videoId||'')?
   'https://www.youtube-nocookie.com/embed/'+source.videoId:'';
 const embed=safeEmbedUrl(officialYouTube||source.embed||source.embedUrl||source.iframe||((source.type==='embed'||source.kind==='embed')?source.url:''));
 if(embed)return {kind:'embed',url:embed,label,lang,quality};
 const u=safeUrl(source.src||((source.type!=='embed'&&source.kind!=='embed')?source.url:''));
 if(!u)return null;
 const supported={'video/mp4':1,'video/webm':1,'application/vnd.apple.mpegurl':1};
 const guessed=u.pathname.toLowerCase().endsWith('.m3u8')?'application/vnd.apple.mpegurl':u.pathname.toLowerCase().endsWith('.webm')?'video/webm':'video/mp4';
 const mime=supported[source.mime]?source.mime:guessed;
 return {kind:'video',url:u.href,label,lang,quality,mime};
}
function configuredSources(item){
 const raw=Array.isArray(item.sources)?item.sources:[{name:'Servidor 1',src:item.src,mime:item.mime}];
 return Array.from({length:MAX_SERVERS},(_,i)=>sourceOf(raw[i],i,item.rights));
}
async function configuredEpisodes(id){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
 try{
  const r=await fetch('./data/licensed-media.json',{cache:'no-cache',signal:ctrl.signal});
  if(!r.ok)throw Error('No se pudo consultar el catálogo multimedia.');
  const json=await r.json();
  const records=json?.entries?.[id]?.episodes;
  const map=new Map();
  if(Array.isArray(records))records.slice(0,9999).forEach((item,index)=>{
   if(!item||typeof item!=='object')return;
   const no=safeNumber(item.number??item.episode,index+1);
   map.set(no,{title:String(item.title||'Episodio '+no).slice(0,120),sources:configuredSources(item),
     captions:safeUrl(item.subtitles_es)?.href||''});
  });
  return map;
 }finally{clearTimeout(timer)}
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
function showVideo(slot){
 // Release prior MediaSource buffers before replacing DOM (critical on iPhone).
 closeVideo();
 const stage=playerRoot.querySelector('#oneup-playback-display');
 const status=playerRoot.querySelector('#oneup-player-message');
 stage.replaceChildren();
 if(!slot){
  const placeholder=document.createElement('div');
  placeholder.className='oneup-player-placeholder';
  placeholder.textContent='Todavía no hay una fuente de reproducción disponible para este episodio.';
  stage.appendChild(placeholder);
  status.textContent='Solo se habilitan servidores configurados con permiso de integración.';
  return;
 }
 if(slot.kind==='embed'){
  const iframe=document.createElement('iframe');
  iframe.src=slot.url;
  iframe.title='Reproductor autorizado · '+slot.label+' · Episodio '+selectedEpisode;
  iframe.loading='lazy';
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups');
  iframe.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
  iframe.allowFullscreen=true;
  stage.appendChild(iframe);
  status.textContent='Reproductor externo: '+slot.label+'. Su disponibilidad depende del proveedor.';
 }else{
  const video=document.createElement('video');
  video.controls=true;video.playsInline=true;video.preload='metadata';
  video.setAttribute('aria-label','Episodio '+selectedEpisode+' desde '+slot.label);
  if(slot.mime!=='application/vnd.apple.mpegurl'){
   const source=document.createElement('source');source.src=slot.url;source.type=slot.mime;
   video.appendChild(source);
  }
  const caption=mediaByEpisode.get(selectedEpisode)?.captions;
  if(caption){
   const track=document.createElement('track');
   track.kind='subtitles';track.srclang='es';track.label='Español';track.src=caption;
   video.appendChild(track);
  }
  video.addEventListener('loadedmetadata',()=>{if(video.isConnected)status.textContent='Fuente cargada · '+slot.label});
  video.addEventListener('playing',()=>{if(video.isConnected)status.textContent='Reproduciendo desde '+slot.label});
  video.addEventListener('error',()=>{if(video.isConnected)status.textContent='No se pudo reproducir. Selecciona otro servidor disponible.'});
  stage.appendChild(video);
  status.textContent='Fuente seleccionada: '+slot.label+' · '+slot.lang+' · '+slot.quality;
  if(slot.mime==='application/vnd.apple.mpegurl'){
   if(!window.OneUpHLS?.attach){
    status.textContent='El módulo HLS no está disponible. Prueba otro servidor.';
   }else{
    disposeActiveVideo=window.OneUpHLS.attach(video,slot.url,{
     onStatus:message=>{if(video.isConnected)status.textContent=message},
     onError:message=>{if(video.isConnected)status.textContent=message+' Selecciona otra fuente.'}
    });
   }
  }
 }
}
function renderSources(preferred=0){
 if(!playerRoot)return;
 const item=mediaByEpisode.get(selectedEpisode);
 const sources=item?.sources||Array(MAX_SERVERS).fill(null);
 const selected=sources[preferred]?preferred:sources.findIndex(Boolean);
 playerRoot.querySelectorAll('[data-server-slot]').forEach(button=>{
  const i=Number(button.dataset.serverSlot),source=sources[i];
  button.disabled=!source;button.textContent=source?.label||'Servidor '+(i+1);
  button.classList.toggle('active',Boolean(source&&i===selected));
  button.setAttribute('aria-pressed',String(Boolean(source&&i===selected)));
  button.title=source?'Cambiar a '+source.label:'Sin fuente configurada';
 });
 const heading=playerRoot.querySelector('#oneup-now-watching');
 if(heading)heading.textContent='Episodio '+selectedEpisode+(item?.title?' · '+item.title:'');
 showVideo(selected>=0?sources[selected]:null);
}
function chooseEpisode(number,broadcast=true){
 const next=safeNumber(number,selectedEpisode);
 if(next>episodeCount||!playerRoot?.isConnected)return;
 if(selectedEpisode===next&&playerRoot.querySelector('#oneup-playback-display')?.children.length&&broadcast)return;
 selectedEpisode=next;
 updateEpisodeSelect();renderSources();
 if(broadcast)document.dispatchEvent(new CustomEvent('oneup-episode-selected',{detail:{animeId:activeAnime,episode:next}}));
}
async function show(anime){
 if(!anime?.id)return;
 const id=String(anime.id),token=++requestId;
 activeAnime=id;selectedEpisode=1;episodeCount=1;mediaByEpisode=new Map();
 playerRoot=document.querySelector('#oneup-player-section');
 if(!playerRoot)return;
 playerRoot.hidden=false;
 playerRoot.innerHTML='<div class="oneup-detail-section"><h3>VER EPISODIOS</h3><p>Preparando opciones de reproducción…</p></div>';
 let map;
 try{map=await configuredEpisodes(id)}
 catch{map=new Map()}
 if(token!==requestId||activeAnime!==id||!playerRoot?.isConnected)return;
 mediaByEpisode=map;
 episodeCount=Math.min(9999,Math.max(1,safeNumber(anime.episodes,1),...map.keys()));
 const visible=Math.min(episodeCount,120);
 playerRoot.innerHTML='<div class="oneup-detail-section oneup-watch-panel">'+
  '<div class="oneup-watch-title"><div><span class="micro">1UP ANIME · EPISODIOS</span><h3>VER EPISODIOS</h3></div><span class="oneup-watch-counter">7 opciones de servidor</span></div>'+
  '<div class="oneup-watch-controls"><label for="oneup-watch-episode">Selecciona un episodio</label>'+
  '<select id="oneup-watch-episode" aria-label="Seleccionar episodio para ver">'+
  Array.from({length:visible},(_,i)=>'<option value="'+(i+1)+'">Episodio '+(i+1)+'</option>').join('')+'</select>'+
  (episodeCount>120?'<label class="oneup-watch-jump" for="oneup-watch-episode-number">Ir al episodio <input id="oneup-watch-episode-number" type="number" min="1" max="'+episodeCount+'" value="1"></label>':'')+'</div>'+
  '<h4 id="oneup-now-watching">Episodio 1</h4>'+
  '<div class="oneup-server-selector" role="group" aria-label="Siete servidores disponibles si están configurados"><strong>ELEGIR SERVIDOR</strong>'+
  Array.from({length:MAX_SERVERS},(_,i)=>'<button type="button" data-server-slot="'+i+'" class="oneup-server-choice" disabled>Servidor '+(i+1)+'</button>').join('')+'</div>'+
  '<div id="oneup-playback-display" class="oneup-playback-stage"></div>'+
  '<p id="oneup-player-message" class="oneup-player-state" role="status" aria-live="polite"></p>'+
  '<p class="oneup-playback-hint">Las opciones se habilitan únicamente cuando existe una fuente HTTPS válida con permiso de distribución o inserción.</p></div>';
 playerRoot.querySelector('#oneup-watch-episode').addEventListener('change',e=>chooseEpisode(Number(e.target.value)));
 playerRoot.querySelector('#oneup-watch-episode-number')?.addEventListener('change',e=>chooseEpisode(Number(e.target.value)));
 playerRoot.querySelectorAll('[data-server-slot]').forEach(button=>button.addEventListener('click',()=>{
  const i=Number(button.dataset.serverSlot),source=mediaByEpisode.get(selectedEpisode)?.sources?.[i];
  if(source)renderSources(i);
 }));
 chooseEpisode(1,false);
}
document.addEventListener('oneup-episode-selected',e=>{
 const d=e.detail;
 if(d?.animeId===activeAnime&&Number(d.episode)!==selectedEpisode)chooseEpisode(Number(d.episode),false);
});
document.addEventListener('oneup-anime-closed',()=>{
 closeVideo();
 ++requestId;activeAnime='';playerRoot=null;mediaByEpisode=new Map();
});
window.OneUpEpisodePlayer={show};
})();
