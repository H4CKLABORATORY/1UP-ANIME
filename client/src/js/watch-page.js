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
function seasonParts(title){
 let t=String(title||'').trim(),part=1;const pm=t.match(/\s+part\s+(\d+)\s*$/i);if(pm){part=Number(pm[1]);t=t.slice(0,pm.index).trim()}
 let num=0;const pats=[/\s+(\d+)(?:st|nd|rd|th)\s+season\s*$/i,/\s+season\s+(\d+)\s*$/i,/\s+the\s+final\s+season\s*$/i,/\s+(\d+)\s*$/];
 for(const re of pats){const m=t.match(re);if(m){num=m[1]?Number(m[1]):-1;t=t.slice(0,m.index).trim();break}}
 t=t.replace(/\s*\((?:tv|movie)\)\s*$/i,'').trim();
 return {base:t,num,part};
}
const KIND_LABEL={movie:'Película',special:'Especial',ova:'OVA',ona:'ONA',short:'Corto'};
function kindOfItem(x){
 if(x.format==='MOVIE'||x.type==='Pelicula')return 'movie';
 if(x.format==='SPECIAL'||x.type==='Especial')return 'special';
 if(x.format==='OVA'||x.type==='OVA')return 'ova';
 if(x.format==='TV_SHORT')return 'short';
 if(x.format==='ONA')return 'ona';
 return 'season';
}
function titleSuffix(title,base){
 let t=String(title||'');
 if(base&&t.toLowerCase().startsWith(base.toLowerCase()))t=t.slice(base.length);
 t=t.replace(/^[\s:·\-–—]+/,'').replace(/^(?:the\s+)?(?:movie|film)\s*\d*\s*[:：]?\s*/i,'').replace(/\s+(?:movie|film)\s*\d*\s*$/i,'').trim();
 if(t.length<3)t=String(title||'').replace(/\s+(?:movie|film)\s*\d*\s*$/i,'').trim();
 return t;
}
function franchiseSeasons(items,current){
 const isSeries=x=>x&&(x.type==='Serie'||x.format==='TV')&&x.format!=='MOVIE';
 const series=items.filter(isSeries);
 const bases=new Set(series.map(x=>seasonParts(x.title).base));
 const baseList=[...bases].sort((a,b)=>b.length-a.length);
 const keyOf=x=>{let b=seasonParts(x.title).base;
  b=b.replace(/\s+(?:movie|film)\s*[:：]\s*.*$/i,'').replace(/\s+(?:movie|film)\s*\d*\s*$/i,'').trim();
  const ci=b.indexOf(': ');if(ci>0&&bases.has(b.slice(0,ci)))b=b.slice(0,ci);
  if(!bases.has(b))for(const base of baseList){if(b.startsWith(base+' ')){b=base;break}}
  return b};
 const key=keyOf(current);
 const sibs=items.filter(x=>x&&x.title&&keyOf(x)===key&&(isSeries(x)||kindOfItem(x)!=='season'));
 if(sibs.length<2)return [];
 const sorted=[...sibs].sort((a,b)=>(Number(a.raw_id)||0)-(Number(b.raw_id)||0));
 let currentNum=0;
 const list=sorted.map(x=>{
  const kind=kindOfItem(x);
  const p=seasonParts(x.title);
  let label;
  if(kind==='season'||(kind==='ona'&&p.num>0)){
   const n=p.num>0?p.num:currentNum+1;currentNum=n;
   label='Temporada '+n+(p.part>1?' · Parte '+p.part:'');
  }else{
   const suf=titleSuffix(x.title,key);
   label=KIND_LABEL[kind]+(suf&&suf.toLowerCase()!==String(x.title).toLowerCase()?' · '+suf:'');
  }
  return {id:String(x.id),title:x.title||'Anime',kind,format:x.format||'',label,image:safe(x.poster||x.image||''),banner:safe(x.banner||x.poster||''),episodes:x.episodes||0,episodes_total:x.episodes_total||x.episodes||0}});
 for(const s of list)s.seasons=list;
 return list;
}
async function loadJk(){
 try{
  const r=await fetch('./data/catalog-full.json',{cache:'force-cache'});
  if(!r.ok)throw Error('No se pudo leer el catálogo.');
  const j=await r.json();
  const items=Array.isArray(j)?j:(Object.values(j).find(v=>Array.isArray(v)&&v.length&&typeof v[0]==='object')||[]);
  const e=items.find(x=>String(x.id)===raw);
  if(!e)throw Error('No encontramos este título en el catálogo.');
  const title=e.title||'Anime';
  document.title=title+' | 1UP Anime';$('#title').textContent=title;
  const image=safe(e.poster||e.image||'');
  if(image)$('#poster').src=image;else $('#poster').hidden=true;
  const banner=safe(e.banner||e.poster||'');if(banner)$('#hero').style.setProperty('--banner','url("'+banner.replace(/["\\]/g,'')+'")');
  const seasons=franchiseSeasons(items,e);
  const nT=seasons.filter(s=>s.kind==='season').length,nM=seasons.filter(s=>s.kind==='movie').length;
  const seasonsTxt=seasons.length>1?[nT?nT+(nT>1?' temporadas':' temporada'):'',nM?nM+(nM>1?' películas':' película'):''].filter(Boolean).join(' · '):'';
  const meta=[e.type||(e.format==='TV'?'Serie':e.format),e.year,seasonsTxt,e.episodes?(e.episodes+(e.episodes===1?' episodio':' episodios')):'',e.averageScore?'★ '+(e.averageScore/10).toFixed(1):''].filter(Boolean);
  $('#meta').innerHTML=meta.map(x=>'<span>'+esc(x)+'</span>').join('');
  $('#synopsis').textContent=summarize(e.description_es||e.description||'Sinopsis no disponible.');
  const off=$('#official');if(off){off.hidden=true;off.style.display='none'}
  $('#providers').closest('section').hidden=true;
  $('#details').innerHTML='<p><strong>Formato:</strong> '+esc(e.format||'No disponible')+'</p><p><strong>Estado:</strong> '+esc(e.status_label||e.status||'No disponible')+'</p><p><strong>Géneros:</strong> '+esc((e.genres||[]).join(', ')||'No disponibles')+'</p>'+(e.studios?'<p><strong>Estudio:</strong> '+esc(e.studios)+'</p>':'');
  try{await window.OneUpEpisodePlayer?.show({id:raw,title,image,banner,format:e.format||'',episodes:e.episodes||0,episodes_total:e.episodes_total||e.episodes||0,...(seasons.length>1?{seasons}:{})})}catch(err){console.warn('1UP player:',err)}
 }catch(error){console.error('1UP watch page:',error);fail(error.message||'Error de conexión.')}
}
const relQuery='query($id:Int,$mal:Int){Media(id:$id,idMal:$mal,type:ANIME,isAdult:false){id idMal format episodes title{english romaji} relations{edges{relationType node{id}}}}}';
const relNodeQuery='query($id:Int){Media(id:$id,type:ANIME,isAdult:false){id idMal format episodes title{english romaji} relations{edges{relationType node{id}}}}}';
async function gql(q,variables){const r=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query:q,variables})});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();return j.data?.Media}
async function anilistSeasons(){
 try{
  const first=await gql(relQuery,isMal?{mal:Number(id)}:{id:Number(id)});
  if(!first)return [];
  const mk=n=>({id:isMal?(n.idMal?'mal-'+n.idMal:'al-'+n.id):'al-'+n.id,title:n.title?.english||n.title?.romaji||'Anime',format:n.format||'TV',kind:kindOfItem({format:n.format||'TV'}),episodes:n.episodes||0,episodes_total:n.episodes||0,image:'',banner:''});
  const chain=[mk(first)];
  let back=first,g=0;
  while(back&&g++<10){const e=(back.relations?.edges||[]).find(x=>x.relationType==='PREQUEL');if(!e)break;const n=await gql(relNodeQuery,{id:e.node.id});if(!n||!['TV','ONA','MOVIE','SPECIAL','OVA','TV_SHORT'].includes(n.format))break;chain.unshift(mk(n));back=n}
  let fwd=first;g=0;
  while(fwd&&g++<10){const e=(fwd.relations?.edges||[]).find(x=>x.relationType==='SEQUEL');if(!e)break;const n=await gql(relNodeQuery,{id:e.node.id});if(!n||!['TV','ONA','MOVIE','SPECIAL','OVA','TV_SHORT'].includes(n.format))break;chain.push(mk(n));fwd=n}
  if(chain.length<2)return [];
  const baseTitle=(chain.find(s=>s.format==='TV')||chain[0]).title;let tn=0;
  chain.forEach(s=>{if(s.format==='TV'){tn++;s.kind='season';s.label='Temporada '+tn}else{const suf=titleSuffix(s.title,baseTitle);s.label=(KIND_LABEL[s.kind]||'Especial')+(suf&&suf.toLowerCase()!==String(s.title).toLowerCase()?' · '+suf:'')}});
  for(const s of chain)s.seasons=chain;
  return chain;
 }catch{return []}
}
async function load(){
 if(raw.startsWith('jk-')){loadJk();return}
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
  const meta=[a.format==='TV'?'Serie':a.format==='MOVIE'?'Película':a.format,a.seasonYear||a.startDate?.year,a.episodes?(a.episodes+(a.episodes===1?' episodio':' episodios')):'',a.averageScore?'★ '+(a.averageScore/10).toFixed(1):''].filter(Boolean);
  $('#meta').innerHTML=meta.map(x=>'<span>'+esc(x)+'</span>').join('');
  spanishSummary(a).then(t=>{$('#synopsis').textContent=t});
  const site=safe(a.siteUrl);if(site){$('#official').href=site;$('#official').hidden=false}
  renderTrailer(a);
  const bySite=new Map();
  for(const x of (a.externalLinks||[])){if(x.type!=='STREAMING'||!safe(x.url))continue;const k=String(x.site||'').trim().toLowerCase();if(k&&!bySite.has(k))bySite.set(k,x)}
  if(!bySite.has('crunchyroll')&&VERIFIED_CRUNCHYROLL['mal-'+a.idMal])bySite.set('crunchyroll',{site:'Crunchyroll',url:VERIFIED_CRUNCHYROLL['mal-'+a.idMal],type:'STREAMING'});
  let providers=['netflix','crunchyroll'].map(k=>bySite.get(k)).filter(Boolean);
  if(!providers.length){const free=['youtube','tubi','pluto tv','retrocrush','hoopla'].map(k=>bySite.get(k)).find(Boolean);if(free)providers=[free]}
  $('#providers').innerHTML=providers.length?providers.map(x=>'<a href="'+esc(safe(x.url))+'" target="_blank" rel="noopener noreferrer">'+esc(x.site||'Plataforma oficial')+' <svg class="ext-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9.2 9.2M19.2 13.5V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19V7a1.6 1.6 0 0 1 1.6-1.6H11"/></svg></a>').join(''):'';$('#providers').closest('section').hidden=!providers.length;
  $('#details').innerHTML='<p><strong>Formato:</strong> '+esc(a.format||'No disponible')+'</p><p><strong>Estado:</strong> '+esc(a.status||'No disponible')+'</p><p><strong>Géneros:</strong> '+esc((a.genres||[]).join(', ')||'No disponibles')+'</p>';
  const seasons=await anilistSeasons();
  try{await window.OneUpEpisodePlayer?.show({id:raw,title,image,banner:banner||'',format:a.format||'',episodes:a.episodes||0,episodes_total:a.episodes||0,...(seasons.length>1?{seasons}:{})})}catch(e){console.warn('1UP player:',e)}
 }catch(error){console.error('1UP watch page:',error);fail(error.message||'Error de conexión.')}
}
load();
})();
