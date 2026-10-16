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
 section.setAttribute('aria-label','Tráilers oficiales disponibles en la ficha del anime');
 section.innerHTML=
  '<header class="oneup-studio-trailer-heading"><div><span>ESTRENOS / AVANCES</span><h2>EL PRÓXIMO <em>ESTRENO.</em></h2></div>'+
  '<p>Una selección de tráilers enlazados desde AniList. La reproducción abre la ficha del anime y requiere que el visitante la elija.</p></header>'+
  '<div class="oneup-studio-trailer-grid">'+
   '<button class="oneup-studio-trailer-main" type="button" data-details="'+esc(preview.id)+'" aria-label="Ver ficha y tráiler de '+esc(preview.title)+'">'+
    '<img alt="" loading="lazy" src="'+esc(preview.banner||preview.image)+'" referrerpolicy="no-referrer">'+
    '<span class="oneup-studio-trailer-scrim"></span>'+
    '<span class="oneup-studio-trailer-main-copy"><small>TRÁILER OFICIAL DISPONIBLE</small><strong>'+esc(preview.title)+'</strong><em>Ver ficha y tráiler ↗</em></span>'+
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