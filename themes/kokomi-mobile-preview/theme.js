/* 1UP Anime — isolated Kokomi-inspired preview controls.
   Preserves the existing studio.js data, authentication, favorites and search.
   Does not load or reproduce any TemplateMonster source code or media.
*/
(()=>{
'use strict';
document.addEventListener('DOMContentLoaded',()=>{
 const body=document.body, header=document.querySelector('.header-inner');
 if(!header||!body.classList.contains('kokomi-mobile-reference'))return;
 // Use physical layout width too: mobile emulation can expose a CSS media
 // viewport wider than the visible screen when legacy rails overflow.
 function fitAnimeRails(){
   const docWidth=document.documentElement.clientWidth||window.innerWidth;
   const visualWidth=window.visualViewport?.width||docWidth;
   const width=Math.min(docWidth,visualWidth);
   const count=width<=780?2:width<=1100?4:5;
   for(const el of document.querySelectorAll('#trending-rail,#season-rail,#recent-rail,#movies-rail,#browse-grid')){
     el.style.setProperty('grid-template-columns','repeat('+count+',minmax(0,1fr))','important');
     el.style.setProperty('grid-auto-flow','row','important');
     el.style.setProperty('grid-auto-columns','minmax(0,1fr)','important');
   }
 }
 fitAnimeRails();
 window.addEventListener('resize',fitAnimeRails,{passive:true});
 window.visualViewport?.addEventListener('resize',fitAnimeRails,{passive:true});
 // If the remote poster host is unavailable, show a branded poster rather
 // than the browser's broken-image icon or overflowing alt text.
 document.addEventListener('error',e=>{
   const img=e.target;
   if(!(img instanceof HTMLImageElement)||!img.matches('.anime-art img,.km-poster-art img'))return;
   img.style.display='none';
   const frame=img.parentElement;
   if(frame&&!frame.querySelector('.km-poster-fallback')){
     const fallback=document.createElement('span');fallback.className='km-poster-fallback';
     fallback.textContent='1UP ANIME';frame.prepend(fallback);
   }
 },true);

 const toggle=document.createElement('button');
 toggle.type='button';toggle.className='km-menu-toggle';toggle.id='km-open';
 toggle.setAttribute('aria-label','Abrir menú');toggle.setAttribute('aria-controls','km-drawer');
 toggle.setAttribute('aria-expanded','false');toggle.textContent='☰';
 header.prepend(toggle);
 const backdrop=document.createElement('div');backdrop.className='km-overlay';backdrop.id='km-overlay';backdrop.hidden=true;
 const drawer=document.createElement('aside');drawer.className='km-drawer';drawer.id='km-drawer';
 drawer.setAttribute('aria-label','Menú de 1UP Anime');drawer.setAttribute('role','navigation');drawer.hidden=true;
 const links=[
  ['⌂','Inicio','inicio'],['♛','Top anime','populares'],['♥','Géneros','catalogo'],
  ['▤','Películas','peliculas'],['▣','Actualizados','recientes'],['◴','En emisión','temporada'],
  ['⌛','Próximamente','programacion'],['☆','Mi lista','milista']
 ];
 drawer.innerHTML='<div class="km-drawer-head"><strong>1UP <b>ANIME</b></strong>'+
  '<button class="km-drawer-close" type="button" id="km-close" aria-label="Cerrar menú">✕</button></div>'+
  '<nav class="km-nav">'+links.map(([icon,label,route])=>
   '<button type="button" data-route="'+route+'"><span aria-hidden="true">'+icon+'</span>'+label+'</button>'
  ).join('')+'<a href="./comunidad.html"><span aria-hidden="true">✦</span>Comunidad</a></nav>'+
  '<div class="km-drawer-foot">1UP ANIME · DESCUBRE UN NUEVO NIVEL</div>';
 document.body.append(backdrop,drawer);
 const inputForm=document.createElement('form');
 inputForm.className='km-search-pop';inputForm.id='km-search-pop';
 inputForm.setAttribute('role','search');inputForm.hidden=true;
 inputForm.innerHTML='<input id="km-search-input" type="search" maxlength="95" aria-label="Buscar anime" placeholder="Buscar anime...">'+
  '<button type="submit">Buscar ↗</button><button type="button" id="km-search-close" aria-label="Cerrar búsqueda">✕</button>';
 body.append(inputForm);
 const qs=s=>document.querySelector(s);
 let lastFocus=null,previousOverflow='';
 function openMenu(){
   closeSearch(false);lastFocus=document.activeElement;
   previousOverflow=body.style.overflow;body.style.overflow='hidden';
   drawer.hidden=false;backdrop.hidden=false;
   toggle.setAttribute('aria-expanded','true');qs('#km-close').focus();
 }
 function closeMenu(restoreFocus=true){
   if(drawer.hidden)return;
   drawer.hidden=true;backdrop.hidden=true;body.style.overflow=previousOverflow;
   toggle.setAttribute('aria-expanded','false');
   if(restoreFocus)(lastFocus?.isConnected?lastFocus:toggle).focus();
 }
 function openSearch(){
   closeMenu(false);inputForm.hidden=false;qs('#km-search-input').focus();
 }
 function closeSearch(restoreFocus=true){
   if(inputForm.hidden)return;
   inputForm.hidden=true;if(restoreFocus)qs('#header-search')?.focus();
 }
 toggle.addEventListener('click',()=>drawer.hidden?openMenu():closeMenu());
 qs('#km-close').addEventListener('click',()=>closeMenu());
 backdrop.addEventListener('click',()=>closeMenu());
 drawer.querySelector('.km-nav').addEventListener('click',e=>{
   if(e.target.closest('button[data-route],a[data-km-view]'))closeMenu(false);
 });
 document.addEventListener('keydown',e=>{
   if(e.key==='Escape'){closeMenu();closeSearch()}
   if(e.key==='Tab'&&!drawer.hidden){
     const targets=[...drawer.querySelectorAll('button,a')].filter(x=>x.offsetParent!==null);
     const first=targets[0],last=targets.at(-1);
     if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
     else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
   }
 });
 // Capture search tap before the site's existing header button handler: retain routing.
 document.addEventListener('click',e=>{
   if(e.target.closest('#header-search')&&body.classList.contains('kokomi-mobile-reference')){
     e.preventDefault();e.stopImmediatePropagation();openSearch();
   }
 },true);
 qs('#km-search-close').addEventListener('click',()=>closeSearch());
 inputForm.addEventListener('submit',e=>{
   e.preventDefault();
   const value=qs('#km-search-input').value.trim();
   if(!value)return;
   const original=qs('#search-input'),siteForm=qs('#search-form');
   if(original&&siteForm){
     original.value=value;closeSearch(false);
     siteForm.requestSubmit();
   }
 });
 // Four quick illustrated genre tiles mirroring the rhythm of the user's recording.
 const home=qs('#home-screen');
 const explore=home?.querySelector('.explore-section');
 if(explore){
   const wrap=document.createElement('div');
   wrap.className='km-genre-row';
   for(const [name,caption] of [['Adventure','Aventura'],['Comedy','Comedia'],['Action','Acción'],['Fantasy','Fantasía']]){
     const button=document.createElement('button');button.type='button';
     button.dataset.genre=name;button.textContent=caption;
     wrap.append(button);
   }
   explore.append(wrap);
 }
 // Numbered red rank badges are decorative; actual catalog order comes from studio.js.
 const rail=qs('#trending-rail');
 if(rail){
   const apply=()=>[...rail.querySelectorAll('.anime-card')].forEach((card,i)=>{
     const art=card.querySelector('.anime-art');
     if(art&&!art.querySelector('.km-rank')){
       const badge=document.createElement('span');badge.className='km-rank';
       badge.textContent=String(i+1);badge.setAttribute('aria-hidden','true');art.append(badge);
     }
   });
   apply();
   const observer=new MutationObserver(apply);observer.observe(rail,{childList:true,subtree:false});
 }
});
})();