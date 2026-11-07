/* 1UP ANIME — single theme system (Phase 1 cleanup, Nov 2026).
 *
 * This ONE file replaces the 9 theme scripts the 6 old theme systems used to
 * load on every page (kokomi-studio, october-2026, kokomi-mobile-preview,
 * cinematic-v3, oneup-palette, oneup-motion). Each section below is one of
 * those scripts, unchanged, in the same execution order — every section is a
 * self-contained IIFE and sections are separated by ";" so concatenation
 * cannot merge two statements. The old per-theme files live in git history.
 *
 * Palette behaviour is unchanged: esmeralda is the default, the stored
 * choice (localStorage oneup.palette.v1) is applied automatically, and the
 * header palette button stays an optional advanced setting.
 *
 * Intro video rule: the signature video has no src in the markup
 * (preload="none"); the cinematic studio section attaches it only when the
 * intro actually plays, and the opening controller cancels any in-flight
 * fetch before removing the overlay — removing a <video> mid-download
 * aborts the fetch (net::ERR_ABORTED).
 */

;
/* ===== 1/9 — themes/kokomi-studio/theme.js ===== */

;
/* 1UP Studio — small original editorial modules.
   The licensed Kokomi HTML, styles and scripts are NOT imported.
   The existing 1UP catalogue, search, player and accounts stay in control.
*/
(()=>{
'use strict';
const $=q=>document.querySelector(q);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const floatDate=stamp=>{
 const d=new Date(stamp*1000);
 return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('es-US',{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(d):'';
};
const dock=[
 {title:'En emisión',sub:'Anime de temporada',route:'temporada',symbol:'◉'},
 {title:'Calendario',sub:'Próximos estrenos',route:'programacion',symbol:'◷'},
 {title:'Películas',sub:'Cine y especiales',route:'peliculas',symbol:'▷'},
 {title:'Comunidad',sub:'Debates y teorías',url:'./comunidad.html',symbol:'✦'}
];
function attachDock(root){
 const menu=document.createElement('nav');
 menu.id='oneup-studio-dock';menu.className='oneup-studio-dock wrap';
 menu.setAttribute('aria-label','Accesos rápidos al anime');
 menu.innerHTML=dock.map(x=>{
  const inner='<span class="studio-dock-icon" aria-hidden="true">'+esc(x.symbol)+'</span>'+
   '<span class="studio-dock-label">'+esc(x.title)+'<small>'+esc(x.sub)+'</small></span>'+
   '<span class="studio-dock-arrow" aria-hidden="true">↗</span>';
  return x.route?'<button type="button" class="studio-dock-item" data-route="'+x.route+'">'+inner+'</button>':
    '<a class="studio-dock-item" href="'+esc(x.url)+'">'+inner+'</a>';
 }).join('');
 root.after(menu);
 return menu;
}
function renderTrailers(data){
 const banner=$('#home-screen .season-banner');
 if(!banner)return;
 const originals=[...(Array.isArray(data.seasonal?.entries)?data.seasonal.entries:[]),...(Array.isArray(data.airing)?data.airing:[])];
 const seen=new Set();
 const rows=originals.filter(x=>{
  const id=x?.trailer?.id;
  if(!/^((mal|al)-\d+)$/.test(x?.id||'')||x.trailer?.site!=='youtube'||!/^[a-zA-Z0-9_-]{11}$/.test(id||'')||!/^https:\/\//.test(x?.banner||x?.image||'')||seen.has(x.id))return false;
  seen.add(x.id);return true;
 }).slice(0,5);
 if(rows.length<2)return;
 window.OneUpCatalog?.register?.(rows);
 const preview=rows[0];
 const posters=rows.slice(1);
 const section=document.createElement('section');
 section.className='oneup-studio-trailers wrap';section.id='oneup-studio-trailers';
 section.setAttribute('aria-label','Tráilers de AniList disponibles en la ficha del anime');
 section.innerHTML=
  '<header class="oneup-studio-trailer-heading"><div><span>ESTRENOS / AVANCES</span><h2>EL PRÓXIMO <em>ESTRENO.</em></h2></div>'+
  '<p>Una selección de tráilers enlazados desde AniList. La reproducción abre la ficha del anime y requiere que el visitante la elija.</p></header>'+
  '<div class="oneup-studio-trailer-grid">'+
   '<button class="oneup-studio-trailer-main" type="button" data-details="'+esc(preview.id)+'" aria-label="Ver ficha y tráiler de '+esc(preview.title)+'">'+
    '<img alt="" loading="lazy" src="'+esc(preview.banner||preview.image)+'" referrerpolicy="no-referrer">'+
    '<span class="oneup-studio-trailer-scrim"></span>'+
    '<span class="oneup-studio-trailer-main-copy"><small>TRÁILER ENLAZADO EN ANILIST</small><strong>'+esc(preview.title)+'</strong><em>Ver ficha y tráiler ↗</em></span>'+
    '<span class="oneup-studio-trailer-play" aria-hidden="true">▷</span>'+
   '</button>'+
   '<div class="oneup-studio-trailer-list">'+posters.map(x=>
     '<button class="oneup-studio-trailer-mini" type="button" data-details="'+esc(x.id)+'" aria-label="Ver ficha y tráiler de '+esc(x.title)+'">'+
     '<img src="'+esc(x.image||x.banner)+'" loading="lazy" alt="" referrerpolicy="no-referrer">'+
     '<span><small>AVANCE · '+esc(String(x.year||'ANIME'))+'</small><b>'+esc(x.title)+'</b><i>Ver tráiler ↗</i></span>'+
     '</button>'
   ).join('')+'</div>'+
  '</div>';
 banner.after(section);
}
async function addAiring(after){
 const section=document.createElement('section');
 section.className='oneup-studio-airing';
 section.id='oneup-studio-airing';
 section.setAttribute('aria-label','Próximos episodios programados');
 section.innerHTML='<div class="oneup-studio-airing-inner wrap"><div class="oneup-studio-airing-label">PRÓXIMAS EMISIONES<small>Fechas de AniList, no enlaces de reproducción</small></div><div class="oneup-studio-airing-items" id="oneup-studio-airing-items"><span style="font-size:11px;color:#afbbb5">Consultando calendario…</span></div><button class="oneup-studio-airing-more" type="button" data-route="programacion">Calendario ↗</button></div>';
 after.after(section);
 const node=$('#oneup-studio-airing-items');
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
  let response;
  try{response=await fetch('./data/airing.json',{cache:'no-store',signal:ctrl.signal})}
  finally{clearTimeout(timer)}
  if(!response.ok)throw Error('Sin acceso al calendario');
  const obj=await response.json();
  renderTrailers(obj);
  const now=Date.now()/1000;
  const rows=(Array.isArray(obj.airing)?obj.airing:[])
   .filter(x=>x&&x.next?.at>now && /^((mal|al)-\d+)$/.test(x.id))
   .sort((a,b)=>a.next.at-b.next.at)
   .filter((x,i,arr)=>arr.findIndex(e=>e.id===x.id)===i).slice(0,4);
  if(!node.isConnected)return;
  if(!rows.length){
   node.innerHTML='<span style="font-size:11px;color:#afbbb5">Todavía no hay próximas emisiones confirmadas.</span>';
   return;
  }
  // Entries in the calendar are genuine AniList metadata, not video streams.
  window.OneUpCatalog?.register?.(rows);
  node.innerHTML=rows.map(x=>{
   const caption='Episodio '+esc(x.next.episode||'?')+' · '+esc(floatDate(x.next.at));
   const poster=x.image && /^https:\/\//i.test(x.image)?'<img src="'+esc(x.image)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'';
   return '<button type="button" class="oneup-studio-airing-item" data-details="'+esc(x.id)+'" title="'+esc(x.title)+'">'+poster+
    '<span><b>'+esc(x.title)+'</b><small>'+caption+'</small></span></button>';
  }).join('');
 }catch(error){
  if(node.isConnected)node.innerHTML='<span style="font-size:11px;color:#afbbb5">Consulta las fechas en Programación.</span>';
  console.info('1UP Studio: no fue posible refrescar la franja de emisiones.',error?.message);
 }
}
function init(){
 if(!document.body.classList.contains('oneup-kokomi'))return;
 const marquee=$('#home-screen .marquee');
 if(!marquee)return;
 const dock=attachDock(marquee);
 void addAiring(dock);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();

;
/* ===== 2/9 — themes/october-2026/theme.js ===== */

;
/*
 1UP / Cinema October study: editorial anime season event + original optional
 audio sting. This file never overrides the catalogue, login, or streaming APIs.
*/
(()=>{
'use strict';
const $=selector=>document.querySelector(selector);
const PREVIEW=document.body?.dataset?.themePreview==='october' ||
 new URLSearchParams(location.search).get('octoberPreview')==='1';
const date=new Date();
const HALLOWEEN=(date.getMonth()===9);
const shouldRun=PREVIEW||HALLOWEEN;
if(!shouldRun)return;
const themeRoot='./themes/oneup/';
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false;
const externalLink='https://bclover.jp/';
let featuredMedia=null;
const escape=str=>String(str??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const normalize=m=>({
 id:m.idMal?'mal-'+m.idMal:'al-'+m.id,
 mal_id:m.idMal??null,ani_id:m.id??null,
 title:m.title?.english||m.title?.romaji||'Black Clover',
 image:m.coverImage?.extraLarge||m.coverImage?.large||'',
 banner:m.bannerImage||'',
 description:String(m.description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),
 format:m.format||'TV',episodes:m.episodes||0,averageScore:m.averageScore||0,
 year:m.seasonYear||m.startDate?.year||null,
 genres:Array.isArray(m.genres)?m.genres:[]
});
function featureHTML(){
 return '<section class="oct-event wrap" aria-label="Especial editorial del mes: Black Clover">'+
  '<span class="oct-moon" aria-hidden="true"></span>'+
  '<img class="oct-event-seal" src="'+themeRoot+'arcane-seal.svg" loading="lazy" alt="" aria-hidden="true">'+
  '<div class="oct-event-copy">'+
   '<span class="oct-kicker">EDICIÓN DE OCTUBRE · 1UP ORIGINAL</span>'+
   '<h2>BLACK<br><span>CLOVER.</span></h2>'+
   '<p>Un mes de estrenos, teorías y mundos extraordinarios. Black Clover protagoniza esta selección editorial inspirada en la magia y la atmósfera de Halloween.</p>'+
   '<div class="oct-feature-metadata" id="oct-feature-metadata" aria-label="Datos de la serie"></div>'+
   '<a id="oct-black-clover-link" class="cta primary" href="'+externalLink+'" target="_blank" rel="noopener noreferrer">Conocer el anime ↗</a>'+
   '<p class="oct-footnote">Inspiración temática original de 1UP. No es una colaboración con el estudio ni un servicio de reproducción.</p>'+
  '</div>'+
  '<div class="oct-event-art" aria-hidden="true">'+
   '<div class="oct-event-frame"><span class="oct-art-fallback">1UP</span><img id="oct-feature-poster" alt="" loading="lazy" hidden></div>'+
   '<div class="oct-stamp">ESTRENO<br>DE TEMPORADA<small>FOCO EDITORIAL · 2026</small></div>'+
  '</div>'+
 '</section>';
}
// Intro is automatic; no season sound option or extra synthesizer is displayed.
function showFeaturedAnime(anime){
 if(!anime||!/black\s*clover/i.test(anime.title||''))return;
 featuredMedia=anime;
 const poster=$('#oct-feature-poster');
 if(poster&&anime.image){
  const img=String(anime.image);
  if(/^https:\/\//i.test(img)){
   poster.src=img;
   poster.alt='Portada del anime '+anime.title;
   poster.onload=()=>{
    poster.hidden=false;
    poster.parentElement?.classList.add('has-poster');
    poster.previousElementSibling?.remove();
   };
   poster.onerror=()=>{poster.hidden=true};
  }
 }
 const metadata=$('#oct-feature-metadata');
 if(metadata){
  const entries=[
   'FICHA DE ANIME',
   Number(anime.year)>=1990&&Number(anime.year)<=2100?String(anime.year):null,
   anime.format==='TV'?'SERIE':anime.format==='MOVIE'?'PELÍCULA':null
  ].filter(Boolean);
  metadata.replaceChildren(...entries.map(value=>{
   const tag=document.createElement('span');
   tag.textContent=value;
   return tag;
  }));
 }
 window.OneUpCatalog?.register?.([anime]);
 const link=$('#oct-black-clover-link');
 if(link){
  link.textContent='Ver ficha del anime ↗';
  link.href='#anime-dialog';
  link.removeAttribute('target');link.removeAttribute('rel');
  link.addEventListener('click',event=>{
   event.preventDefault();
   window.OneUpCatalog?.register?.([anime]);
   if(window.OneUpCatalog?.open)window.OneUpCatalog.open(anime.id);
   else window.open(externalLink,'_blank','noopener,noreferrer');
  });
 }
}
async function localFeaturedAnime(){
 try{
  const response=await fetch('./data/catalog.json',{cache:'no-store'});
  if(!response.ok)return null;
  const data=await response.json();
  const groups=data.groups||{};
  const all=Object.values(groups).flatMap(items=>Array.isArray(items)?items:[]);
  const matched=all.find(a=>/^black clover$/i.test(String(a?.title||'').trim()))||
   all.find(a=>/black\s*clover/i.test(String(a?.title||'')));
  return matched?{...matched}:null;
 }catch{return null}
}
async function fetchFeature(){
 // First paint uses the site's own durable data; the remote metadata is an upgrade.
 const cached=await localFeaturedAnime();
 if(cached)showFeaturedAnime(cached);
 const query='query { Page(page:1,perPage:10){ media(search:"Black Clover",type:ANIME,sort:[START_DATE_DESC]){id idMal isAdult format seasonYear startDate{year}title{english romaji} coverImage{extraLarge large} bannerImage description(asHtml:false) episodes averageScore genres } } }';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
 try{
  const response=await fetch('https://graphql.anilist.co',{
   method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({query}),signal:controller.signal
  });
  if(!response.ok)throw Error('AniList '+response.status);
  const json=await response.json();
  const results=json.data?.Page?.media;
  if(!Array.isArray(results))throw Error('No se recibieron datos del anime');
  const safe=results.filter(x=>!x.isAdult && /black\s*clover/i.test([x.title?.english,x.title?.romaji].join(' ')));
  if(safe.length && !cached)showFeaturedAnime(normalize(safe[0]));
 }catch(e){
  if(!cached)console.info('1UP Octubre: la ficha externa no está disponible. Sigue habilitado el enlace oficial.',e?.message);
 }finally{clearTimeout(timer)}
}
function activateEditorialMotion(){
 const section=$('.oct-event');
 if(!section||reduced||!('IntersectionObserver' in window))return;
 const observer=new IntersectionObserver(entries=>{
  for(const item of entries){
   if(!item.isIntersecting)continue;
   observer.unobserve(item.target);
   section.classList.add('oct-revealed');
   if(typeof Element.prototype.animate!=='function')return;
   const targets=section.querySelectorAll('.oct-kicker,.oct-event h2,.oct-event-copy>p:not(.oct-footnote),.oct-event-copy>.cta,.oct-event-art');
   targets.forEach((node,index)=>{
    node.animate([
     {opacity:.06,transform:'translate3d(0,18px,0)'},
     {opacity:1,transform:'translate3d(0,0,0)'}
    ],{
     duration:460+(index===1?130:0),delay:index*80,
     easing:'cubic-bezier(.16,1,.3,1)',fill:'both'
    });
   });
  }
 },{threshold:.15});
 observer.observe(section);
}
// On desktop the entire illustration shifts by at most 5 px.
// Mobile devices avoid pointer effects for performance and touch ergonomics.
function activateParallax(){
 const section=$('.oct-event');
 if(!section||reduced||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
 let queued=false,x=0,y=0;
 const flush=()=>{
  queued=false;
  section.style.setProperty('--oct-shift-x',x.toFixed(2)+'px');
  section.style.setProperty('--oct-shift-y',y.toFixed(2)+'px');
 };
 section.addEventListener('pointermove',event=>{
  const box=section.getBoundingClientRect();
  x=(((event.clientX-box.left)/box.width)-.5)*9;
  y=(((event.clientY-box.top)/box.height)-.5)*9;
  if(!queued){queued=true;requestAnimationFrame(flush)}
 },{passive:true});
 section.addEventListener('pointerleave',()=>{
  x=0;y=0;if(!queued){queued=true;requestAnimationFrame(flush)}
 },{passive:true});
}

function init(){
 if(!$('#home-screen')||!$('.hero'))return;
 document.body.classList.add('oneup-october');
 const hero=$('.hero');
 const stamp=document.createElement('img');
 stamp.className='oct-arcane-mark';stamp.src=themeRoot+'arcane-seal.svg';stamp.alt='';
 stamp.setAttribute('aria-hidden','true');stamp.decoding='async';
 hero.append(stamp);
 const line=$('.limited-tag');
 if(line)line.textContent='OCTUBRE 2026 · ESPECIAL HALLOWEEN';
 const anchor=$('#home-screen .marquee');
 if(anchor){
  const editorialEnd=$('#oneup-studio-airing')||anchor;
  editorialEnd.insertAdjacentHTML('afterend',featureHTML());
 }
 activateEditorialMotion();
 activateParallax();
 // The original cinema intro attempts audio automatically. Safari may deny it.
 void fetchFeature();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();

;
/* ===== 3/9 — themes/kokomi-mobile-preview/theme.js ===== */

;
/* 1UP Anime — isolated Kokomi-inspired preview controls.
   Preserves the existing studio.js data, authentication, favorites and search.
   Does not load or reproduce any TemplateMonster source code or media.
*/
(()=>{
'use strict';
document.addEventListener('DOMContentLoaded',()=>{
 const body=document.body, header=document.querySelector('.header-inner');
 if(!header||!body.classList.contains('kokomi-mobile-reference'))return;
 // Use physical layout width too: mobile emulation can expose a CSS media
 // viewport wider than the visible screen when legacy rails overflow.
 function fitAnimeRails(){
   const docWidth=document.documentElement.clientWidth||window.innerWidth;
   const visualWidth=window.visualViewport?.width||docWidth;
   const width=Math.min(docWidth,visualWidth);
   const count=width<=780?2:width<=1100?4:5;
   for(const el of document.querySelectorAll('#trending-rail,#season-rail,#recent-rail,#movies-rail,#browse-grid')){
     el.style.setProperty('grid-template-columns','repeat('+count+',minmax(0,1fr))','important');
     el.style.setProperty('grid-auto-flow','row','important');
     el.style.setProperty('grid-auto-columns','minmax(0,1fr)','important');
   }
 }
 fitAnimeRails();
 window.addEventListener('resize',fitAnimeRails,{passive:true});
 window.visualViewport?.addEventListener('resize',fitAnimeRails,{passive:true});
 // If the remote poster host is unavailable, show a branded poster rather
 // than the browser's broken-image icon or overflowing alt text.
 document.addEventListener('error',e=>{
   const img=e.target;
   if(!(img instanceof HTMLImageElement)||!img.matches('.anime-art img,.km-poster-art img'))return;
   img.style.display='none';
   const frame=img.parentElement;
   if(frame&&!frame.querySelector('.km-poster-fallback')){
     const fallback=document.createElement('span');fallback.className='km-poster-fallback';
     fallback.textContent='1UP ANIME';frame.prepend(fallback);
   }
 },true);

 const toggle=document.createElement('button');
 toggle.type='button';toggle.className='km-menu-toggle';toggle.id='km-open';
 toggle.setAttribute('aria-label','Abrir menú');toggle.setAttribute('aria-controls','km-drawer');
 toggle.setAttribute('aria-expanded','false');toggle.textContent='☰';
 header.prepend(toggle);
 const backdrop=document.createElement('div');backdrop.className='km-overlay';backdrop.id='km-overlay';backdrop.hidden=true;
 const drawer=document.createElement('aside');drawer.className='km-drawer';drawer.id='km-drawer';
 drawer.setAttribute('aria-label','Menú de 1UP Anime');drawer.setAttribute('role','navigation');drawer.hidden=true;
 const links=[
  ['⌂','Inicio','inicio'],['♛','Top anime','populares'],['♥','Géneros','catalogo'],
  ['▤','Películas','peliculas'],['▣','Actualizados','recientes'],['◴','En emisión','temporada'],
  ['⌛','Próximamente','programacion'],['☆','Mi lista','milista']
 ];
 drawer.innerHTML='<div class="km-drawer-head"><a class="km-drawer-brand" href="#inicio" data-route="inicio">'+
  '<img src="./assets/oneup-header-letters.png" class="oneup-drawer-textmark" width="162" height="54" alt="1UP ANIME"></a>'+
  '<button class="km-drawer-close" type="button" id="km-close" aria-label="Cerrar menú">✕</button></div>'+
  '<nav class="km-nav">'+links.map(([icon,label,route])=>
   '<button type="button" data-route="'+route+'"><span aria-hidden="true">'+icon+'</span>'+label+'</button>'
  ).join('')+'<a href="./comunidad.html"><span aria-hidden="true">✦</span>Comunidad</a></nav>'+
  '<div class="km-drawer-foot">1UP ANIME · DESCUBRE UN NUEVO NIVEL</div>';
 document.body.append(backdrop,drawer);
 const inputForm=document.createElement('form');
 inputForm.className='km-search-pop';inputForm.id='km-search-pop';
 inputForm.setAttribute('role','search');inputForm.hidden=true;
 inputForm.innerHTML='<input id="km-search-input" type="search" maxlength="95" aria-label="Buscar anime" placeholder="Buscar anime...">'+
  '<button type="submit">Buscar ↗</button><button type="button" id="km-search-close" aria-label="Cerrar búsqueda">✕</button>';
 body.append(inputForm);
 const qs=s=>document.querySelector(s);
 let lastFocus=null,previousOverflow='';
 function openMenu(){
   closeSearch(false);lastFocus=document.activeElement;
   previousOverflow=body.style.overflow;body.style.overflow='hidden';
   drawer.hidden=false;backdrop.hidden=false;
   toggle.setAttribute('aria-expanded','true');qs('#km-close').focus();
 }
 function closeMenu(restoreFocus=true){
   if(drawer.hidden)return;
   drawer.hidden=true;backdrop.hidden=true;body.style.overflow=previousOverflow;
   toggle.setAttribute('aria-expanded','false');
   if(restoreFocus)(lastFocus?.isConnected?lastFocus:toggle).focus();
 }
 function openSearch(){
   closeMenu(false);inputForm.hidden=false;qs('#km-search-input').focus();
 }
 function closeSearch(restoreFocus=true){
   if(inputForm.hidden)return;
   inputForm.hidden=true;if(restoreFocus)qs('#header-search')?.focus();
 }
 toggle.addEventListener('click',()=>drawer.hidden?openMenu():closeMenu());
 qs('#km-close').addEventListener('click',()=>closeMenu());
 drawer.querySelector('.km-drawer-brand').addEventListener('click',()=>closeMenu(false));
 backdrop.addEventListener('click',()=>closeMenu());
 drawer.querySelector('.km-nav').addEventListener('click',e=>{
   if(e.target.closest('button[data-route],a[data-km-view]'))closeMenu(false);
 });
 document.addEventListener('keydown',e=>{
   if(e.key==='Escape'){closeMenu();closeSearch()}
   if(e.key==='Tab'&&!drawer.hidden){
     const targets=[...drawer.querySelectorAll('button,a')].filter(x=>x.offsetParent!==null);
     const first=targets[0],last=targets.at(-1);
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
 });
 // Capture search tap before the site's existing header button handler: retain routing.
 document.addEventListener('click',e=>{
   if(e.target.closest('#header-search')&&body.classList.contains('kokomi-mobile-reference')){
     e.preventDefault();e.stopImmediatePropagation();openSearch();
   }
 },true);
 qs('#km-search-close').addEventListener('click',()=>closeSearch());
 inputForm.addEventListener('submit',e=>{
   e.preventDefault();
   const value=qs('#km-search-input').value.trim();
   if(!value)return;
   const original=qs('#search-input'),siteForm=qs('#search-form');
   if(original&&siteForm){
     original.value=value;closeSearch(false);
     siteForm.requestSubmit();
   }
 });
 // Four quick illustrated genre tiles mirroring the rhythm of the user's recording.
 const home=qs('#home-screen');
 const explore=home?.querySelector('.explore-section');
 if(explore){
   const wrap=document.createElement('div');
   wrap.className='km-genre-row';
   for(const [name,caption] of [['Adventure','Aventura'],['Comedy','Comedia'],['Action','Acción'],['Fantasy','Fantasía']]){
     const button=document.createElement('button');button.type='button';
     button.dataset.genre=name;button.textContent=caption;
     wrap.append(button);
   }
   explore.append(wrap);
 }
 // Numbered red rank badges are decorative; actual catalog order comes from studio.js.
 const rail=qs('#trending-rail');
 if(rail){
   const apply=()=>[...rail.querySelectorAll('.anime-card')].forEach((card,i)=>{
     const art=card.querySelector('.anime-art');
     if(art&&!art.querySelector('.km-rank')){
       const badge=document.createElement('span');badge.className='km-rank';
       badge.textContent=String(i+1);badge.setAttribute('aria-hidden','true');art.append(badge);
     }
   });
   apply();
   const observer=new MutationObserver(apply);observer.observe(rail,{childList:true,subtree:false});
 }
});
})();

;
/* ===== 4/9 — themes/kokomi-mobile-preview/pages.js ===== */

;
/* 1UP Anime · Kokomi-reference interior routes.
 * Independent implementation. Uses existing site data and account identity.
 * No unauthorised streaming discovery, DRM bypass or copied template assets.
 */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uri=v=>{try{const u=new URL(String(v||''),location.href);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
const prefsKey='oneup_kokomi_preferences_v1';
const routes=[
 ['inicio','Inicio'],['populares','Top Anime'],['recientes','Actualizados'],
 ['temporada','En emisión'],['upcoming','Próximos estrenos'],['peliculas','Películas'],
 ['catalogo','Géneros'],['series','Detalles de serie'],['series-play','Reproductor episodios'],
 ['movie-single','Detalles de película'],['movie-play','Reproductor película'],
 ['trailers','Tráilers'],['programacion','Calendario'],['blog','Noticias y artículos'],
 ['blog-single','Artículo'],['contact','Contacto'],['coming-soon','Próximamente'],
 ['404','No encontrado'],['profile','Mi perfil'],['notifications','Notificaciones'],
 ['milista','Mi lista'],['settings','Configuración']
];
const nativeRoutes=new Set(['inicio','populares','recientes','temporada','peliculas','catalogo','programacion','milista']);
const routeMap=new Map(routes);
const blogArticles=[
 {id:'bienvenida',title:'Bienvenido al universo 1UP ANIME',tag:'GUÍA DE LA PLATAFORMA',body:'Explora los animes disponibles en el catálogo, consulta información de temporadas y crea tu lista personal. La disponibilidad de reproducción depende de las fuentes autorizadas configuradas para cada título.'},
 {id:'calendario',title:'Cómo seguir la temporada de anime',tag:'CONSEJOS',body:'Revisa la sección En emisión y el calendario para conocer próximos episodios. Los horarios son estimaciones informativas del catálogo y no garantizan la publicación inmediata de un video.'},
 {id:'favoritos',title:'Organiza tus series favoritas',tag:'TU PERFIL',body:'Guarda títulos en Mi lista y usa los perfiles que ya ofrece 1UP ANIME. Los datos locales no equivalen a una cuenta sincronizada en la nube.'}
];
let all=[],byId=new Map(),group={},licensed=null,activeRoute='',activeId='',activeSeason=1,renderSeq=0;
let root,home,browse;
function catalogItems(){const seen=new Set(),items=[];for(const value of Object.values(group)){if(!Array.isArray(value))continue;for(const a of value){if(!a?.id||seen.has(a.id))continue;seen.add(a.id);items.push(a)}}return items}
function getIdList(name){const obj={upcoming:'upcoming',trailers:'trending','coming-soon':'upcoming',series:'trending','movie-single':'movies'};
 const key=obj[name]||name;const entries=Array.isArray(group[key])?group[key]:[];
 return entries.length?entries:all}
function info(id){return byId.get(id)||window.OneUpCatalog?.get?.(id)||null}
function animeUrl(a,type){const page=type||(a.format==='MOVIE'?'movie-single':'series');return '#km/'+page+'/'+encodeURIComponent(a.id)}
function heading(t,sub){return '<div class="km-page-heading"><span class="km-eyebrow">1UP ANIME / '+esc(t).toUpperCase()+'</span><h1>'+esc(t)+'</h1><p>'+esc(sub||'Explora el universo anime desde una nueva perspectiva.')+'</p></div>'}
function poster(a,i){const image=uri(a.image),title=esc(a.title||'Anime'),desc=esc(String(a.year||'')+' · '+(a.format||'TV'));return '<a href="'+animeUrl(a)+'" class="km-poster" aria-label="Ver detalles de '+title+'"><div class="km-poster-art">'+(image?'<img src="'+esc(image)+'" loading="lazy" alt="">':'<span class="km-art-empty">'+title+'</span>')+'<span class="km-poster-index">'+String(i+1).padStart(2,'0')+'</span></div><b>'+title+'</b><small>'+desc+'</small></a>'}
function gallery(title,sub,items){return heading(title,sub)+'<div class="km-gallery">'+items.map(poster).join('')+'</div>'}
function savedData(){
 try{
 const auth=window.OneUpAuth?.get?.()||{key:'guest'};
 const key=auth.kind==='local'?'1up_anime_profile_'+String(auth.key||'').replace(/^local_/,''):'oneup_anime_saved_'+(auth.key||'guest');
 const data=JSON.parse(localStorage.getItem(key)||'{}');return data&&typeof data==='object'?data:{};
 }catch{return {}}
}
function stopMedia(){
 if(root?.querySelector('#km-player-section'))window.OneUpEpisodePlayer?.close?.();
}

function showCommon(){home.hidden=false;if(browse&&activeRoute!==''&&activeRoute!=='inicio')browse.hidden=false;root.hidden=true}
function setPage(markup,route){
 stopMedia();
 window.OneUpKokomiWatch?.unmount?.();
 home.hidden=true;if(browse)browse.hidden=true;root.hidden=false;
 root.innerHTML='<div class="km-page-inner">'+markup+'</div>';
 document.querySelectorAll('.km-nav [data-route],.km-nav [data-km-view]').forEach(n=>{
 n.classList.toggle('active',n.dataset.kmView===route)
 });
 window.OneUpMotion?.enter?.(root,'interior');
}
function richList(data){return '<div class="km-rows">'+data.map(a=>'<a class="km-row" href="'+animeUrl(a)+'">'+(uri(a.image)?'<img src="'+esc(uri(a.image))+'" loading="lazy" alt="">':'')+'<span><strong>'+esc(a.title)+'</strong><small>'+esc(String(a.format||'TV')+' · '+String(a.year||''))+'</small></span><span aria-hidden="true">↗</span></a>').join('')+'</div>'}
function detailPage(a,movie){
 if(!a)return errorPage('No encontramos ese anime');
 const art=uri(a.banner||a.image);
 const list=(a.genres||[]).slice(0,5).map(x=>'<span>'+esc(x)+'</span>').join('');
 const playback=movie?'movie-play':'series-play';
 const mediaButton='<a class="km-main-button" href="#km/'+playback+'/'+encodeURIComponent(a.id)+'">▷ VER REPRODUCTOR</a>';
 const official=(a.streaming||[]).filter(x=>uri(x.url)).slice(0,5).map(x=>'<a class="km-source-link" href="'+esc(uri(x.url))+'" target="_blank" rel="noopener noreferrer">↗ '+esc(x.name)+'</a>').join('');
 return '<div class="km-detail-banner" style="'+(art?'background-image:linear-gradient(90deg,#111118 7%,#121219bb 65%,#08080ac7),url(&quot;'+esc(art)+'&quot;)':'')+'"><div class="km-detail-inner"><span class="km-eyebrow">'+(movie?'PELÍCULA':'SERIE')+' / 1UP ANIME</span><h1>'+esc(a.title)+'</h1><div class="km-detail-meta"><span>★ '+esc(String(a.averageScore?Math.round(a.averageScore)/10:'—'))+'</span><span>'+esc(a.year||'Año desconocido')+'</span><span>'+esc(movie?'Película':String(a.episodes||'—')+' episodios declarados')+'</span></div><div class="km-tags">'+list+'</div><p>'+esc((a.description_es||a.description||'Sin sinopsis disponible.').slice(0,900))+'</p><div class="km-action-row">'+mediaButton+'<button data-km-open="'+esc(a.id)+'" class="km-second-button">＋ ABRIR FICHA COMPLETA</button></div></div></div><section class="km-block"><h2>Disponibilidad y fuentes</h2><p>El motor integrado solo reproduce archivos o incrustaciones autorizadas declaradas en el manifiesto. Los sitios externos conservan su propia reproducción.</p><div class="km-action-row">'+(official||'<span class="km-muted">No hay plataformas registradas para este título.</span>')+'</div></section>';
}
function errorPage(msg){return heading('No encontrado',msg||'La página o el anime solicitado no existe.')+'<button class="km-main-button" data-route="inicio">← VOLVER AL INICIO</button>'}
function watchHeading(a,movie){
 const detailPath=movie?'movie-single':'series';
 return '<header class="km-watch-heading">'+
  '<div class="km-watch-topline"><a href="#km/'+detailPath+'/'+encodeURIComponent(a.id)+'">← VOLVER A LA FICHA</a>'+
  '<span class="km-eyebrow">1UP ANIME / '+(movie?'VER PELÍCULA':'VER EPISODIO')+'</span></div>'+
  '<h1 title="'+esc(a.title)+'">'+esc(a.title)+'</h1>'+
  '<div class="km-watch-subtitle">'+
  '<span>'+(movie?'PELÍCULA':'SERIE')+'</span><span>'+esc(String(a.year||'AÑO NO DISPONIBLE'))+'</span>'+
  '<span>★ '+esc(String(a.averageScore?Math.round(a.averageScore)/10:'—'))+'</span>'+
  '</div></header>';
}
async function mediaManifest(){
 if(licensed)return licensed;
 try{const response=await fetch('./data/licensed-media.json',{cache:'no-cache'});if(!response.ok)throw Error('Sin manifiesto');licensed=(await response.json())?.entries||{}}
 catch{licensed={}}
 return licensed;
}
function playerFrame(a,movie){
 const episodes=licensed?.[a.id]?.episodes||[];
 const seasons=[...new Set(episodes.map(item=>Number(item.season)||1))].sort((a,b)=>a-b);
 if(!seasons.length)seasons.push(1);
 if(!seasons.includes(activeSeason))activeSeason=seasons[0];
 return watchHeading(a,movie)+'<label class="km-season-control" for="km-season-select">Temporadas configuradas <select id="km-season-select">'+
 seasons.map(season=>'<option value="'+season+'"'+(season===activeSeason?' selected':'')+'>Temporada '+season+'</option>').join('')+'</select></label>'+
 '<div class="km-watch-layout km-shared-player"><section id="km-player-section" class="oneup-detail-section" aria-label="Reproductor integrado"></section></div>'+
 '<div id="km-watch-community"></div>';
}
function mountDiscussion(a,episode=1){
 const options=[...root.querySelectorAll('#oneup-watch-episode option')].map(option=>({season:activeSeason,number:Number(option.value)}));
 window.OneUpKokomiWatch?.mount?.({anime:a,season:activeSeason,episode,episodeOptions:options});
}
async function mountSharedPlayer(a,serial){
 const host=root.querySelector('#km-player-section');
 window.OneUpKokomiWatch?.unmount?.();
 root.querySelector('#km-watch-community')?.replaceChildren();
 try{await window.OneUpEpisodePlayer.show(a,{root:host,season:activeSeason})}
 catch{if(serial===renderSeq&&host.isConnected)host.textContent='El reproductor no está disponible en este momento.'}
 if(serial!==renderSeq||!host.isConnected)return;
 mountDiscussion(a);
}
function getLocalPref(){try{return JSON.parse(localStorage.getItem(prefsKey)||'{}')}catch{return {}}}
function content(route,id){
 const p=getLocalPref();
 if(route==='upcoming'||route==='coming-soon'){
 const data=(Array.isArray(group.upcoming)&&group.upcoming.length?group.upcoming:all.filter(x=>x.status==='NOT_YET_RELEASED')).filter(x=>x.status==='NOT_YET_RELEASED'||Array.isArray(group.upcoming)&&group.upcoming.some(y=>y.id===x.id));
 return gallery(route==='upcoming'?'Próximos estrenos':'Muy pronto','Títulos anunciados según la copia del catálogo; comprueba fechas con el distribuidor.',data.slice(0,45))
 }
 if(route==='trailers'){
 const list=all.filter(a=>a.trailer?.site==='youtube'&&/^[\w-]{11}$/.test(a.trailer.id||''));
 return heading('Tráilers','Avances publicados en los metadatos del catálogo.')+(list.length?richList(list):'<div class="km-no-media">No hay tráilers verificables en el catálogo local.</div>')
 }
 if(route==='blog')return heading('Artículos','Notas originales sobre nuestra plataforma.')+'<div class="km-posts">'+blogArticles.map(a=>'<a href="#km/blog-single/'+a.id+'" class="km-post"><span>'+a.tag+'</span><h2>'+esc(a.title)+'</h2><p>Leer artículo completo ↗</p></a>').join('')+'</div>';
 if(route==='blog-single'){const article=blogArticles.find(x=>x.id===id);return article?heading(article.title,article.tag)+'<article class="km-article">'+esc(article.body)+'</article><a href="#km/blog" class="km-second-button">← Volver a artículos</a>':errorPage('Artículo no disponible')}
 if(route==='contact')return heading('Contacto','Habla con nuestra comunidad y comparte sugerencias.')+'<section class="km-block"><h2>1UP ANIME</h2><p>Para enviar sugerencias puedes participar en La Plaza. Este formulario no simula el envío de correo ni almacena datos personales.</p><a class="km-main-button" href="./comunidad.html">IR A LA COMUNIDAD ↗</a></section>';
 if(route==='404')return errorPage('La dirección solicitada no pertenece a las páginas disponibles.');
 if(route==='profile'){
 const auth=window.OneUpAuth?.get?.()||{key:'guest'};
 const favs=Object.values(savedData()).filter(x=>x.favorite);
 return heading('Mi perfil','Accede a tus datos actuales.')+'<div class="km-profile-panel"><div class="km-avatar">1UP</div><div><h2>'+esc(auth.name||'Invitado')+'</h2><p>Tipo de acceso: '+esc(auth.kind||'guest')+'</p><p>'+favs.length+' favoritos disponibles en este navegador.</p><button class="km-second-button" id="km-auth-open">Administrar sesión</button></div></div>'+richList(all.filter(x=>favs.some(f=>f.id===x.id)).slice(0,6));
 }
 if(route==='notifications')return heading('Notificaciones','Centro de avisos de la plataforma.')+'<div class="km-no-media"><strong>No hay avisos nuevos.</strong><p>Las futuras notificaciones requerirán un backend y permisos explícitos. No hemos activado notificaciones push.</p></div>';
 if(route==='settings')return heading('Configuración','Preferencias de experiencia en este dispositivo.')+'<form id="km-preferences" class="km-preferences"><label><span>Reducir animaciones del tema</span><input name="reduced" type="checkbox" '+(p.reduced?'checked':'')+'></label><label><span>Ocultar notas visuales de Halloween</span><input name="halloween" type="checkbox" '+(p.halloween?'checked':'')+'></label><label><span>Interfaz compacta</span><input name="compact" type="checkbox" '+(p.compact?'checked':'')+'></label><button class="km-main-button" type="submit">Guardar preferencias</button><p role="status" id="km-settings-result"></p></form>';
 if(route==='series'||route==='movie-single'){const a=id?info(id):getIdList(route)[0];if(a)activeId=a.id;return detailPage(a,route==='movie-single')}
 return errorPage('La página solicitada no existe.');
}
async function render(){
 const serial=++renderSeq;
 let hash='';
 try{hash=decodeURIComponent(location.hash.slice(1))}catch{hash='km/404'}
 if(!hash.startsWith('km/')){
  stopMedia();
  window.OneUpKokomiWatch?.unmount?.();
  activeRoute='';root.hidden=true;
  const route=hash.split('/')[0];
  if(home.hidden&&browse.hidden){
   const fallback=nativeRoutes.has(route)?route:'inicio';
   document.querySelector('.desktop-links [data-route="'+fallback+'"]')?.click();
  }
  return;
 }
 const [,route,...parts]=hash.split('/'),id=parts.join('/');
 activeRoute=route;activeId=id;
 if(route==='series-play'||route==='movie-play'){
 const a=info(id);if(!a){setPage(errorPage('No existe este título en el catálogo.'),route);return}
 activeSeason=1;await mediaManifest();if(serial!==renderSeq)return;
 setPage(playerFrame(a,route==='movie-play'),route);
 await mountSharedPlayer(a,serial);
 }else setPage(content(route,id),route);
 document.title=routeMap.get(route)||'1UP Anime';
 window.scrollTo({top:0,behavior:'instant'});
}
function startup(){
 home=$('#home-screen');browse=$('#browse-screen');const main=$('main');
 if(!main||!home)return;
 root=document.createElement('section');root.id='km-extra-root';root.className='km-extra-root';root.hidden=true;main.append(root);
 const extras=[['upcoming','Próximos estrenos'],['trailers','Tráilers'],['blog','Artículos'],['profile','Perfil'],['notifications','Notificaciones'],['settings','Configuración']];
 const drawer=$('#km-drawer .km-nav');
 if(drawer){const caption=document.createElement('strong');caption.className='km-nav-title';caption.textContent='MÁS SECCIONES';drawer.append(caption);
 extras.forEach(([route,title])=>{const a=document.createElement('a');a.href='#km/'+route;a.dataset.kmView=route;a.innerHTML='<span aria-hidden="true">↗</span>'+title;drawer.append(a)})}
 // Kokomi prioritizes the anime galleries before service directories.
 // Move nodes in DOM order (not just CSS order) so keyboard focus follows visuals.
 const priority=node=>{
  if(node.matches('.hero'))return 0;
  if(node.matches('.explore-section'))return 1;
  if(node.matches('.oneup-finale-deck'))return 1.5; // Shortcut deck remains above galleries.
  if(node.querySelector?.('#trending-rail'))return 2;
  if(node.querySelector?.('#recent-rail'))return 3;
  if(node.querySelector?.('#season-rail'))return 4;
  if(node.querySelector?.('#movies-rail'))return 5;
  if(node.matches('.oneup-studio-trailers'))return 6;
  if(node.querySelector?.('#schedule-preview-list'))return 7;
  if(node.matches('.season-banner'))return 8;
  if(node.matches('.oct-event')||node.querySelector?.('.oct-event'))return 12;
  if(node.matches('.oneup-studio-dock'))return 13;
  if(node.matches('.oneup-studio-airing'))return 14;
  if(node.matches('.oneup-external-directory'))return 18;
  if(node.matches('.community-note'))return 19;
  return 10;
 };
 let sorting=false;
 const observer=new MutationObserver(()=>sortHome());
 function sortHome(){
   if(sorting)return;
   const original=[...home.children];
   const ordered=original.map((n,i)=>({n,i,p:priority(n)})).sort((a,b)=>a.p-b.p||a.i-b.i).map(x=>x.n);
   if(ordered.every((n,i)=>n===original[i]))return;
   sorting=true;observer.disconnect();ordered.forEach(n=>home.append(n));
   observer.observe(home,{childList:true});sorting=false;
 }
 sortHome();observer.observe(home,{childList:true});

 const response=fetch('./data/catalog.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{
 group=j?.groups||{};all=catalogItems();byId=new Map(all.map(a=>[a.id,a]));
 window.OneUpCatalog?.register?.(all);
 }).catch(()=>{all=[];group={}}).then(render);
 window.addEventListener('hashchange',render);
 document.addEventListener('click',e=>{
 const open=e.target.closest('[data-km-open]');if(open){e.preventDefault();window.OneUpCatalog?.open?.(open.dataset.kmOpen);return}
 if(e.target.closest('#km-auth-open')){const auth=$('#auth-open');if(auth)auth.click();return}
 const mainRoute=e.target.closest('[data-route]');if(mainRoute){++renderSeq;}if(mainRoute&&!root.hidden){stopMedia();window.OneUpKokomiWatch?.unmount?.();root.hidden=true;activeRoute='';}
 });
 document.addEventListener('change',async e=>{
  if(e.target.id!=='km-season-select'||root.hidden)return;
  activeSeason=Number(e.target.value)||1;
  await mountSharedPlayer(info(activeId),++renderSeq);
 });
 document.addEventListener('oneup-episode-selected',e=>{
  if(!root.hidden&&e.detail?.animeId===activeId&&Number(e.detail.season||1)===activeSeason)mountDiscussion(info(activeId),Number(e.detail.episode));
 });
 document.addEventListener('oneup-anime-closed',()=>{
  if(!root.hidden&&['series-play','movie-play'].includes(activeRoute))render();
 });
 document.addEventListener('submit',e=>{
 if(e.target.id==='km-preferences'){
  e.preventDefault();const fd=new FormData(e.target);
  const p={reduced:fd.has('reduced'),halloween:fd.has('halloween'),compact:fd.has('compact')};
  localStorage.setItem(prefsKey,JSON.stringify(p));applyPrefs();
  const msg=$('#km-settings-result');if(msg)msg.textContent='Preferencias guardadas en este navegador.';
 }
 });
 function applyPrefs(){const p=getLocalPref();document.body.classList.toggle('km-quiet',!!p.reduced);document.body.classList.toggle('km-compact',!!p.compact);document.body.classList.toggle('km-no-halloween',!!p.halloween)}
 applyPrefs();void response;
}
document.addEventListener('DOMContentLoaded',startup);
})();

;
/* ===== 5/9 — themes/kokomi-mobile-preview/watch-comments.js ===== */

;
/* Kokomi watch community — isolated episode discussion UI
 * Reuses the same public Supabase backend as 1UP's detail dialog.
 * No fake comments; no posting when Supabase has not been configured.
 */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const backend=()=>window.OneUpSocialBackend;
let unsub=null,serial=0,active=null,thread=1;
const $=s=>document.querySelector(s);
function cleanup(){
 serial++;
 if(typeof unsub==='function'){try{unsub()}catch{}}
 unsub=null;active=null;
}
function nick(){try{return sessionStorage.getItem('oneup_pseudonym')||''}catch{return ''}}
function saveNick(value){try{sessionStorage.setItem('oneup_pseudonym',value)}catch{}}
function setStatus(message){const node=$('#km-watch-status');if(node)node.textContent=message}
function formatDate(t){
 const date=t?.toDate?.();
 return date?new Intl.DateTimeFormat('es',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(date):'';
}
function drawList(items){
 const node=$('#km-watch-comment-list');if(!node)return;
 node.innerHTML=items.length?items.map(c=>
 '<article class="km-watch-comment"><div class="km-watch-avatar" aria-hidden="true">'+esc((c.displayName||'?').slice(0,1).toUpperCase())+'</div>'+
 '<div class="km-watch-comment-text"><div class="km-comment-by"><strong>'+esc(c.displayName||'Fan del anime')+'</strong>'+
 (c.owner?'<span>✦ Equipo 1UP</span>':c.verified?'<span>Verificado</span>':'')+
 '<small>'+esc(formatDate(c.createdAt))+'</small></div><p>'+esc(c.text||'')+'</p>'+
 '<button type="button" data-km-report="'+esc(c.id||'')+'">Reportar</button></div></article>').join('')
 :'<p class="km-watch-muted">Todavía no hay comentarios para este episodio.</p>';
}
function currentEpisodeId(season,number){
 // Season 1 preserves existing public thread numbering; later seasons
 // use a unique numeric namespace compatible with the 1UP backend limit 9999.
 const s=Math.max(1,Math.min(9,Number(season)||1));
 const n=Math.max(1,Math.min(s===1?9999:999,Number(number)||1));
 return (s-1)*1000+n;
}
function subscribe(){
 const old=unsub;if(typeof old==='function')old();unsub=null;
 const id=++serial;
 if(!backend()?.enabled()){
  const list=$('#km-watch-comment-list');
  if(list)list.innerHTML='<p class="km-watch-muted">Los comentarios de este episodio aún no están disponibles.</p>';
  setStatus('Comentarios en espera de conexión con la comunidad.');
  return;
 }
 const list=$('#km-watch-comment-list');
 if(list)list.innerHTML='<p class="km-watch-muted">Cargando conversación…</p>';
 setStatus('Los comentarios son públicos. Evita información personal y spoilers.');
 backend().subscribeEpisode(active.id,thread,items=>{
  if(id!==serial)return;drawList(items);
 },error=>{
  if(id!==serial)return;
  if(list)list.innerHTML='<p class="km-watch-muted">'+esc(error)+'</p>';
 }).then(stop=>{
  if(id===serial)unsub=stop;else if(typeof stop==='function')stop();
 }).catch(error=>{
  if(id!==serial)return;
  if(list)list.innerHTML='<p class="km-watch-muted">'+esc(backend().maskError(error))+'</p>';
 });
}
function mount({anime,episode,season,episodeOptions}){
 cleanup();if(!anime?.id)return;
 const container=$('#km-watch-community');if(!container)return;
 active=anime;
 let options=Array.isArray(episodeOptions)?episodeOptions:[];
 if(!options.length){
  const count=Math.max(1,Math.min(120,Number(anime.episodes)||1));
  options=Array.from({length:count},(_,i)=>({season:1,number:i+1}));
 }
 const selectedSeason=Number(season)||1,selectedNum=Number(episode)||1;
 thread=currentEpisodeId(selectedSeason,selectedNum);
 const unique=new Set();
 const opts=options.filter(x=>{
  const k=currentEpisodeId(x.season,x.number);
  if(unique.has(k))return false;unique.add(k);return true;
 }).slice(0,120);
 container.innerHTML='<section class="km-watch-discussion" aria-label="Comentarios del episodio">'+
 '<div class="km-discussion-title"><div><span class="km-eyebrow">1UP ANIME / COMUNIDAD</span><h2>Comentarios del episodio</h2>'+
 '<p>Habla con otros fans sin salir del reproductor.</p></div>'+
 '<label>Capítulo <select id="km-watch-select" aria-label="Capítulo para comentarios">'+
 opts.map(x=>'<option data-episode="'+esc(x.number)+'" value="'+currentEpisodeId(x.season,x.number)+'"'+(currentEpisodeId(x.season,x.number)===thread?' selected':'')+'>'+
 'T'+esc(x.season||1)+' · Episodio '+esc(x.number||1)+'</option>').join('')+'</select></label></div>'+
 '<div id="km-watch-comment-list" class="km-watch-comments" aria-live="polite"></div>'+
 '<form id="km-watch-comment-form" class="km-watch-form">'+
 '<label for="km-watch-name">Tu nombre temporal</label><input id="km-watch-name" type="text" minlength="3" maxlength="25" required autocomplete="nickname" placeholder="Tu apodo" value="'+esc(nick())+'">'+
 '<label for="km-watch-text">Tu comentario</label><textarea id="km-watch-text" rows="3" minlength="2" maxlength="900" required placeholder="Comenta sin compartir spoilers…"></textarea>'+
 '<div class="km-watch-submit"><small>Los comentarios son públicos y están sujetos a moderación.</small><button type="submit" id="km-watch-publish">Publicar comentario ↗</button></div>'+
 '<p role="status" id="km-watch-status"></p></form></section>';
 const selector=$('#km-watch-select');
 if(!opts.some(x=>currentEpisodeId(x.season,x.number)===thread)&&opts.length){
  thread=currentEpisodeId(opts[0].season,opts[0].number);
  selector.value=String(thread);
 }
 selector?.addEventListener('change',()=>{
  thread=Number(selector.value)||1;subscribe();
  document.dispatchEvent(new CustomEvent('oneup-episode-selected',{detail:{animeId:active.id,season:selectedSeason,episode:Number(selector.selectedOptions[0]?.dataset.episode)||1}}));
 });
 const form=$('#km-watch-comment-form');
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!backend()?.enabled()){setStatus('Supabase aún no está configurado para publicar.');return}
  const username=$('#km-watch-name').value.trim(),body=$('#km-watch-text').value.trim();
  if(username.length<3||body.length<2){setStatus('Escribe un apodo y un comentario válido.');return}
  const button=$('#km-watch-publish'),target=thread,current=active.id;
  button.disabled=true;saveNick(username);setStatus('Enviando…');
  try{
   await backend().sendEpisodeComment(current,target,username,body);
   if(!form.isConnected||active?.id!==current)return;
   $('#km-watch-text').value='';setStatus('Comentario enviado. Se mostrará según la moderación del servicio.');
  }catch(error){if(form.isConnected)setStatus(backend().maskError(error))}
  finally{if(form.isConnected)button.disabled=false}
 });
 container.addEventListener('click',async e=>{
  const button=e.target.closest('[data-km-report]');
  if(!button||!backend()?.enabled()||!active)return;
  if(!confirm('¿Enviar este comentario a moderación?'))return;
  try{
   await backend().report('episodeComment',active.id+'_ep_'+thread+'/'+button.dataset.kmReport,'Contenido inapropiado');
   setStatus('Reporte enviado.');
  }catch(error){setStatus(backend().maskError(error))}
 });
 subscribe();
}
window.OneUpKokomiWatch={mount,unmount:cleanup};
window.addEventListener('pagehide',cleanup);
})();

;
/* ===== 6/9 — themes/cinematic-v3/opening-controller.js ===== */

;
/* Full-screen V3 studio opening, once per session.
 * Scene playback uses the owner's original 3.2s AAC source via studio.js.
 * No buttons, no interception after finish and no dependency on audio autoplay.
 */
(()=>{
'use strict';
const overlay=document.querySelector('#oneup-opening');
if(!overlay)return;
const KEY='oneup-v3-opening-seen-v1';
const forced=new URLSearchParams(location.search).get('intro')==='1';
let seen=false;
try{seen=sessionStorage.getItem(KEY)==='yes'}catch{}
if(seen&&!forced){overlay.remove();return;}
document.body.classList.add('oneup-opening-active');
const others=Array.from(document.body.children).filter(el=>el!==overlay&&el.tagName!=='SCRIPT');
for(const el of others)el.inert=true;
let finished=false,stopped=false;
const timer=setTimeout(finish,6500);
function finish(){
 if(finished)return;
 finished=true;clearTimeout(timer);
 try{sessionStorage.setItem(KEY,'yes')}catch{}
 if(!stopped){
  stopped=true;
  overlay.querySelector('#cinema')?.dispatchEvent(new Event('oneup-opening-stop'));
 }
 overlay.classList.add('oneup-opening-out');
 const cleanup=()=>{
  for(const el of others)el.inert=false;
  document.body.classList.remove('oneup-opening-active');
  // Cancel any in-flight intro download before removing the node: removing
  // a <video> mid-download aborts the fetch (net::ERR_ABORTED).
  const sig=overlay.querySelector('#original-signature');
  if(sig){try{sig.pause()}catch{}sig.removeAttribute('src');try{sig.load()}catch{}}
  overlay.remove();
 };
 // A transition may not fire on iOS, on hidden tabs or reduced motion.
 const exit=setTimeout(cleanup,520);
 overlay.addEventListener('transitionend',e=>{
  if(e.target===overlay){clearTimeout(exit);cleanup()}
 },{once:true});
}
overlay.addEventListener('oneup-opening-finished',finish);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&!finished){
  // Do not strand a visitor behind a partially-rendered intro in background.
  finish();
 }
});
})();

;
/* ===== 7/9 — themes/cinematic-v3/studio.js ===== */

;
/* 1UP ANIME V3 — browser motion study, independent procedural FX.
 * Not an MP4 replacement: user-owned metallic logo + original AAC source only.
 * No artificial/copyrighted character faces. No external libraries.
 */
(()=>{
'use strict';
const DURATION=3.2;
const root=document.querySelector('#cinema');
const canvas=document.querySelector('#particles');
const media=document.querySelector('#original-signature');
const replay=document.querySelector('#replay');
const isOpening=root?.dataset.mode==='opening';
const status=document.querySelector('#audio-status');
if(!root||!canvas||!media||(!replay&&!isOpening))return;
const signatureSrc=media.getAttribute('src')||media.dataset.src||'';
const ctx=canvas.getContext('2d',{alpha:true});
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let width=innerWidth,height=innerHeight,dpr=1,particles=[],start=0,raf=0,playing=false,once=0;
let audioFallback=false;
let seed=0x1A7AC4;
function rand(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967295}
function resetParticles(){
 seed=0x1A7AC4;
 particles=Array.from({length:Math.min(170,Math.max(65,Math.floor(width*height/6800)))},(_,i)=>({
  x:rand(),y:rand(),r:.45+rand()*1.9,speed:.15+rand()*.9,
  drift:-.11+rand()*.22,life:.40+rand()*.58,phase:rand()*Math.PI*2,
  red:i%2===0
 }));
}
function resize(){
 width=Math.max(1,innerWidth);height=Math.max(1,innerHeight);
 dpr=Math.min(devicePixelRatio||1,1.7);
 canvas.width=Math.round(width*dpr);
 canvas.height=Math.round(height*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 resetParticles();
}
function bolt(time,side,index){
 const hue=side===0?'35,119,255':'255,48,102';
 const px=side===0?width*.12:width*.88;
 const py=height*(.24+index*.26);
 const radius=Math.min(width,height)*(.25+index*.08);
 const power=Math.max(0,1-Math.abs(time-(.32+index*.34))/0.20);
 if(power<=0)return;
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const pass of [12,4,1.4]){
  ctx.beginPath();
  ctx.moveTo(px,py);
  for(let step=1;step<=15;step++){
   const u=step/15;
   const jitter=Math.sin(step*11.13+side*6+index*8+time*13)*radius*.14;
   const x=px+(side===0?1:-1)*radius*u+jitter;
   const y=py+Math.sin(u*Math.PI*2.1+time*7)*radius*.22;
   ctx.lineTo(x,y);
  }
  ctx.lineWidth=pass;
  ctx.strokeStyle='rgba('+hue+','+(power*(pass>5?.075:pass>2?.24:.91))+')';
  ctx.shadowBlur=pass*1.5;ctx.shadowColor='rgba('+hue+',1)';
  ctx.stroke();
 }
 ctx.restore();
}
function sparks(time){
 ctx.save();ctx.globalCompositeOperation='lighter';
 const envelope=Math.min(1,time/.3,Math.max(0,(DURATION-time)/.22));
 for(let i=0;i<particles.length;i++){
  const p=particles[i];
  const cyc=((p.y+time*p.speed*.24+Math.sin(p.phase+time)*.025)%1+1)%1;
  const px=(p.x+time*p.drift*.11)*width;
  const py=cyc*height;
  const side=p.red?1:0;
  const color=side?'255,79,92':'50,163,255';
  const beam=Math.max(0,1-Math.abs(px-width*.5)/(width*.62));
  const alpha=p.life*(.19+.80*beam)*envelope;
  if(!alpha)continue;
  ctx.fillStyle='rgba('+color+','+alpha+')';
  ctx.shadowColor='rgba('+color+',.8)';
  ctx.shadowBlur=Math.min(14,p.r*6);
  ctx.beginPath();ctx.arc(px,py,p.r,0,Math.PI*2);ctx.fill();
  if(i%4===0){
   ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+p.drift*24,py+10+p.speed*9);
   ctx.lineWidth=.55;ctx.strokeStyle='rgba('+color+','+(alpha*.53)+')';ctx.stroke();
  }
 }
 ctx.restore();
}
function atmosphere(time){
 const power=Math.max(0,Math.sin(Math.PI*Math.min(DURATION,time)/DURATION));
 ctx.save();
 const x=width*.50,y=height*.5;
 const g=ctx.createRadialGradient(x,y,0,x,y,Math.max(width,height)*.68);
 g.addColorStop(0,'rgba(90,40,160,'+(power*.11)+')');
 g.addColorStop(.48,'rgba(10,22,86,'+(power*.055)+')');
 g.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
 ctx.restore();
}
function beatPulse(time){
 const beats=[.26,.50,.74,1.12,1.90,2.64];
 const energy=beats.reduce((a,b)=>a+Math.max(0,1-Math.abs(time-b)/.055),0);
 if(!energy)return;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const x=width*.5,y=height*.48,r=Math.min(width,height)*(.28+energy*.02);
 ctx.beginPath();ctx.ellipse(x,y,r*1.36,r*.53,time*.15,0,Math.PI*2);
 ctx.strokeStyle='rgba(194,221,255,'+Math.min(.5,energy*.19)+')';
 ctx.shadowColor='#9fd0ff';ctx.shadowBlur=30;ctx.lineWidth=Math.max(1,energy*2);ctx.stroke();
 ctx.restore();
}
function drawFrame(time){
 ctx.clearRect(0,0,width,height);
 if(reduced)return;
 atmosphere(time);sparks(time);
 bolt(time,0,0);bolt(time,1,0);
 bolt(time,0,1);bolt(time,1,1);
 beatPulse(time);
}
function tick(now){
 if(!playing)return;
 const elapsed=Math.max(0,(now-start)/1000);
 const t=Number.isFinite(media.currentTime)&&media.currentTime>.01?
  Math.min(DURATION,media.currentTime):Math.min(DURATION,elapsed);
 drawFrame(t);
 if(elapsed>DURATION+.65){stop();return}
 raf=requestAnimationFrame(tick);
}
function stop(){
 if(!playing)return;
 playing=false;cancelAnimationFrame(raf);
 root.classList.remove('playing');
 root.classList.add('finished');
 drawFrame(DURATION);
 try{media.pause()}catch{}
 if(replay)replay.disabled=false;
 if(isOpening)root.dispatchEvent(new CustomEvent('oneup-opening-finished',{bubbles:true}));
}
function startScene(){
 cancelAnimationFrame(raf);
 try{media.pause();media.currentTime=0;}catch{}
 // Attach the signature source only when the scene actually starts. With
 // preload="none" and no src in the markup, a discarded intro never starts
 // (and never aborts) a download of the 1.6 MB file. The stash keeps the
 // studio preview replay working after the first play.
 if(!media.getAttribute('src')&&signatureSrc){media.src=signatureSrc;}
 playing=true;audioFallback=false;once++;
 root.classList.remove('playing','finished');
 // Force restart of CSS keyframes while keeping the same DOM and original logo.
 void root.offsetWidth;
 root.classList.add('playing');
 start=performance.now();
 raf=requestAnimationFrame(tick);
 if(replay)replay.disabled=true;
 if(reduced){
  status.textContent='Movimiento reducido: se conserva el logotipo estático.';
  setTimeout(stop,900);return;
 }
 media.muted=false;
 media.playsInline=true;
 const attempt=media.play();
 if(attempt?.catch)attempt.catch(()=>{
   if(!playing)return;
   audioFallback=true;
   status.textContent='El navegador no permite audio automático; continúa sin sonido.';
   media.muted=true;
   media.play().catch(()=>{});
 });
}
function setupCharacters(entries){
 // Permission-required optional slots, not populated with extracted images.
 if(!Array.isArray(entries))return;
 for(const [index,item] of entries.entries()){
  const url=String(item?.image||'');
  const permission=String(item?.permission||'');
  if(!/^\.\/assets\/characters_authorized\/[\w.-]+\.png$/.test(url)||
    !permission.startsWith('owner-authorized:'))continue;
  const layer=document.createElement('img');
  layer.src=url;layer.alt='';layer.decoding='async';
  layer.className='authorized-character authorized-character-'+(index%2);
  layer.dataset.permission=permission;layer.setAttribute('aria-hidden','true');
  document.querySelector('.environment').append(layer);
 }
}
async function loadAllowedCharacters(){
 try{
  const r=await fetch('./themes/oneup/characters.json',{cache:'no-store'});
  if(r.ok)setupCharacters((await r.json()).layers);
 }catch{}
}
window.addEventListener('resize',resize,{passive:true});
media.addEventListener('ended',stop);
media.addEventListener('error',()=>{audioFallback=true;status.textContent='Audio no disponible; permanece la vista visual.'});
if(replay)replay.addEventListener('click',startScene);
if(isOpening)root.addEventListener('oneup-opening-stop',stop);
resize();
void loadAllowedCharacters();
startScene();
})();

;
/* ===== 8/9 — themes/oneup-palette/selector.js ===== */

;
/* 1UP ANIME — original color-theme picker. No third-party UI/CSS imported.
 * Runs entirely in the browser; the only saved data is a theme identifier.
 * Apply stored palette before the page paints, then mount accessible controls.
 */
(() => {
  'use strict';
  const KEY = 'oneup.palette.v1';
  const OPTIONS = Object.freeze([
    { id: 'esmeralda', label: 'Negro y verde', caption: 'Esmeralda', swatch: '#65e5a0', chrome: '#08140f' },
    { id: 'original', label: 'Diseño original', caption: 'Original', swatch: '#fd3158', chrome: '#090a11' },
    { id: 'violeta', label: 'Negro y violeta', caption: 'Violeta', swatch: '#b89dff', chrome: '#100d1c' }
  ]);
  const allowed = id => OPTIONS.some(option => option.id === id);
  const root = document.documentElement;
  let saved = '';
  try { saved = window.localStorage.getItem(KEY) || ''; } catch { /* private browsing */ }
  root.dataset.oneupTheme = allowed(saved) ? saved : 'esmeralda';

  function active() {
    return allowed(root.dataset.oneupTheme) ? root.dataset.oneupTheme : 'esmeralda';
  }
  function setTheme(id, persist = true) {
    if (!allowed(id)) return false;
    root.dataset.oneupTheme = id;
    if (persist) {
      try { window.localStorage.setItem(KEY, id); } catch { /* storage denied */ }
    }
    document.querySelectorAll('[data-oneup-theme-option]').forEach(button => {
      const picked = button.dataset.oneupThemeOption === id;
      button.setAttribute('aria-pressed', String(picked));
      button.classList.toggle('is-selected', picked);
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', OPTIONS.find(option => option.id === id).chrome);
    return true;
  }

  function makeOptions(title, className) {
    const group = document.createElement('section');
    group.className = className;
    group.setAttribute('aria-label', title);
    const heading = document.createElement('h3');
    heading.textContent = title;
    heading.className = 'oneup-theme-heading';
    group.append(heading);
    for (const option of OPTIONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'oneup-theme-option';
      button.dataset.oneupThemeOption = option.id;
      button.setAttribute('aria-label', option.label);
      button.setAttribute('aria-pressed', String(active() === option.id));
      const color = document.createElement('span');
      color.className = 'oneup-theme-swatch';
      color.style.setProperty('--swatch', option.swatch);
      color.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = option.caption;
      label.className = 'oneup-theme-label';
      const check = document.createElement('span');
      check.className = 'oneup-theme-check';
      check.textContent = '✓';
      check.setAttribute('aria-hidden', 'true');
      button.append(color, label, check);
      if (active() === option.id) button.classList.add('is-selected');
      button.addEventListener('click', () => {
        setTheme(option.id);
        if (className === 'oneup-theme-panel') closePanel();
      });
      group.append(button);
    }
    return group;
  }

  let trigger = null, panel = null;
  function closePanel(focus = false) {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger?.focus();
  }
  function mount() {
    const header = document.querySelector('.header-right');
    if (!header || document.getElementById('oneup-theme-trigger')) return;
    const wrap = document.createElement('div');
    wrap.className = 'oneup-theme-control';
    trigger = document.createElement('button');
    trigger.id = 'oneup-theme-trigger';
    trigger.className = 'icon-button oneup-theme-trigger';
    trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Cambiar tema de colores');
    trigger.setAttribute('title', 'Cambiar tema de colores');
    trigger.setAttribute('aria-controls', 'oneup-theme-panel');
    trigger.setAttribute('aria-expanded', 'false');
    // A locally authored SVG; no external assets or icon dependencies.
    trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5a8.5 8.5 0 1 0 0 17h1.4a2.15 2.15 0 0 0 1.6-3.6 1.6 1.6 0 0 1 1.25-2.66h1.6a3.65 3.65 0 0 0 3.65-3.65C21.5 6.9 17.24 3.5 12 3.5Z"/><circle cx="7.5" cy="10" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="16" cy="8.5" r="1"/><circle cx="7.9" cy="14.2" r="1"/></svg>';
    panel = makeOptions('Seleccionar tema', 'oneup-theme-panel');
    panel.id = 'oneup-theme-panel';
    panel.hidden = true;
    wrap.append(trigger, panel);
    header.insertBefore(wrap, header.querySelector('#auth-open'));
    trigger.addEventListener('click', () => {
      const next = !panel.hidden;
      panel.hidden = next;
      trigger.setAttribute('aria-expanded', String(!next));
      if (!next) panel.querySelector('[aria-pressed="true"]')?.focus();
    });
    document.addEventListener('pointerdown', event => {
      if (!wrap.contains(event.target)) closePanel();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) { event.stopPropagation(); closePanel(true); }
    });
    const drawer = document.getElementById('km-drawer');
    if (drawer) {
      const drawerChoices = makeOptions('Colores de 1UP Anime', 'oneup-theme-drawer');
      const footer = drawer.querySelector('.km-drawer-foot');
      if (footer) footer.before(drawerChoices);
      else drawer.append(drawerChoices);
    }
    setTheme(active(), false);
  }
  // Deferred scripts execute while readyState is often 'interactive'. Wait for
  // DOMContentLoaded so the existing Kokomi menu's listener creates its drawer
  // before we insert the mobile palette options.
  if (document.readyState === 'complete') mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });
  // Only an allowlisted palette identifier; no remote calls or user content.
  window.OneUpPalette = Object.freeze({ get: active, set: setTheme });
})();

;
/* ===== 9/9 — themes/oneup-motion/windows.js ===== */

;
/*
 * 1UP Anime interaction motion: nonblocking screen entry and optional
 * close animation for native <dialog>. Only opacity and transform.
 * Core navigation works identically without this module.
 */
(() => {
  'use strict';
  const EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const current = new WeakMap();
  const closing = new Map();
  const reduced = () => (
    Boolean(document.body?.classList.contains('km-quiet')) ||
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) ||
    Boolean(navigator.connection?.saveData)
  );

  function enter(element, kind = 'route') {
    if (!element || element.hidden || !element.isConnected || document.hidden ||
        reduced() || typeof element.animate !== 'function') return false;
    current.get(element)?.cancel();
    const duration = kind === 'interior' ? 270 : 215;
    const animation = element.animate([
      { opacity: .83, transform: 'translate3d(0, 11px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' }
    ], { duration, easing: EASE });
    animation.id = 'oneup-motion-enter';
    current.set(element, animation);
    animation.finished.catch(() => {}).then(() => {
      if (current.get(element) === animation) current.delete(element);
    });
    return true;
  }

  function closeDialog(dialog) {
    if (!dialog?.open) return false;
    if (closing.has(dialog)) return true;
    if (reduced() || document.hidden || typeof dialog.animate !== 'function') {
      dialog.close();
      return true;
    }
    const animation = dialog.animate([
      { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
      { opacity: 0, transform: 'translate3d(0, 10px, 0) scale(.986)' }
    ], { duration: 165, easing: EASE, fill: 'forwards' });
    animation.id = 'oneup-motion-close';
    closing.set(dialog, animation);
    const finish = () => {
      if (closing.get(dialog) !== animation) return;
      closing.delete(dialog);
      if (dialog.open) dialog.close();
    };
    animation.finished.then(finish, finish);
    // If a PWA is backgrounded mid-close, release the native modal immediately.
    const onVisibility = () => {
      if (document.hidden) finish();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    document.addEventListener('visibilitychange', onVisibility);
    dialog.addEventListener('close', () => {
      document.removeEventListener('visibilitychange', onVisibility);
      if (closing.get(dialog) === animation) {
        closing.delete(dialog);
        animation.cancel();
      }
    }, { once: true });
    return true;
  }

  window.OneUpMotion = Object.freeze({ enter, closeDialog, prefersReducedMotion: reduced });
})();
