'use strict';
/* 1UP Anime — independent Jikan-powered anime explorer. No third-party video scraping. */
const API = 'https://api.jikan.moe/v4';
const STORAGE = '1up_anime_v1';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = {view:'inicio',pool:new Map(),saved:{},featured:null,catalog:[],page:1,next:false,loading:false,currentId:null,lastSearch:'',request:0};
const sections = {
  temporada:{title:'Esta temporada.',label:'EN EMISIÓN / ESTRENOS',description:'Anime en emisión esta temporada.',url:'/seasons/now?sfw=true&limit=24'},
  populares:{title:'Los más populares.',label:'RANKING / POPULARES',description:'Los títulos que más seguidores tienen en MyAnimeList.',url:'/top/anime?filter=bypopularity&sfw=true&limit=24'},
  peliculas:{title:'Películas de anime.',label:'CINE / ANIMACIÓN',description:'Películas que merecen un lugar en tu lista.',url:'/top/anime?type=movie&sfw=true&limit=24'}
};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const escapeText=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl=u=>{try{let o=new URL(u);return ['https:','http:'].includes(o.protocol)?o.href:''}catch{return ''}};
const imageOf=a=>safeUrl(a?.images?.webp?.large_image_url||a?.images?.jpg?.large_image_url||a?.images?.jpg?.image_url||'');
const shortTitle=a=>a?.title_english||a?.title||a?.title_japanese||'Anime sin título';
const truncate=(s,n)=>String(s||'').slice(0,n)+(String(s||'').length>n?'…':'');
const timeWait=(()=>{let last=0;return async()=>{let ms=Math.max(0,last+425-Date.now());last=Math.max(Date.now(),last+425);if(ms)await delay(ms)}})();
const cache=new Map();
let toastTimer;
function toast(message){const e=$('#toast');e.textContent=message;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),2600)}
function loadSaved(){try{const v=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))state.saved=v}catch{}}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(state.saved))}catch{toast('No se pudo guardar en este navegador')}}
function remembered(a){const id=Number(a?.mal_id);if(!Number.isFinite(id))return;state.pool.set(id,a)}
function rememberAll(list){for(const a of list||[])remembered(a)}
function saved(id){return state.saved[String(id)]||null}
function isFav(id){return Boolean(saved(id)?.favorite)}
function ensureSaved(id){let a=state.pool.get(Number(id));if(!state.saved[id])state.saved[id]={id:Number(id),title:shortTitle(a),image:imageOf(a),year:a?.year||a?.aired?.prop?.from?.year||'',score:a?.score||'',type:a?.type||'',watched:0,favorite:true,customUrl:''};return state.saved[id]}
function toggleFav(id){id=Number(id);let a=state.pool.get(id);if(!a)return;let item=ensureSaved(id);item.favorite=!item.favorite;if(!item.favorite&&!(item.watched>0)&&!item.customUrl)delete state.saved[id];persist();updateFavoriteButtons();if(state.view==='milista')renderMyList();toast(isFav(id)?'Añadido a tu lista':'Quitado de favoritos')}
function updateFavoriteButtons(){for(const el of $$('[data-save]')){const yes=isFav(el.dataset.save);el.textContent=yes?'✓':'＋';el.classList.toggle('saved',yes);el.setAttribute('aria-label',yes?'Quitar de mi lista':'Guardar en mi lista')}if(state.featured){$('#hero-fav').textContent=isFav(state.featured.mal_id)?'✓ EN MI LISTA':'＋ GUARDAR EN MI LISTA'}}
async function getJson(path){
 if(cache.has(path)&&Date.now()-cache.get(path).time<180000){return cache.get(path).value}
 await timeWait();
 let err;
 for(let i=0;i<3;i++){
  try{
   const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),12000);
   let r;
   try{r=await fetch(API+path,{signal:ctrl.signal,headers:{Accept:'application/json'}})}
   finally{clearTimeout(timeout)}
   if(r.status===429||r.status===503){await delay(1200*(i+1));continue}
   if(!r.ok)throw Error('HTTP '+r.status);
   const data=await r.json();cache.set(path,{value:data,time:Date.now()});return data;
  }catch(e){err=e;if(i<2)await delay(700*(i+1))}
 }
 throw err||Error('El servicio de anime está ocupado. Intenta de nuevo.');
}
const errorCard=(title,msg)=>'<div class="error"><b>'+escapeText(title)+'</b><p>'+escapeText(msg||'Revisa tu conexión e inténtalo nuevamente.')+'</p><button class="button button-clear" data-view="inicio">Volver al inicio</button></div>';
const emptyCard=msg=>'<div class="empty">'+escapeText(msg)+'</div>';
function card(a,index){
 const id=Number(a.mal_id), title=shortTitle(a), img=imageOf(a),score=a.score?Number(a.score).toFixed(1):'—';
 const year=a.year||a.aired?.prop?.from?.year||'Anime',type=a.type||'Serie',ep=a.episodes?a.episodes+' episodios':'';
 const photo=img?'<img src="'+escapeText(img)+'" alt="Portada de '+escapeText(title)+'" loading="lazy" referrerpolicy="no-referrer">':'';
 return '<article class="anime-card"><div class="anime-cover" data-detail="'+id+'" role="button" tabindex="0" aria-label="Ver ficha de '+escapeText(title)+'">'+photo+'<div class="anime-gradient"></div>'+(index<3?'<span class="anime-top">TOP '+String(index+1).padStart(2,'0')+'</span>':'')+'<span class="anime-score"><span>★</span> '+score+'</span></div><button class="anime-save'+(isFav(id)?' saved':'')+'" data-save="'+id+'" title="Añadir a mi lista" aria-label="Guardar en mi lista">'+(isFav(id)?'✓':'＋')+'</button><div class="anime-info"><button class="anime-name" data-detail="'+id+'">'+escapeText(title)+'</button><div class="anime-sub"><span>'+escapeText(type)+' · '+escapeText(String(year))+'</span><span>'+escapeText(ep)+'</span></div></div></article>';
}
function paint(el,items,showRank){el.innerHTML=items?.length?items.map((a,i)=>card(a,showRank?i:999)).join(''):emptyCard('No se encontraron títulos.')}
function headlineTitle(text){let words=text.split(' ');return escapeText(words.slice(0,-1).join(' ')||words[0])+' <em>'+escapeText(words.slice(-1)[0])+'</em>'}
async function loadHome(){
 try{
  const d=await getJson('/top/anime?filter=bypopularity&sfw=true&limit=10');state.top=d.data||[];rememberAll(state.top);paint($('#top-grid'),state.top.slice(0,10),true);
  let first=state.top.find(a=>imageOf(a))||state.top[0];if(first)setFeatured(first);
 }catch(e){$('#top-grid').innerHTML=errorCard('No se pudo cargar el ranking',e.message)}
 try{
  const d=await getJson('/seasons/now?sfw=true&limit=10');state.season=d.data||[];rememberAll(state.season);paint($('#season-grid'),state.season.slice(0,10),false);
 }catch(e){$('#season-grid').innerHTML=errorCard('No se pudieron cargar los estrenos',e.message)}
}
function setFeatured(a){
 state.featured=a;const name=shortTitle(a).toUpperCase(),title=name.split(' ');
 let first=title.slice(0,2).join(' '),second=title.slice(2).join(' ')||'ANIME';
 $('#hero-title').innerHTML=escapeText(first)+'<span>'+escapeText(truncate(second,29))+'</span>';
 $('#hero-description').textContent=truncate(a.synopsis||'Descubre este anime, guárdalo en tu lista y sigue el progreso de sus episodios.',240);
 let img=imageOf(a);if(img)$('#hero-art').style.backgroundImage="linear-gradient(90deg,#1114,transparent),url('"+img.replace(/['"()\\]/g,'')+"')";
 $('#hero-meta').innerHTML='<span>'+escapeText(a.type||'ANIME')+'</span><span>'+escapeText(String(a.year||a.aired?.prop?.from?.year||'ESTRENO'))+'</span><span>★ '+escapeText(String(a.score||'—'))+'</span>';
 updateFavoriteButtons();
}
function markNav(v){$$('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===v))}
function switchView(v){
 if(v!=='inicio'&&v!=='milista'&&v!=='busca'&&!sections[v])v='inicio';
 state.view=v;$('#home-view').hidden=v!=='inicio';$('#catalog-view').hidden=v==='inicio';markNav(v);
 if(v==='milista')renderMyList();else if(v!=='inicio')loadCatalog(v,1);
 try{history.replaceState(null,'','#'+v)}catch{}
 window.scrollTo({top:0,behavior:'instant'});
}
function setCatalogTitle(title,label,description){$('#catalog-title').innerHTML=headlineTitle(title);$('#catalog-kicker').textContent=label;$('#catalog-desc').textContent=description;$('#results-count').textContent=''}
async function loadCatalog(v,page,append=false){
 if(state.loading&&append)return;
 let s=v==='busca'?{title:'Resultados de búsqueda.',label:'BUSCADOR / RESULTADOS',description:'Resultados para «'+state.lastSearch+'»',url:'/anime?q='+encodeURIComponent(state.lastSearch)+'&sfw=true&limit=24&order_by=popularity&sort=asc'}:sections[v];
 if(!s)return;
 let request=++state.request;setCatalogTitle(s.title,s.label,s.description);state.loading=true;
 $('#load-more').hidden=true;
 if(!append){$('#catalog-grid').innerHTML='<div class="loading">Buscando animes…</div>';state.catalog=[]}
 try{
  let connector=s.url.includes('?')?'&':'?';
  const d=await getJson(s.url+connector+'page='+page);
  if(request!==state.request)return;
  const list=d.data||[];rememberAll(list);state.page=page;state.next=Boolean(d.pagination?.has_next_page);state.catalog=append?state.catalog.concat(list):list;
  paint($('#catalog-grid'),state.catalog,v==='populares');$('#results-count').textContent=state.catalog.length+' ANIMES ENCONTRADOS';$('#load-more').hidden=!state.next;
 }catch(e){if(request===state.request){$('#catalog-grid').innerHTML=errorCard('No pudimos consultar el catálogo',e.message)}}
 finally{if(request===state.request)state.loading=false}
}
function renderMyList(){
 setCatalogTitle('Mi lista personal.','TU ESPACIO / FAVORITOS','Tus animes guardados y los episodios vistos en este dispositivo.');
 const ids=Object.values(state.saved).filter(a=>a?.favorite||a?.watched>0||a?.customUrl).reverse().map(x=>Number(x.id));
 const entries=ids.map(id=>state.pool.get(id)||{
  mal_id:id,title:state.saved[id].title,score:state.saved[id].score,type:state.saved[id].type,year:state.saved[id].year,
  images:{jpg:{large_image_url:state.saved[id].image}}
 });
 rememberAll(entries);
 paint($('#catalog-grid'),entries,false);$('#results-count').textContent=entries.length+' ANIMES GUARDADOS';$('#load-more').hidden=true;
 if(!entries.length)$('#catalog-grid').innerHTML=emptyCard('Tu lista está vacía. Usa ＋ en cualquier anime para añadirlo.');
}
async function showDetail(id){
 id=Number(id);if(!id)return;
 state.currentId=id;const dialog=$('#details');$('#modal-content').innerHTML='<div class="loading">Cargando la ficha del anime…</div>';
 if(!dialog.open)dialog.showModal();
 try{
  let details=await getJson('/anime/'+id+'/full');let anime=details.data;if(!anime)throw Error('Ficha no encontrada');remembered(anime);
  if(state.currentId!==id)return;paintDetail(anime);
 }catch(e){let fallback=state.pool.get(id);if(fallback)paintDetail(fallback);else $('#modal-content').innerHTML=errorCard('No se pudo mostrar este anime',e.message)}
}
function paintDetail(a){
 let id=Number(a.mal_id),title=shortTitle(a),item=saved(id),watched=Math.max(0,Number(item?.watched)||0),eps=Number(a.episodes)||0;
 let img=imageOf(a);const stream=(a.streaming||[]).filter(x=>safeUrl(x.url)).map(x=>'<a class="stream-link" target="_blank" rel="noopener noreferrer" href="'+escapeText(safeUrl(x.url))+'">'+escapeText(x.name||'Plataforma')+' ↗</a>').join('');
 const genres=(a.genres||[]).slice(0,4).map(g=>g.name).join(' · ');
 const videoId=a.trailer?.youtube_id;const haveVideo=typeof videoId==='string'&&/^[\w-]{11}$/.test(videoId);
 const personal=safeUrl(item?.customUrl||'');
 const imageTag=img?'<img class="detail-poster" src="'+escapeText(img)+'" alt="Portada de '+escapeText(title)+'">':'';
 $('#modal-content').innerHTML='<div class="detail-head">'+imageTag+'<div><div class="kicker">1UP ANIME / DETALLES</div><h2>'+escapeText(title)+'</h2><div class="detail-meta"><b>★ '+escapeText(String(a.score||'—'))+'</b> · '+escapeText(String(a.year||a.aired?.prop?.from?.year||'—'))+' · '+escapeText(a.type||'Anime')+' · '+escapeText(String(eps||'?'))+' episodios<br>'+escapeText(genres)+'</div><p>'+escapeText(a.synopsis||'Sin descripción disponible.')+'</p><div class="detail-actions"><button class="button button-primary" data-favorite="'+id+'">'+(isFav(id)?'✓ GUARDADO':'＋ MI LISTA')+'</button>'+(safeUrl(a.url)?'<a class="button button-clear" href="'+escapeText(safeUrl(a.url))+'" target="_blank" rel="noopener noreferrer">VER FICHA ↗</a>':'')+'</div></div></div>'+
 '<section class="detail-section"><h3>Progreso de episodios</h3><p>Marca cuántos episodios viste. Se guarda en este navegador.</p><div class="episode-row"><button data-episode="-1" aria-label="Restar episodio">−</button><output id="watched">'+watched+'</output><button data-episode="1" aria-label="Sumar episodio">+</button><span class="detail-meta">de '+(eps||'¿?')+' episodios</span></div></section>'+
 '<section class="detail-section"><h3>Dónde ver</h3><p>Enlaces de plataformas registrados en los datos públicos. Cada sitio externo puede incluir anuncios, suscripciones o restricciones de región.</p><div class="stream-links">'+(stream||'<p>Este título no tiene plataformas de visualización registradas.</p>')+'</div></section>'+
 '<section class="detail-section"><h3>Mi enlace personal</h3><p>Guarda una dirección HTTPS para abrir tu sitio preferido. 1UP Anime no extrae ni reproduce capítulos de terceros.</p><div class="custom-row"><input type="url" id="personal-url" value="'+escapeText(personal)+'" placeholder="https://..." aria-label="Enlace personal"><button id="save-url">Guardar</button>'+(personal?'<a class="stream-link" target="_blank" rel="noopener noreferrer" href="'+escapeText(personal)+'">ABRIR ↗</a>':'')+'</div></section>'+
 (haveVideo?'<section class="detail-section"><h3>Tráiler oficial</h3><div class="trailer-frame"><iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/'+videoId+'" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Tráiler de '+escapeText(title)+'"></iframe></div></section>':'');
}
function saveEpisode(delta){const id=state.currentId;let a=state.pool.get(id);if(!a)return;let item=ensureSaved(id);const max=Number(a.episodes)||9999;item.watched=Math.max(0,Math.min(max,Math.round(Number(item.watched)||0)+delta));persist();$('#watched').textContent=item.watched;toast('Progreso guardado')}
function savePersonalLink(){const input=$('#personal-url');let raw=input.value.trim();let url=raw?safeUrl(raw):'';if(raw&&(!url||!url.startsWith('https://'))){toast('Usa un enlace válido que empiece con https://');return}let item=ensureSaved(state.currentId);item.customUrl=url;persist();paintDetail(state.pool.get(state.currentId));toast('Enlace guardado')}
function searchNow(raw){const q=(raw||'').trim();if(!q){toast('Escribe el nombre de un anime');return}state.lastSearch=q;switchView('busca')}
function closeDialog(){const el=$('#details');state.currentId=null;if(el.open)el.close();$('#modal-content').innerHTML=''}
function setup(){
 loadSaved();$('#footer-year').textContent=new Date().getFullYear();
 document.addEventListener('click',event=>{
  const target=event.target.closest('[data-view],[data-detail],[data-save],[data-favorite],[data-episode]');
  if(target?.dataset.view){event.preventDefault();switchView(target.dataset.view);return}
  if(target?.dataset.detail){showDetail(target.dataset.detail);return}
  if(target?.dataset.save){toggleFav(target.dataset.save);return}
  if(target?.dataset.favorite){toggleFav(target.dataset.favorite);paintDetail(state.pool.get(state.currentId));return}
  if(target?.dataset.episode){saveEpisode(Number(target.dataset.episode));return}
 });
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-detail]')){e.preventDefault();showDetail(e.target.dataset.detail)}});
 $('#hero-explore').addEventListener('click',()=>state.featured&&showDetail(state.featured.mal_id));
 $('#hero-fav').addEventListener('click',()=>state.featured&&toggleFav(state.featured.mal_id));
 $('#header-search').addEventListener('click',()=>{$('#search').focus();if(state.view!=='inicio')switchView('inicio');setTimeout(()=>$('#search').focus(),10)});
 $('#mobile-search').addEventListener('click',()=>{switchView('inicio');setTimeout(()=>{$('#search').scrollIntoView({behavior:'smooth',block:'center'});$('#search').focus()},60)});
 $('#search-form').addEventListener('submit',e=>{e.preventDefault();searchNow($('#search').value)});
 let searchDelay;$('#search').addEventListener('input',e=>{clearTimeout(searchDelay);let q=e.target.value.trim();if(q.length>=3)searchDelay=setTimeout(()=>searchNow(q),750)});
 $('#load-more').addEventListener('click',()=>{if(state.next&&!state.loading)loadCatalog(state.view,state.page+1,true)});
 $('#close-modal').addEventListener('click',closeDialog);
 $('#details').addEventListener('click',e=>{if(e.target===$('#details'))closeDialog();if(e.target?.id==='save-url')savePersonalLink()});
 let installEvent;
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvent=e;$('#install-app').hidden=false});
 $('#install-app').addEventListener('click',async()=>{if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;$('#install-app').hidden=true});
 if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
 const initial=decodeURIComponent(location.hash.slice(1));if(sections[initial]||initial==='milista')switchView(initial);
 loadHome();
}
document.addEventListener('DOMContentLoaded',setup);