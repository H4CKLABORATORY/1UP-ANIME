/* 1UP — live metadata with fallback and richer navigation. */
(()=>{
'use strict';
const F='id idMal title{romaji english} description(asHtml:false) coverImage{extraLarge large color} bannerImage episodes seasonYear format status genres averageScore siteUrl nextAiringEpisode{airingAt episode} trailer{id site} externalLinks{site url type}';
const Q='query($page:Int,$perPage:Int,$sort:[MediaSort],$search:String,$season:MediaSeason,$seasonYear:Int,$format:MediaFormat,$genre:String,$status:MediaStatus){Page(page:$page,perPage:$perPage){pageInfo{hasNextPage}media(type:ANIME,isAdult:false,sort:$sort,search:$search,season:$season,seasonYear:$seasonYear,format:$format,genre:$genre,status:$status){'+F+'}}}';
const D='query($id:Int,$idMal:Int){Media(id:$id,idMal:$idMal,type:ANIME){'+F+'}}';
const titles=[[34572,'Black Clover','Action,Fantasy',2017,170],[21,'One Piece','Action,Adventure',1999,0],[20,'Naruto','Action,Adventure',2002,220],[40748,'Jujutsu Kaisen','Action,Fantasy',2020,24],[38000,'Demon Slayer','Action,Fantasy',2019,26],[16498,'Attack on Titan','Action,Drama',2013,25],[1535,'Death Note','Mystery,Supernatural',2006,37],[5114,'Fullmetal Alchemist Brotherhood','Action,Adventure',2009,64],[269,'Bleach','Action,Adventure',2004,366],[30276,'One Punch Man','Action,Comedy',2015,12],[44511,'Chainsaw Man','Action,Fantasy',2022,12],[50265,'SPY x FAMILY','Action,Comedy',2022,12],[52299,'Solo Leveling','Action,Fantasy',2024,12],[52991,'Frieren','Adventure,Drama',2023,28],[31964,'My Hero Academia','Action,Comedy',2016,13],[49596,'Blue Lock','Sports,Drama',2022,24],[32182,'Mob Psycho 100','Action,Comedy',2016,12],[11061,'Hunter x Hunter','Action,Adventure',2011,148],[813,'Dragon Ball Z','Action,Adventure',1989,291],[9253,'Steins;Gate','Drama,Sci-Fi',2011,24],[1,'Cowboy Bebop','Action,Sci-Fi',1998,26],[199,'Spirited Away','Adventure,Fantasy',2001,1],[32281,'Your Name','Romance,Drama',2016,1],[431,'Howl’s Moving Castle','Adventure,Fantasy',2004,1]];
const BASIC=titles.map(([mal_id,title,tags,year,episodes],i)=>({mal_id,title,title_english:title,year,episodes,score:null,type:i>=21?'Movie':'TV',genres:tags.split(',').map(name=>({name})),synopsis:'Incluido en el catálogo base. La sinopsis completa estará disponible al reconectar.',images:{webp:{large_image_url:''}},url:'https://myanimelist.net/anime/'+mal_id}));
const secure=u=>{try{let x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return ''}};
function norm(x){const img=secure(x.coverImage?.extraLarge||x.coverImage?.large||'');return{mal_id:x.idMal||-x.id,title:x.title?.romaji||x.title?.english||'Anime',title_english:x.title?.english||x.title?.romaji||'Anime',synopsis:String(x.description||'').replace(/<[^>]*>/g,' '),score:x.averageScore?+(x.averageScore/10).toFixed(1):null,year:x.seasonYear||'',episodes:x.episodes,type:x.format==='MOVIE'?'Movie':x.format||'TV',status:x.status,genres:(x.genres||[]).map(name=>({name})),images:{webp:{large_image_url:img},jpg:{large_image_url:img}},url:secure(x.siteUrl),nextAiringEpisode:x.nextAiringEpisode,streaming:(x.externalLinks||[]).filter(a=>a.type==='STREAMING'&&secure(a.url)).map(a=>({name:a.site,url:a.url})),trailer:x.trailer?.site==='youtube'?{youtube_id:x.trailer.id}:{}}}
/* Phase 1 - ask(): AniList with the same rate safety as studio.js (one
   serialized queue, >=2.1 s spacing, 429 honours Retry-After with
   exponential backoff, X-RateLimit-Remaining slows us down early) plus a
   fallback to the last good cached snapshot for the same query when the
   live call fails or stays rate-limited. Metadata only; no user setup. */
const ASK_MIN_GAP_MS=2100,ASK_MAX_ATTEMPTS=3;
/* Phase 3 - ONE catalog cache policy (catalog-cache-policy.js via
   studio.js; this mirror keeps the file working standalone in tests). */
const ASK_POLICY=(typeof window!=='undefined'&&window.OneUpCachePolicy)||{askSnapshotTtlMs:7200000,routeCacheTtlMs:7200000,askSnapshotKeyPrefix:'oneup_anilist_snapshot_v44_',routeKeyPrefix:'oneup_cache_v44_'};
const ASK_SNAPSHOT_PREFIX=ASK_POLICY.askSnapshotKeyPrefix;
const askRate={remaining:null,limit:null,resetAt:0,backoffUntil:0};
let askLastCall=0,askQueue=Promise.resolve(),askFellBack=false;
function askSnapshotKey(query,variables){let h=0;const raw=query+JSON.stringify(variables||{});for(let i=0;i<raw.length;i++)h=(h*31+raw.charCodeAt(i))>>>0;return ASK_SNAPSHOT_PREFIX+h.toString(36)}
function askReadSnapshot(query,variables){try{const x=JSON.parse(sessionStorage.getItem(askSnapshotKey(query,variables))||'null');return x&&x.data&&Date.now()-(x.at||0)<ASK_POLICY.askSnapshotTtlMs?x.data:null}catch{return null}}
function askSaveSnapshot(query,variables,data){try{sessionStorage.setItem(askSnapshotKey(query,variables),JSON.stringify({at:Date.now(),data}))}catch{}}
async function ask(query,variables){
 const work=askQueue.catch(()=>{}).then(()=>askSerial(query,variables));
 askQueue=work.catch(()=>{});
 return work;
}
async function askSerial(query,variables){
 let lastError=null;
 for(let attempt=1;attempt<=ASK_MAX_ATTEMPTS;attempt++){
  const now=Date.now();
  const gap=Math.max(0,ASK_MIN_GAP_MS-(now-askLastCall),askRate.backoffUntil-now);
  if(gap)await new Promise(r=>setTimeout(r,gap));
  askLastCall=Date.now();
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),11500);
  try{
   const r=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({query,variables}),signal:controller.signal});
   try{
    const remaining=Number((r.headers?.get?.('X-RateLimit-Remaining'))??NaN);
    const limit=Number((r.headers?.get?.('X-RateLimit-Limit'))??NaN);
    const reset=Number((r.headers?.get?.('X-RateLimit-Reset'))??NaN);
    if(Number.isFinite(remaining))askRate.remaining=remaining;
    if(Number.isFinite(limit))askRate.limit=limit;
    if(Number.isFinite(reset)&&reset>0)askRate.resetAt=reset*1000;
    if(Number.isFinite(remaining)&&remaining<=2)askRate.backoffUntil=Math.max(askRate.backoffUntil,(askRate.resetAt>Date.now()?askRate.resetAt:Date.now()+30000));
   }catch{}
   if(r.status===429){
    lastError=Error('AniList 429');
    if(attempt<ASK_MAX_ATTEMPTS){const sec=Number(r.headers.get('Retry-After'));await new Promise(res=>setTimeout(res,Number.isFinite(sec)&&sec>0?Math.min(65000,Math.ceil(sec*1000)):10000*attempt));continue}
    break;
   }
   if(!r.ok){
    lastError=Error('AniList '+r.status);
    // Phase 3 (audit gap 7): 403 / 5xx = AniList outage: back off and
    // retry; after the last attempt the snapshot fallback below serves
    // the last good data instead of a hard error.
    if((r.status===403||r.status>=500)&&attempt<ASK_MAX_ATTEMPTS){const sec=Number(r.headers.get('Retry-After'));await new Promise(res=>setTimeout(res,Number.isFinite(sec)&&sec>0?Math.min(65000,Math.ceil(sec*1000)):1500*attempt));continue}
    break;
   }
   const j=await r.json();
   if(j.errors?.length){
    const rateLimited=j.errors.some(e=>e?.status===429||/too many requests/i.test(e?.message||''));
    if(rateLimited){lastError=Error('AniList 429');if(attempt<ASK_MAX_ATTEMPTS){await new Promise(res=>setTimeout(res,2000*attempt));continue}}
    throw Error(j.errors[0].message);
   }
   askFellBack=false;askSaveSnapshot(query,variables,j.data);return j.data;
  }catch(e){
   lastError=e;
   if((e?.name==='AbortError'||/network|failed to fetch|load failed/i.test(e?.message||''))&&attempt<ASK_MAX_ATTEMPTS){await new Promise(res=>setTimeout(res,2000*attempt));continue}
   break;
  }finally{clearTimeout(timer)}
 }
 // Live call failed or stayed rate-limited: serve the last good snapshot
 // for this exact query instead of failing the view.
 const snapshot=askReadSnapshot(query,variables);
 if(snapshot){askFellBack=true;return snapshot}
 throw lastError||Error('AniList unavailable');
}
function args(path){let u=new URL(path,'https://example.test'),a={page:Math.max(1,+u.searchParams.get('page')||1),perPage:24,sort:['POPULARITY_DESC']};if(u.pathname==='/top/anime'){if(u.searchParams.get('type')==='movie')a.format='MOVIE'}else if(u.pathname==='/seasons/now'){let n=new Date();a.season=['WINTER','SPRING','SUMMER','FALL'][Math.floor(n.getMonth()/3)];a.seasonYear=n.getFullYear();a.sort=['TRENDING_DESC']}else if(u.pathname==='/anime'||u.pathname==='/schedules'){let s=u.searchParams.get('q'),g=u.searchParams.get('genre'),f=u.searchParams.get('type');if(s){a.search=s;a.sort=['SEARCH_MATCH']}if(g)a.genre=g;if(f&&['MOVIE','OVA','ONA','SPECIAL'].includes(f.toUpperCase()))a.format=f.toUpperCase();if(u.pathname==='/schedules')a.status='RELEASING'}else return null;return a}
function local(path){let u=new URL(path,'https://example.test'),q=(u.searchParams.get('q')||'').toLowerCase(),g=(u.searchParams.get('genre')||'').toLowerCase(),type=u.searchParams.get('type'),p=Math.max(1,+u.searchParams.get('page')||1);let a=BASIC.filter(x=>(!q||x.title.toLowerCase().includes(q))&&(!g||x.genres.some(y=>y.name.toLowerCase().includes(g)))&&(!type||type!=='movie'||x.type==='Movie'));return{data:a.slice((p-1)*24,p*24),pagination:{has_next_page:p*24<a.length},offline:true}}
getJson=async function(path){
 const m=/^\/anime\/(-?\d+)\/full/.exec(path);
 try{
 let out;
 if(m){let k=+m[1],res=await ask(D,k<0?{id:-k}:{idMal:k});out={data:norm(res.Media)}}
 else{let variables=args(path);if(!variables)throw Error('Ruta de catálogo no admitida');const result=await ask(Q,variables),items=(result.Page?.media||[]).map(norm);if(!items.length)throw Error('No results');out={data:items,pagination:{has_next_page:!!result.Page?.pageInfo?.hasNextPage}}}
 state.catalogSource=askFellBack?'Caché':'AniList';try{sessionStorage.setItem(ASK_POLICY.routeKeyPrefix+path,JSON.stringify({...out,at:Date.now()}))}catch{}return out
 }catch(err){
 try{let r=JSON.parse(sessionStorage.getItem(ASK_POLICY.routeKeyPrefix+path)||'null');if(r?.data&&Date.now()-(r.at||0)<ASK_POLICY.routeCacheTtlMs){state.catalogSource='Caché';return r}}catch{}
 state.catalogSource='Catálogo básico';
 if(m){let x=BASIC.find(x=>x.mal_id===+m[1]);if(x)return{data:x};throw Error('Ficha no disponible')}
 return local(path);
 }
};
sections.programacion={title:'Programación semanal.',label:'PRÓXIMOS EPISODIOS',description:'Anime actualmente en emisión.',url:'/schedules?limit=24'};
sections.ovas={title:'OVAs.',label:'CATÁLOGO OVA',description:'Animación original para video.',url:'/anime?type=OVA&limit=24'};
sections.onas={title:'ONAs.',label:'CATÁLOGO ONA',description:'Animación original de internet.',url:'/anime?type=ONA&limit=24'};
sections.especiales={title:'Especiales.',label:'CATÁLOGO ESPECIAL',description:'Producciones especiales.',url:'/anime?type=SPECIAL&limit=24'};
const G=[['⚔️','Acción','Action'],['🧭','Aventura','Adventure'],['✨','Fantasía','Fantasy'],['💕','Romance','Romance'],['👻','Terror','Horror'],['😂','Comedia','Comedy'],['🚀','Ciencia ficción','Sci-Fi'],['🌸','Vida cotidiana','Slice of Life']];
function mount(){let home=document.querySelector('#home-view');if(!home||document.querySelector('#extra-catalog'))return;let e=document.createElement('div');e.id='extra-catalog';e.innerHTML='<section id="continue-shelf" class="extra-shelf" hidden><div class="shelf-heading"><div><span>VUELVE A TU HISTORIA</span><h2>Continuar <em>viendo</em></h2></div><button data-view="milista">Mi lista →</button></div><div class="anime-grid" id="continue-grid"></div></section><section class="extra-shelf"><div class="shelf-heading"><div><span>ANIME PARA CADA GUSTO</span><h2>Explora por <em>géneros</em></h2></div></div><div id="genre-tiles" class="genre-tiles"></div></section><section class="extra-shelf"><div class="shelf-heading"><div><span>LAS MEJORES HISTORIAS</span><h2>Películas y <em>cine</em></h2></div><button data-view="peliculas">Explorar →</button></div><div id="movie-shelf" class="anime-grid"></div></section><section class="extra-shelf"><div class="shelf-heading"><div><span>CALENDARIO ANIME</span><h2>Próximos <em>episodios</em></h2></div><button data-view="programacion">Ver programación →</button></div><div class="schedule-list" id="schedule-shelf"></div></section>';home.appendChild(e);
 document.querySelector('#genre-tiles').innerHTML=G.map(x=>'<button class="genre-tile" type="button" data-genre="'+x[2]+'"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>Explorar ↗</small></button>').join('');
 document.addEventListener('click',e=>{let b=e.target.closest('[data-genre]');if(!b)return;let g=b.dataset.genre,key='genre-'+g.toLowerCase().replace(/[^a-z]+/g,'-');sections[key]={title:g+'.',label:'EXPLORAR POR GÉNERO',description:'Anime de '+g,url:'/anime?genre='+encodeURIComponent(g)+'&limit=24'};switchView(key)})}
function continueShelf(){let el=document.querySelector('#continue-shelf');if(!el)return;let items=Object.values(state.saved||{}).filter(x=>+x.watched>0).map(x=>state.pool.get(+x.id)||{mal_id:+x.id,title:x.title,score:x.score,year:x.year,type:x.type,images:{jpg:{large_image_url:x.image}}});el.hidden=!items.length;if(items.length){rememberAll(items);paint(document.querySelector('#continue-grid'),items.slice(0,5),false)}}
const oldHome=loadHome;
loadHome=async function(){mount();continueShelf();rememberAll(BASIC);paint(document.querySelector('#top-grid'),BASIC.slice(0,10),true);paint(document.querySelector('#season-grid'),BASIC.slice(10,20),false);setFeatured(BASIC[0]);paint(document.querySelector('#movie-shelf'),BASIC.filter(x=>x.type==='Movie'),false);document.querySelector('#schedule-shelf').innerHTML='<p>Consultando estrenos y programación…</p>';await oldHome();try{let m=await getJson('/top/anime?type=movie&limit=6');rememberAll(m.data||[]);paint(document.querySelector('#movie-shelf'),(m.data||[]).slice(0,6),false)}catch{}
try{let s=await getJson('/schedules?limit=24'),items=(s.data||[]).filter(x=>x.nextAiringEpisode?.airingAt).sort((a,b)=>a.nextAiringEpisode.airingAt-b.nextAiringEpisode.airingAt).slice(0,8);rememberAll(items);document.querySelector('#schedule-shelf').innerHTML=items.length?items.map(a=>'<button class="schedule-item" data-detail="'+a.mal_id+'"><strong>EP '+a.nextAiringEpisode.episode+'</strong><span>'+escapeText(a.title_english||a.title)+'</span><time>'+new Intl.DateTimeFormat('es',{weekday:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(a.nextAiringEpisode.airingAt*1000))+'</time></button>').join(''):'<p>La programación en vivo estará disponible cuando responda AniList.</p>'}catch{}
let source=document.querySelector('#catalog-source-info');if(source)source.textContent='Datos: '+(state.catalogSource||'AniList')};
const oldSwitch=switchView;switchView=function(v){oldSwitch(v);if(v==='inicio')continueShelf()};
// Phase 1 diagnostics hook (no UI, no setup): exposes ask() and its rate
// state for automated tests and debugging.
if(typeof window!=='undefined')window.OneUpCatalogPlus={ask,get fellBack(){return askFellBack},get rate(){return {...askRate}},get minGapMs(){return ASK_MIN_GAP_MS}};
})();