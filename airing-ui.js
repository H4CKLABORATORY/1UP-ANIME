/* ONE UP / EN EMISIÓN: published schedule dates,  seasonal premieres & trailers.
 * No claims that a broadcast equals licensed streaming availability.
 */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const approved=id=>/^[A-Za-z0-9_-]{11}$/.test(String(id||''));
const media=new Map();
let calendar=null;
const dateKey=date=>{const d=new Date(date);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const formatTime=unix=>new Intl.DateTimeFormat('es',{hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(unix*1000));
const formatDay=unix=>new Intl.DateTimeFormat('es',{weekday:'short',day:'numeric',month:'short'}).format(new Date(unix*1000));
const formatPremiere=iso=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso||''))return 'Fecha por confirmar';
 const [y,m,d]=iso.split('-').map(Number);
 return new Intl.DateTimeFormat('es',{day:'numeric',month:'short',year:'numeric'}).format(new Date(y,m-1,d,12));
};
function findTitle(a){return a?.title||'Anime sin título'}
function normalizeForStudio(a){
 return {id:a.id,mal_id:a.mal_id,ani_id:a.ani_id||null,title:findTitle(a),description:a.description||'',
 description_es:a.description_es||'',image:a.image||'',banner:a.banner||'',year:a.year||'',
 format:a.format||'TV',averageScore:a.averageScore||0,episodes:a.episodes||0,genres:a.genres||[],
 status:a.status||'',next:a.next||null,startDate:a.startDate||null,trailer:a.trailer||null,
 siteUrl:a.siteUrl||'',streaming:[],source:'airing'};
}
function remember(a){
 if(!a?.id)return;
 const item=normalizeForStudio(a);
 media.set(a.id,item);
 window.OneUpCatalog?.register([item]);
}
function animeCard(a,mode){
 const image=a.image?'<img src="'+esc(a.image)+'" loading="lazy" alt="Póster de '+esc(findTitle(a))+'">':'<div class="airing-empty-art">1UP</div>';
 const sub=mode==='season'?
  '<span class="airing-date">'+esc(formatPremiere(a.startDate))+'</span>'+
  (a.trailer?' <span class="airing-with-trailer">▷ Tráiler</span>':''):
  '<span class="airing-date">'+esc(formatTime(a.airingAt))+' · Episodio '+esc(a.episode||'?')+'</span>';
 return '<button class="airing-anime" type="button" data-airing-anime="'+esc(a.id)+'" aria-label="Ver información de '+esc(findTitle(a))+'">'+
 '<span class="airing-cover">'+image+'</span><span class="airing-meta">'+
 '<strong>'+esc(findTitle(a))+'</strong>'+sub+'</span></button>';
}
function renderShelf(id,items,mode){
 const target=$('#'+id);if(!target)return;
 const show=items.slice(0,18);
 if(!show.length){
  target.innerHTML='<p class="airing-empty">No hay emisiones confirmadas en esta fecha. El calendario se actualiza con los datos disponibles de AniList.</p>';
  return;
 }
 show.forEach(remember);
 target.innerHTML=show.map(a=>animeCard(a,mode)).join('');
}
function splitDates(entries){
 const now=new Date(),today=dateKey(now);
 const previous=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);
 const yesterday=dateKey(previous);
 const moment=Date.now()/1000;
 return {
  today:entries.filter(a=>dateKey(a.airingAt*1000)===today&&a.airingAt<=moment).sort((a,b)=>b.airingAt-a.airingAt),
  yesterday:entries.filter(a=>dateKey(a.airingAt*1000)===yesterday&&a.airingAt<=moment).sort((a,b)=>b.airingAt-a.airingAt),
  upcoming:entries.filter(a=>a.airingAt>moment).sort((a,b)=>a.airingAt-b.airingAt)
 };
}
function display(){
 if(!calendar)return;
 const items=Array.isArray(calendar.airing)?calendar.airing:[];
 items.forEach(remember);
 const dates=splitDates(items);
 renderShelf('airing-today',dates.today,'episode');
 renderShelf('airing-yesterday',dates.yesterday,'episode');
 renderShelf('airing-upcoming',dates.upcoming,'episode');
 const season=calendar.seasonal?.entries||[];
 season.forEach(remember);
 renderShelf('airing-season',season.slice(0,22),'season');
 const checked=$('#airing-update-note');
 if(checked){
  const updated=calendar.updated?new Date(calendar.updated):null;
  checked.textContent='Horarios según AniList · Tu zona horaria'+(updated&&!isNaN(+updated)?' · Actualizado '+new Intl.DateTimeFormat('es',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(updated):'')+'. Una emisión no garantiza que el episodio esté disponible en streaming.';
 }
 const coming=$('#airing-count');
 if(coming)coming.textContent=dates.today.length+' emisiones hoy · '+dates.yesterday.length+' ayer · '+dates.upcoming.length+' próximas';
}
function insertLayout(){
 const anchor=$('.season-banner')||$('.schedule-preview');
 if(!anchor||$('#oneup-airing-dashboard'))return;
 const host=document.createElement('section');
 host.id='oneup-airing-dashboard';
 host.className='wrap oneup-airing-dashboard';
 host.innerHTML=
 '<div class="airing-heading"><div><span class="micro">1UP ANIME · EN EMISIÓN</span><h2>ESTRENOS POR <em>DÍA.</em></h2><p>Consulta qué capítulos se emitieron y cuándo serán los siguientes.</p></div><span id="airing-count" class="airing-summary">Consultando emisiones…</span></div>'+
 '<div class="airing-category"><div class="airing-category-title"><h3>EMITIDOS <em>HOY</em></h3><span>Capítulos con horario de emisión registrado para hoy</span></div><div id="airing-today" class="airing-rail"><p class="airing-empty">Cargando horarios…</p></div></div>'+
 '<div class="airing-category"><div class="airing-category-title"><h3>EMITIDOS <em>AYER</em></h3><span>Lo emitido durante el día anterior</span></div><div id="airing-yesterday" class="airing-rail"><p class="airing-empty">Cargando horarios…</p></div></div>'+
 '<div class="airing-category"><div class="airing-category-title"><h3>PRÓXIMAS <em>EMISIONES</em></h3><span>Fecha y hora local de los próximos episodios</span></div><div id="airing-upcoming" class="airing-rail"><p class="airing-empty">Buscando próximos episodios…</p></div></div>'+
 '<p id="airing-update-note" class="airing-note">Los horarios pueden variar por país y plataforma.</p>'+
 '<div class="airing-premieres"><div class="airing-heading"><div><span class="micro">ESTRENOS Y NUEVAS TEMPORADAS</span><h2>ANIMES DE <em>TEMPORADA.</em></h2><p>Fecha del estreno, información y tráiler disponible en la ficha.</p></div></div><div id="airing-season" class="airing-rail"><p class="airing-empty">Cargando estrenos…</p></div></div>';
 anchor.parentNode.insertBefore(host,anchor);
 host.addEventListener('click',e=>{
  const button=e.target.closest('[data-airing-anime]');if(!button)return;
  const item=media.get(button.dataset.airingAnime);if(!item)return;
  window.OneUpCatalog?.register([item]);
  window.OneUpCatalog?.open(item.id);
 });
}
async function fallbackLive(){
 const now=Math.floor(Date.now()/1000);
 const q='query($from:Int,$to:Int){Page(page:1,perPage:50){airingSchedules(airingAt_greater:$from,airingAt_lesser:$to,sort:TIME){id episode airingAt media{id idMal type isAdult format title{romaji english}coverImage{large}bannerImage status episodes genres seasonYear}}}}';
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);
 try{
  const res=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query:q,variables:{from:now-48*3600,to:now+72*3600}}),signal:ctrl.signal});
  if(!res.ok)throw Error('AniList unavailable');
  const data=await res.json();
  const entries=(data.data?.Page?.airingSchedules||[]).filter(x=>x.media?.type==='ANIME'&&!x.media.isAdult).map(x=>({
   id:x.media.idMal?'mal-'+x.media.idMal:'al-'+x.media.id,
   mal_id:x.media.idMal,ani_id:x.media.id,title:x.media.title?.english||x.media.title?.romaji,
   image:x.media.coverImage?.large,banner:x.media.bannerImage,format:x.media.format,
   year:x.media.seasonYear,episodes:x.media.episodes,genres:x.media.genres,
   episode:x.episode,airingAt:x.airingAt,status:x.media.status
  }));
  return entries.length?{airing:entries,seasonal:{entries:[]},updated:new Date().toISOString()}:null;
 }finally{clearTimeout(timer)}
}
function placeCalendar(){
 const el=$('#oneup-airing-dashboard'),home=$('#home-screen'),browse=$('#browse-screen');
 if(!el||!home||!browse)return;
 const route=location.hash.replace('#','');
 if(route==='temporada'||route==='programacion'){
  const heading=browse.querySelector('.browse-intro');
  if(heading)heading.after(el);
 }else if(!home.contains(el)){
  const anchor=home.querySelector('.season-banner')||home.querySelector('.schedule-preview');
  if(anchor)anchor.before(el);
 }
}
document.addEventListener('click',event=>{
 if(event.target.closest('[data-route]'))setTimeout(placeCalendar,0);
},true);
window.addEventListener('hashchange',placeCalendar);
async function load(){
 insertLayout();
 placeCalendar();
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),8500);
  let r;
  try{r=await fetch('./data/airing.json',{cache:'no-store',signal:ctrl.signal})}finally{clearTimeout(timer)}
  if(!r.ok)throw Error('Snapshot pending');
  const d=await r.json();
  if(!Array.isArray(d.airing))throw Error('Invalid schedule');
  calendar=d;
 }catch(e){
  try{calendar=await fallbackLive()}catch{}
 }
 if(calendar)display();
 else{
  for(const id of ['airing-today','airing-yesterday','airing-upcoming','airing-season']){
   const element=$('#'+id);if(element)element.innerHTML='<p class="airing-empty">El calendario todavía no está disponible. Vuelve a intentarlo cuando termine la actualización de AniList.</p>';
  }
  const label=$('#airing-count');if(label)label.textContent='Horarios temporalmente no disponibles';
 }
}
async function fetchIndividualTrailer(a){
 let id=Number(a.ani_id)||0,mal=Number(a.mal_id)||0;
 if(!id&&!mal)return null;
 const query='query($id:Int,$mal:Int){Media(id:$id,idMal:$mal,type:ANIME){trailer{id site}startDate{year month day}description(asHtml:false)}}';
 const body={query,variables:{...(id?{id}:{}),...(mal?{mal}:{})}};
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6700);
 try{
  const r=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctrl.signal});
  if(!r.ok)return null;
  return (await r.json()).data?.Media||null;
 }catch{return null}finally{clearTimeout(timer)}
}
function trailerPane(a,info){
 if(!a?.id)return;
 const root=$('#anime-dialog-body');if(!root)return;
 root.querySelector('#oneup-trailer-pane')?.remove();
 const trailer=info?.trailer||a.trailer;
 if(!trailer||trailer.site!=='youtube'||!approved(trailer.id))return;
 const pane=document.createElement('section');pane.id='oneup-trailer-pane';pane.className='oneup-trailer-pane';
 pane.innerHTML='<div><span class="micro">AVANCE DEL ANIME</span><h3>TRÁILER DE <em>'+esc(a.title)+'</em></h3><p>Tráiler enlazado por AniList. El video se carga solamente cuando pulses reproducir.</p></div>'+
 '<button id="oneup-trailer-play" type="button" class="oneup-trailer-thumb" aria-label="Reproducir tráiler de '+esc(a.title)+'">'+
 '<img src="https://i.ytimg.com/vi/'+trailer.id+'/hqdefault.jpg" alt="Vista previa del tráiler" loading="lazy"><span class="oneup-trailer-play-icon">▷</span><strong>Reproducir tráiler</strong></button>'+
 '<div id="oneup-trailer-frame" hidden></div>';
 const after=root.querySelector('.oneup-detail-cover');
 if(after)after.after(pane);else root.prepend(pane);
 const button=pane.querySelector('#oneup-trailer-play');
 button.addEventListener('click',()=>{
  const frame=pane.querySelector('#oneup-trailer-frame');
  frame.hidden=false;
  const iframe=document.createElement('iframe');
  iframe.title='Tráiler de '+a.title;
  iframe.loading='eager';
  iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  iframe.allowFullscreen=true;
  iframe.src='https://www.youtube-nocookie.com/embed/'+trailer.id+'?rel=0&autoplay=1';
  frame.appendChild(iframe);button.hidden=true;
 });
}
async function animeOpened(a){
 if(!a)return;
 const req=a.id;
 const external=media.get(req);
 if(external?.trailer){trailerPane(a,external);return}
 if(a.trailer){trailerPane(a,a);return}
 const details=await fetchIndividualTrailer(a);
 if(window.OneUpCatalog?.active()!==req)return;
 trailerPane(a,details);
}
document.addEventListener('oneup-anime-opened',e=>animeOpened(e.detail));
document.addEventListener('DOMContentLoaded',load);
window.OneUpAiring={get:()=>calendar,refresh:load};
})();