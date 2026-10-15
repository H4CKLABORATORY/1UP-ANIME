/* 1UP Anime v4: AniList main provider, Jikan backup, offline sample. */
(()=>{
'use strict';
const API='https://graphql.anilist.co', JIKAN='https://api.jikan.moe/v4';
const $=q=>document.querySelector(q), $$=q=>[...document.querySelectorAll(q)];
const esc=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>{try{let x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return ''}};
const formats={TV:'Serie',MOVIE:'Película',OVA:'OVA',ONA:'ONA',SPECIAL:'Especial',TV_SHORT:'Corto'};
const genres=[['Action','Acción'],['Adventure','Aventura'],['Comedy','Comedia'],['Drama','Drama'],['Fantasy','Fantasía'],['Romance','Romance'],['Sci-Fi','Ciencia ficción'],['Supernatural','Sobrenatural'],['Mystery','Misterio'],['Sports','Deportes'],['Horror','Terror'],['Slice of Life','Vida cotidiana']];
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
let lastCall=0;
async function ani(options){
 const gap=Math.max(0,800-(Date.now()-lastCall));if(gap)await new Promise(r=>setTimeout(r,gap));lastCall=Date.now();
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
async function fetchCatalog(o){
 const old=cached(o);if(old){register(old.items);return old}
 for(const loader of [ani,jikan]){
  try{const r=await loader(o);if(r.items.length){register(r.items);cache(o,r);return r}}catch(e){console.warn('1UP provider temporarily unavailable',e?.message)}
 }
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
 if(state.featured)$('#hero-save').innerHTML=isFav(state.featured.id)?'<svg><use href="#ico-check"/></svg> Guardado':'<svg><use href="#ico-plus"/></svg> Mi lista';
}
function card(a){
 const pic=a.image?'<img loading="lazy" referrerpolicy="no-referrer" src="'+esc(a.image)+'" alt="Póster de '+esc(a.title)+'">':'<div class="placeholder-art"><strong>'+esc(a.title.slice(0,27))+'</strong></div>';
 return '<article class="anime-card"><div class="anime-art" data-details="'+esc(a.id)+'" role="button" tabindex="0">'+pic+'<div class="art-shade"></div><span class="rating"><b>★</b> '+(a.averageScore?(a.averageScore/10).toFixed(1):'—')+'</span></div><button class="anime-save'+(isFav(a.id)?' saved':'')+'" data-save="'+esc(a.id)+'">'+(isFav(a.id)?'✓':'＋')+'</button><div class="card-info"><button class="card-name" data-details="'+esc(a.id)+'">'+esc(a.title)+'</button><div class="card-sub"><span>'+esc(String(a.year||'Anime'))+'</span><span class="card-type">'+esc(formats[a.format]||a.format||'Serie')+'</span></div></div></article>';
}
function paint(selector,data,source=''){
 const e=$(selector);if(!e)return;
 e.innerHTML=(source==='sample'?'<div class="error">Mostrando ejemplos guardados: el servicio de datos no responde. Inténtalo más tarde.</div>':'')+(data.length?data.map(card).join(''):'<div class="empty">No encontramos títulos con esos filtros.</div>');
}
function hero(a){
 state.featured=a;
 const pieces=a.title.split(' '),first=pieces.slice(0,2).join(' '),rest=pieces.slice(2).join(' ')||'ANIME';
 $('#hero-title').innerHTML=esc(first).toUpperCase()+'<br><span>'+esc(rest).toUpperCase()+'</span>';
 $('#hero-description').textContent=a.source==='sample'?'Descubre recomendaciones mientras recuperamos los resultados actualizados.':(a.description||'Descubre un anime que merece estar en tu lista.').slice(0,245);
 $('#hero-poster').style.backgroundImage=a.banner||a.image?'url("'+(a.banner||a.image).replace(/["\\]/g,'')+'")':'';
 $('#hero-badges').innerHTML='<span>'+esc(formats[a.format]||'Anime')+'</span><span>'+esc(String(a.year||'ESTRENO'))+'</span><span>★ '+(a.averageScore?(a.averageScore/10).toFixed(1):'—')+'</span>';
 refreshFav();
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
  if(k==='trending'&&d.source!=='sample'&&d.items[0])hero(d.items.find(x=>x.banner)||d.items[0]);
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
 $('#browse-status').textContent=(d.source==='sample'?'Solo ejemplos · Fuentes no disponibles':(d.source==='anilist'?'AniList':'Jikan')+' · '+state.results.length+' títulos');
 $('#browse-next').hidden=!state.next;
}
function doSearch(q){q=(q||'').trim();if(!q){toast('Escribe el nombre del anime');return}state.query=q;go('buscar')}
function detail(id){
 const a=state.entries.get(id);if(!a)return;
 state.active=id;const item=state.saved[id]||{},site=a.siteUrl||'';
 const poster=a.image?'<img src="'+esc(a.image)+'" alt="'+esc(a.title)+'">':'<div class="placeholder-art"><strong>'+esc(a.title)+'</strong></div>';
 const links=(a.streaming||[]).filter(x=>safe(x.url)).map(x=>'<a target="_blank" rel="noopener noreferrer" href="'+esc(safe(x.url))+'">'+esc(x.name||'Plataforma')+' ↗</a>').join('');
 $('#anime-dialog-body').innerHTML='<div class="detail-layout">'+poster+'<div><span class="micro">1UP ANIME / DETALLE</span><h2>'+esc(a.title)+'</h2><p>'+esc(a.description||'Sin sinopsis disponible')+'</p><div class="detail-actions"><button class="cta primary" data-save="'+esc(id)+'">'+(isFav(id)?'✓ En mi lista':'＋ Guardar')+'</button>'+(site?'<a class="cta outline" target="_blank" rel="noopener noreferrer" href="'+esc(safe(site))+'">Ver ficha ↗</a>':'')+'</div></div></div>'+
 '<div class="detail-block"><h3>MI PROGRESO</h3><p>Registra tus episodios vistos sin reproducir videos.</p><div class="episode-controls"><button data-episode="-1">−</button><strong id="episode-value">'+(item.watched||0)+'</strong><button data-episode="1">+</button><small>de '+(a.episodes||'?')+' episodios</small></div></div>'+
 '<div class="detail-block"><h3>DÓNDE VERLO</h3><div class="detail-links">'+(links||'<p>Sin plataformas oficiales registradas para este título.</p>')+'</div></div>'+
 '<div class="detail-block"><h3>MI ENLACE</h3><div class="detail-actions"><input id="custom-url" placeholder="https://..." value="'+esc(item.externalUrl||'')+'" style="background:#221725;border:1px solid #65435f;border-radius:5px;padding:12px;color:white;flex:1;min-width:180px"><button id="save-url" class="cta outline">Guardar</button></div></div>';
 if(!$('#anime-dialog').open)$('#anime-dialog').showModal();
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
 let seen=false;try{seen=sessionStorage.getItem('oneup_intro_seen')==='v4'}catch{}
 if(seen||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const el=$('#startup');el.hidden=false;let ended=false;
 const done=()=>{if(ended)return;ended=true;try{sessionStorage.setItem('oneup_intro_seen','v4')}catch{}el.classList.add('finished');setTimeout(()=>el.hidden=true,650)};
 const timer=setTimeout(done,4300);
 $('#startup-sound').addEventListener('click',()=>{if(ended)return;window.OneUpSonic?.play();el.classList.add('started');clearTimeout(timer);setTimeout(done,1700)});
 $('#startup-skip').addEventListener('click',()=>{clearTimeout(timer);done()});
}
function init(){
 reloadSaved();
 $('#genre-pills').innerHTML='<button data-genre="">✦ Explorar todos</button>'+genres.map(([en,es])=>'<button data-genre="'+esc(en)+'">'+esc(es)+'</button>').join('');
 document.addEventListener('click',e=>{
  const nav=e.target.closest('[data-route]');if(nav){e.preventDefault();go(nav.dataset.route);return}
  const g=e.target.closest('[data-genre]');if(g){state.filters.genre=g.dataset.genre;go(g.dataset.genre?'genero':'catalogo');return}
  const s=e.target.closest('[data-save]');if(s){toggle(s.dataset.save);if(state.active&&$('#anime-dialog').open)detail(state.active);return}
  const d=e.target.closest('[data-details]');if(d){detail(d.dataset.details);return}
  const ep=e.target.closest('[data-episode]');if(ep){changeEp(Number(ep.dataset.episode))}
 });
 document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-details]')){e.preventDefault();detail(e.target.dataset.details)}});
 $('#search-form').addEventListener('submit',e=>{e.preventDefault();doSearch($('#search-input').value)});
 $('#header-search').addEventListener('click',()=>{go('inicio');setTimeout(()=>{$('#search-input').scrollIntoView({block:'center'});$('#search-input').focus()},100)});
 $('#hero-detail').addEventListener('click',()=>state.featured?detail(state.featured.id):go('catalogo'));
 $('#hero-save').addEventListener('click',()=>state.featured&&toggle(state.featured.id));
 $('#browse-next').addEventListener('click',()=>!state.loading&&state.next&&browse(state.view,state.page+1,true));
 $('#browse-controls').addEventListener('change',e=>{const keys={'filter-genre':'genre','filter-format':'format','filter-status':'status','filter-sort':'sort'};if(keys[e.target.id]){state.filters[keys[e.target.id]]=e.target.value;browse('catalogo')}});
 $('#browse-controls').addEventListener('click',e=>{if(e.target.id==='filter-reset'){state.filters={genre:'',format:'',status:'',sort:'POPULARITY_DESC'};browse('catalogo')}});
 $('#anime-close').addEventListener('click',()=>$('#anime-dialog').close());
 $('#anime-dialog').addEventListener('click',e=>{if(e.target===$('#anime-dialog'))$('#anime-dialog').close();if(e.target.id==='save-url')saveUrl()});
 window.OneUpAuth?.onChange(()=>{reloadSaved();refreshFav();renderContinue();if(state.view==='milista')showSaved()});
 splash();
 const route=location.hash.slice(1);if(['temporada','programacion','catalogo','peliculas','milista','populares','recientes'].includes(route))go(route);
 loadHome();
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
document.addEventListener('DOMContentLoaded',init);
})();