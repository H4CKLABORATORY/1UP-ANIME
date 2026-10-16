/* Kokomi watch community — isolated episode discussion UI
 * Reuses the same public Firebase backend as 1UP's detail dialog.
 * No fake comments; no posting when Firebase has not been configured.
 */
(()=>{
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const backend=()=>window.OneUpSocialBackend;
let unsub=null,serial=0,active=null,thread=1;
const $=s=>document.querySelector(s);
function cleanup(){
 serial++;
 if(typeof unsub==='function'){try{unsub()}catch{}}
 unsub=null;active=null;
}
function nick(){try{return sessionStorage.getItem('oneup_pseudonym')||''}catch{return ''}}
function saveNick(value){try{sessionStorage.setItem('oneup_pseudonym',value)}catch{}}
function setStatus(message){const node=$('#km-watch-status');if(node)node.textContent=message}
function formatDate(t){
 const date=t?.toDate?.();
 return date?new Intl.DateTimeFormat('es',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(date):'';
}
function drawList(items){
 const node=$('#km-watch-comment-list');if(!node)return;
 node.innerHTML=items.length?items.map(c=>
 '<article class="km-watch-comment"><div class="km-watch-avatar" aria-hidden="true">'+esc((c.displayName||'?').slice(0,1).toUpperCase())+'</div>'+
 '<div class="km-watch-comment-text"><div class="km-comment-by"><strong>'+esc(c.displayName||'Fan del anime')+'</strong>'+
 (c.owner?'<span>✦ Equipo 1UP</span>':c.verified?'<span>Verificado</span>':'')+
 '<small>'+esc(formatDate(c.createdAt))+'</small></div><p>'+esc(c.text||'')+'</p>'+
 '<button type="button" data-km-report="'+esc(c.id||'')+'">Reportar</button></div></article>').join('')
 :'<p class="km-watch-muted">Todavía no hay comentarios para este episodio.</p>';
}
function currentEpisodeId(season,number){
 // Season 1 preserves existing public thread numbering; later seasons
 // use a unique numeric namespace compatible with the 1UP backend limit 9999.
 const s=Math.max(1,Math.min(9,Number(season)||1));
 const n=Math.max(1,Math.min(999,Number(number)||1));
 return (s-1)*1000+n;
}
function subscribe(){
 const old=unsub;if(typeof old==='function')old();unsub=null;
 const id=++serial;
 if(!backend()?.enabled()){
  const list=$('#km-watch-comment-list');
  if(list)list.innerHTML='<p class="km-watch-muted">Los comentarios públicos estarán disponibles cuando el propietario configure Firebase.</p>';
  setStatus('Comentarios en espera de conexión con la comunidad.');
  return;
 }
 const list=$('#km-watch-comment-list');
 if(list)list.innerHTML='<p class="km-watch-muted">Cargando conversación…</p>';
 setStatus('Los comentarios son públicos. Evita información personal y spoilers.');
 backend().subscribeEpisode(active.id,thread,items=>{
  if(id!==serial)return;drawList(items);
 },error=>{
  if(id!==serial)return;
  if(list)list.innerHTML='<p class="km-watch-muted">'+esc(error)+'</p>';
 }).then(stop=>{
  if(id===serial)unsub=stop;else if(typeof stop==='function')stop();
 }).catch(error=>{
  if(id!==serial)return;
  if(list)list.innerHTML='<p class="km-watch-muted">'+esc(backend().maskError(error))+'</p>';
 });
}
function mount({anime,episode,season,episodeOptions}){
 cleanup();if(!anime?.id)return;
 const container=$('#km-watch-community');if(!container)return;
 active=anime;
 let options=Array.isArray(episodeOptions)?episodeOptions:[];
 if(!options.length){
  const count=Math.max(1,Math.min(120,Number(anime.episodes)||1));
  options=Array.from({length:count},(_,i)=>({season:1,number:i+1}));
 }
 const selectedSeason=Number(season)||1,selectedNum=Number(episode)||1;
 thread=currentEpisodeId(selectedSeason,selectedNum);
 const unique=new Set();
 const opts=options.filter(x=>{
  const k=currentEpisodeId(x.season,x.number);
  if(unique.has(k))return false;unique.add(k);return true;
 }).slice(0,120);
 container.innerHTML='<section class="km-watch-discussion" aria-label="Comentarios del episodio">'+
 '<div class="km-discussion-title"><div><span class="km-eyebrow">1UP ANIME / COMUNIDAD</span><h2>Comentarios del episodio</h2>'+
 '<p>Habla con otros fans sin salir del reproductor.</p></div>'+
 '<label>Capítulo <select id="km-watch-select" aria-label="Capítulo para comentarios">'+
 opts.map(x=>'<option value="'+currentEpisodeId(x.season,x.number)+'"'+(currentEpisodeId(x.season,x.number)===thread?' selected':'')+'>'+
 'T'+esc(x.season||1)+' · Episodio '+esc(x.number||1)+'</option>').join('')+'</select></label></div>'+
 '<div id="km-watch-comment-list" class="km-watch-comments" aria-live="polite"></div>'+
 '<form id="km-watch-comment-form" class="km-watch-form">'+
 '<label for="km-watch-name">Tu nombre temporal</label><input id="km-watch-name" type="text" minlength="3" maxlength="25" required autocomplete="nickname" placeholder="Tu apodo" value="'+esc(nick())+'">'+
 '<label for="km-watch-text">Tu comentario</label><textarea id="km-watch-text" rows="3" minlength="2" maxlength="900" required placeholder="Comenta sin compartir spoilers…"></textarea>'+
 '<div class="km-watch-submit"><small>Los comentarios son públicos y están sujetos a moderación.</small><button type="submit" id="km-watch-publish">Publicar comentario ↗</button></div>'+
 '<p role="status" id="km-watch-status"></p></form></section>';
 const selector=$('#km-watch-select');
 if(!opts.some(x=>currentEpisodeId(x.season,x.number)===thread)&&opts.length){
  thread=currentEpisodeId(opts[0].season,opts[0].number);
  selector.value=String(thread);
 }
 selector?.addEventListener('change',()=>{
  thread=Number(selector.value)||1;subscribe();
 });
 const form=$('#km-watch-comment-form');
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!backend()?.enabled()){setStatus('Firebase aún no está configurado para publicar.');return}
  const username=$('#km-watch-name').value.trim(),body=$('#km-watch-text').value.trim();
  if(username.length<3||body.length<2){setStatus('Escribe un apodo y un comentario válido.');return}
  const button=$('#km-watch-publish'),target=thread,current=active.id;
  button.disabled=true;saveNick(username);setStatus('Enviando…');
  try{
   await backend().sendEpisodeComment(current,target,username,body);
   if(!form.isConnected||active?.id!==current)return;
   $('#km-watch-text').value='';setStatus('Comentario enviado. Se mostrará según la moderación del servicio.');
  }catch(error){if(form.isConnected)setStatus(backend().maskError(error))}
  finally{if(form.isConnected)button.disabled=false}
 });
 container.addEventListener('click',async e=>{
  const button=e.target.closest('[data-km-report]');
  if(!button||!backend()?.enabled()||!active)return;
  if(!confirm('¿Enviar este comentario a moderación?'))return;
  try{
   await backend().report('episodeComment',active.id+'_ep_'+thread+'/'+button.dataset.kmReport,'Contenido inapropiado');
   setStatus('Reporte enviado.');
  }catch(error){setStatus(backend().maskError(error))}
 });
 subscribe();
}
window.OneUpKokomiWatch={mount,unmount:cleanup};
window.addEventListener('pagehide',cleanup);
})();