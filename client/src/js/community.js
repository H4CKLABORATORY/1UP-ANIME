/* One Up Community: public reading, registered social features, realtime chat.
   No simulated posts, counts or users. Inactive until the owner connects Firebase. */
(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const backend=()=>window.OneUpSocialBackend;
const avatars=['⚔️','🔥','🦇','🌙','🐉','🎃','💀','✨'];
let selected='para-ti',allPosts=[],feedStop=null,chatStop=null,repliesStop=null,activePost=null,selectedAvatar='⚔️';
const status=(id,txt)=>{const e=$(id);if(e)e.textContent=txt};
const niceDate=value=>{
 try{const date=value?.toDate?.();return date?new Intl.DateTimeFormat('es-US',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(date):'Reciente'}catch{return 'Reciente'}
};
const labels={debate:'Debate',pregunta:'Pregunta',manga:'Manga',fanart:'Fanart',clip:'Video',recomendacion:'Recomendación'};
function stateMessage(message){status('#c-info',message)}
function errorText(e){return backend()?.maskError(e)||e?.message||'No se pudo completar la acción.'}
async function registered(){
 try{return backend()?.registered(await backend().firebaseAccount())||false}catch{return false}
}
async function requireAccount(){
 if(!backend()?.enabled()){
  stateMessage('La comunidad necesita activar Firebase, App Check y sus funciones. Aún no hay un servidor conectado.');
  return false;
 }
 if(await registered())return true;
 $('#c-auth-dialog').showModal();return false;
}
function setTab(tab){
 selected=tab;
 $$('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 $('#feed-view').hidden=['chat','perfil'].includes(tab);
 $('#feed-view').classList.toggle('c-clip-mode',tab==='clip');
 $('#chat-view').hidden=tab!=='chat';
 $('#profile-view').hidden=tab!=='perfil';
 if(tab==='chat'){showChat();return}
 if(tab==='perfil'){loadMyProfile();return}
 const name={recientes:'PUBLICACIONES RECIENTES','para-ti':'PARA TI',preguntas:'PREGUNTAS Y TEORÍAS',manga:'UNIVERSO MANGA',fanart:'FANARTS Y FOTOS',clip:'VIDEOS Y CLIPS'};
 $('#feed-title').textContent=name[tab]||'PARA TI';
 $('#feed-desc').textContent=tab==='para-ti'?'Publicaciones según actividad y reacciones públicas (sin un algoritmo oculto).':'Explora la conversación más reciente de esta categoría.';
 renderFeed();
}
function feedData(){
 let out=[...allPosts];
 if(selected==='preguntas')out=out.filter(x=>x.kind==='pregunta');
 else if(selected==='manga')out=out.filter(x=>x.kind==='manga');
 else if(selected==='fanart')out=out.filter(x=>x.kind==='fanart');
 else if(selected==='clip')out=out.filter(x=>x.kind==='clip');
 else if(selected==='para-ti'){
  out.sort((a,b)=>{
   const time=a.createdAt?.toMillis?.()||0,other=b.createdAt?.toMillis?.()||0;
   const score=(Number(a.likes)||0)*12 + Math.max(0,168-(Date.now()-time)/3600000)*.5;
   const scoreOther=(Number(b.likes)||0)*12 + Math.max(0,168-(Date.now()-other)/3600000)*.5;
   return scoreOther-score;
  });
 }
 return out;
}
function badge(post){
 return post.owner?'<span class="c-verified c-owner">✦ Propietario 1UP</span>':post.verified?'<span class="c-verified">✦ Verificado 1UP</span>':'';
}
function postHTML(post){
 const name=esc(post.displayName||'Fan del anime'),kind=labels[post.kind]||'Debate';
 const media=post.mediaPath?'<div class="c-media" data-media="'+esc(post.mediaPath)+'"><small>Cargando archivo publicado…</small></div>':'';
 return '<article class="c-feed-card" data-post="'+esc(post.id)+'"><div class="c-card-body">'+
 '<div class="c-card-top"><div class="c-publisher"><div class="c-avatar"'+(post.avatarPath?' data-avatar-file="'+esc(post.avatarPath)+'"':'')+'>'+esc(post.icon||'✦')+'</div><div class="c-person"><strong>'+name+' '+badge(post)+'</strong><small>'+niceDate(post.createdAt)+'</small></div></div><span class="c-post-kind">'+esc(kind)+'</span></div>'+
 '<p class="c-post-text">'+esc(post.text||'')+'</p></div>'+media+
 '<div class="c-card-buttons"><button type="button" data-like="'+esc(post.id)+'">♡ '+(Math.max(0,Number(post.likes)||0))+'</button>'+
 '<button type="button" data-reply="'+esc(post.id)+'">◌ Comentar</button><button type="button" data-share="'+esc(post.id)+'">↗ Compartir</button>'+
 '<button type="button" data-report="'+esc(post.id)+'">⚑ Reportar</button>'+
 '<button type="button" class="c-follow" data-follow="'+esc(post.authorUid||'')+'">＋ Seguir</button>'+
 '<button type="button" data-friend="'+esc(post.authorUid||'')+'">♧ Amistad</button></div></article>';
}
async function renderMedia(){
 for(const elem of $$('[data-media]')){
  const path=elem.dataset.media;
  if(!path)continue;
  try{
   const url=await backend().mediaURL(path);
   if(!elem.isConnected||elem.dataset.media!==path)continue;
   if(/\.mp4$/i.test(path)){
    const video=document.createElement('video');video.src=url;video.controls=true;video.preload='none';video.playsInline=true;video.setAttribute('aria-label','Video de la comunidad');elem.replaceChildren(video);
   }else{
    const image=document.createElement('img');image.src=url;image.loading='lazy';image.alt='Imagen compartida en la comunidad';elem.replaceChildren(image);
   }
  }catch{if(elem.isConnected)elem.textContent='Imagen o video no disponible.'}
 }
 for(const badge of $('[data-avatar-file]')){
  const path=badge.dataset.avatarFile;
  try{
   const link=await backend().mediaURL(path);
   if(badge.isConnected&&badge.dataset.avatarFile===path){
    const image=document.createElement('img');image.src=link;image.alt='Foto del creador';image.loading='lazy';badge.replaceChildren(image);
   }
  }catch{}
 }
}
function renderFeed(){
 const e=$('#feed-list');if(!e)return;
 const posts=feedData();
 e.innerHTML=posts.length?posts.map(postHTML).join(''):'<div class="c-empty">Aún no hay publicaciones en esta sección. Cuando esté conectada la comunidad, aquí aparecerán las conversaciones reales.</div>';
 if(backend()?.enabled())renderMedia();
}
function subscribeFeed(){
 if(!backend()?.enabled()){stateMessage(backend()?.explain||'Configura Firebase para mostrar publicaciones reales.');$('#feed-list').innerHTML='<div class="c-empty">La red social todavía no tiene un servidor público conectado. No se mostrarán publicaciones simuladas.</div>';return}
 backend().subscribeFeed(posts=>{allPosts=posts;renderFeed()},e=>{
  stateMessage(e);$('#feed-list').innerHTML='<div class="c-empty">'+esc(e)+'</div>'
 }).then(cleanup=>feedStop=cleanup).catch(e=>stateMessage(errorText(e)));
}
function showComposer(){
 if(!backend()?.enabled()){stateMessage('Para publicar hace falta configurar Firebase y activar el servidor de 1UP Comunidad.');return}
 requireAccount().then(ok=>{if(ok){setTab('recientes');$('#composer').hidden=false;$('#post-text').focus()}});
}
async function publish(e){
 e.preventDefault();
 if(!await requireAccount())return;
 const button=$('#post-form button[type=submit]'),text=$('#post-text').value.trim(),kind=$('#post-kind').value,file=$('#post-media').files[0];
 button.disabled=true;status('#post-result','Enviando publicación…');
 try{
  let mediaPath='';
  if(file){
   const uid=(await backend().firebaseAccount()).uid;
   const draft=crypto.randomUUID?.()||('u'+Date.now().toString(36)+'abcdef');
   const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4'}[file.type];
   if(!ext)throw Error('Formato de archivo no admitido.');
   mediaPath=await backend().uploadCommunityFile(file,draft);
  }
  await backend().publishPost({text,kind,mediaPath});
  status('#post-result',file?'Tu publicación multimedia está pendiente de revisión.':'Publicación creada correctamente.');
  $('#post-text').value='';$('#post-media').value='';
  if(!file){setTimeout(()=>$('#composer').hidden=true,850)}
 }catch(err){status('#post-result',errorText(err))}
 finally{button.disabled=false}
}
async function showChat(){
 if(chatStop||!backend()?.enabled()){
  if(!backend()?.enabled())$('#global-messages').innerHTML='<div class="c-empty">El chat global necesita conectar el servidor de la comunidad.</div>';
  return;
 }
 backend().subscribeGlobal(messages=>{
  const root=$('#global-messages');
  root.innerHTML=messages.length?messages.map(m=>'<article class="c-message"><header><strong>'+esc(m.displayName||'Fan')+'</strong>'+badge(m)+'<small>'+niceDate(m.createdAt)+'</small></header><p>'+esc(m.text)+'</p></article>').join(''):'<div class="c-empty">Todavía no hay mensajes. ¡Inicia la conversación!</div>';
 },e=>status('#chat-state',e)).then(off=>chatStop=off).catch(e=>status('#chat-state',errorText(e)));
}
async function chatSubmit(e){
 e.preventDefault();if(!await requireAccount())return;
 const box=$('#global-text'),text=box.value.trim();
 if(!text)return;const btn=$('#global-form button');btn.disabled=true;
 try{await backend().sendGlobal(text);box.value='';status('#chat-state','Mensaje enviado.')}
 catch(err){status('#chat-state',errorText(err))}
 finally{btn.disabled=false}
}
async function sharePost(id){
 const uri=new URL('./comunidad.html?post='+encodeURIComponent(id),location.href).href;
 try{if(navigator.share){await navigator.share({title:'Debate en 1UP Comunidad',url:uri})}
 else{await navigator.clipboard.writeText(uri);stateMessage('Enlace de publicación copiado.')}}
 catch(e){if(e.name!=='AbortError')stateMessage('No se pudo compartir el enlace.')}
}
function startReplies(postId){
 activePost=postId;
 const post=allPosts.find(x=>x.id===postId);
 $('#c-reply-context').textContent=(post?.displayName||'Fan')+': '+String(post?.text||'').slice(0,170);
 $('#reply-list').innerHTML='<div class="c-empty">Cargando respuestas…</div>';status('#reply-state','');
 $('#c-reply-dialog').showModal();
 if(repliesStop){repliesStop();repliesStop=null}
 if(!backend()?.enabled()){$('#reply-list').innerHTML='<div class="c-empty">Se necesita conectar la comunidad.</div>';return}
 backend().subscribeReplies(postId,comments=>{
  $('#reply-list').innerHTML=comments.length?comments.map(x=>'<article class="c-reply"><strong>'+esc(x.displayName||'Fan')+' '+badge(x)+'</strong><p>'+esc(x.text)+'</p><small>'+niceDate(x.createdAt)+'</small></article>').join(''):'<div class="c-empty">Nadie ha comentado esta publicación todavía.</div>';
 },e=>status('#reply-state',e)).then(off=>repliesStop=off).catch(e=>status('#reply-state',errorText(e)));
}
async function reply(e){
 e.preventDefault();if(!activePost||!await requireAccount())return;
 const text=$('#reply-text').value.trim(),btn=$('#reply-form button');btn.disabled=true;
 try{await backend().replyToPost(activePost,text);$('#reply-text').value='';status('#reply-state','Respuesta publicada.')}
 catch(e){status('#reply-state',errorText(e))}
 finally{btn.disabled=false}
}
function profileIcons(){
 const box=$('#profile-icons');
 box.innerHTML=avatars.map((icon,i)=>'<button type="button" data-avatar-choice="'+esc(icon)+'" class="'+(icon===selectedAvatar?'selected':'')+'" aria-label="Avatar '+(i+1)+'">'+icon+'</button>').join('');
}
async function showFriends(){
 const box=$('#c-friend-requests'),list=$('#c-friend-list');
 if(!box||!list)return;
 if(!await registered()){
  box.innerHTML='<p class="c-empty">Inicia sesión con Google para consultar solicitudes de amistad.</p>';list.textContent='';return;
 }
 try{
  const result=await backend().listFriends();
  const requests=Array.isArray(result?.incoming)?result.incoming:[];
  const friends=Array.isArray(result?.friends)?result.friends:[];
  box.innerHTML=requests.length?requests.map(x=>'<article class="c-friend-row"><strong>'+esc(x.displayName)+'</strong><div><button type="button" data-answer-friend="'+esc(x.fromUid)+'" data-accept="1">Aceptar</button><button type="button" data-answer-friend="'+esc(x.fromUid)+'" data-accept="0">Rechazar</button></div></article>').join(''):'<p class="c-empty">No tienes solicitudes pendientes.</p>';
  list.innerHTML='<h4>AMIGOS ('+friends.length+')</h4>'+ (friends.length?friends.map(x=>'<div class="c-friend-name">'+esc(x.displayName)+'</div>').join(''):'<p>Aún no has añadido amigos.</p>');
 }catch(e){box.textContent=errorText(e)}
}
async function loadMyProfile(){
 if(!backend()?.enabled()){status('#profile-state','Configura Firebase para guardar un perfil público.');return}
 if(!await registered()){status('#profile-state','Inicia sesión con Google para editar tu perfil.');return}
 try{const data=await backend().myProfile();if(data){$('#profile-alias').value=data.displayName||'';selectedAvatar=data.icon||'⚔️';profileIcons()}}
 catch(e){status('#profile-state',errorText(e))}
 await showFriends();
}
async function saveProfile(e){
 e.preventDefault();if(!await requireAccount())return;
 const btn=$('#profile-form button[type=submit]');btn.disabled=true;status('#profile-state','Guardando perfil…');
 try{
  const file=$('#profile-photo').files[0];
  const saved=await backend().myProfile();
  let avatarPath=saved?.avatarPath||'';
  if(file)avatarPath=await backend().uploadAvatar(file);
  await backend().updateProfile({displayName:$('#profile-alias').value,icon:selectedAvatar,avatarPath});
  status('#profile-state','Perfil actualizado. Los distintivos se administran por separado.');
 }catch(e){status('#profile-state',errorText(e))}
 finally{btn.disabled=false}
}
async function verify(e){
 e.preventDefault();if(!await requireAccount())return;
 try{await backend().verificationRequest($('#verification-reason').value);status('#verification-state','Solicitud registrada para revisión humana.')}
 catch(e){status('#verification-state',errorText(e))}
}
async function account(){
 if(!backend()?.enabled()){status('#c-auth-state','Debes configurar Firebase y App Check para activar el inicio de sesión.');$('#c-auth-dialog').showModal();return}
 try{
  const me=await backend().firebaseAccount();
  if(backend().registered(me)){const ok=confirm('Sesión iniciada. ¿Quieres cerrar sesión?');if(ok){const x=await backend().sdk();await x.auth.signOut(x.authentication);$('#c-login').textContent='Iniciar sesión';stateMessage('Sesión cerrada. Puedes seguir leyendo publicaciones públicas.')}return}
 }catch{}
 $('#c-auth-dialog').showModal();
}
async function google(){
 const button=$('#c-google');button.disabled=true;status('#c-auth-state','Conectando con Google…');
 try{
  const user=await backend().loginWithGoogle();
  if(user){$('#c-login').textContent=user.displayName?.slice(0,22)||'Mi cuenta';$('#c-auth-dialog').close();stateMessage('Sesión iniciada. Ya puedes participar en La Plaza, el chat y tu perfil.')}
 }catch(e){status('#c-auth-state',errorText(e))}
 finally{button.disabled=false}
}
async function reportPost(id){
 if(!backend()?.enabled())return;
 const reason=prompt('Motivo del reporte (mínimo 4 caracteres):','Contenido inapropiado');
 if(!reason)return;
 try{await backend().report('communityPost',id,reason);stateMessage('Reporte enviado a revisión.')}
 catch(e){stateMessage(errorText(e))}
}
function actions(e){
 const target=e.target;
 const nav=target.closest('[data-tab]');if(nav){setTab(nav.dataset.tab);return}
 const replyId=target.closest('[data-reply]');if(replyId){startReplies(replyId.dataset.reply);return}
 const like=target.closest('[data-like]');if(like){requireAccount().then(ok=>ok&&backend().react(like.dataset.like).catch(err=>stateMessage(errorText(err))));return}
 const share=target.closest('[data-share]');if(share){sharePost(share.dataset.share);return}
 const report=target.closest('[data-report]');if(report){reportPost(report.dataset.report);return}
 const follow=target.closest('[data-follow]');if(follow){requireAccount().then(ok=>ok&&backend().follow(follow.dataset.follow).then(v=>stateMessage(v.following?'Ahora sigues este perfil.':'Dejaste de seguir el perfil.')).catch(e=>stateMessage(errorText(e))));return}
 const friend=target.closest('[data-friend]');if(friend){requireAccount().then(ok=>ok&&backend().requestFriend(friend.dataset.friend).then(()=>stateMessage('Invitación enviada. Se necesita aceptación para ser amigos.')).catch(e=>stateMessage(errorText(e))));return}
 const answer=target.closest('[data-answer-friend]');if(answer){backend().answerFriend(answer.dataset.answerFriend,answer.dataset.accept==='1').then(()=>{status('#c-friend-state','Respuesta enviada.');showFriends()}).catch(e=>status('#c-friend-state',errorText(e)));return}
 const icon=target.closest('[data-avatar-choice]');if(icon){selectedAvatar=icon.dataset.avatarChoice;profileIcons()}
}
async function init(){
 profileIcons();
 document.addEventListener('click',actions);
 $('#c-login').addEventListener('click',account);
 $('#c-google').addEventListener('click',google);
 $('#c-auth-close').addEventListener('click',()=>$('#c-auth-dialog').close());
 $('#c-compose').addEventListener('click',showComposer);
 $('#c-compose-hero').addEventListener('click',showComposer);
 $('#cancel-compose').addEventListener('click',()=>$('#composer').hidden=true);
 $('#post-form').addEventListener('submit',publish);
 $('#open-chat').addEventListener('click',()=>setTab('chat'));
 $('#global-form').addEventListener('submit',chatSubmit);
 $('#c-reply-close').addEventListener('click',()=>$('#c-reply-dialog').close());
 $('#c-reply-dialog').addEventListener('close',()=>{if(repliesStop){repliesStop();repliesStop=null}});
 $('#reply-form').addEventListener('submit',reply);
 $('#profile-form').addEventListener('submit',saveProfile);
 $('#verification-form').addEventListener('submit',verify);
 const id=new URLSearchParams(location.search).get('post');
 if(id){
  const target=$('#feed-list');const watch=new MutationObserver(()=>{
   if(allPosts.some(x=>x.id===id)){watch.disconnect();startReplies(id)}
  });
  watch.observe(target,{childList:true});setTimeout(()=>watch.disconnect(),7000);
 }
 if(backend()?.enabled()){
  try{const me=await backend().firebaseAccount();if(backend().registered(me))$('#c-login').textContent=me.displayName||'Mi cuenta'}catch{}
 }
 subscribeFeed();
}
document.addEventListener('DOMContentLoaded',init);
})();
