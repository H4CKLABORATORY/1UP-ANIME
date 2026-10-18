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
