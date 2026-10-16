/* Public episode discussion — browse without login; post with temporary pseudonym.
   Firestore listener reads public data. Writes use Firebase anonymous auth + server moderation.
   No fake comments, no local-only comment masquerading as public. */
(()=>{
'use strict';
const $=q=>document.querySelector(q);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let activeAnime=null,episode=1,stop=null,requestSerial=0;
const api=()=>window.OneUpSupabaseEpisodeBackend?.enabled()
 ? window.OneUpSupabaseEpisodeBackend : window.OneUpSocialBackend;
function message(text){const s=$('#oneup-comment-state');if(s)s.textContent=text}
function textOf(t){const d=document.createElement('div');d.textContent=String(t??'');return d.textContent}
function alias(){
 try{return sessionStorage.getItem('oneup_pseudonym')||''}catch{return ''}
}
function saveAlias(n){try{sessionStorage.setItem('oneup_pseudonym',n)}catch{}}
function dateOf(value){
 const t=value?.toDate?.()||null;
 return t?new Intl.DateTimeFormat('es-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(t):'Ahora';
}
function renderComments(items){
 const target=$('#oneup-episode-comments');if(!target)return;
 target.innerHTML=items.length?items.map(x=>
 '<article class="oneup-comment"><div class="oneup-comment-avatar">'+escape((x.displayName||'?')[0]?.toUpperCase()||'?')+'</div>'+
 '<div><header><strong>'+escape(x.displayName||'Fan del anime')+'</strong>'+(!x.guest?'<span class="oneup-user-type">Cuenta</span>':'<span class="oneup-user-type">Invitado</span>')+(x.owner?'<span class="oneup-user-type">✦ Propietario 1UP</span>':x.verified?'<span class="oneup-user-type">✦ Verificado 1UP</span>':'')+
 '<small>'+dateOf(x.createdAt)+'</small></header><p>'+escape(x.text||'')+'</p><button type="button" data-report-comment="'+escape(x.id)+'">Reportar</button></div></article>'
 ).join(''):'<p class="oneup-no-comments">Todavía no hay comentarios. ¡Puedes empezar la conversación!</p>';
}
function unsubscribe(){requestSerial++;if(typeof stop==='function'){stop();stop=null}}
function subscribe(){
 unsubscribe();
 const target=$('#oneup-episode-comments');
 if(!target||!activeAnime)return;
 const token=requestSerial;
 if(!api()?.enabled()){target.innerHTML='<p class="oneup-no-comments">Los comentarios públicos estarán disponibles al conectar el servidor de la comunidad.</p>';message('Aún falta configurar el servidor público.');return}
 target.innerHTML='<p class="oneup-no-comments">Cargando comentarios públicos…</p>';
 message('Los comentarios de este episodio son públicos y pueden leerse sin registrarse.');
 api().subscribeEpisode(activeAnime,episode,items=>{if(token!==requestSerial)return;renderComments(items)},error=>{if(token!==requestSerial)return;target.innerHTML='<p class="oneup-no-comments">'+escape(error)+'</p>'})
 .then(cleanup=>{if(token===requestSerial)stop=cleanup;else if(typeof cleanup==='function')cleanup()})
 .catch(e=>{if(token!==requestSerial)return;target.innerHTML='<p class="oneup-no-comments">'+escape(api().maskError(e))+'</p>'});
}
function setSelectorEpisode(number){
 const select=$('#oneup-comment-episode');
 if(!select)return;
 select.querySelector('[data-extra-episode]')?.remove();
 if(!Array.from(select.options).some(x=>Number(x.value)===number)){
  const extra=document.createElement('option');
  extra.value=String(number);
  extra.textContent='Episodio '+number;
  extra.dataset.extraEpisode='true';
  select.appendChild(extra);
 }
 select.value=String(number);
 const input=$('#oneup-episode-number');if(input)input.value=String(number);
}
function draw(anime){
 if(!anime?.id)return;
 activeAnime=anime.id;
 episode=1;unsubscribe();
 const root=$('#oneup-comments-section');if(!root)return;
 const total=Number(anime.episodes)||0;
 const max=total>0?Math.min(9999,Math.max(1,total)):9999;
 root.innerHTML='<div class="oneup-discussion-head"><div><span class="micro">1UP ANIME · CONVERSACIÓN</span><h3>COMENTARIOS DEL EPISODIO</h3><p>Lee y comenta con un nombre temporal sin crear una cuenta. No compartas información privada ni spoilers sin avisar.</p></div></div>'+
 '<div class="oneup-comments-controls"><label for="oneup-comment-episode">Episodio</label><select id="oneup-comment-episode" aria-label="Seleccionar episodio">'+
 Array.from({length:Math.min(max,120)},(_,i)=>'<option value="'+(i+1)+'">Episodio '+(i+1)+'</option>').join('')+
 '</select>'+(max>120?'<input id="oneup-episode-number" type="number" min="1" max="'+max+'" value="1" aria-label="Número de episodio" placeholder="Episodio">':'')+'</div>'+
 '<div id="oneup-episode-comments" class="oneup-episode-comments"><p class="oneup-no-comments">Cargando comentarios…</p></div>'+
 '<form id="oneup-guest-comment-form" class="oneup-comment-form"><label for="oneup-guest-name">Tu nombre temporal</label>'+
 '<input id="oneup-guest-name" type="text" maxlength="25" minlength="3" autocomplete="nickname" placeholder="Ejemplo: AnimeFan17" required value="'+escape(alias())+'">'+
 '<label for="oneup-guest-text">Tu comentario</label><textarea id="oneup-guest-text" rows="3" maxlength="900" minlength="2" placeholder="Comparte tu opinión sin spoilers…" required></textarea>'+
 '<div class="oneup-comment-submit"><small>Los mensajes son públicos. Hay límites contra spam y se puede reportar contenido.</small>'+
 '<button id="oneup-send-comment" class="cta primary" type="submit">Publicar comentario</button></div>'+
 '<p id="oneup-comment-state" role="status" aria-live="polite"></p></form>';
 const selector=$('#oneup-comment-episode');selector.addEventListener('change',()=>{episode=Number(selector.value)||1;const custom=$('#oneup-episode-number');if(custom)custom.value=episode;subscribe();document.dispatchEvent(new CustomEvent('oneup-episode-selected',{detail:{animeId:activeAnime,episode}}))});
 $('#oneup-episode-number')?.addEventListener('change',e=>{episode=Math.min(max,Math.max(1,Number(e.target.value)||1));setSelectorEpisode(episode);subscribe();document.dispatchEvent(new CustomEvent('oneup-episode-selected',{detail:{animeId:activeAnime,episode}}))});
 $('#oneup-guest-comment-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const button=$('#oneup-send-comment'),name=$('#oneup-guest-name').value.trim(),body=$('#oneup-guest-text').value.trim();
  if(!api()?.enabled()){message('Para publicar, primero debe activarse el servidor de comentarios.');return}
  button.disabled=true;message('Publicando comentario…');saveAlias(name);
  try{await api().sendEpisodeComment(activeAnime,episode,name,body);$('#oneup-guest-text').value='';message('Comentario publicado.');}
  catch(error){message(api().maskError(error))}
  finally{button.disabled=false}
 });
 root.addEventListener('click',async e=>{
  const button=e.target.closest('[data-report-comment]');if(!button)return;
  if(!api()?.enabled())return;
  if(!confirm('¿Reportar este comentario para revisión?'))return;
  try{await api().report('episodeComment',activeAnime+'_ep_'+episode+'/'+button.dataset.reportComment,'Contenido inapropiado');message('Reporte enviado a moderación.')}
  catch(error){message(api().maskError(error))}
 });
 subscribe();
}
document.addEventListener('oneup-episode-selected',e=>{
 const selection=e.detail;
 if(!activeAnime||selection?.animeId!==activeAnime)return;
 const n=Number(selection.episode);
 if(!Number.isInteger(n)||n<1||n>9999||n===episode)return;
 episode=n;
 setSelectorEpisode(n);
 subscribe();
});
document.addEventListener('oneup-anime-opened',e=>draw(e.detail));
document.addEventListener('oneup-anime-closed',unsubscribe);
window.OneUpEpisodeComments={show:draw,close:unsubscribe};
})();
