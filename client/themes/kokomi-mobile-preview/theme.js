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
 toggle.setAttribute('aria-expanded','false');toggle.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5h16M4 12h16M4 17.5h16"/></svg>';
 header.prepend(toggle);
 const backdrop=document.createElement('div');backdrop.className='km-overlay';backdrop.id='km-overlay';backdrop.hidden=true;
 const drawer=document.createElement('aside');drawer.className='km-drawer';drawer.id='km-drawer';
 drawer.setAttribute('aria-label','Menú de 1UP Anime');drawer.setAttribute('role','navigation');drawer.hidden=true;
 const links=[
  ['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5.2 9.4V20a1 1 0 0 0 1 1h3.8v-6h4v6h3.8a1 1 0 0 0 1-1V9.4"/></svg>','Inicio','inicio'],['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4h10v4.5a5 5 0 0 1-10 0V4Z"/><path d="M7 5.5H4.2a2.8 2.8 0 0 0 2.9 3.8M17 5.5h2.8a2.8 2.8 0 0 1-2.9 3.8M12 13.5v3M8.5 20h7M12 16.5c-1 .8-1.7 2-2 3.5h4c-.3-1.5-1-2.7-2-3.5Z"/></svg>','Top anime','populares'],['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/></svg>','Géneros','catalogo'],
  ['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5"/></svg>','Películas','peliculas'],['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3.5V8h-4.5"/></svg>','Actualizados','recientes'],['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1.7"/><path d="M8.6 15.4a4.8 4.8 0 0 1 0-6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8M5.8 18.2a9 9 0 0 1 0-12.4M18.2 5.8a9 9 0 0 1 0 12.4"/></svg>','En emisión','temporada'],
  ['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.8h17M8 3v3.8M16 3v3.8M8 14h3"/></svg>','Próximamente','programacion'],['<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11V21L12 16.8 6.5 21Z"/></svg>','Mi lista','milista']
 ];
 drawer.innerHTML='<div class="km-drawer-head"><a class="km-drawer-brand" href="#inicio" data-route="inicio">'+
  '<img src="./assets/oneup-header-letters.png" class="oneup-drawer-textmark" width="162" height="54" alt="1UP ANIME"></a>'+
  '<button class="km-drawer-close" type="button" id="km-close" aria-label="Cerrar menú"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg></button></div>'+
  '<nav class="km-nav">'+links.map(([icon,label,route])=>
   '<button type="button" data-route="'+route+'"><span aria-hidden="true">'+icon+'</span>'+label+'</button>'
  ).join('')+'<a href="./comunidad.html"><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8.5" r="3.4"/><path d="M3.2 19.8c.6-3 2.7-4.8 5.8-4.8s5.2 1.8 5.8 4.8M15.8 5.4a3.4 3.4 0 0 1 0 6.2M17.6 15.3c1.8.7 2.9 2.1 3.3 4.5"/></svg></span>Comunidad</a></nav>'+
  '<div class="km-drawer-foot">1UP ANIME · DESCUBRE UN NUEVO NIVEL</div>';
 document.body.append(backdrop,drawer);
 const inputForm=document.createElement('form');
 inputForm.className='km-search-pop';inputForm.id='km-search-pop';
 inputForm.setAttribute('role','search');inputForm.hidden=true;
 inputForm.innerHTML='<input id="km-search-input" type="search" maxlength="95" aria-label="Buscar anime" placeholder="Buscar anime...">'+
  '<button type="submit">Buscar <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9.2 9.2M19.2 13.5V19a1.6 1.6 0 0 1-1.6 1.6H5.6A1.6 1.6 0 0 1 4 19V7a1.6 1.6 0 0 1 1.6-1.6H11"/></svg></button><button type="button" id="km-search-close" aria-label="Cerrar búsqueda"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19"/></svg></button>';
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
   if(drawer.hidden || drawer.classList.contains('is-closing'))return;
   const finish = () => {
     drawer.classList.remove('is-closing');
     backdrop.classList.remove('is-closing');
     drawer.hidden=true;backdrop.hidden=true;body.style.overflow=previousOverflow;
     toggle.setAttribute('aria-expanded','false');
     if(restoreFocus)(lastFocus?.isConnected?lastFocus:toggle).focus();
   };
   if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !drawer.animate) {
     finish();
     return;
   }
   drawer.classList.add('is-closing');
   backdrop.classList.add('is-closing');
   setTimeout(finish, 180);
 }
 function openSearch(){
   closeMenu(false);inputForm.hidden=false;qs('#km-search-input').focus();
 }
 function closeSearch(restoreFocus=true){
   if(inputForm.hidden || inputForm.classList.contains('is-closing'))return;
   const finish = () => {
     inputForm.classList.remove('is-closing');
     inputForm.hidden=true;if(restoreFocus)qs('#header-search')?.focus();
   };
   if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !inputForm.animate) {
     finish();
     return;
   }
   inputForm.classList.add('is-closing');
   setTimeout(finish, 150);
 }
 toggle.addEventListener('click',()=>drawer.hidden?openMenu():closeMenu());
 qs('#km-close').addEventListener('click',()=>closeMenu());
 drawer.querySelector('.km-drawer-brand').addEventListener('click',()=>closeMenu(false));
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
