/* 1UP: the depth switch must remain accessible on desktop and iPhone.
 * Never move it inside the mobile drawer: the drawer starts hidden,
 * sometimes mounts after DOMContentLoaded, and made the switch inaccessible.
 */
document.addEventListener('DOMContentLoaded',()=>{
 const button=document.getElementById('depth-toggle');
 if(!button||typeof DepthEngine==='undefined')return;
 button.hidden=false;
 button.removeAttribute('inert');
 button.setAttribute('aria-label','Activar modo profundidad');
 function sync(enabled){
  button.classList.toggle('active',enabled);
  button.setAttribute('aria-pressed',String(enabled));
  button.title=enabled?'Desactivar modo profundidad':'Activar modo profundidad';
  button.setAttribute('aria-label',button.title);
 }
 sync(DepthEngine.isEnabled());
 button.addEventListener('click',()=>sync(DepthEngine.toggle()));
 document.addEventListener('depth-mode-changed',event=>sync(Boolean(event.detail?.enabled)));
});
