/* 1UP owner rule (Dexter): the 3D/depth mode is ON by default and the
 * switch stays hidden — it must never appear on the page. */
document.addEventListener('DOMContentLoaded',()=>{
 const button=document.getElementById('depth-toggle');
 if(!button||typeof DepthEngine==='undefined')return;
 button.hidden=true;
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
