/* 1UP Anime v4: AniList main provider, Jikan backup, offline sample. */
(()=>{
'use strict';
const API='https://graphql.anilist.co', JIKAN='https://api.jikan.moe/v4';
const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>{try{let x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return ''}};
const formats={TV:'Serie',MOVIE:'Película',OVA:'OVA',ONA:'ONA',SPECIAL:'Especial',TV_SHORT:'Corto'};
const genres=[['Action','Acción'],['Adventure','Aventura'],['Comedy','Comedia'],['Drama','Drama'],['Fantasy','Fantasía'],['Romance','Romance'],['Sci-Fi','Ciencia ficción'],['Supernatural','Sobrenatural'],['Mystery','Misterio'],['Sports','Deportes'],['Horror','Terror'],['Slice of Life','Vida cotidiana']];
const genreSpanish=label=>{const pair=genres.find(g=>g[0]===label);return pair?pair[1]:({Psychological:'Psicológico',Thriller:'Suspenso',Music:'Música',Mecha:'Robots',Supernatural:'Sobrenatural',Ecchi:'Ecchi',Horror:'Terror',Sports:'Deportes',Fantasy:'Fantasía'}[label]||label)};
const seedRecords=[
[5114,'Fullmetal Alchemist: Brotherhood','Action,Adventure,Drama,Fantasy',91,2009],
[21,'One Piece','Action,Adventure,Fantasy',88,1999],
[16498,'Attack on Titan','Action,Drama,Fantasy',89,2013],
[38000,'Demon Slayer: Kimetsu no Yaiba','Action,Fantasy',84,2019],
[40748,'Jujutsu Kaisen','Action,Fantasy,Supernatural',85,2020],
[52991,'Frieren: Beyond Journey’s End','Adventure,Drama,Fantasy',92,2023],
[34572,'Black Clover','Action,Adventure,Fantasy',81,2017],
[20,'Naruto','Action,Adventure',80,2002],
[1535,'Death Note','Mystery,Supernatural,Drama',86,2006],
[52299,'Solo Leveling','Action,Adventure,Fantasy',82,2024],
[50265,'SPY x FAMILY','Action,Comedy',85,2022],
[9253,'Steins;Gate','Drama,Sci-Fi,Mystery',91,2011],
[30276,'One Punch Man','Action,Comedy,Sci-Fi',85,2015],
[31964,'My Hero Academia','Action,Comedy',78,2016],
[199,'Spirited Away','Adventure,Fantasy',86,2001,'MOVIE'],
[32281,'Your Name','Drama,Romance,Fantasy',88,2016,'MOVIE'],
[28851,'A Silent Voice','Drama,Romance',88,2016,'MOVIE'],
[164,'Princess Mononoke','Action,Adventure,Fantasy',87,1997,'MOVIE'],
[431,'Howl’s Moving Castle','Adventure,Drama,Fantasy',86,2004,'MOVIE'],
[38826,'Weathering With You','Drama,Fantasy,Romance',82,2019,'MOVIE'],
[50594,'Suzume','Adventure,Fantasy',78,2022,'MOVIE']
];
const samples=seedRecords.map(x=>({id:'mal-'+x[0],mal_id:x[0],title:x[1],image:'',banner:'',description:'Título de ejemplo del catálogo. Se actualizará al recuperar la conexión con las fuentes de datos.',averageScore:x[3],year:x[4],genres:x[2].split(','),format:x[5]||'TV',episodes:0,streaming:[],siteUrl:'https://myanimelist.net/anime/'+x[0],next:null,source:'sample'}));
// Auto-generated Spanish descriptions. The catalog is translated on GitHub Actions,
// not by scraping JKAnime or sending visitors' browsing activity to translation services.
const synopsisLocale={translations:{},ready:false};
function normalizeSynopsis(value){return String(value||'').replace(/\s+/g,' ').trim()}
function spanishSynopsis(a){
 if(!a)return '';
 const row=synopsisLocale.translations[String(a.id)]||
   (a.mal_id?synopsisLocale.translations['mal-'+a.mal_id]:null);
 return normalizeSynopsis(a.description_es||row?.es);
}
function hasSpanish(a){return Boolean(spanishSynopsis(a)) || a?.source==='sample'}
function hasEditorialSpanish(a){return Boolean(synopsisLocale.translations[String(a?.id)]?.editorial)}
function chosenSynopsis(a){
 if(!a)return 'Sinopsis no disponible.';
 if(a.source==='sample')return normalizeSynopsis(a.description);
 return spanishSynopsis(a)||'Sinopsis en español pendiente de traducción para este anime.';
}
function applySpanishToVisibleText(){
 const featured=state.featured;
 if(featured && featured.source!=='sample'){
  const el=$('#hero-description');if(el)el.textContent=chosenSynopsis(featured).slice(0,245);
 }
 const active=state.entries.get(state.active);
 if(!active||!$('#anime-dialog')?.open)return;
 const excerpt=$('.oneup-detail-synopsis');
 if(excerpt)excerpt.textContent=chosenSynopsis(active);
 const full=$('.oneup-synopsis-text');
 if(full)full.textContent=chosenSynopsis(active);
 const label=$('.oneup-synopsis-eyebrow');
 if(label)label.textContent=hasSpanish(active)?'SINOPSIS EN ESPAÑOL':'SINOPSIS · TRADUCCIÓN PENDIENTE';
 const source=$('.oneup-synopsis-source');
 if(source)source.textContent=hasSpanish(active)?(hasEditorialSpanish(active)?'Sinopsis revisada editorialmente en español':'Traducción automática al español · puede contener imprecisiones'):'Aún no hay traducción disponible para este título';
 const original=$('[data-synopsis-original]');
 if(original)original.hidden=!normalizeSynopsis(active.description);
}
async function loadSpanishSynopses(){
 try{
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),7500);
  let response;
  try{response=await fetch('./data/translations-es.json',{cache:'no-store',signal:ctrl.signal})}
  finally{clearTimeout(timer)}
  if(!response.ok)throw Error('Archivo de traducciones no disponible');
  const json=await response.json();
  if(json.language!=='es'||typeof json.translations!=='object'||!json.translations)throw Error('Archivo de idioma inválido');
  synopsisLocale.translations=json.translations;
  synopsisLocale.ready=true;
  applySpanishToVisibleText();
 }catch(e){console.info('1UP Anime: sinopsis en español pendiente.',e?.message)}
}
const state={entries:new Map(),saved:{},home:{},featured:null,view:'inicio',results:[],page:1,next:false,loading:false,filters:{genre:'',format:'',status:'',sort:'POPULARITY_DESC'},query:'',active:null,seq:0};
function register(data){for(const a of data||[])if(a.id)state.entries.set(a.id,a)}
function normalizeAni(m){
 const score=Number(m.averageScore)||0;
 return {id:m.idMal?'mal-'+m.idMal:'al-'+m.id,mal_id:m.idMal||null,title:m.title?.english||m.title?.romaji||'Anime',image:safe(m.coverImage?.extraLarge||m.coverImage?.large),banner:safe(m.bannerImage),description:String(m.description||'').replace(/<[^>]+>/g,'').replace(/\n/g,' '),averageScore:score,year:m.seasonYear||m.startDate?.year||'',genres:m.genres||[],format:m.format||'TV',episodes:m.episodes||0,status:m.status||'',siteUrl:safe(m.siteUrl),streaming:(m.externalLinks||[]).filter(x=>x.type==='STREAMING'&&safe(x.url)).map(x=>({name:x.site,url:x.url})),next:m.nextAiringEpisode?{at:m.nextAiringEpisode.airingAt,episode:m.nextAiringEpisode.episode}:null,source:'anilist'};
}
function normalizeJikan(m){
 return {id:'mal-'+m.mal_id,mal_id:m.mal_id,title:m.title_english||m.title||'Anime',image:safe(m.images?.webp?.large_image_url||m.images?.jpg?.large_image_url),banner:'',description:m.synopsis||'',averageScore:m.score?Math.round(m.score*10):0,year:m.year||m.aired?.prop?.from?.year||'',genres:(m.genres||[]).map(x=>x.name),format:m.type==='Movie'?'MOVIE':m.type==='OVA'?'OVA':m.type==='ONA'?'ONA':'TV',episodes:m.episodes||0,status:m.airing?'RELEASING':'FINISHED',siteUrl:safe(m.url),streaming:(m.streaming||[]).filter(x=>safe(x.url)).map(x=>({name:x.name,url:x.url})),next:null,source:'jikan'};
}
const gql=[
'query OneUp($page:Int,$perPage:Int,$sort:[MediaSort],$status:MediaStatus,$search:String,$genre:String,$format:MediaFormat){',
'Page(page:$page,perPage:$perPage){pageInfo{hasNextPage currentPage}',
'media(type:ANIME,isAdult:false,sort:$sort,status:$status,search:$search,genre:$genre,format:$format){',
'id idMal title{english romaji} description(asHtml:false) coverImage{extraLarge large} bannerImage',
'averageScore episodes format status seasonYear startDate{year} genres siteUrl',
'nextAiringEpisode{episode airingAt} externalLinks{site url type}',
'}}}'].join(' ');
let lastCall=0,aniQueue=Promise.resolve();
async function ani(options){
 const work=aniQueue.catch(()=>{}).then(()=>fetchAniSerial(options));
 aniQueue=work.catch(()=>{});
 return work;
}
async function fetchAniSerial(options){
 const gap=Math.max(0,1500-(Date.now()-lastCall));if(gap)await new Promise(r=>setTimeout(r,gap));lastCall=Date.now();
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),7000);
 try{
  const variables={page:options.page||1,perPage:options.perPage||18,sort:[options.sort||'POPULARITY_DESC']};
  for(const k of ['status','search','genre','format'])if(options[k])variables[k]=options[k];
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query:gql,variables}),signal:c.signal});
  if(!r.ok)throw Error('AniList '+r.status);
  const j=await r.json();if(j.errors?.length)throw Error(j.errors[0].message);
  return {items:(j.data?.Page?.media||[]).map(normalizeAni),next:!!j.data?.Page?.pageInfo?.hasNextPage,source:'anilist'};
 }finally{clearTimeout(timer)}
}
async function jikan(options){
 let path='/top/anime?limit=20';
 if(options.search)path='/anime?sfw=true&limit=20&q='+encodeURIComponent(options.search);
 else if(options.status==='RELEASING')path='/seasons/now?sfw=true&limit=20';
 else if(options.format==='MOVIE')path='/top/anime?type=movie&limit=20';
 else if(options.genre){
  const ids={Action:1,Adventure:2,Comedy:4,Drama:8,Fantasy:10,Romance:22,'Sci-Fi':24,Supernatural:37,Mystery:7,Sports:30,Horror:14,'Slice of Life':36};
  path='/anime?sfw=true&limit=20&order_by=popularity&sort=asc&genres='+(ids[options.genre]||1);
 }else if(options.sort==='START_DATE_DESC')path='/anime?sfw=true&limit=20&order_by=start_date&sort=desc';
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6600);
 try{
  const r=await fetch(JIKAN+path+'&page='+(options.page||1),{signal:ctrl.signal});
  if(!r.ok)throw Error('Jikan '+r.status);
  const j=await r.json();
  return {items:(j.data||[]).map(normalizeJikan),next:!!j.pagination?.has_next_page,source:'jikan'};
 }finally{clearTimeout(timer)}
}
function cacheKey(o){return 'oneup_catalog_'+JSON.stringify(o)}
function cached(o){try{const x=JSON.parse(localStorage.getItem(cacheKey(o))||'null');return x&&x.items?.length&&Date.now()-x.at<3600000*8?x:null}catch{return null}}
function cache(o,r){try{localStorage.setItem(cacheKey(o),JSON.stringify({...r,at:Date.now(),items:r.items.slice(0,24)}))}catch{}}
let snapshotPromise=null;
async function getSnapshot(){
 if(!snapshotPromise){
  snapshotPromise=(async()=>{
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),4500);
   try{const response=await fetch('./data/catalog.json',{cache:'no-cache',signal:ctrl.signal});
    if(!response.ok)throw Error('No snapshot');
    const obj=await response.json();
    if(!obj.groups||!obj.updated)return null;
    return obj;
   }catch{return null}finally{clearTimeout(timer)}
  })();
 }
 return snapshotPromise;
}
async function fromSnapshot(o){
 const data=await getSnapshot();if(!data)return null;
 let group='trending';
 if(o.status==='RELEASING')group='season';
 else if(o.format==='MOVIE')group='movies';
 else if(o.sort==='START_DATE_DESC')group='recent';
 let items=Array.isArray(data.groups[group])?data.groups[group]:[];
 if(o.search||o.genre||o.format||o.status){
  const combined=Object.values(data.groups).filter(Array.isArray).flat();
  const unique=new Map();for(const x of combined)if(x.id)unique.set(x.id,x);
  items=[...unique.values()].filter(x=>
   (!o.search||x.title.toLowerCase().includes(o.search.toLowerCase()))&&
   (!o.genre||(x.genres||[]).includes(o.genre))&&
   (!o.format||x.format===o.format)&&
   (!o.status||x.status===o.status)
  );
 }
 if(!items.length)return null;
 const res={items:items.slice(0,o.perPage||24),next:false,source:'snapshot',updated:data.updated};
 register(res.items);return res;
}
async function fetchCatalog(o){
 const old=cached(o);if(old){register(old.items);return old}
 if(!o.search&&!o.genre&&(!o.page||o.page===1)){
  const snapshot=await fromSnapshot(o);if(snapshot){cache(o,snapshot);return snapshot;}
 }
 for(const loader of [ani,jikan]){
  try{const r=await loader(o);if(r.items.length){register(r.items);cache(o,r);return r}}catch(e){console.warn('1UP provider temporarily unavailable',e?.message)}
 }
 const snapshot=await fromSnapshot(o);if(snapshot){cache(o,snapshot);return snapshot;}
 let items=samples.filter(x=>(!o.search||x.title.toLowerCase().includes(o.search.toLowerCase()))&&(!o.genre||x.genres.includes(o.genre))&&(!o.format||x.format===o.format));
 register(items);
 return {items,next:false,source:'sample'};
}
function identityKey(){const p=window.OneUpAuth?.get()||{key:'guest'};return p.kind==='local'?'1up_anime_profile_'+p.key.replace(/^local_/,''):'oneup_anime_saved_'+p.key}
function reloadSaved(){try{const v=JSON.parse(localStorage.getItem(identityKey())||'{}');state.saved=v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{state.saved={}}}
function persist(){try{localStorage.setItem(identityKey(),JSON.stringify(state.saved))}catch{toast('No se pudieron guardar los datos')}}
function isFav(id){return !!state.saved[id]?.favorite}
function ensureItem(id){const a=state.entries.get(id);if(!a)return null;return state.saved[id]||(state.saved[id]={id,title:a.title,image:a.image,averageScore:a.averageScore,year:a.year,format:a.format,genres:a.genres,favorite:false,watched:0,externalUrl:''})}
let toastTimer;
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2500)}
function toggle(id){
 const x=ensureItem(id);if(!x)return;x.favorite=!x.favorite;
 if(!x.favorite&&!x.watched&&!x.externalUrl)delete state.saved[id];
 persist();refreshFav();renderContinue();
 if(state.view==='milista')showSaved();
 toast(isFav(id)?'Añadido a Mi lista':'Quitado de Mi lista');
}
function refreshFav(){
 $$('[data-save]').forEach(b=>{const yes=isFav(b.dataset.save);b.textContent=yes?'✓':'＋';b.classList.toggle('saved',yes)});
 if(state.featured)$('#hero-save').innerHTML=isFav(state.featured.id)?'<svg><use href="#ico-check"/></svg> Guardado':'<svg><use href="#ico-plus"/></svg> Guardar anime';
}
function card(a){
 const pic=a.image?'<img loading="lazy" referrerpolicy="no-referrer" src="'+esc(a.image)+'" alt="Póster de '+esc(a.title)+'">':'<div class="placeholder-art"><strong>'+esc(a.title.slice(0,27))+'</strong></div>';
 return '<article class="anime-card"><div class="anime-art" data-details="'+esc(a.id)+'" role="button" tabindex="0">'+pic+'<div class="art-shade"></div><span class="rating"><b>★</b> '+(a.averageScore?(a.averageScore/10).toFixed(1):'—')+'</span></div><button class="anime-save'+(isFav(a.id)?' saved':'')+'" data-save="'+esc(a.id)+'">'+(isFav(a.id)?'✓':'＋')+'</button><div class="card-info"><button class="card-name" data-details="'+esc(a.id)+'">'+esc(a.title)+'</button><div class="card-sub"><span>'+esc(String(a.year||'Anime'))+'</span><span class="card-type">'+esc(formats[a.format]||a.format||'Serie')+'</span></div></div></article>';
}
function paint(selector,data,source=''){
 const e=$(selector);if(!e)return;
 e.innerHTML=(source==='sample'?'<div class="error">Mostrando ejemplos guardados: el servicio de datos no responde. Inténtalo más tarde.</div>':'')+(data.length?data.map(card).join(''):'<div class="empty">No encontramos títulos con esos filtros.</div>');
}
function hero(a, chosen=false){
 if(!a)return;
 if(!chosen&&state.selectedId&&state.selectedId!==a.id)return;
 if(chosen){
  state.selectedId=a.id;
  try{sessionStorage.setItem('oneup_last_selected_anime',a.id)}catch{}
 }
 state.featured=a;
 const parts=(a.title||'Anime').trim().split(/\s+/);
 const first=parts.length>2?parts.slice(0,2).join(' '):parts.slice(0,1).join(' '),rest=parts.length>2?parts.slice(2).join(' '):parts.slice(1).join(' ');
 $('#hero-title').innerHTML=esc(first).toUpperCase()+(rest?'<br><span>'+esc(rest).toUpperCase()+'</span>':'');
 $('#hero-description').textContent=a.source==='sample'
  ?'El catálogo se está recuperando. Consulta la ficha para ver los datos disponibles.'
  :(chosenSynopsis(a)||'Sinopsis aún no disponible para este anime.').slice(0,245);
 const art=a.banner||a.image||'';
 const background=$('#hero-poster');
 if(background)background.style.backgroundImage=art?'url("'+art.replace(/["\\]/g,'')+'")':'';
 const poster=$('#hero-feature-cover');
 if(poster){
  poster.src=a.image||'./assets/oneup-crest.svg';
  poster.alt='Póster de '+a.title;
  poster.onerror=()=>{poster.onerror=null;poster.src='./assets/oneup-crest.svg'};
 }
 const name=$('#hero-feature-title');
 if(name)name.textContent=a.title;
 const caption=$('#hero-feature-caption');
 if(caption)caption.textContent=[formats[a.format]||'Anime',a.year||''].filter(Boolean).join(' · ').toUpperCase();
 $('#hero-badges').innerHTML='<span>'+esc(formats[a.format]||'Anime')+'</span><span>'+esc(String(a.year||'CATÁLOGO'))+'</span><span>★ '+(a.averageScore?(a.averageScore/10).toFixed(1):'—')+'</span>';
 const picks=$('#hero-picks');
 if(picks){
  const pool=[a,...(state.home.trending||[]),...(state.home.season||[])];
  const unique=new Map();
  for(const x of pool){if(x?.id&&!unique.has(x.id))unique.set(x.id,x)}
  const cards=[...unique.values()].slice(0,4);
  picks.innerHTML='<span class="hero-picks-label">DESCUBRE OTROS ANIMES</span>'+cards.map(x=>
   '<button class="hero-pick'+(x.id===a.id?' active':'')+'" type="button" data-feature="'+esc(x.id)+'" aria-pressed="'+String(x.id===a.id)+'" title="'+esc(x.title)+'">'+esc(x.title)+'</button>'
  ).join('');
 }
 refreshFav();
 if(chosen){
  const wrap=document.querySelector('.hero');
  if(wrap && !matchMedia('(prefers-reduced-motion: reduce)').matches){
   wrap.classList.remove('is-switching');void wrap.offsetWidth;wrap.classList.add('is-switching');
  }
 }
}
function scheduleHTML(items){
 const now=Date.now()/1000,upcoming=items.filter(x=>x.next?.at>now).sort((a,b)=>a.next.at-b.next.at).slice(0,16);
 if(!upcoming.length)return '<div class="empty">El proveedor aún no tiene fechas confirmadas para las próximas emisiones.</div>';
 return upcoming.map(x=>{
  const d=new Date(x.next.at*1000),t=new Intl.DateTimeFormat('es-US',{hour:'numeric',minute:'2-digit'}).format(d),date=new Intl.DateTimeFormat('es-US',{month:'short',day:'numeric',weekday:'short'}).format(d);
  return '<button class="schedule-item" data-details="'+esc(x.id)+'"><span class="schedule-time">'+esc(t)+'</span><span class="schedule-text"><b>'+esc(x.title)+'</b><small>'+esc(date)+' · Episodio '+esc(x.next.episode)+'</small></span></button>';
 }).join('');
}
async function loadHome(){
 register(samples);
 for(const [selector,amount] of [['#trending-rail',10],['#season-rail',10],['#recent-rail',10],['#movies-rail',8]])paint(selector,(selector==='#movies-rail'?samples.filter(x=>x.format==='MOVIE'):samples.filter(x=>x.format==='TV')).slice(0,amount),'sample');
 hero(samples[6]);renderContinue();
 const requests=[['trending','#trending-rail',{sort:'TRENDING_DESC',perPage:18}],['season','#season-rail',{sort:'TRENDING_DESC',status:'RELEASING',perPage:18}],['recent','#recent-rail',{sort:'START_DATE_DESC',perPage:18}],['movies','#movies-rail',{sort:'POPULARITY_DESC',format:'MOVIE',perPage:18}]];
 await Promise.all(requests.map(async ([k,target,o])=>{
  const d=await fetchCatalog(o);
  state.home[k]=d.items;
  paint(target,d.items,d.source);
  if(k==='trending'){
   const remembered=(()=>{try{return sessionStorage.getItem('oneup_last_selected_anime')}catch{return null}})();
   const restored=remembered?state.entries.get(remembered):null;
   if(restored)hero(restored,true);
   else if(d.source!=='sample'&&d.items[0])hero(d.items.find(x=>x.banner)||d.items[0]);
   else if(state.featured)hero(state.featured);
  }
  if(k==='season')$('#schedule-preview-list').innerHTML=scheduleHTML(d.items);
 }));
}
function renderContinue(){
 const arr=Object.values(state.saved).filter(x=>x.watched>0).map(x=>state.entries.get(x.id)||{...x,source:'saved',genres:[]});
 $('#continue-section').hidden=!arr.length;
 if(arr.length){register(arr);paint('#continue-rail',arr)}
}
function go(route){
 const routes=['inicio','temporada','programacion','catalogo','peliculas','milista','populares','recientes','genero','buscar'];
 if(!routes.includes(route))route='inicio';
 state.view=route;$('#home-screen').hidden=route!=='inicio';$('#browse-screen').hidden=route==='inicio';
 $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
 window.scrollTo({top:0,behavior:'instant'});try{history.replaceState(null,'','#'+route)}catch{}
 if(route==='milista')showSaved();else if(route==='programacion')showSchedule();else if(route!=='inicio')browse(route);
}
function heading(h,sub,tag){$('#browse-title').innerHTML=h;$('#browse-summary').textContent=sub;$('#browse-eyebrow').textContent=tag}
function showSaved(){
 heading('MI <em>LISTA.</em>','Tus favoritos y el progreso guardado en este dispositivo.','MI ESPACIO / FAVORITOS');
 $('#browse-controls').innerHTML='';$('#browse-next').hidden=true;
 const items=Object.values(state.saved).filter(x=>x.favorite||x.watched||x.externalUrl).reverse().map(x=>state.entries.get(x.id)||{...x,source:'saved',genres:[]});
 register(items);$('#browse-grid').className='poster-grid';paint('#browse-grid',items);
 $('#browse-status').textContent=items.length+' títulos guardados';
}
function showSchedule(){
 heading('PRÓXIMAS <em>EMISIONES.</em>','Calendario de próximas emisiones según AniList y tu hora local.','HOY / PROGRAMACIÓN');
 $('#browse-controls').innerHTML='';$('#browse-next').hidden=true;
 const d=state.home.season||[];
 $('#browse-grid').className='schedule-rail';$('#browse-grid').innerHTML=scheduleHTML(d);
 $('#browse-status').textContent=d.length?'Programación de anime en emisión':'Sin datos disponibles en este momento';
}
function options(opts,selected){return opts.map(([k,v])=>'<option value="'+esc(k)+'"'+(k===selected?' selected':'')+'>'+esc(v)+'</option>').join('')}
function filters(){
 $('#browse-controls').innerHTML='<select aria-label="Género" id="filter-genre">'+options([['','Todos los géneros'],...genres],state.filters.genre)+'</select>'+
 '<select aria-label="Tipo" id="filter-format">'+options([['','Todos los tipos'],['TV','Series'],['MOVIE','Películas'],['OVA','OVA'],['ONA','ONA'],['SPECIAL','Especiales']],state.filters.format)+'</select>'+
 '<select aria-label="Estado" id="filter-status">'+options([['','Todos los estados'],['RELEASING','En emisión'],['FINISHED','Finalizados']],state.filters.status)+'</select>'+
 '<select aria-label="Orden" id="filter-sort">'+options([['POPULARITY_DESC','Más populares'],['TRENDING_DESC','Tendencias'],['SCORE_DESC','Mejor puntuados'],['START_DATE_DESC','Más recientes']],state.filters.sort)+'</select><button id="filter-reset">Limpiar</button>';
}
async function browse(route,page=1,append=false){
 if(state.loading&&append)return;
 const descriptions={temporada:['EN <em>EMISIÓN.</em>','Las series que están en emisión.','TEMPORADA / EN EMISIÓN'],peliculas:['PELÍCULAS <em>ANIME.</em>','El cine anime que no te quieres perder.','CINE / PELÍCULAS'],populares:['TOP <em>ANIME.</em>','Ranking por popularidad.','RANKING / POPULARES'],recientes:['ANIME <em>RECIENTE.</em>','Series y nuevas incorporaciones.','CATÁLOGO / RECIENTES'],catalogo:['CATÁLOGO <em>COMPLETO.</em>','Busca por género, tipo y estado.','EXPLORA / TODOS'],genero:['ANIME DE <em>'+esc(genres.find(x=>x[0]===state.filters.genre)?.[1]||state.filters.genre)+'</em>','Historias por género.','GÉNEROS / FILTRO'],buscar:['RESULTADOS DE <em>BÚSQUEDA.</em>','Búsqueda para «'+state.query+'».','BÚSQUEDA / ANIME']};
 heading(...(descriptions[route]||descriptions.catalogo));
 $('#browse-grid').className='poster-grid';
 $('#browse-controls').innerHTML='';if(route==='catalogo')filters();
 if(!append){$('#browse-grid').innerHTML='<div class="loading">Consultando anime...</div>';state.results=[]}
 $('#browse-next').hidden=true;
 const params={page,perPage:20};
 if(route==='temporada'){params.status='RELEASING';params.sort='TRENDING_DESC'}
 else if(route==='peliculas'){params.format='MOVIE';params.sort='POPULARITY_DESC'}
 else if(route==='populares'){params.sort='POPULARITY_DESC'}
 else if(route==='recientes'){params.sort='START_DATE_DESC'}
 else if(route==='genero'){params.genre=state.filters.genre;params.sort='POPULARITY_DESC'}
 else if(route==='buscar'){params.search=state.query;params.sort='POPULARITY_DESC'}
 else Object.assign(params,state.filters);
 const token=++state.seq;state.loading=true;
 const d=await fetchCatalog(params);
 if(token!==state.seq)return;
 state.results=append?state.results.concat(d.items):d.items;state.next=d.next;state.page=page;state.loading=false;
 paint('#browse-grid',state.results,d.source);
 $('#browse-status').textContent=d.source==='sample'?'Ejemplos · Fuentes no disponibles':((d.source==='snapshot'?'Catálogo guardado':d.source==='anilist'?'AniList':'Jikan')+' · '+state.results.length+' títulos');
 $('#browse-next').hidden=!state.next;
}
function doSearch(q){q=(q||'').trim();if(!q){toast('Escribe el nombre del anime');return}state.query=q;go('buscar')}
// A rights-cleared media manifest is optional. No unofficial video-host extraction.
let authorizedMedia=null,authorizedMediaLoading=null;
async function mediaForAnime(id){
 if(!authorizedMediaLoading){
  authorizedMediaLoading=(async()=>{
   try{
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6500);
    let response;
    try{response=await fetch('./data/licensed-media.json',{cache:'no-cache',signal:ctrl.signal})}
    finally{clearTimeout(timer)}
    if(!response.ok)throw Error('No media library');
    const json=await response.json();
    authorizedMedia=json?.entries&&typeof json.entries==='object'?json.entries:{};
   }catch{authorizedMedia={}}
  })();
 }
 await authorizedMediaLoading;
 const entry=authorizedMedia?.[id];
 return Array.isArray(entry?.episodes)?entry.episodes.filter(item=>mediaSources(item).length>0).slice(0,60):[];
}
function mediaFileUrl(value){
 try{
  const urlObj=new URL(String(value||''),location.href);
  if(urlObj.protocol!=='https:')return '';
  return urlObj.href;
 }catch{return ''}
}
function mediaSources(item){
 if(!item || typeof item!=='object')return [];
 const raw=Array.isArray(item.sources)&&item.sources.length?item.sources:[{name:'Fuente principal',src:item.src,mime:item.mime}];
 const supported=['video/mp4','video/webm','application/vnd.apple.mpegurl'];
 return raw.slice(0,8).map((source,i)=>{
  if(!source||typeof source!=='object')return null;
  const name=String(source.name||source.label||'Servidor '+(i+1)).slice(0,45);
  const language=String(source.language||item.language||'No especificado').slice(0,35);
  const quality=String(source.quality||item.quality||'No especificada').slice(0,35);
  // Explicitly approved provider iframe. Public YouTube is the only built-in
  // embedded third-party host; this does not auto-discover anime episodes.
  if(source.mode==='official_embed'&&source.provider==='youtube'&&
     source.rights==='authorized'&&/^[\w-]{11}$/.test(source.videoId||'')){
   const videoId=source.videoId;
   return {name,language,quality,kind:'official_embed',provider:'youtube',videoId,
    src:'https://www.youtube-nocookie.com/embed/'+videoId,
    watchUrl:'https://www.youtube.com/watch?v='+videoId};
  }
  const url=mediaFileUrl(source.src||source.url);
  if(!url)return null;
  const guess=url.split('?')[0].endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp4';
  const type=supported.includes(source.mime)?source.mime:guess;
  return {src:url,name,kind:'video',mime:type,language,quality};
 }).filter(Boolean);
}
function playbackEpisode(id,episodes,index,serverIndex=0,tried=[]){
 const item=episodes[index];if(!item)return;
 const host=$('#oneup-player-content');if(!host)return;
 const sources=mediaSources(item);
 const activeSource=sources[serverIndex]||sources[0];
 if(!activeSource){host.textContent='No hay fuentes autorizadas para este episodio.';return}
 const caption=mediaFileUrl(item.subtitles_es||'');
 if(activeSource.kind==='official_embed'){
  const choiceHtml=sources.length>1?
   '<div class="oneup-server-selector" aria-label="Fuentes de reproducción"><strong>ELEGIR SERVIDOR</strong>'+
   sources.map((source,i)=>'<button type="button" class="oneup-server-choice'+(source===activeSource?' active':'')+'" data-licensed-server="'+i+'" aria-pressed="'+String(source===activeSource)+'">'+esc(source.name)+'</button>').join('')+'</div>':'';
  host.innerHTML=choiceHtml+
   '<div class="oneup-playback-stage oneup-embed-stage"><button type="button" id="oneup-embed-play" aria-label="Cargar reproductor externo oficial">'+
   '<span class="oneup-embed-play-icon">▷</span><strong>ABRIR REPRODUCTOR</strong></button>'+
   '<div id="oneup-embed-frame" hidden></div></div>'+
   '<p class="oneup-playback-hint">Reproductor oficial de '+esc(activeSource.provider)+' · '+esc(activeSource.name)+'</p>'+
   '<p class="oneup-player-state" role="status" aria-live="polite">Fuente externa autorizada declarada. Se cargará únicamente cuando pulses reproducir.</p>'+
   '<a class="oneup-embed-external" target="_blank" rel="noopener noreferrer" href="'+esc(activeSource.watchUrl)+'">Abrir directamente en YouTube ↗</a>';
  const action=host.querySelector('#oneup-embed-play');
  const frame=host.querySelector('#oneup-embed-frame');
  action.addEventListener('click',()=>{
   const iframe=document.createElement('iframe');
   iframe.title='Reproductor externo: '+activeSource.name;
   iframe.loading='eager';iframe.allowFullscreen=true;
   iframe.referrerPolicy='strict-origin-when-cross-origin';
   iframe.allow='encrypted-media; picture-in-picture; autoplay; fullscreen';
   iframe.src=activeSource.src;
   frame.hidden=false;frame.append(iframe);action.hidden=true;
   host.querySelector('.oneup-player-state').textContent=
    'Reproductor externo cargado. El proveedor determina si este video está disponible.';
  });
  host.querySelectorAll('[data-licensed-server]').forEach(button=>button.addEventListener('click',()=>{
   playbackEpisode(id,episodes,index,Number(button.dataset.licensedServer));
  }));
  return;
 }

 const sourceChoices=sources.length>1?
  '<div class="oneup-server-selector" aria-label="Cambiar servidor autorizado"><strong>SELECCIONAR SERVIDOR</strong>'+
  sources.map((source,i)=>'<button type="button" class="oneup-server-choice'+(source===activeSource?' active':'')+'" data-licensed-server="'+i+'" aria-pressed="'+String(source===activeSource)+'">'+esc(source.name)+'</button>').join('')+'</div>':'';
 host.innerHTML=sourceChoices+
 '<div class="oneup-playback-stage">'+
 '<video id="oneup-licensed-video" controls playsinline preload="metadata" crossorigin="anonymous" aria-label="Reproductor de episodio autorizado">'+
 '<source src="'+esc(activeSource.src)+'" type="'+esc(activeSource.mime)+'">'+
 (caption?'<track kind="subtitles" src="'+esc(caption)+'" srclang="es" label="Español" default>':'')+
 'Tu navegador no admite esta reproducción.</video>'+
 '</div><p class="oneup-playback-hint">Episodio '+(index+1)+' · '+esc(item.title||'Video autorizado')+' · '+esc(activeSource.name)+
 (caption?' · Subtítulos en español disponibles':' · Sin subtítulos en español disponibles')+
 '</p><p class="oneup-player-state" role="status" aria-live="polite">Comprobando compatibilidad de esta fuente…</p>';
 const video=host.querySelector('#oneup-licensed-video');
 const playerState=host.querySelector('.oneup-player-state');
 let sourceFailed=false;
 const triedSources=[...new Set([...tried,serverIndex])];
 const handleFailed=()=>{
  if(sourceFailed||!video.isConnected)return;
  sourceFailed=true;
  const next=sources.findIndex((s,i)=>!triedSources.includes(i));
  if(next>=0){
   if(playerState)playerState.textContent='Servidor no disponible. Probando otro servidor configurado…';
   playbackEpisode(id,episodes,index,next,triedSources);
  }else{
   if(playerState)playerState.textContent='Esta reproducción falló en las fuentes configuradas. Puedes seleccionar otro episodio o intentarlo más tarde.';
  }
 };
 video?.addEventListener('loadedmetadata',()=>{
  if(playerState)playerState.textContent='Fuente de video cargada · '+activeSource.name+' · Idioma: '+activeSource.language+' · Calidad declarada: '+activeSource.quality;
 });
 video?.addEventListener('playing',()=>{if(playerState)playerState.textContent='Reproduciendo desde '+activeSource.name});
 video?.addEventListener('stalled',()=>{if(playerState)playerState.textContent='La reproducción está tardando. Comprueba tu conexión o cambia de servidor.'});
 video?.addEventListener('error',handleFailed);
 video?.querySelector('source')?.addEventListener('error',handleFailed);
  host.querySelectorAll('[data-licensed-server]').forEach(button=>button.addEventListener('click',()=>{
  playbackEpisode(id,episodes,index,Number(button.dataset.licensedServer));
 }));
 // Source switches do not autoplay or capture streams.
}
async function loadAuthorizedPlayer(id){
 const host=$('#oneup-player-section');if(!host)return;
 const episodes=await mediaForAnime(id);
 if(state.active!==id||!$('#anime-dialog')?.open)return;
 if(!episodes.length){host.hidden=true;return}
 host.hidden=false;
 const buttons=episodes.map((x,i)=>'<button class="oneup-episode-button" type="button" data-licensed-episode="'+i+'" aria-label="Abrir episodio autorizado '+(i+1)+'">'+(i+1)+' · '+esc(x.title||'Episodio')+'</button>').join('');
 host.innerHTML='<div class="oneup-detail-section"><h3>EPISODIOS DISPONIBLES</h3><p>Estas fuentes se agregan únicamente con permiso de distribución. Elige episodio y servidor.</p>'+
 '<div id="oneup-licensed-episodes" class="oneup-episode-select">'+buttons+'</div>'+
 '<div id="oneup-player-content"></div></div>';
 host.querySelectorAll('[data-licensed-episode]').forEach(button=>button.addEventListener('click',()=>{
  playbackEpisode(id,episodes,Number(button.dataset.licensedEpisode));
 }));
 playbackEpisode(id,episodes,0);
}
function detail(id){
 const a=state.entries.get(id);if(!a)return;
 state.active=id;
 hero(a,true);
 const item=state.saved[id]||{},site=safe(a.siteUrl||'');
 const originalSynopsis=normalizeSynopsis(a.description);
 const synopsis=chosenSynopsis(a);
 const autoTranslated=hasSpanish(a);
 const hasSynopsis=Boolean(synopsis);
 const poster=a.image?'<img src="'+esc(a.image)+'" alt="Póster de '+esc(a.title)+'" loading="eager" referrerpolicy="no-referrer">':
 '<div class="placeholder-art"><strong>'+esc(a.title)+'</strong></div>';
 const stats=[
  formats[a.format]||a.format||'Anime',
  a.year?String(a.year):'',
  a.episodes?(a.episodes+' episodios'):'',
  a.averageScore?('★ '+(a.averageScore/10).toFixed(1)):''
 ].filter(Boolean);
 const chips=(a.genres||[]).slice(0,7).map(g=>'<span class="oneup-genre-tag">'+esc(genreSpanish(g))+'</span>').join('');
 const links=(a.streaming||[]).filter(x=>safe(x.url)).map(x=>'<a href="'+esc(safe(x.url))+'" target="_blank" rel="noopener noreferrer">'+esc(x.name||'Plataforma oficial')+' ↗</a>').join('');
 const pool=[...state.entries.values()];
 const related=pool.filter(x=>x.id!==id && x.image && (x.genres||[]).some(g=>(a.genres||[]).includes(g))).slice(0,4);
 const recommendations=related.length?
 '<section class="oneup-detail-section"><h3>SI TE INTERESÓ ESTE ANIME</h3><div class="oneup-related-grid">'+related.map(x=>
  '<button class="oneup-related-tile" type="button" data-details="'+esc(x.id)+'" title="Ver '+esc(x.title)+'"><img loading="lazy" src="'+esc(x.image)+'" alt="Póster de '+esc(x.title)+'"><strong>'+esc(x.title)+'</strong></button>'
 ).join('')+'</div></section>':'';
 const detailUI=
 '<div class="oneup-detail-cover">'+
  '<div id="oneup-detail-art" class="oneup-detail-cover-image" aria-hidden="true"></div>'+
  '<div class="oneup-detail-content">'+
   '<div class="oneup-detail-poster">'+poster+'</div>'+
   '<div class="oneup-detail-info">'+
    '<div class="oneup-detail-tag">1UP ANIME / DESTACADO</div>'+
    '<h2 class="oneup-detail-title" id="detail-anime-name">'+esc(a.title)+'</h2>'+
    '<div class="oneup-detail-meta">'+stats.map((s,i)=>'<span'+(s.startsWith('★')?' class="rated"':'')+'>'+esc(s)+'</span>').join('')+'</div>'+
    '<div class="oneup-detail-tag oneup-synopsis-eyebrow">'+(autoTranslated?'SINOPSIS EN ESPAÑOL · TRADUCCIÓN AUTOMÁTICA':'SINOPSIS · INFORMACIÓN DEL ANIME')+'</div>'+ 
    '<p class="oneup-detail-synopsis">'+esc(hasSynopsis?synopsis:'La sinopsis de este anime todavía no está disponible en el catálogo.')+'</p>'+
    '<div class="oneup-detail-commands">'+
     '<button type="button" class="cta primary" data-save="'+esc(id)+'">'+(isFav(id)?'✓ Guardado':'＋ Añadir a mi lista')+'</button>'+
     (site?'<a class="cta outline" href="'+esc(site)+'" target="_blank" rel="noopener noreferrer">Ficha completa ↗</a>':'')+
    '</div>'+
   '</div>'+
  '</div>'+
 '</div>'+
 '<div class="oneup-detail-lower">'+
  '<section id="oneup-player-section" class="oneup-detail-section" hidden></section>'+
  '<section id="oneup-comments-section" class="oneup-comment-panel" aria-label="Comentarios por episodio"></section>'+
  (hasSynopsis?'<section class="oneup-detail-section oneup-synopsis-section"><h3>HISTORIA Y SINOPSIS</h3><p class="oneup-synopsis-source">'+(autoTranslated?(hasEditorialSpanish(a)?'Sinopsis en español revisada editorialmente':'Traducción automática al español · puede contener imprecisiones'):'Sinopsis en español pendiente de traducción')+'</p><p class="oneup-synopsis-text">'+esc(synopsis)+'</p><button type="button" data-synopsis-original="1" class="oneup-synopsis-toggle"'+(!originalSynopsis?' hidden':'')+'>Ver texto original</button></section><hr class="oneup-detail-separator">':'')+
  '<section class="oneup-detail-section"><h3>GÉNEROS</h3><div class="oneup-genre-tags">'+(chips||'<span class="oneup-genre-tag">Anime</span>')+'</div></section>'+
  '<hr class="oneup-detail-separator">'+
  '<section class="oneup-detail-section"><h3>TU PROGRESO</h3><p>Lleva un registro personal de los episodios vistos.</p><div class="episode-controls"><button type="button" data-episode="-1" aria-label="Restar episodio">−</button><strong id="episode-value">'+(item.watched||0)+'</strong><button type="button" data-episode="1" aria-label="Sumar episodio">+</button><span class="oneup-episode-text">de '+(a.episodes||'?')+' episodios</span></div></section>'+
  '<hr class="oneup-detail-separator">'+
  '<section class="oneup-detail-section"><h3>DÓNDE VERLO</h3><div class="detail-links">'+(links||'<p>No hay plataformas oficiales registradas para este título.</p>')+'</div><p>Los enlaces conducen a proveedores externos; la disponibilidad depende de cada plataforma y región.</p></section>'+
  '<hr class="oneup-detail-separator">'+
  '<section class="oneup-detail-section"><h3>MI ENLACE PERSONAL</h3><div class="detail-actions"><input id="custom-url" type="url" aria-label="Enlace personal del anime" placeholder="https://..." value="'+esc(item.externalUrl||'')+'"><button type="button" id="save-url" class="cta outline">Guardar</button></div></section>'+
  recommendations+
 '</div>';
 const closeControl=$('#anime-close');
 const modal=$('#anime-dialog');
 if(closeControl&&closeControl.parentElement!==modal)modal.appendChild(closeControl);
 $('#anime-dialog-body').innerHTML=detailUI;
 const detailContent=$('#anime-dialog-body .oneup-detail-content');
 if(detailContent&&closeControl)detailContent.appendChild(closeControl);
 const bg=safe(a.banner||a.image);
 const scene=$('#oneup-detail-art');
 if(scene&&bg)scene.style.backgroundImage='url("'+bg.replace(/["\\]/g,'')+'")';
 const dialog=$('#anime-dialog');
 if(!dialog.open)dialog.showModal();
 dialog.setAttribute('aria-labelledby','detail-anime-name');
 dialog.scrollTop=0;
 loadAuthorizedPlayer(id).catch(()=>{});
 document.dispatchEvent(new CustomEvent('oneup-anime-opened',{detail:a}));
}
function changeEp(delta){
 const item=ensureItem(state.active);if(!item)return;
 item.watched=Math.max(0,Math.min(state.entries.get(state.active)?.episodes||9999,Number(item.watched||0)+delta));persist();
 $('#episode-value').textContent=item.watched;renderContinue();toast('Episodio guardado');
}
function saveUrl(){
 const raw=$('#custom-url').value.trim(),link=raw?safe(raw):'';
 if(raw&&!link){toast('Usa una URL que empiece con https://');return}
 const item=ensureItem(state.active);if(!item)return;item.externalUrl=link;persist();toast('Enlace guardado');
}
function splash(){
 // Intro visual automática sin pantalla de entrada, sin botones y sin sonido forzado.
 // Safari no permite iniciar audio arbitrariamente al abrir una PWA sin gesto del usuario.
 let seen=false;try{seen=sessionStorage.getItem('oneup_intro_seen')==='v5'}catch{}
 if(seen||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const el=$('#startup');if(!el)return;
 el.hidden=false;el.classList.add('started');
 const finish=()=>{
  try{sessionStorage.setItem('oneup_intro_seen','v5')}catch{}
  el.classList.add('finished');
  setTimeout(()=>{el.hidden=true},500);
 };
 setTimeout(finish,1550);
}
window.OneUpCatalog={
 register(items){for(const a of items||[]){if(a?.id)state.entries.set(a.id,a)}},
 open(id){detail(id)},
 active(){return state.active},
 get(id){return state.entries.get(id)}
};
function init(){
 reloadSaved();
 loadSpanishSynopses();
 $('#genre-pills').innerHTML='<button data-genre="">✦ Explorar todos</button>'+genres.map(([en,es])=>'<button data-genre="'+esc(en)+'">'+esc(es)+'</button>').join('');
 document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-route]');if(nav){e.preventDefault();go(nav.dataset.route);return}
  const g=e.target.closest('[data-genre]');if(g){state.filters.genre=g.dataset.genre;go(g.dataset.genre?'genero':'catalogo');return}
  const s=e.target.closest('[data-save]');if(s){const id=s.dataset.save;toggle(id);if($('#anime-dialog').open&&state.active===id){const button=$('#anime-dialog [data-save]');if(button)button.textContent=isFav(id)?'✓ Guardado':'＋ Añadir a mi lista'}return}
  const pick=e.target.closest('[data-feature]');if(pick){const anime=state.entries.get(pick.dataset.feature);if(anime)hero(anime,true);return}
  const d=e.target.closest('[data-details]');if(d){detail(d.dataset.details);return}
  const ep=e.target.closest('[data-episode]');if(ep){changeEp(Number(ep.dataset.episode))}
 });

 // Real iPhone touch fallback for fixed mobile tabs obscured by animated layers.
 // Only activates when hit testing unexpectedly targets main content instead
 // of the visible tab underneath that exact screen coordinate.
 document.addEventListener('pointerdown',event=>{
  const nav=$('.mobile-navigation');
  if(!nav||!matchMedia('(max-width:780px)').matches||event.target.closest('.mobile-navigation'))return;
  const area=nav.getBoundingClientRect();
  if(event.clientY<area.top||event.clientY>area.bottom||event.clientX<area.left||event.clientX>area.right)return;
  for(const target of nav.querySelectorAll('[data-route],a[href]')){
   const r=target.getBoundingClientRect();
   if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)continue;
   event.preventDefault();event.stopPropagation();
   if(target.dataset.route)go(target.dataset.route);
   else if(target.href)location.href=target.href;
   return;
  }
 },true);
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-details]')){e.preventDefault();detail(e.target.dataset.details)}});
 $('#search-form').addEventListener('submit',e=>{e.preventDefault();doSearch($('#search-input').value)});
 $('#header-search').addEventListener('click',()=>{go('inicio');setTimeout(()=>{$('#search-input').scrollIntoView({block:'center'});$('#search-input').focus()},100)});
 $('#hero-detail').addEventListener('click',()=>state.featured?detail(state.featured.id):go('catalogo'));
 $('#hero-save').addEventListener('click',()=>state.featured&&toggle(state.featured.id));
 $('#browse-next').addEventListener('click',()=>!state.loading&&state.next&&browse(state.view,state.page+1,true));
 $('#browse-controls').addEventListener('change',e=>{const keys={'filter-genre':'genre','filter-format':'format','filter-status':'status','filter-sort':'sort'};if(keys[e.target.id]){state.filters[keys[e.target.id]]=e.target.value;browse('catalogo')}});
 $('#browse-controls').addEventListener('click',e=>{if(e.target.id==='filter-reset'){state.filters={genre:'',format:'',status:'',sort:'POPULARITY_DESC'};browse('catalogo')}});
 $('#anime-close').addEventListener('click',()=>$('#anime-dialog').close());
 // iOS tap fallback: this dialog capture receives taps even if a painted cover
 // unexpectedly intercepts the visible close button's pointer target.
 $('#anime-dialog').addEventListener('pointerdown',e=>{
  const dialog=$('#anime-dialog'),button=$('#anime-close');
  if(!dialog?.open||!button)return;
  const r=button.getBoundingClientRect(),pad=7;
  if(e.clientX>=r.left-pad&&e.clientX<=r.right+pad&&e.clientY>=r.top-pad&&e.clientY<=r.bottom+pad){
   e.preventDefault();e.stopPropagation();dialog.close();
  }
 },true);
 $('#anime-dialog').addEventListener('close',()=>document.dispatchEvent(new Event('oneup-anime-closed')));
 $('#anime-dialog').addEventListener('click',e=>{
  if(e.target===$('#anime-dialog'))$('#anime-dialog').close();
  if(e.target.id==='save-url')saveUrl();
  const btn=e.target.closest('[data-synopsis-original]');
  if(btn){
   const a=state.entries.get(state.active);
   if(!a)return;
   const original=normalizeSynopsis(a.description);
   const translated=spanishSynopsis(a);
   if(!original)return;
   const showOriginal=btn.getAttribute('aria-pressed')!=='true';
   btn.setAttribute('aria-pressed',String(showOriginal));
   btn.textContent=showOriginal?'Volver al español':'Ver texto original';
   const full=$('.oneup-synopsis-text');
   if(full)full.textContent=showOriginal?original:(translated||chosenSynopsis(a));
  }
 });
 window.OneUpAuth?.onChange(()=>{reloadSaved();refreshFav();renderContinue();if(state.view==='milista')showSaved()});
 splash();
 const route=location.hash.slice(1);if(['temporada','programacion','catalogo','peliculas','milista','populares','recientes'].includes(route))go(route);
 loadHome();
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
document.addEventListener('DOMContentLoaded',init);
})();