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
const state={entries:new Map(),saved:{},home:{},featured:null,view:'inicio',results:[],page:1,next:false,loading:false,filters:{genre:'',format:'',status:'',sort:'POPULARITY_DESC',letter:'ALL'},query:'',searchTags:[],fullCatalog:[],fullCatalogLoaded:false,fullCatalogLoading:false,active:null,seq:0};
function register(data){
 for(const a of data||[]){
  if(!a||!a.id)continue;
  state.entries.set(a.id,a);
  if(a.slug&&!state.entries.has(a.slug))state.entries.set(a.slug,a);
  if(a.raw_id!=null&&!state.entries.has(String(a.raw_id)))state.entries.set(String(a.raw_id),a);
  if(typeof a.id==='string'&&a.id.startsWith('jk-')&&!state.entries.has(a.id.slice(3)))state.entries.set(a.id.slice(3),a);
 }
}
function normalizeAni(m){
 const score=Number(m.averageScore)||0;
 return {id:m.idMal?'mal-'+m.idMal:'al-'+m.id,mal_id:m.idMal||null,title:m.title?.english||m.title?.romaji||'Anime',title_romaji:m.title?.romaji||'',title_native:m.title?.native||'',aliases:window.OneUpAnimeSearch?.collectAliases(m.title,m.synonyms)||[],image:safe(m.coverImage?.extraLarge||m.coverImage?.large),banner:safe(m.bannerImage),description:String(m.description||'').replace(/<[^>]+>/g,'').replace(/\n/g,' '),averageScore:score,year:m.seasonYear||m.startDate?.year||'',genres:m.genres||[],format:m.format||'TV',episodes:m.episodes||0,status:m.status||'',siteUrl:safe(m.siteUrl),streaming:(m.externalLinks||[]).filter(x=>x.type==='STREAMING'&&safe(x.url)).map(x=>({name:x.site,url:x.url})),next:m.nextAiringEpisode?{at:m.nextAiringEpisode.airingAt,episode:m.nextAiringEpisode.episode}:null,source:'anilist'};
}
function normalizeJikan(m){
 return {id:'mal-'+m.mal_id,mal_id:m.mal_id,title:m.title_english||m.title||'Anime',title_romaji:m.title||'',title_native:m.title_japanese||'',aliases:window.OneUpAnimeSearch?.collectAliases({english:m.title_english,romaji:m.title,native:m.title_japanese},[...(m.title_synonyms||[]),...(m.titles||[]).map(x=>x.title)])||[],image:safe(m.images?.webp?.large_image_url||m.images?.jpg?.large_image_url),banner:'',description:m.synopsis||'',averageScore:m.score?Math.round(m.score*10):0,year:m.year||m.aired?.prop?.from?.year||'',genres:(m.genres||[]).map(x=>x.name),format:m.type==='Movie'?'MOVIE':m.type==='OVA'?'OVA':m.type==='ONA'?'ONA':'TV',episodes:m.episodes||0,status:m.airing?'RELEASING':'FINISHED',siteUrl:safe(m.url),streaming:(m.streaming||[]).filter(x=>safe(x.url)).map(x=>({name:x.name,url:x.url})),next:null,source:'jikan'};
}
const gql=[
'query OneUp($page:Int,$perPage:Int,$sort:[MediaSort],$status:MediaStatus,$search:String,$genre:String,$format:MediaFormat){',
'Page(page:$page,perPage:$perPage){pageInfo{hasNextPage currentPage}',
'media(type:ANIME,isAdult:false,sort:$sort,status:$status,search:$search,genre:$genre,format:$format){',
'id idMal title{english romaji native} synonyms description(asHtml:false) coverImage{extraLarge large} bannerImage',
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
 // Do not label a trending snapshot as "most popular".
 // If the new popular group has not been generated yet, try the live APIs.
 else if(o.sort==='POPULARITY_DESC')group='popular';
 // A popular ranking must never silently use trending metadata, even
 // when a genre/search filter would otherwise merge the snapshot groups.
 if(group==='popular'&&!Array.isArray(data.groups.popular))return null;
 let items=Array.isArray(data.groups[group])?data.groups[group]:[];
 if(o.search||o.genre||o.format||o.status){
  // Put the requested ranking's group first, then fill gaps from other
  // groups without changing the primary order.
  const combined=[...items,...Object.values(data.groups).filter(Array.isArray).flat()];
  const unique=new Map();for(const x of combined)if(x.id&&!unique.has(x.id))unique.set(x.id,x);
  items=[...unique.values()].filter(x=>
   (!o.search||(window.OneUpAnimeSearch?.matches(x,o.search)??x.title.toLowerCase().includes(o.search.toLowerCase())))&&
   (!o.genre||(x.genres||[]).includes(o.genre))&&
   (!o.format||x.format===o.format)&&
   (!o.status||x.status===o.status)
  );
 }
 if(!items.length)return null;
 const res={items:items.slice(0,o.perPage||24),next:false,source:'snapshot',updated:data.updated};
 register(res.items);return res;
}
let backendHomePromise=null;
async function fetchBackendHome(){
 if(!backendHomePromise){
  backendHomePromise=(async()=>{
   const bases=[
    (typeof window!=='undefined'&&window.ONEUP_API_BASE),
    '/api',
    'http://127.0.0.1:4050/api',
    'http://localhost:4050/api'
   ].filter(Boolean);
   for(const base of bases){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),3500);
    try{
     const url=base.replace(/\/$/,'')+'/home';
     const res=await fetch(url,{cache:'no-cache',signal:ctrl.signal});
     if(res.ok){
      const obj=await res.json();
      if(obj?.groups&&obj?.updated)return obj;
     }
    }catch(e){}finally{clearTimeout(timer)}
   }
   return null;
  })();
 }
 return backendHomePromise;
}
async function fromBackendHome(o){
 const data=await fetchBackendHome();if(!data)return null;
 let group='trending';
 if(o.status==='RELEASING')group='season';
 else if(o.format==='MOVIE')group='movies';
 else if(o.sort==='START_DATE_DESC')group='recent';
 else if(o.sort==='POPULARITY_DESC')group='popular';
 let items=Array.isArray(data.groups[group])?data.groups[group]:[];
 if(o.search||o.genre||o.format||o.status){
  const combined=[...items,...Object.values(data.groups).filter(Array.isArray).flat()];
  const unique=new Map();for(const x of combined)if(x.id&&!unique.has(x.id))unique.set(x.id,x);
  items=[...unique.values()].filter(x=>
   (!o.search||(window.OneUpAnimeSearch?.matches(x,o.search)??x.title.toLowerCase().includes(o.search.toLowerCase())))&&
   (!o.genre||(x.genres||[]).includes(o.genre))&&
   (!o.format||x.format===o.format)&&
   (!o.status||x.status===o.status)
  );
 }
 if(!items.length)return null;
 const res={items:items.slice(0,o.perPage||24),next:false,source:'backend',updated:data.updated};
 register(res.items);return res;
}
async function fetchBackendApi(o){
 const bases=[
  (typeof window!=='undefined'&&window.ONEUP_API_BASE),
  '/api',
  'http://127.0.0.1:4050/api',
  'http://localhost:4050/api'
 ].filter(Boolean);
 const p=new URLSearchParams();
 if(o.search)p.set('search',o.search);
 if(o.status)p.set('status',o.status);
 if(o.format)p.set('format',o.format);
 if(o.genre)p.set('genre',o.genre);
 if(o.sort)p.set('sort',o.sort);
 p.set('page',String(o.page||1));
 p.set('limit',String(o.perPage||20));
 for(const base of bases){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),3500);
  try{
   const url=base.replace(/\/$/,'')+'/animes?'+p.toString();
   const res=await fetch(url,{cache:'no-cache',signal:ctrl.signal});
   if(!res.ok)continue;
   const json=await res.json();
   if(Array.isArray(json?.items)&&json.items.length>0){
    register(json.items);
    return {items:json.items,next:Boolean(json.next),source:'backend',total:json.total};
   }
  }catch(e){}finally{clearTimeout(timer)}
 }
 return null;
}
async function fetchCatalog(o){
 const old=cached(o);if(old){register(old.items);return old}
 if(!o.search&&!o.genre&&(!o.page||o.page===1)){
  const backendHome=await fromBackendHome(o);
  if(backendHome){cache(o,backendHome);return backendHome;}
 }
 const backend=await fetchBackendApi(o);
 if(backend&&backend.items?.length){register(backend.items);cache(o,backend);return backend;}
 if(!o.search&&!o.genre&&(!o.page||o.page===1)){
  const snapshot=await fromSnapshot(o);if(snapshot){cache(o,snapshot);return snapshot;}
 }
 for(const loader of [ani,jikan]){
  try{const r=await loader(o);if(r.items.length){register(r.items);cache(o,r);return r}}catch(e){console.warn('1UP provider temporarily unavailable',e?.message)}
 }
 const snapshot=await fromSnapshot(o);if(snapshot){cache(o,snapshot);return snapshot;}
 let items=samples.filter(x=>(!o.search||(window.OneUpAnimeSearch?.matches(x,o.search)??x.title.toLowerCase().includes(o.search.toLowerCase())))&&(!o.genre||x.genres.includes(o.genre))&&(!o.format||x.format===o.format));
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
 const title = (a.title || a.title_romaji || 'Anime').trim();
 const year = a.year || (a.season ? a.season.split(' ').pop() : 'Anime');
 const type = formats[a.format] || a.type || a.format || 'Serie';
 const eps = a.episodes ? `${a.episodes} eps` : (a.status_label || (a.status === 'RELEASING' ? 'En emisión' : ''));
 const score = a.averageScore ? (a.averageScore / 10).toFixed(1) : (a.score ? Number(a.score).toFixed(1) : '—');
 const pic = (a.image || a.poster)
  ? '<img data-depth="far" loading="lazy" referrerpolicy="no-referrer" src="'+esc(a.image || a.poster)+'" alt="Póster de '+esc(title)+'">'
  : '<div class="placeholder-art"><strong>'+esc(title.slice(0, 27))+'</strong></div>';
 const isAiring = a.status === 'RELEASING' || (a.status_label && a.status_label.toLowerCase().includes('emisión'));

 return '<article class="anime-card depth-scene" data-id="'+esc(a.id)+'">'+
   '<div class="anime-art" data-details="'+esc(a.id)+'" role="button" tabindex="0">'+
     pic+
     '<div class="art-shade anime-card-shine" data-depth="mid"></div>'+
     '<span class="rating" data-depth="front"><b>★</b> '+score+'</span>'+
     (isAiring ? '<span class="card-badge-airing">EMISIÓN</span>' : '')+
   '</div>'+
   '<button class="anime-save'+(isFav(a.id)?' saved':'')+'" data-save="'+esc(a.id)+'" type="button" aria-label="'+(isFav(a.id)?'Guardado':'Guardar')+'">'+(isFav(a.id)?'✓':'＋')+'</button>'+
   '<div class="card-info" data-depth="front">'+
     '<button class="card-name" data-details="'+esc(a.id)+'" title="'+esc(title)+'">'+esc(title)+'</button>'+
     '<div class="card-sub">'+
       '<span class="card-year">'+esc(String(year))+'</span>'+
       (eps ? '<span class="card-episodes">'+esc(eps)+'</span>' : '')+
       '<span class="card-type">'+esc(type)+'</span>'+
     '</div>'+
   '</div>'+
 '</article>';
}
function paint(selector,data,source=''){
 const e=$(selector);if(!e)return;
 e.innerHTML=(source==='sample'?'<div class="error">Mostrando ejemplos guardados: el servicio de datos no responde. Inténtalo más tarde.</div>':'')+(data.length?data.map(card).join(''):'<div class="empty">No encontramos títulos con esos filtros.</div>');
 if (typeof CardDepthEngine !== 'undefined') CardDepthEngine.refresh();
}
function hero(a, chosen=false, persist=chosen){
 if(!a)return;
 if(!chosen&&state.selectedId&&state.selectedId!==a.id)return;
 if(chosen&&persist){
  state.selectedId=a.id;
  try{sessionStorage.setItem('oneup_last_selected_anime',a.id)}catch{}
 }
 state.featured=a;
 const parts=(a.title||'Anime').trim().split(/\s+/);
 const first=parts.length>2?parts.slice(0,2).join(' '):parts.slice(0,1).join(' '),rest=parts.length>2?parts.slice(2).join(' '):parts.slice(1).join(' ');
 const heroTitle=$('#hero-title');
 if(heroTitle){
  const length=Array.from(a.title||'').length;
  heroTitle.dataset.titleSize=length>67?'extra-long':length>38?'long':'normal';
  heroTitle.innerHTML=esc(first).toUpperCase()+(rest?'<br><span>'+esc(rest).toUpperCase()+'</span>':'');
  document.querySelector('.hero')?.classList.toggle('has-long-title',length>38);
 }
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
   wrap.classList.remove('is-switching');void wrap.offsetWidth;wrap.classList.add('is-switching');setTimeout(()=>wrap.classList.remove('is-switching'),500);
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
 loadFullCatalogStudio().catch(()=>{});
 for(const [selector,amount] of [['#trending-rail',10],['#season-rail',10],['#recent-rail',10],['#movies-rail',8]])paint(selector,(selector==='#movies-rail'?samples.filter(x=>x.format==='MOVIE'):samples.filter(x=>x.format==='TV')).slice(0,amount),'sample');
 hero(samples[6]);renderContinue();
 const requests=[['trending','#trending-rail',{sort:'TRENDING_DESC',perPage:18}],['season','#season-rail',{sort:'TRENDING_DESC',status:'RELEASING',perPage:18}],['recent','#recent-rail',{sort:'START_DATE_DESC',perPage:18}],['movies','#movies-rail',{sort:'POPULARITY_DESC',format:'MOVIE',perPage:18}]];
 await Promise.all(requests.map(async ([k,target,o])=>{
  const d=await fetchCatalog(o);
  state.home[k]=d.items;
  paint(target,d.items,d.source);
  if(k==='trending'&& !window.OneUpPremiereHero?.isReady?.()){
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
 // Invalidate pending catalogue responses even when the next view is synchronous.
 ++state.seq;state.loading=false;
 state.view=route;$('#home-screen').hidden=route!=='inicio';$('#browse-screen').hidden=route==='inicio';
 const railAside=$('#catalog-letter-rail-aside');if(railAside)railAside.hidden=(route!=='catalogo');
 const gridEl=$('#browse-grid');
 if(gridEl&&route!=='catalogo'){
  gridEl.classList.remove('virtual-catalog-container','catalog-virtual-active');
  if(route!=='programacion')gridEl.classList.add('poster-grid');
 }
 $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===route));
 window.scrollTo({top:0,behavior:'instant'});try{history.replaceState(null,'','#'+route)}catch{}
 if(route==='milista')showSaved();else if(route==='programacion')showSchedule();else if(route!=='inicio')browse(route);
 // A nonblocking visual transition; routing and data loading stay synchronous.
 window.OneUpMotion?.enter?.(route==='inicio'?$('#home-screen'):$('#browse-screen'));
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
 const hasQ=Boolean(state.query||state.searchTags.length);
 const tagsHtml=state.searchTags.length?
  '<div class="encapsulated-tags-section"><div class="encapsulated-header"><span class="encapsulated-badge">⚡ Buscando de lo ya buscado ('+state.searchTags.length+')</span><button type="button" id="clear-tags-btn" class="clear-tags-link">Limpiar filtros</button></div><div class="filter-chips-list">'+state.searchTags.map((t,i)=>'<span class="filter-chip"><span class="chip-label">'+esc(t)+'</span><button type="button" class="chip-remove" data-tag-idx="'+i+'">✕</button></span>').join('')+'</div></div>':'';
 $('#browse-controls').innerHTML=
  '<div class="catalog-filter-controls">'+
  '<div class="catalog-search-bar"><div class="search-input-box"><span class="search-icon">🔍</span><input id="catalog-search-input" class="catalog-search-input" type="text" placeholder="Buscar en catálogo... (Enter para encapsular y filtrar más)" value="'+esc(state.query)+'"><button id="catalog-search-clear" class="catalog-search-clear-btn" type="button" aria-label="Limpiar búsqueda" '+(hasQ?'':'style="display:none"')+'>✕</button></div>'+(state.query.trim()?'<button type="button" id="encapsulate-btn" class="encapsulate-btn">＋ Encapsular</button>':'')+'</div>'+
  tagsHtml+
  '<div class="browse-controls-row">'+
  '<select aria-label="Género" id="filter-genre">'+options([['','Todos los géneros'],...genres],state.filters.genre)+'</select>'+
  '<select aria-label="Tipo" id="filter-format">'+options([['','Todos los tipos'],['TV','Series'],['MOVIE','Películas'],['OVA','OVA'],['ONA','ONA'],['SPECIAL','Especiales']],state.filters.format)+'</select>'+
  '<select aria-label="Estado" id="filter-status">'+options([['','Todos los estados'],['RELEASING','En emisión'],['FINISHED','Finalizados']],state.filters.status)+'</select>'+
  '<select aria-label="Orden" id="filter-sort">'+options([['POPULARITY_DESC','Más populares'],['TRENDING_DESC','Tendencias'],['SCORE_DESC','Mejor puntuados'],['START_DATE_DESC','Más recientes']],state.filters.sort)+'</select><button id="filter-reset">Limpiar</button>'+
  '</div></div>';
}
let catalogVirtualScrollAttached = false;
let catalogFilteredCache = [];
let catalogGridDocTop = -1;

async function loadFullCatalogStudio() {
 if (state.fullCatalogLoaded && state.fullCatalog.length) return state.fullCatalog;
 if (state.fullCatalogLoading) return state.fullCatalog;
 state.fullCatalogLoading = true;
 const bases = [
  (typeof window !== 'undefined' && window.ONEUP_API_BASE),
  '/api',
  'http://127.0.0.1:4050/api',
  'http://localhost:4050/api'
 ].filter(Boolean);
 for (const base of bases) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 3500);
  try {
   const url = base.replace(/\/$/, '') + '/animes?limit=5000';
   const res = await fetch(url, { cache: 'no-cache', signal: ctrl.signal });
   if (res.ok) {
    const json = await res.json();
    if (Array.isArray(json?.items) && json.items.length > 0) {
     register(json.items);
     state.fullCatalog = json.items;
     state.fullCatalogLoaded = true;
     state.fullCatalogLoading = false;
     return json.items;
    }
   }
  } catch (e) {} finally { clearTimeout(timer); }
 }
 const files = ['./data/catalog-full.json', '/data/catalog-full.json', './client/data/catalog-full.json', './data/catalog.json'];
 for (const f of files) {
  const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 4000);
  try {
   const res = await fetch(f, { signal: ctrl.signal });
   if (res.ok) {
    const json = await res.json();
    const items = Array.isArray(json?.items) ? json.items : (json.groups ? Object.values(json.groups).flat() : []);
    if (items.length) {
     const unique = new Map();
     for (const x of items) if (x && x.id && !unique.has(x.id)) unique.set(x.id, x);
     const uniqueItems = [...unique.values()];
     register(uniqueItems);
     state.fullCatalog = uniqueItems;
     state.fullCatalogLoaded = true;
     state.fullCatalogLoading = false;
     return uniqueItems;
    }
   }
  } catch (e) {} finally { clearTimeout(timer); }
 }
 state.fullCatalogLoading = false;
 return state.fullCatalog;
}

function ensureLetterRailElement() {
 let layout = $('#catalog-view-layout');
 const grid = $('#browse-grid');
 if (!layout && grid && grid.parentNode) {
  layout = document.createElement('div');
  layout.id = 'catalog-view-layout';
  layout.className = 'catalog-view-layout';
  grid.parentNode.insertBefore(layout, grid);
  const gridArea = document.createElement('div');
  gridArea.className = 'catalog-grid-area';
  gridArea.appendChild(grid);
  layout.appendChild(gridArea);

  const aside = document.createElement('aside');
  aside.id = 'catalog-letter-rail-aside';
  aside.className = 'catalog-letter-rail-aside';
  aside.innerHTML = `
    <nav id="catalog-letter-rail" class="letter-filter-rail" aria-label="Filtro de catálogo por letra" role="navigation">
      <div class="letter-rail-header"><span class="letter-rail-label">A-Z</span></div>
      <div class="letter-rail-list">
        ${['TODOS', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map(l => 
          `<button type="button" class="letter-btn ${l === 'TODOS' ? 'is-all' : ''}" data-letter="${l}" aria-label="Letra ${l}"><span class="letter-text">${l === 'TODOS' ? 'ALL' : l}</span></button>`
        ).join('')}
      </div>
    </nav>
  `;
  layout.appendChild(aside);

  aside.addEventListener('click', e => {
   const btn = e.target.closest('.letter-btn');
   if (!btn) return;
   const letVal = btn.dataset.letter;
   if (letVal === 'TODOS' || state.filters.letter === letVal) {
    state.filters.letter = 'ALL';
   } else {
    state.filters.letter = letVal;
   }
   updateLetterRailActive();
   paintCatalogVirtual();
   window.scrollTo({ top: 320, behavior: 'smooth' });
  });
 }
 const railAside = $('#catalog-letter-rail-aside');
 if (railAside) railAside.hidden = false;
 updateLetterRailActive();
}

function updateLetterRailActive() {
 const rail = $('#catalog-letter-rail');
 if (!rail) return;
 const current = state.filters.letter || 'ALL';
 rail.querySelectorAll('.letter-btn').forEach(b => {
  const l = b.dataset.letter;
  const isAct = (l === current) || (l === 'TODOS' && current === 'ALL');
  b.classList.toggle('active', isAct);
  b.setAttribute('aria-pressed', isAct);
 });
}

function matchStudioAnime(item, q) {
 if (!q) return true;
 q = q.toLowerCase().trim();
 if (!q) return true;
 if ((item.title || '').toLowerCase().includes(q)) return true;
 if ((item.short_title || '').toLowerCase().includes(q)) return true;
 if ((item.slug || '').toLowerCase().includes(q)) return true;
 if ((item.aliases || []).some(a => String(a).toLowerCase().includes(q))) return true;
 if ((item.genres || []).some(g => String(g).toLowerCase().includes(q))) return true;
 if (String(item.year || '').includes(q)) return true;
 if ((item.studios || '').toLowerCase().includes(q)) return true;
 if ((item.description || item.synopsis || '').toLowerCase().includes(q)) return true;
 if ((item.type || '').toLowerCase().includes(q)) return true;
 return false;
}

function getFilteredCatalogStudio() {
 let list = state.fullCatalog || [];
 if (!list.length) return [];

 const letter = state.filters.letter;
 if (letter && letter !== 'ALL' && letter !== 'TODOS') {
  if (letter === '#') {
   list = list.filter(item => {
    const title = (item.title || '').trim().replace(/^["'«“‘]+/g, '');
    const first = title.charAt(0);
    return !/^[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(first);
   });
  } else {
   const target = letter.toUpperCase();
   list = list.filter(item => {
    const title = (item.title || '').trim().replace(/^["'«“‘]+/g, '');
    const normalized = title.charAt(0).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    return normalized === target;
   });
  }
 }

 if (state.filters.genre) {
  const g = state.filters.genre.toLowerCase();
  list = list.filter(item => (item.genres || []).some(genre => genre.toLowerCase().includes(g)));
 }

 if (state.filters.format) {
  const f = state.filters.format;
  list = list.filter(item => item.format === f || item.type === f);
 }

 if (state.filters.status) {
  const s = state.filters.status;
  list = list.filter(item => item.status === s);
 }

 if (state.searchTags && state.searchTags.length) {
  list = list.filter(item => state.searchTags.every(tag => matchStudioAnime(item, tag)));
 }

 if (state.query && state.query.trim()) {
  list = list.filter(item => matchStudioAnime(item, state.query));
 }

 const sort = state.filters.sort;
 const sorted = [...list];
 if (sort === 'POPULARITY_DESC') {
  sorted.sort((a, b) => (b.vote_count || b.averageScore || 0) - (a.vote_count || a.averageScore || 0));
 } else if (sort === 'TRENDING_DESC') {
  sorted.sort((a, b) => (b.id > a.id ? 1 : -1));
 } else if (sort === 'START_DATE_DESC') {
  sorted.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
 } else if (sort === 'SCORE_DESC') {
  sorted.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0));
 } else if (sort === 'TITLE_ASC') {
  sorted.sort((a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' }));
 } else if (sort === 'TITLE_DESC') {
  sorted.sort((a, b) => b.title.localeCompare(a.title, 'es', { sensitivity: 'base' }));
 }
 return sorted;
}

let catalogLastRender = { startRow: -1, endRow: -1, cols: -1, count: -1, gridWidth: 0 };

function renderVirtualSlice() {
 const grid = $('#browse-grid');
 if (!grid) return;
 const body = grid.querySelector('.virtual-scroll-body');
 if (!body) return;
 const rowsWrapper = body.querySelector('.virtual-rendered-rows');
 if (!rowsWrapper) return;

 const items = catalogFilteredCache || [];
 if (!items.length) {
  body.style.height = '0px';
  rowsWrapper.innerHTML = '';
  return;
 }

 const gridWidth = grid.clientWidth || window.innerWidth;
 let cols = 4;
 if (gridWidth >= 1150) cols = 5;
 else if (gridWidth >= 880) cols = 4;
 else if (gridWidth >= 560) cols = 3;
 else cols = 2;

 const gap = cols >= 3 ? 16 : 12;
 const cardWidth = Math.max(120, (gridWidth - (cols - 1) * gap) / cols);
 const posterHeight = Math.round(cardWidth * 1.5);
 const infoHeight = cols >= 3 ? 84 : 74;
 const cardHeight = posterHeight + infoHeight;
 const rowPitch = cardHeight + gap;

 const totalRows = Math.ceil(items.length / cols);
 const totalHeight = totalRows * rowPitch;
 const targetHeightStr = totalHeight + 'px';
 if (body.dataset.renderedHeight !== targetHeightStr) {
  body.style.height = targetHeightStr;
  body.dataset.renderedHeight = targetHeightStr;
 }

 const pageScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
 const gridDocTop = (typeof catalogGridDocTop === 'number' && catalogGridDocTop >= 0)
  ? catalogGridDocTop
  : (grid.getBoundingClientRect().top + pageScroll);
 catalogGridDocTop = gridDocTop;
 const scrollTop = Math.max(0, pageScroll - gridDocTop);
 const viewportHeight = window.innerHeight || 800;

 const overscan = 2;
 const rawStart = Math.floor(scrollTop / rowPitch) - overscan;
 const startRow = Math.max(0, rawStart);
 const rawEnd = Math.ceil((scrollTop + viewportHeight) / rowPitch) + overscan;
 const endRow = Math.min(totalRows, rawEnd);

 const offsetY = startRow * rowPitch;
 rowsWrapper.style.transform = 'translate3d(0,' + offsetY + 'px,0)';

 if (
  startRow === catalogLastRender.startRow &&
  endRow === catalogLastRender.endRow &&
  cols === catalogLastRender.cols &&
  items.length === catalogLastRender.count &&
  Math.abs(gridWidth - catalogLastRender.gridWidth) < 5
 ) {
  return;
 }

 catalogLastRender = { startRow, endRow, cols, count: items.length, gridWidth };

 let rowsHtml = '';
 for (let r = startRow; r < endRow; r++) {
  const slice = items.slice(r * cols, (r + 1) * cols);
  rowsHtml += '<div class="virtual-row" style="grid-template-columns: repeat(' + cols + ', minmax(0, 1fr)); gap: ' + gap + 'px; min-height: ' + cardHeight + 'px;">' +
    slice.map(card).join('') +
  '</div>';
 }
 rowsWrapper.innerHTML = rowsHtml;
}

function paintCatalogVirtual() {
 const grid = $('#browse-grid');
 if (!grid) return;
 if (grid.classList.contains('poster-grid')) {
  grid.classList.remove('poster-grid');
  grid.classList.add('virtual-catalog-container', 'catalog-virtual-active');
 }
 const items = getFilteredCatalogStudio();
 catalogFilteredCache = items;
 catalogLastRender = { startRow: -1, endRow: -1, cols: -1, count: -1, gridWidth: 0 };

 const total = (state.fullCatalog || []).length;
 const count = items.length;
 const letter = state.filters.letter && state.filters.letter !== 'ALL' && state.filters.letter !== 'TODOS'
  ? ' · Letra: ' + state.filters.letter
  : '';
 const tags = state.searchTags.length ? ' · ' + state.searchTags.length + ' filtros encapsulados' : '';
 const live = state.query ? ' · Buscando «' + state.query + '»' : '';
 $('#browse-status').textContent = count === total
  ? `${total.toLocaleString()} animes en catálogo completo (Scroll virtual 60fps)${letter}${tags}${live}`
  : `${count.toLocaleString()} de ${total.toLocaleString()} animes encontrados${letter}${tags}${live}`;

 if (!items.length) {
  grid.innerHTML = '<div class="empty">No encontramos títulos con esos filtros. Prueba encapsular otros términos o cambiar la letra.</div>';
  return;
 }

 if (!grid.querySelector('.virtual-scroll-body')) {
  grid.innerHTML = `
    <div class="virtual-scroll-body" style="position: relative; width: 100%;">
      <div class="virtual-rendered-rows" style="position: absolute; top: 0; left: 0; right: 0; width: 100%;"></div>
    </div>
  `;
 }

 renderVirtualSlice();

 if (!catalogVirtualScrollAttached) {
  catalogVirtualScrollAttached = true;
  let ticking = false;
  window.addEventListener('scroll', () => {
   if (state.view !== 'catalogo') return;
   if (!ticking) {
    ticking = true;
    requestAnimationFrame(() => {
     renderVirtualSlice();
     ticking = false;
    });
   }
  }, { passive: true });
  window.addEventListener('resize', () => {
   if (state.view === 'catalogo') {
    catalogGridDocTop = -1;
    catalogLastRender.gridWidth = 0;
    renderVirtualSlice();
   }
  }, { passive: true });
 }
}

async function renderCatalogView() {
 heading('CATÁLOGO <em>COMPLETO.</em>', 'Explora todo el universo anime con scroll virtual, búsqueda encapsulada e índice A-Z.', 'EXPLORA / TODOS LOS ANIMES');
 filters();
 $('#browse-next').hidden = true;
 ensureLetterRailElement();
 const grid = $('#browse-grid');
 if (grid) {
  grid.classList.remove('poster-grid');
  grid.classList.add('virtual-catalog-container', 'catalog-virtual-active');
 }

 if (!state.fullCatalog || !state.fullCatalog.length) {
  $('#browse-grid').innerHTML = '<div class="loading">Cargando catálogo completo (4,885 animes)...</div>';
  $('#browse-status').textContent = 'Cargando catálogo completo...';
  await loadFullCatalogStudio();
 }

 updateLetterRailActive();
 paintCatalogVirtual();
}

async function browse(route,page=1,append=false){
 if(route==='catalogo'){
  renderCatalogView();
  return;
 }
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
 const pool=[...new Set(state.entries.values())];
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
 // Keep the close button outside regenerated anime detail markup.
 // Re-parenting it into the poster/cover grid broke hit-testing in iOS Safari.
 $('#anime-dialog-body').innerHTML=detailUI;
 const bg=safe(a.banner||a.image);
 const scene=$('#oneup-detail-art');
 if(scene&&bg)scene.style.backgroundImage='url("'+bg.replace(/["\\]/g,'')+'")';
 const dialog=$('#anime-dialog');
 window.OneUpMotion?.prepareOpen?.(dialog);
 for(const a of dialog?.getAnimations?.()||[]){if(a.id==='oneup-motion-close')a.cancel()}
 if(!dialog.open)dialog.showModal();
 dialog.setAttribute('aria-labelledby','detail-anime-name');
 dialog.scrollTop=0;
 window.OneUpEpisodePlayer?.show(a)?.catch(()=>{});
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
 feature(id){
  const anime=state.entries.get(id);
  if(!anime)return false;
  state.selectedId=null; // carousel rotation does not overwrite user's saved choice
  hero(anime,true,false);
  return true;
 },
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
  const d=e.target.closest('[data-details]');
  if(d){
   // Block delayed Safari ghost click that would immediately reopen the dialog.
   if(performance.now()-lastDetailDismissed<450){e.preventDefault();return}
   detail(d.dataset.details);return
  }
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
 $('#browse-controls').addEventListener('click',e=>{
  if(e.target.id==='filter-reset'){
   state.filters={genre:'',format:'',status:'',sort:'POPULARITY_DESC',letter:'ALL'};
   state.query='';state.searchTags=[];
   browse('catalogo');
  }else if(e.target.id==='catalog-search-clear'){
   state.query='';state.searchTags=[];
   browse('catalogo');
  }else if(e.target.id==='clear-tags-btn'){
   state.searchTags=[];
   browse('catalogo');
  }else if(e.target.closest('.chip-remove')){
   const idx=Number(e.target.closest('.chip-remove').dataset.tagIdx);
   if(!isNaN(idx))state.searchTags.splice(idx,1);
   browse('catalogo');
  }else if(e.target.id==='encapsulate-btn'){
   const q=state.query.trim();
   if(q&&!state.searchTags.includes(q)){state.searchTags.push(q);state.query='';browse('catalogo')}
  }
 });
 $('#browse-controls').addEventListener('keydown',e=>{
  if(e.target.id==='catalog-search-input'&&e.key==='Enter'){
   e.preventDefault();
   const q=e.target.value.trim();
   if(q&&!state.searchTags.includes(q)){state.searchTags.push(q);state.query='';e.target.value='';browse('catalogo')}
  }
 });
 $('#browse-controls').addEventListener('input',e=>{
  if(e.target.id==='catalog-search-input'){
   state.query=e.target.value;
   const clr=$('#catalog-search-clear');
   if(clr)clr.style.display=(state.query||state.searchTags.length)?'':'none';
  }
 });
 let lastDetailDismissed=-10000;
 const closeAnime=(event)=>{
  if(event){event.preventDefault();event.stopPropagation()}
  const modal=$('#anime-dialog');
  if(!modal?.open)return;
  lastDetailDismissed=performance.now();
  if(!window.OneUpMotion?.closeDialog?.(modal))modal.close();
 };
 $('#anime-close').addEventListener('click',closeAnime);
 // iOS fallback applies only when another element intercepts the X's
 // screen coordinates, not a normal tap on the button itself.
 // Closing on the button's pointerdown allowed click-through to a card.
 $('#anime-dialog').addEventListener('pointerdown',e=>{
  const button=$('#anime-close'),modal=$('#anime-dialog');
  if(!modal?.open||!button||button.contains(e.target))return;
  const r=button.getBoundingClientRect(),pad=5;
  if(e.clientX<r.left-pad||e.clientX>r.right+pad||
     e.clientY<r.top-pad||e.clientY>r.bottom+pad)return;
  e.preventDefault();e.stopPropagation();closeAnime();
 },true);
 $('#anime-dialog').addEventListener('close',()=>{
  lastDetailDismissed=performance.now();
  state.active=null;
  window.OneUpMotion?.cancelMotion?.($('#anime-dialog'));
  for(const a of $('#anime-dialog')?.getAnimations?.()||[]){if(a.id==='oneup-motion-close')a.cancel()}
  document.dispatchEvent(new Event('oneup-anime-closed'));
 });
 $('#anime-dialog').addEventListener('click',e=>{
  if(e.target===$('#anime-dialog'))closeAnime(e);
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
