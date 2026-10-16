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
let all=[],byId=new Map(),group={},licensed=null,activeRoute='',activeId='',activeEpisode=0,renderSeq=0;
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
function showCommon(){home.hidden=false;if(browse&&activeRoute!==''&&activeRoute!=='inicio')browse.hidden=false;root.hidden=true}
function setPage(markup,route){
 home.hidden=true;if(browse)browse.hidden=true;root.hidden=false;
 root.innerHTML='<div class="km-page-inner">'+markup+'</div>';
 document.querySelectorAll('.km-nav [data-route],.km-nav [data-km-view]').forEach(n=>{
 n.classList.toggle('active',n.dataset.kmView===route)
 });
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
async function mediaManifest(){
 if(licensed)return licensed;
 try{const res=await fetch('./data/licensed-media.json',{cache:'no-cache'});if(!res.ok)throw Error('Sin manifiesto');const obj=await res.json();licensed=obj?.entries||{}}
 catch{licensed={}}return licensed;
}
function sourcesFrom(ep){
 const data=Array.isArray(ep?.sources)?ep.sources:[{src:ep?.src,mime:ep?.mime,name:'Fuente principal'}];
 return data.filter(x=>x&&x.rights!=='unlicensed').map(s=>{
 if(s.mode==='official_embed'&&s.provider==='youtube'&&s.rights==='authorized'&&/^[\w-]{11}$/.test(s.videoId||''))return {name:s.name||'YouTube',kind:'youtube',id:s.videoId,language:s.language||'',quality:s.quality||''};
 const link=uri(s.src||s.url);
 if(!link)return null;
 const mime=['video/mp4','video/webm','application/vnd.apple.mpegurl'].includes(s.mime)?s.mime:(link.split('?')[0].endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp4');
 return {name:s.name||'Servidor',kind:'video',link,mime,language:s.language||ep.language||'',quality:s.quality||'',subtitles:uri(ep.subtitles_es||'')};
 }).filter(Boolean).slice(0,8)
}
function playerFrame(a,movie,entry){
 const ep=entry?.episodes||[];
 if(!ep.length)return detailPage(a,movie)+'<section class="km-block"><h2>Reproductor integrado</h2><div class="km-no-media"><span>▷</span><strong>Sin fuentes integradas configuradas</strong><p>Esta serie no dispone de episodios autorizados en nuestro manifiesto. No simulamos reproducciones inexistentes.</p></div><button class="km-second-button" data-km-open="'+esc(a.id)+'">Ver ficha y comentarios</button></section>';
 activeEpisode=Math.min(activeEpisode,ep.length-1);const episode=ep[activeEpisode];
 const servers=sourcesFrom(episode);
 const currentSeason=Number(episode.season)||1;const seasons=[...new Set(ep.map(x=>Number(x.season)||1))].sort((a,b)=>a-b);
 const buttons=ep.map((x,i)=>({x,i})).filter(item=>(Number(item.x.season)||1)===currentSeason).map(item=>'<button data-km-episode="'+item.i+'" class="'+(item.i===activeEpisode?'active':'')+'">'+esc(String(item.x.number||item.i+1))+'</button>').join('');
 const seasonOptions=seasons.map(x=>'<option value="'+x+'" '+(x===currentSeason?'selected':'')+'>Temporada '+x+'</option>').join('');
 const select='<div class="km-episode-list"><label for="km-season-select">Temporadas disponibles</label><select id="km-season-select">'+seasonOptions+'</select><b>Episodios disponibles</b><div class="km-episode-buttons">'+buttons+'</div></div>';
 const serverMarkup=servers.length?'<div class="km-server-list">'+servers.map((s,i)=>'<button type="button" data-km-server="'+i+'" class="'+(i===0?'active':'')+'">'+esc(s.name)+' <small>'+esc(s.language)+'</small></button>').join('')+'</div>':'';
 const player='<div id="km-play-stage" class="km-play-stage"></div>';
 return heading(movie?'Reproducir película':'Reproducir episodio',a.title)+'<div class="km-watch-layout"><div><div class="km-video-holder">'+player+'</div>'+serverMarkup+'<p class="km-muted">Solo fuentes de video declaradas y autorizadas. La compatibilidad HLS depende del navegador.</p></div><aside>'+select+'<button class="km-second-button" data-km-open="'+esc(a.id)+'">Abrir comentarios y ficha ↗</button></aside></div>';
}
function mountPlayer(a){
 const episodes=licensed?.[a.id]?.episodes||[];const ep=episodes[activeEpisode];
 const servers=sourcesFrom(ep);const host=$('#km-play-stage');if(!host)return;
 const selected=Number(host.dataset.server||0);const s=servers[selected]||servers[0];
 if(!s){host.innerHTML='<div class="km-no-media"><span>▷</span><strong>No hay video compatible para este episodio.</strong></div>';return}
 if(s.kind==='youtube'){
  host.innerHTML='<div class="km-embed-wrap"><iframe src="https://www.youtube-nocookie.com/embed/'+esc(s.id)+'" title="Video autorizado" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture; fullscreen"></iframe></div>';
  return;
 }
 const tag='<video id="km-video" controls playsinline preload="metadata" crossorigin="anonymous"><source src="'+esc(s.link)+'" type="'+esc(s.mime)+'">'+(s.subtitles?'<track kind="subtitles" src="'+esc(s.subtitles)+'" srclang="es" label="Español">':'')+'</video>';
 host.innerHTML=tag+'<p id="km-player-status" role="status">Esperando disponibilidad del video.</p>';
 const v=$('#km-video');const st=$('#km-player-status');
 v.addEventListener('loadedmetadata',()=>{st.textContent='Video listo · '+esc(s.quality||'calidad automática')});
 v.addEventListener('error',()=>{st.textContent='No se pudo reproducir esta fuente en este navegador.'});
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
 if(route==='series'||route==='movie-single'){const a=info(id)||getIdList(route)[0];if(a)activeId=a.id;return detailPage(a,route==='movie-single')}
 return errorPage('La página solicitada no existe.');
}
async function render(){
 const hash=decodeURIComponent(location.hash.slice(1));if(!hash.startsWith('km/')){
 activeRoute='';root.hidden=true;return;
 }
 const [,route,...parts]=hash.split('/'),id=parts.join('/');
 activeRoute=route;activeId=id;const serial=++renderSeq;
 if(route==='series-play'||route==='movie-play'){
 const a=info(id);if(!a){setPage(errorPage('No existe este título en el catálogo.'),route);return}
 activeEpisode=0;const items=await mediaManifest();if(serial!==renderSeq)return;
 setPage(playerFrame(a,route==='movie-play',items[a.id]),route);mountPlayer(a);
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
 const response=fetch('./data/catalog.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(j=>{
 group=j?.groups||{};all=catalogItems();byId=new Map(all.map(a=>[a.id,a]));
 window.OneUpCatalog?.register?.(all);
 }).catch(()=>{all=[];group={}}).then(render);
 window.addEventListener('hashchange',render);
 document.addEventListener('click',e=>{
 const open=e.target.closest('[data-km-open]');if(open){e.preventDefault();window.OneUpCatalog?.open?.(open.dataset.kmOpen);return}
 const seasonPick=e.target.closest('#km-season-select');if(seasonPick&&activeId)return;
 const ep=e.target.closest('[data-km-episode]');if(ep&&activeId){
   activeEpisode=Number(ep.dataset.kmEpisode);const a=info(activeId);
   setPage(playerFrame(a,activeRoute==='movie-play',licensed[a.id]),activeRoute);mountPlayer(a);return;
 }
 const server=e.target.closest('[data-km-server]');if(server){
   $('#km-play-stage').dataset.server=server.dataset.kmServer;
   document.querySelectorAll('[data-km-server]').forEach(b=>b.classList.toggle('active',b===server));
   mountPlayer(info(activeId));return;
 }
 if(e.target.closest('#km-auth-open')){const auth=$('#auth-open');if(auth)auth.click();return}
 const mainRoute=e.target.closest('[data-route]');if(mainRoute&&!root.hidden){root.hidden=true;activeRoute='';}
 });
 document.addEventListener('change',e=>{
 if(e.target.id==='km-season-select'&&activeId){
   const episodes=licensed?.[activeId]?.episodes||[];
   const found=episodes.findIndex(x=>(Number(x.season)||1)===Number(e.target.value));
   if(found<0)return;
   activeEpisode=found;const a=info(activeId);
   setPage(playerFrame(a,activeRoute==='movie-play',licensed[activeId]),activeRoute);mountPlayer(a);
 }
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
