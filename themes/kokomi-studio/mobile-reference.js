/* 1UP ANIME — drawer editorial solo para la vista previa Kokomi.
   No modifica auth, player, proveedores, catálogo ni estado de producción. */
(()=>{
'use strict';
if(document.body.dataset.kokomiReference!=='yes')return;
const header=document.querySelector('.header-inner'),brand=header?.querySelector('.brand');
if(!header||!brand)return;
const menu=document.createElement('button');
menu.type='button';menu.className='preview-kokomi-menu-button';menu.setAttribute('aria-label','Abrir menú lateral');menu.setAttribute('aria-expanded','false');menu.textContent='☰';header.insertBefore(menu,brand);
const overlay=document.createElement('div');overlay.className='preview-kokomi-overlay';overlay.hidden=true;
const drawer=document.createElement('aside');drawer.className='preview-kokomi-drawer';drawer.setAttribute('aria-label','Navegación del prototipo');drawer.setAttribute('aria-hidden','true');
const items=[['⌂','Inicio','inicio'],['♛','Top Anime','populares'],['▤','Películas','peliculas'],['♥','Géneros','catalogo'],['▣','Actualizados','recientes'],['◉','En emisión','temporada'],['⌛','Próximos','programacion'],['▦','Calendario','programacion'],['☆','Mi lista','milista']];
drawer.innerHTML='<div class="drawer-head"><strong>1UP ANIME ✦</strong><button type="button" class="drawer-close" aria-label="Cerrar menú">✕</button></div><nav>'+items.map(([icon,title,route])=>'<button type="button" data-route="'+route+'"><span class="nav-icon" aria-hidden="true">'+icon+'</span>'+title+'</button>').join('')+'<a href="./comunidad.html"><span class="nav-icon" aria-hidden="true">✦</span>Comunidad</a></nav><div class="drawer-footer">1UP ANIME · VISTA PREVIA<br>Tu universo, tus historias.</div>';
document.body.append(overlay,drawer);
let previousFocus=null;
function open(){previousFocus=document.activeElement;drawer.classList.add('open');overlay.hidden=false;drawer.setAttribute('aria-hidden','false');menu.setAttribute('aria-expanded','true');drawer.querySelector('.drawer-close').focus({preventScroll:true})}
function close(){drawer.classList.remove('open');overlay.hidden=true;drawer.setAttribute('aria-hidden','true');menu.setAttribute('aria-expanded','false');if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true})}
menu.addEventListener('click',open);
drawer.querySelector('.drawer-close').addEventListener('click',close);
overlay.addEventListener('click',close);
drawer.addEventListener('click',e=>{if(e.target.closest('[data-route],a'))close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('open')){close();e.stopPropagation()}});
})();