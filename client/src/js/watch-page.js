(()=>{'use strict';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),raw=params.get('anime')||'';
const id=raw.replace(/^(al-|mal-)/,'');
const isMal=raw.startsWith('mal-');
const query=isMal
?'query($id:Int){Media(idMal:$id,type:ANIME,isAdult:false){id idMal title{english romaji native} coverImage{extraLarge large} bannerImage description(asHtml:false) averageScore episodes format status seasonYear startDate{year} genres siteUrl externalLinks{site url type} trailer{id site}}}'
:'query($id:Int){Media(id:$id,type:ANIME,isAdult:false){id idMal title{english romaji native} coverImage{extraLarge large} bannerImage description(asHtml:false) averageScore episodes format status seasonYear startDate{year} genres siteUrl externalLinks{site url type} trailer{id site}}}';
const VERIFIED_CRUNCHYROLL={'mal-21':'https://www.crunchyroll.com/series/GRMG8ZQZR/one-piece','mal-61967':'https://www.crunchyroll.com/es-es/series/GRE50KV36/black-clover','mal-34572':'https://www.crunchyroll.com/es-es/series/GRE50KV36/black-clover','mal-61987':'https://www.crunchyroll.com/es/series/G3KHEVDJ7/the-apothecary-diaries','mal-64340':'https://www.crunchyroll.com/es/series/GT00384004/overgeared','mal-63181':'https://www.crunchyroll.com/series/GP5HJ84D2/tougen-anki'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return ''}};
const clean=s=>String(s||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
function summarize(s){s=clean(s);if(s.length<=400)return s;const cut=s.slice(0,400),dot=cut.lastIndexOf('. ');if(dot>200)return cut.slice(0,dot+1);const sp=cut.lastIndexOf(' ');return (sp>0?cut.slice(0,sp):cut)+'…'}
async function spanishSummary(a){
 const mal=a.idMal;
 try{const r=await fetch('./data/translations-es.json',{cache:'force-cache'});if(r.ok){const j=await r.json();const es=j?.translations?.['mal-'+mal]?.es;if(es)return summarize(es)}}catch{}
 try{const r=await fetch('./data/catalog-full.json',{cache:'force-cache'});if(r.ok){const j=await r.json();const items=Array.isArray(j)?j:(Object.values(j).find(v=>Array.isArray(v)&&v.length&&typeof v[0]==='object')||[]);const title=(a.title?.english||a.title?.romaji||'').toLowerCase();const hit=items.find(x=>String(x.title||'').toLowerCase()===title&&x.description_es);if(hit)return summarize(hit.description_es)}}catch{}
 return summarize(a.description||'Sinopsis no disponible.');
}
function renderTrailer(a){
 const tr=a.trailer;
 if(!tr||tr.site!=='youtube'||!/^[A-Za-z0-9_-]{11}$/.test(tr.id||''))return;
 const sec=$('#trailer-section'),host=$('#trailer');if(!sec||!host)return;
 sec.hidden=false;
 host.innerHTML='<button type="button" class="trailer-thumb" aria-label="Reproducir tráiler oficial"><img src="https://i.ytimg.com/vi/'+tr.id+'/hqdefault.jpg" alt="Vista previa del tráiler" loading="lazy"><span class="trailer-play"><span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6L18.8 12Z"/></svg></span></span></button>';
 host.querySelector('.trailer-thumb').addEventListener('click',()=>{
  host.innerHTML='<iframe class="trailer-frame" src="https://www.youtube-nocookie.com/embed/'+tr.id+'?rel=0&autoplay=1" title="Tráiler oficial" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
 });
}
function fail(message){$('#title').textContent='No se pudo cargar este anime';$('#synopsis').textContent=message;$('#providers').innerHTML='<div class="status">Vuelve al catálogo y selecciona el anime otra vez.</div>';}
async function load(){
 if(!/^\d+$/.test(id)){fail('El enlace del anime no es válido.');return}
 try{
  const response=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query,variables:{id:Number(id)}})});
  if(!response.ok)throw Error('El catálogo respondió con HTTP '+response.status);
  const json=await response.json(),a=json.data?.Media;
  if(!a)throw Error('No encontramos este título en el catálogo.');
  const title=a.title?.english||a.title?.romaji||a.title?.native||'Anime';
  document.title=title+' | 1UP Anime';$('#title').textContent=title;
  const image=safe(a.coverImage?.extraLarge||a.coverImage?.large);
  if(image)$('#poster').src=image;else $('#poster').hidden=true;
  const banner=safe(a.bannerImage);if(banner)$('#hero').style.setProperty('--banner','url("'+banner.replace(/["\\]/g,'')+'")');
  const meta=[a.format==='TV'?'Serie':a.format,a.seasonYear||a.startDate?.year,a.episodes?(a.episodes+' episodios'):'',a.averageScore?'★ '+(a.averageScore/10).toFixed(1):''].filter(Boolean);
  $('#meta').innerHTML=meta.map(x=>'<span>'+esc(x)+'</span>').join('');
  spanishSummary(a).then(t=>{$('#synopsis').textContent=t});
  const site=safe(a.siteUrl);if(site){$('#official').href=site;$('#official').hidden=false}
  renderTrailer(a);
  const bySite=new Map();
  for(const x of (a.externalLinks||[])){if(x.type!=='STREAMING'||!safe(x.url))continue;const k=String(x.site||'').trim().toLowerCase();if(k&&!bySite.has(k))bySite.set(k,x)}
  if(!bySite.has('crunchyroll')&&VERIFIED_CRUNCHYROLL['mal-'+a.idMal])bySite.set('crunchyroll',{site:'Crunchyroll',url:VERIFIED_CRUNCHYROLL['mal-'+a.idMal],type:'STREAMING'});
  let providers=['netflix','crunchyroll'].map(k=>bySite.get(k)).filter(Boolean);
  if(!providers.length){const free=['youtube','tubi','pluto tv','retrocrush','hoopla'].map(k=>bySite.get(k)).find(Boolean);if(free)providers=[free]}
  $('#providers').innerHTML=providers.length?providers.map(x=>'<a href="'+esc(safe(x.url))+'" target="_blank" rel="noopener noreferrer">'+esc(x.site||'Plataforma oficial')+' <svg class="ext-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9.2 9.2M19.2 13.5V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19V7a1.6 1.6 0 0 1 1.6-1.6H11"/></svg></a>').join(''):'<div class="status">Sin plataformas registradas por ahora.</div>';
  $('#details').innerHTML='<p><strong>Formato:</strong> '+esc(a.format||'No disponible')+'</p><p><strong>Estado:</strong> '+esc(a.status||'No disponible')+'</p><p><strong>Géneros:</strong> '+esc((a.genres||[]).join(', ')||'No disponibles')+'</p>';
  try{await window.OneUpEpisodePlayer?.show({id:raw,title,image,banner:banner||'',episodes:a.episodes||0,episodes_total:a.episodes||0})}catch(e){console.warn('1UP player:',e)}
 }catch(error){console.error('1UP watch page:',error);fail(error.message||'Error de conexión.')}
}
load();
})();
