/* 1UP Community adapter: the site is public; participation requires a 1UP account.
   Episode comments require a 1UP account (email + password).
   Community posts and replies require a 1UP account (email + password).
   All writes go directly to Postgres under RLS + guard triggers; the database
   (not client flags) enforces ownership, rate limits and author fields.
   Moderation runs in Edge Functions with the service_role key (see
   supabase/functions/). Never trust client flags. No anonymous sign-in. */
(()=>{
'use strict';
const SDK_URL='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';
const EXPLAIN='La comunidad 1UP aún no está disponible. Puedes explorar anime como invitado.';
const getConfig=()=>window.ONEUP_SUPABASE_CONFIG;
const normalizeId=value=>String(value||'').trim().slice(0,100);
let clientPromise=null;
const AVATARS=['⚔️','🔥','🦇','🌙','🐉','🎃','💀','✨'];
const KINDS=['debate','pregunta','fanart','clip','manga','recomendacion'];
const maskError=e=>{
 const raw=String(e?.code||e?.message||'');
 const value=raw.toLowerCase();
 if(value.includes('p0001')||value.includes('wait before'))return 'Has publicado demasiado rápido. Espera antes de volver a comentar.';
 if(value.includes('p0002')||value.includes('not available')||value.includes('no longer available'))return 'Esa publicación ya no está disponible.';
 if(value.includes('42501')||value.includes('permission')||value.includes('row-level'))return 'No tienes permisos para esta acción.';
 if(value.includes('23505')||value.includes('duplicate'))return 'Ya existe ese registro.';
 if(value.includes('inicia sesión')||value.includes('sign in required'))return 'Necesitas iniciar sesión para esta acción.';
 if(value.includes('invalid login credentials'))return 'Correo o contraseña incorrectos.';
 return raw.slice(0,180)||'No se pudo conectar con la comunidad.';
};
function enabled(){
 const c=getConfig();
 try{
  const u=new URL(c?.url||'');
  return u.protocol==='https:'&&!u.username&&!u.password&&
   typeof c?.publishableKey==='string'&&c.publishableKey.startsWith('sb_publishable_');
 }catch{return false}
}
async function sdk(){
 if(clientPromise)return clientPromise;
 if(!enabled())throw new Error(EXPLAIN);
 clientPromise=import(SDK_URL).then(({createClient})=>{
  const c=getConfig();
  const supabase=createClient(c.url,c.publishableKey,{
   auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  return {supabase};
 }).catch(e=>{clientPromise=null;throw e});
 return clientPromise;
}
async function supabaseAccount(){
 const {supabase}=await sdk();
 const {data,error}=await supabase.auth.getUser();
 if(error&&error.name!=='AuthSessionMissingError')throw error;
 return data?.user||null;
}
function registered(user){
 // Any non-anonymous Supabase account counts: 1UP accounts are email + password only.
 return Boolean(user&&!user.is_anonymous);
}
async function requireAccount(){
 const user=await supabaseAccount();
 if(!registered(user))throw Error('Inicia sesión con tu cuenta 1UP para esta acción.');
 return user;
}
async function loginWithEmail(email,password){
 const {supabase}=await sdk();
 const {data,error}=await supabase.auth.signInWithPassword({email:String(email||'').trim(),password:String(password||'')});
 if(error)throw error;
 return data.user||await supabaseAccount();
}
/* Moderation Edge Functions (service_role). User-facing writes below do NOT
   go through here: they use direct PostgREST inserts under RLS. */
const EDGE_FUNCTIONS={
 moderationDashboard:'moderation-dashboard',
 moderateCommunityPost:'moderate-post',
 reviewReport:'review-report',
 reviewVerification:'review-verification',
 moderateEpisodeComment:'moderate-episode-comment',
 moderateGlobalMessage:'moderate-global-message',
 moderateCommunityReply:'moderate-community-reply'
};
async function callable(name,values){
 const fn=EDGE_FUNCTIONS[name];
 if(!fn)throw Error('Función no disponible: '+name);
 const {supabase}=await sdk();
 const {data,error}=await supabase.functions.invoke(fn,{body:values||{}});
 if(error)throw error;
 return data;
}
function episodeThread(animeId,episode){
 const aid=normalizeId(animeId),number=Number(episode);
 if(!/^(mal|al)-\d+$/.test(aid)||!Number.isInteger(number)||number<1||number>9999)throw Error('Identificador de capítulo incorrecto.');
 return aid+'_ep_'+number;
}
const stamp=row=>row?.created_at?{toDate:()=>new Date(row.created_at),toMillis:()=>new Date(row.created_at).getTime()}:null;
function mapPost(row){
 return {id:row.id,authorUid:row.author_id,displayName:row.display_name,icon:row.icon,
  avatarPath:row.avatar_path,verified:row.verified,owner:row.owner,kind:row.kind,
  text:row.text,mediaPath:row.media_path,likes:row.likes,status:row.status,createdAt:stamp(row)};
}
function mapComment(row){
 return {id:row.id,authorUid:row.author_id,displayName:row.display_name,icon:row.icon,
  avatarPath:row.avatar_path,verified:row.verified,owner:row.owner,
  text:row.text,body:row.body,status:row.status,guest:false,createdAt:stamp(row)};
}
function mapGlobal(row){
 return {id:row.id,authorUid:row.author_id,displayName:row.display_name,icon:row.icon,
  avatarPath:row.avatar_path,verified:row.verified,owner:row.owner,
  text:row.text,status:row.status,createdAt:stamp(row)};
}
function subscribeTable({table,select,filter,order,limit,map,cb,onError}){
 return sdk().then(async ({supabase})=>{
  let active=true;
  const refresh=async()=>{
   let q=supabase.from(table).select(select);
   for(const [col,val] of (filter||[]))q=q.eq(col,val);
   if(order)q=q.order(order.col,{ascending:order.asc});
   if(limit)q=q.limit(limit);
   const {data,error}=await q;
   if(!active)return;
   if(error){onError?.(maskError(error));return}
   cb((data||[]).map(map));
  };
  await refresh();
  if(!active)return ()=>{};
  const topic='oneup-'+table+'-'+Math.random().toString(36).slice(2);
  const channel=supabase.channel(topic)
   .on('postgres_changes',{event:'*',schema:'public',table},()=>{if(active)void refresh()})
   .subscribe();
  return ()=>{active=false;void supabase.removeChannel(channel)};
 });
}
function subscribeEpisode(animeId,episode,cb,onError){
 const thread=episodeThread(animeId,episode);
 const [aid,ep]=thread.split('_ep_');
 return subscribeTable({table:'oneup_episode_comments',
  select:'id,display_name,body,created_at',
  filter:[['anime_id',aid],['episode_number',Number(ep)],['status','visible']],
  order:{col:'created_at',asc:false},limit:40,
  map:r=>({id:r.id,displayName:r.display_name,text:r.body,guest:false,
   verified:false,owner:false,createdAt:stamp(r)}),cb,onError});
}
function subscribeGlobal(cb,onError){
 return subscribeTable({table:'oneup_global_messages',
  select:'id,author_id,display_name,icon,avatar_path,verified,owner,text,status,created_at',
  filter:[['status','visible']],order:{col:'created_at',asc:false},limit:60,
  map:mapGlobal,cb,onError});
}
async function sendGlobal(text){
 const user=await requireAccount();
 const body=String(text||'').trim();
 if(body.length<2||body.length>350)throw Error('Escribe un mensaje de 2 a 350 caracteres.');
 const {supabase}=await sdk();
 const {error}=await supabase.from('oneup_global_messages').insert({
  author_id:user.id,text:body
 });
 if(error)throw error;
 return {ok:true};
}
async function updateProfile({displayName,icon,avatarPath}){
 const user=await requireAccount();
 const name=String(displayName||'').trim();
 if(name.length<3||name.length>25)throw Error('El nombre temporal debe tener entre 3 y 25 caracteres.');
 if(!AVATARS.includes(icon))throw Error('Icono no admitido.');
 const path=String(avatarPath||'');
 if(path&&!/^avatars\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{8,90}\.(jpg|png|webp)$/.test(path))
  throw Error('Ruta de foto incorrecta.');
 const {supabase}=await sdk();
 const {error}=await supabase.from('oneup_creator_profiles').upsert({
  user_id:user.id,display_name:name,icon,avatar_path:path
 },{onConflict:'user_id'});
 if(error)throw error;
 return {ok:true};
}
async function verificationRequest(reason){
 const user=await requireAccount();
 const text=String(reason||'').trim();
 if(text.length<30||text.length>600)throw Error('Escribe un motivo de 30 a 600 caracteres.');
 const {supabase}=await sdk();
 const {error}=await supabase.from('oneup_verification_requests').upsert({
  user_id:user.id,reason:text
 },{onConflict:'user_id'});
 if(error)throw error;
 return {ok:true,message:'Recibimos tu solicitud. No garantiza verificación.'};
}
async function follow(uid){
 const user=await requireAccount();
 const target=normalizeId(uid);
 if(!target||target===user.id)throw Error('No puedes seguir ese perfil.');
 const {supabase}=await sdk();
 const {data,error}=await supabase.rpc('toggle_follow',{p_target:target});
 if(error)throw error;
 return {following:data===true};
}
async function myProfile(){
 const user=await supabaseAccount();
 if(!registered(user))return null;
 const {supabase}=await sdk();
 const {data,error}=await supabase.from('oneup_creator_profiles')
  .select('display_name,icon,avatar_path,verified,owner,followers')
  .eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 if(!data)return null;
 return {displayName:data.display_name,icon:data.icon,avatarPath:data.avatar_path,
  verified:data.verified,owner:data.owner,followers:data.followers};
}
async function uploadAvatar(file){
 const user=await requireAccount();
 const valid={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const ext=valid[file.type];
 if(!ext||file.size>5*1024*1024)throw Error('Se admiten fotos JPG, PNG o WebP de hasta 5 MB.');
 const {supabase}=await sdk();
 const path='avatars/'+user.id+'/'+crypto.randomUUID()+'.'+ext;
 const {error}=await supabase.storage.from('avatars').upload(path,file,{contentType:file.type});
 if(error)throw error;
 return path;
}
async function sendEpisodeComment(animeId,episode,pseudonym,text){
 const user=await requireAccount();
 const thread=episodeThread(animeId,episode);
 const [aid,ep]=thread.split('_ep_');
 const body=String(text||'').trim();
 if(body.length<2||body.length>900)throw Error('El comentario debe tener de 2 a 900 caracteres.');
 const name=String(pseudonym||'').trim();
 if(name.length<3||name.length>25)throw Error('El apodo debe tener de 3 a 25 caracteres.');
 const {supabase}=await sdk();
 const {error}=await supabase.from('oneup_episode_comments').insert({
  anime_id:aid,episode_number:Number(ep),author_id:user.id,
  display_name:name,body,status:'visible'
 });
 if(error)throw error;
 return {ok:true};
}
function subscribeFeed(cb,onError){
 return subscribeTable({table:'oneup_community_posts',
  select:'id,author_id,display_name,icon,avatar_path,verified,owner,kind,text,media_path,likes,status,created_at',
  filter:[['status','visible']],order:{col:'created_at',asc:false},limit:35,
  map:mapPost,cb,onError});
}
async function publishPost({text,kind='debate',mediaPath=''}){
 const user=await requireAccount();
 const body=String(text||'').trim();
 if(body.length<3||body.length>2500)throw Error('Escribe una publicación de 3 a 2500 caracteres.');
 if(!KINDS.includes(kind))throw Error('Tipo de publicación no admitido.');
 const path=String(mediaPath||'');
 if(path&&!new RegExp('^postUploads/'+user.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'/[A-Za-z0-9_-]{8,90}/media\\.(jpg|png|webp|gif|mp4)$').test(path))
  throw Error('Ruta de archivo incorrecta.');
 const {supabase}=await sdk();
 const {data,error}=await supabase.from('oneup_community_posts').insert({
  author_id:user.id,kind,text:body,media_path:path
 }).select('id').single();
 if(error)throw error;
 return {ok:true,id:data?.id};
}
async function replyToPost(postId,text){
 const user=await requireAccount();
 const id=normalizeId(postId);
 const body=String(text||'').trim();
 if(body.length<2||body.length>1200)throw Error('Escribe una respuesta de 2 a 1200 caracteres.');
 const {supabase}=await sdk();
 const {data,error}=await supabase.from('oneup_community_comments').insert({
  post_id:id,author_id:user.id,text:body
 }).select('id').single();
 if(error)throw error;
 return {ok:true,id:data?.id};
}
function subscribeReplies(postId,cb,onError){
 return subscribeTable({table:'oneup_community_comments',
  select:'id,author_id,display_name,icon,avatar_path,verified,owner,text,status,created_at',
  filter:[['post_id',normalizeId(postId)],['status','visible']],
  order:{col:'created_at',asc:true},limit:60,map:mapComment,cb,onError});
}
async function react(postId){
 await requireAccount();
 const {supabase}=await sdk();
 const {data,error}=await supabase.rpc('toggle_community_reaction',{p_post_id:normalizeId(postId)});
 if(error)throw error;
 return {liked:data===true};
}
async function report(type,id,reason){
 const user=await requireAccount();
 if(!['episodeComment','communityPost','communityComment','globalMessage'].includes(type))
  throw Error('Tipo de reporte inválido.');
 const key=String(id||'').trim();
 if(key.length<10||key.length>240)throw Error('Referencia inválida.');
 const note=String(reason||'').trim();
 if(note.length<4||note.length>160)throw Error('Escribe un motivo entre 4 y 160 caracteres.');
 const {supabase}=await sdk();
 const {error}=await supabase.from('oneup_moderation_reports').insert({
  reporter_id:user.id,type,target:key,reason:note
 });
 if(error)throw error;
 return {ok:true};
}
async function uploadCommunityFile(file,postId){
 const user=await requireAccount();
 const types=['image/jpeg','image/png','image/webp','image/gif','video/mp4'];
 if(!types.includes(file.type))throw Error('Solo se admiten JPG, PNG, WebP, GIF o MP4.');
 const max=file.type==='video/mp4'?25*1024*1024:5*1024*1024;
 if(file.size>max)throw Error('El archivo excede el límite de '+(max/1024/1024)+' MB.');
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','video/mp4':'mp4'}[file.type];
 const path='postUploads/'+user.id+'/'+String(postId)+'/media.'+ext;
 const {supabase}=await sdk();
 const {error}=await supabase.storage.from('post-uploads').upload(path,file,{contentType:file.type});
 if(error)throw error;
 return path;
}
async function requestFriend(uid){
 const user=await requireAccount();
 const target=normalizeId(uid);
 if(!target||target===user.id)throw Error('No puedes enviar invitación a ese perfil.');
 const {supabase}=await sdk();
 const {error}=await supabase.from('oneup_friend_requests').insert({
  from_id:user.id,to_id:target
 });
 if(error)throw error;
 return {ok:true,message:'Invitación de amistad enviada.'};
}
async function listFriends(){
 const user=await requireAccount();
 const {supabase}=await sdk();
 const [incoming,friends]=await Promise.all([
  supabase.from('oneup_friend_requests')
   .select('from_id,display_name,created_at').eq('to_id',user.id).eq('status','pending').limit(30),
  supabase.from('oneup_friendships')
   .select('friend_id,display_name').eq('user_id',user.id).limit(60)
 ]);
 if(incoming.error)throw incoming.error;
 if(friends.error)throw friends.error;
 return {
  incoming:(incoming.data||[]).map(d=>({fromUid:d.from_id,displayName:d.display_name||'Fan del anime',
   createdAt:new Date(d.created_at).getTime()||0})),
  friends:(friends.data||[]).map(d=>({uid:d.friend_id,displayName:d.display_name||'Amigo de 1UP'}))
 };
}
async function answerFriend(uid,accept){
 await requireAccount();
 const {supabase}=await sdk();
 const {data,error}=await supabase.rpc('respond_friendship',{p_from:normalizeId(uid),p_accept:!!accept});
 if(error)throw error;
 return {ok:true,accepted:data===true};
}
async function mediaURL(path){
 const {supabase}=await sdk();
 const value=String(path||'');
 const bucket=value.startsWith('avatars/')?'avatars':'post-uploads';
 const {data}=supabase.storage.from(bucket).getPublicUrl(value);
 return data.publicUrl;
}
window.OneUpSocialBackend={sdk,supabaseAccount,registered,loginWithEmail,episodeThread,
 subscribeEpisode,sendEpisodeComment,subscribeFeed,publishPost,replyToPost,subscribeReplies,react,report,
 subscribeGlobal,sendGlobal,updateProfile,verificationRequest,follow,requestFriend,listFriends,answerFriend,myProfile,uploadAvatar,
 uploadCommunityFile,mediaURL,callable,maskError,enabled:()=>enabled(),explain:EXPLAIN};
})();
