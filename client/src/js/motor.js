/* Public, read-only ONEUP diagnostic dashboard.
 * GitHub permissions are enforced by GitHub; this page never accepts credentials.
 */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const spanishState={
 conectada:'Conectada',en_espera:'Programada',error:'Error',desactualizada:'Datos desactualizados',
 desactivada:'Desactivada',sin_contenido_autorizado:'Sin videos autorizados',
 sin_paginas_verificadas:'Sin páginas',sin_trailers_disponibles:'Sin tráilers',
 pendiente:'Pendiente',needs_configuration:'Falta configuración',
 requires_permission:'Requiere autorización',correcto:'Correcto',atencion:'Atención',fallo:'Fallo',
 parcial:'Parcial',correcta:'Correcta'
};
const nice=key=>spanishState[key]||key||'Sin datos';
const classOf=value=>['conectada','correcto','correcta','ok'].includes(value)?'ok':
 ['error','fallo','critical'].includes(value)?'critical':'warning';
function datetime(raw){
 if(!raw)return 'No registrada';
 const d=new Date(raw);
 if(Number.isNaN(+d))return 'No registrada';
 return new Intl.DateTimeFormat('es',{dateStyle:'medium',timeStyle:'short'}).format(d);
}
async function get(path){
 const ctrl=new AbortController();
 const timer=setTimeout(()=>ctrl.abort(),7500);
 try{
  const r=await fetch('./'+path,{cache:'no-store',signal:ctrl.signal});
  if(!r.ok)throw Error('HTTP '+r.status);
  return await r.json();
 }finally{clearTimeout(timer)}
}
function pill(txt,type){return '<span class="motor-state '+classOf(type)+'">'+esc(txt)+'</span>'}
function number(n){return Number.isFinite(Number(n))?Number(n).toLocaleString('es'):'—'}
function renderStats(sync,health){
 $('#motor-health').textContent=nice(health.verdict);
 $('#motor-last-guard').textContent='Revisado: '+datetime(health.updatedAt)+' · '+health.totalChecks+' pruebas';
 $('#motor-anime').textContent=number(sync.records?.anime);
 $('#motor-episodes').textContent=number(sync.records?.episodes);
 $('#motor-playback').textContent=number(sync.records?.sources);
}
function renderProviders(sync,history){
 const historyRows=history.items||[];
 let content=(sync.providers||[]).map(p=>{
  const last=historyRows.find(x=>x.providerId===p.id&&x.result==='success');
  return '<article class="motor-provider"><div class="motor-provider-head"><h3>'+esc(p.name||p.id)+'</h3>'+
   pill(nice(p.state),p.state)+'</div>'+
   '<p>'+esc(p.mode||'Adaptador')+' · '+esc(p.sourceType||'')+(p.error?' · '+esc(p.error):'')+'</p>'+
   '<div class="motor-provider-footer"><span>Última ejecución: '+datetime(p.runAt||p.lastRunAt)+'</span>'+
   '<span>Detectados: '+number(p.runAt?p.observed:last?.observed)+'</span>'+
   '<span>Nuevos: '+number(p.runAt?p.created:last?.created)+'</span>'+
   '<span>Frecuencia: '+esc(p.intervalHours||'?')+' horas</span></div></article>';
 }).join('');
 for(const p of sync.externalIntegrations||[]){
  content+='<article class="motor-provider"><div class="motor-provider-head"><h3>'+esc(p.displayName||p.id)+'</h3>'+pill(nice(p.status),p.status)+'</div><p>'+esc(p.reason||'Se necesita configurar este proveedor')+'</p></article>';
 }
 $('#motor-providers').innerHTML=content||'<p class="motor-loading">Todavía no se ha publicado el estado de los proveedores.</p>';
}
function renderHealth(d){
 const items=d.checks||[];
 const priority=x=>x.level==='critical'?0:x.level==='warning'?1:x.level==='info'?2:3;
 const sorted=[...items].sort((a,b)=>priority(a)-priority(b));
 const render=x=>'<article class="motor-check">'+pill(x.level==='critical'?'Fallo':x.level==='warning'?'Atención':'✓',x.level)+'<div><strong>'+esc(x.message)+'</strong><small>'+esc(x.id)+'</small></div></article>';
 const main=sorted.slice(0,12).map(render).join('');
 const extra=sorted.length>12?'<details><summary>Mostrar las otras '+(sorted.length-12)+' comprobaciones</summary><div class="motor-checks">'+sorted.slice(12).map(render).join('')+'</div></details>':'';
 $('#motor-checks').innerHTML=main+extra||'<p class="motor-loading">No hay comprobaciones registradas.</p>';
}
function renderHistory(h){
 const rows=(h.items||[]).slice(0,24);
 $('#motor-history').innerHTML=rows.map(x=>'<article class="motor-event"><div><h3>'+esc(x.providerId)+'</h3>'+
  '<p>'+esc(x.detail||x.message||'Sincronización')+
  ' · Revisados: '+number(x.observed)+' · Nuevos: '+number(x.created)+'</p></div>'+
  '<div>'+pill(x.result==='success'?'Correcto':'Error',x.result==='success'?'ok':'critical')+
  '<time datetime="'+esc(x.at)+'">'+datetime(x.at)+'</time></div></article>').join('')||
  '<p class="motor-loading">Todavía no hay sincronizaciones guardadas.</p>';
}
async function refresh(){
 const button=$('#motor-refresh');
 button.disabled=true;$('#motor-status').textContent='Consultando informes públicos de GitHub Pages…';
 try{
  const [sync,hist,health]=await Promise.all([
   get('data/dexter/status.json'),get('data/dexter/history.json'),get('data/guard/status.json')
  ]);
  renderStats(sync,health);renderProviders(sync,hist);renderHealth(health);renderHistory(hist);
  $('#motor-status').textContent='Datos leídos correctamente · '+datetime(new Date().toISOString())+
   '. Los cambios pueden tardar en llegar desde GitHub Pages.';
 }catch(error){
  $('#motor-status').textContent='No se pudieron recuperar todos los informes: '+String(error?.message||error)+
   '. Puedes consultar el último trabajo de ONEUP Self Healing en GitHub Actions.';
 }finally{button.disabled=false}
}
document.addEventListener('DOMContentLoaded',()=>{
 $('#motor-refresh').addEventListener('click',refresh);
 refresh();
});
})();