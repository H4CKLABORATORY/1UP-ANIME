/* ONE UP moderation dashboard: owner/moderator actions are checked by Cloud Functions.
 * Public users can load this HTML but cannot read queues without an adminRole.
 */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const esc=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=()=>window.OneUpSocialBackend;
const status=s=>$('#admin-status').textContent=s;
let last=null;
async function userLogin(){
 if(!api()?.enabled()){status('Firebase aún no está conectado a 1UP Anime. Configura auth-config.js y App Check para activar este panel.');return}
 const button=$('#admin-login');button.disabled=true;status('Comprobando sesión administrativa…');
 try{const me=await api().firebaseAccount();if(!api().registered(me)){status('El acceso administrativo está pendiente de migración a 1UP Auth.');return}await refresh()}
 catch(e){status(api().maskError(e))}
 finally{button.disabled=false}
}
function card(inner){return '<article class="mod-card">'+inner+'</article>'}
function contentItem(x){
 const text=esc(x.text||'Sin descripción');
 return card('<div class="mod-details"><strong>'+esc(x.displayName||'Creador')+'</strong><span>'+esc(x.kind||'Publicación')+'</span><p>'+text+'</p>'+(x.mediaPath?'<div class="mod-preview" data-pending-media="'+esc(x.mediaPath)+'">Cargando vista previa…</div>':'')+'</div><div class="mod-actions"><button type="button" class="c-primary" data-moderate-post="'+esc(x.id)+'" data-decision="approve">Aprobar</button><button type="button" class="c-outline" data-moderate-post="'+esc(x.id)+'" data-decision="remove">Rechazar</button></div>');
}
function reportItem(x){
 return card('<div class="mod-details"><strong>'+esc(x.type||'Reporte')+'</strong><p>'+esc(x.reason||'')+'</p><small>'+esc(x.target||'')+'</small></div><div class="mod-actions"><button type="button" data-report-action="'+esc(x.id)+'" data-report-value="resolved" class="c-primary">Resolver</button><button type="button" data-report-action="'+esc(x.id)+'" data-report-value="dismissed" class="c-outline">Descartar</button><button type="button" data-remove-target="'+esc(x.id)+'" class="c-outline">Retirar contenido</button></div>');
}
function verificationItem(x){
 return card('<div class="mod-details"><strong>ID: '+esc(x.uid)+'</strong><p>'+esc(x.reason||'Sin justificación')+'</p></div><div class="mod-actions"><button type="button" data-verify-user="'+esc(x.uid)+'" data-decision="approve" class="c-primary">Verificar</button><button type="button" data-verify-user="'+esc(x.uid)+'" data-decision="reject" class="c-outline">Rechazar</button></div>');
}
async function preview(){
 for(const wrap of document.querySelectorAll('[data-pending-media]')){
  const path=wrap.dataset.pendingMedia;
  try{
   const url=await api().mediaURL(path);
   if(!wrap.isConnected)continue;
   wrap.textContent='';
   if(path.endsWith('.mp4')){const video=document.createElement('video');video.src=url;video.controls=true;video.preload='metadata';video.playsInline=true;wrap.append(video)}
   else{const image=document.createElement('img');image.src=url;image.alt='Archivo pendiente de moderación';image.loading='lazy';wrap.append(image)}
  }catch{wrap.textContent='No se pudo cargar este archivo.'}
 }
}
async function refresh(){
 if(!api()?.enabled()){status('Falta configurar Firebase y App Check. Este panel no concede acceso sin autorización.');$('#admin-dashboard').hidden=true;return}
 try{
  const result=await api().callable('moderationDashboard',{});
  last=result;
  status(result.role==='owner'?'Acceso confirmado: propietario 1UP':'Acceso confirmado: moderador 1UP');
  $('#admin-dashboard').hidden=false;
  $('#mod-posts').innerHTML=result.posts?.length?result.posts.map(contentItem).join(''):'<p class="c-empty">No hay publicaciones multimedia pendientes.</p>';
  $('#mod-reports').innerHTML=result.reports?.length?result.reports.map(reportItem).join(''):'<p class="c-empty">Sin reportes pendientes.</p>';
  $('#mod-verification-section').hidden=result.role!=='owner';
  $('#mod-verifications').innerHTML=result.verification?.length?result.verification.map(verificationItem).join(''):'<p class="c-empty">Sin solicitudes de verificación.</p>';
  await preview();
 }catch(e){$('#admin-dashboard').hidden=true;status('Acceso denegado o servidor no disponible: '+api().maskError(e))}
}
async function removeReported(id){
 const report=last?.reports?.find(x=>x.id===id);
 if(!report)return;
 if(!confirm('¿Retirar el contenido reportado? Se comprobarán tus permisos de moderación.'))return;
 const target=String(report.target||'');
 let action=null;
 if(report.type==='communityPost')action={fn:'moderateCommunityPost',args:{postId:target,action:'remove'}};
 else if(report.type==='globalMessage')action={fn:'moderateGlobalMessage',args:{messageId:target,action:'remove'}};
 else if(report.type==='episodeComment'){
  const ix=target.indexOf('/');
  if(ix>0)action={fn:'moderateEpisodeComment',args:{thread:target.slice(0,ix),commentId:target.slice(ix+1),action:'remove'}};
 }else if(report.type==='communityComment'){
  const ix=target.indexOf('/');
  if(ix>0)action={fn:'moderateCommunityReply',args:{postId:target.slice(0,ix),commentId:target.slice(ix+1),action:'remove'}};
 }
 if(!action){status('Referencia de contenido no válida para retiro.');return}
 await api().callable(action.fn,action.args);
 await api().callable('reviewReport',{reportId:id,decision:'resolved'});
 status('Contenido retirado y reporte resuelto.');await refresh();
}
async function handleClick(e){
 const post=e.target.closest('[data-moderate-post]');
 const report=e.target.closest('[data-report-action]');
 const user=e.target.closest('[data-verify-user]');
 const remove=e.target.closest('[data-remove-target]');
 if(!(post||report||user||remove))return;
 const button=post||report||user||remove;button.disabled=true;
 try{
  if(post)await api().callable('moderateCommunityPost',{postId:post.dataset.moderatePost,action:post.dataset.decision});
  else if(report)await api().callable('reviewReport',{reportId:report.dataset.reportAction,decision:report.dataset.reportValue});
  else if(user){
   if(user.dataset.decision==='approve'&&!confirm('¿Conceder verificación 1UP a este perfil?'))return;
   await api().callable('reviewVerification',{targetUid:user.dataset.verifyUser,decision:user.dataset.decision});
  }
  else if(remove)await removeReported(remove.dataset.removeTarget);
  await refresh();
 }catch(err){status(api().maskError(err))}
 finally{button.disabled=false}
}
document.addEventListener('DOMContentLoaded',()=>{$('#admin-login').addEventListener('click',userLogin);$('#admin-refresh').addEventListener('click',refresh);$('#admin-dashboard').addEventListener('click',handleClick);refresh()});
})();
