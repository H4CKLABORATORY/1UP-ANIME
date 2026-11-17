// @ts-check
(()=>{'use strict';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search);
const raw=(params.get('anime')||'').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>{try{const x=new URL(u,location.href);return x.protocol==='https:'||x.protocol==='http:'?x.href:''}catch{return ''}};

function fail(message){
 const title=$('#title');if(title)title.textContent='No se pudo cargar este anime';
 const syn=$('#synopsis');if(syn)syn.textContent=message;
 const prov=$('#providers');if(prov)prov.innerHTML='<div class="status">Vuelve al catálogo y selecciona el anime otra vez. Si el problema continúa, intenta recargar esta pestaña.</div>';
 const det=$('#details');if(det)det.innerHTML='<p class="muted">Información detallada no disponible para este título.</p>';
}

function renderAnime(a){
 if(!a)return fail('No encontramos este título en el catálogo.');

 const title=a.title?.english||a.title?.romaji||a.title?.native||a.title||'Anime';
 document.title=title+' | 1UP Anime';
 const titleEl=$('#title');if(titleEl)titleEl.textContent=title;

 const image=safe(a.image||a.coverImage?.extraLarge||a.coverImage?.large||a.poster);
 const poster=$('#poster');
 if(poster){
  if(image){poster.src=image;poster.hidden=false;}
  else{poster.hidden=true;}
 }

 const banner=safe(a.banner||a.bannerImage||image);
 const hero=$('#hero');
 if(hero&&banner){
  hero.style.setProperty('--banner','url("'+banner.replace(/["\\]/g,'')+'")');
 }

 const formatStr=a.type||(a.format==='TV'?'Serie':a.format)||'Serie';
 const yearStr=a.year||a.seasonYear||a.startDate?.year||'';
 const epCount=a.episodes_total||(typeof a.episodes==='number'?a.episodes:(Array.isArray(a.episodes)?a.episodes.length:''))||a.episodes_count||'';
 const scoreStr=a.averageScore?('★ '+(a.averageScore/10).toFixed(1)):(a.vote_count?('★ '+(Number(a.vote_count)/10).toFixed(1)):'');

 const meta=[formatStr,yearStr,epCount?(epCount+' episodios'):'',scoreStr].filter(Boolean);
 const metaEl=$('#meta');
 if(metaEl)metaEl.innerHTML=meta.map(x=>'<span>'+esc(x)+'</span>').join('');

 const syn=a.synopsis||a.description_es||a.description||'Sinopsis no disponible.';
 const synEl=$('#synopsis');
 if(synEl)synEl.textContent=String(syn).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();

 const site=safe(a.siteUrl||a.site_url);
 const offEl=$('#official');
 if(offEl){
  if(site){offEl.href=site;offEl.hidden=false;}
  else{offEl.hidden=true;}
 }

 // External streaming or players
 const streamLinks=Array.isArray(a.streaming)?a.streaming:(Array.isArray(a.externalLinks)?a.externalLinks:[]);
 const validProviders=streamLinks.filter(x=>(x.url||x.player_url)&&safe(x.url||x.player_url));
 const provEl=$('#providers');
 if(provEl){
  if(validProviders.length){
   provEl.innerHTML=validProviders.map(x=>'<a href="'+esc(safe(x.url||x.player_url))+'" target="_blank" rel="noopener noreferrer">'+esc(x.name||x.site||x.server||'Plataforma oficial')+' ↗</a>').join('');
  }else{
   provEl.innerHTML='<div class="status">Plataformas oficiales y reproductores autorizados disponibles según región.</div>';
  }
 }

 // Details section
 const genresList=Array.isArray(a.genres)?a.genres.join(', '):(a.genres||'Anime');
 const statusStr=a.estado||(a.status==='currently'?'En emisión':(a.status==='finished'?'Finalizado':a.status))||'Disponible';
 const detEl=$('#details');
 if(detEl){
  detEl.innerHTML=
   '<p><strong>Formato:</strong> '+esc(formatStr)+'</p>'+
   '<p><strong>Estado:</strong> '+esc(statusStr)+'</p>'+
   '<p><strong>Géneros:</strong> '+esc(genresList)+'</p>'+
   (epCount?'<p><strong>Episodios:</strong> '+esc(epCount)+'</p>':'')+
   (a.studios?'<p><strong>Estudio:</strong> '+esc(a.studios)+'</p>':'');
 }
}

async function loadFromBackend(target){
 const bases=['/api','http://127.0.0.1:4050/api','http://localhost:4050/api','http://localhost:8765/api'];
 for(const b of bases){
  try{
   const res=await fetch(`${b}/anime/${encodeURIComponent(target)}`,{signal:AbortSignal.timeout(3500)});
   if(res.ok){
    const json=await res.json();
    if(json?.title)return json;
   }
  }catch{}
 }
 return null;
}

async function loadFromCatalogJson(target){
 try{
  const res=await fetch('./data/catalog.json',{signal:AbortSignal.timeout(3500)});
  if(!res.ok)return null;
  const json=await res.json();
  const groups=json?.groups||{};
  const all=[...(groups.trending||[]),...(groups.popular||[]),...(groups.season||[]),...(groups.recent||[]),...(groups.movies||[])];
  const targetLower=target.toLowerCase();
  const found=all.find(x=>x.id===target||x.slug===target||x.title?.toLowerCase()===targetLower);
  return found||null;
 }catch{return null;}
}

async function loadFromAniList(numericId,isMal){
 const query=isMal
  ?'query($id:Int){Media(idMal:$id,type:ANIME,isAdult:false){id idMal title{english romaji native} coverImage{extraLarge large} bannerImage description(asHtml:false) averageScore episodes format status seasonYear startDate{year} genres siteUrl externalLinks{site url type}}}'
  :'query($id:Int){Media(id:$id,type:ANIME,isAdult:false){id idMal title{english romaji native} coverImage{extraLarge large} bannerImage description(asHtml:false) averageScore episodes format status seasonYear startDate{year} genres siteUrl externalLinks{site url type}}}';
 const res=await fetch('https://graphql.anilist.co',{
  method:'POST',
  headers:{'Content-Type':'application/json',Accept:'application/json'},
  body:JSON.stringify({query,variables:{id:Number(numericId)}}),
  signal:AbortSignal.timeout(6000)
 });
 if(!res.ok)throw Error('AniList HTTP '+res.status);
 const json=await res.json();
 return json.data?.Media||null;
}

async function load(){
 if(!raw){
  fail('No se especificó ningún anime para mostrar.');
  return;
 }

 // 1. Try local catalog backend (supports jk-*, slugs, IDs, etc.)
 try{
  const backendData=await loadFromBackend(raw);
  if(backendData){
   renderAnime(backendData);
   return;
  }
 }catch(e){}

 // 2. Try catalog.json snapshot
 try{
  const catData=await loadFromCatalogJson(raw);
  if(catData){
   renderAnime(catData);
   return;
  }
 }catch(e){}

 // 3. Try AniList for mal-* or al-* or digits
 const pureId=raw.replace(/^(al-|mal-)/,'');
 const isMal=raw.startsWith('mal-');
 if(/^\d+$/.test(pureId)){
  try{
   const aniData=await loadFromAniList(pureId,isMal);
   if(aniData){
    renderAnime(aniData);
    return;
   }
  }catch(e){
   console.warn('AniList lookup error:',e);
  }
 }

 fail('No se pudo encontrar la información para este anime.');
}

load();
})();
