/* Menú de descubrimiento de 1UP. No cuenta usuarios ni presupone reproducción. */
(() => {
 'use strict';
 const root=document.getElementById('oneup-finale-deck');
 if(!root)return;
 const status=root.querySelector('[data-finale-status]');
 const kinds=new Set(['inicio','temporada','programacion','catalogo','milista']);
 const updateRoute=()=>{
  const name=location.hash.replace(/^#/,'')||'inicio';
  root.querySelectorAll('[data-route]').forEach(item=>{
   if(kinds.has(name)&&item.dataset.route===name)item.setAttribute('aria-current','page');
   else item.removeAttribute('aria-current');
  });
 };
 updateRoute();
 window.addEventListener('hashchange',updateRoute);
 root.addEventListener('click',event=>{
  if(event.target.closest('[data-route]'))queueMicrotask(updateRoute);
 });
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4500);
 (async()=>{
  try{
   const response=await fetch('./data/catalog.json',{cache:'no-cache',signal:controller.signal});
   if(!response.ok)throw Error('Catálogo sin conexión');
   const data=await response.json();
   if(!data.groups||!data.updated)throw Error('Snapshot incompleto');
   const unique=new Set();
   for(const entries of Object.values(data.groups)){
    if(!Array.isArray(entries))continue;
    for(const item of entries)if(item&&typeof item.id==='string')unique.add(item.id);
   }
   const stamp=new Date(data.updated);
   if(!Number.isFinite(stamp.getTime())||!unique.size)throw Error('Catálogo sin registros');
   const updated=new Intl.DateTimeFormat('es',{day:'numeric',month:'short',year:'numeric'}).format(stamp);
   status.textContent='Selección de '+unique.size+' fichas · datos AniList · actualizado '+updated;
  }catch{
   status.textContent='Explora el catálogo y la programación disponibles; la última actualización no se pudo comprobar.';
  }finally{clearTimeout(timeout)}
 })();
})();
