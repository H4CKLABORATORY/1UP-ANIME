// 1UP Anime — authoritative Firebase server.
'use strict';
const {onCall,onRequest,HttpsError}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {buildClient,err:anime1vError}=require('./anime1v-adapter');
const anime1vKey=defineSecret('ANIME1V_API_KEY');
const admin=require('firebase-admin');
if(!admin.apps.length)admin.initializeApp();
const db=admin.firestore();
const FieldValue=admin.firestore.FieldValue;
const Timestamp=admin.firestore.Timestamp;
const common={region:'us-east1',enforceAppCheck:true,maxInstances:6};
const GUARD_MS={episode:18000,post:45000,reply:14000,react:2000,chat:15000,report:30000,profile:60000,verify:86400000,friend:45000};
const genres=['debate','pregunta','fanart','clip','manga','recomendacion'];
const clean=(s,n=800)=>String(s||'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n+1);
const account=req=>req.auth?.token?.firebase?.sign_in_provider||'';
function requireAuth(req){if(!req.auth?.uid)throw new HttpsError('unauthenticated','Se requiere una sesión, incluso para comentar como invitado.')}
function requireRegistered(req){
 requireAuth(req);
 if(account(req)!=='google.com')throw new HttpsError('permission-denied','Para participar en la comunidad necesitas una cuenta de Google.');
}
function nameOf(req){
 const value=clean(req.auth?.token?.name || (req.auth?.token?.email||'').split('@')[0] || 'Fan del anime',28);
 return value||'Fan del anime';
}
function validText(raw,max,min=2){
 const value=clean(raw,max);
 if(value.length<min||value.length>max)throw new HttpsError('invalid-argument','Escribe un mensaje de '+min+' a '+max+' caracteres.');
 return value;
}
function pseudonym(raw){
 const str=clean(raw,25);
 if(str.length<3||str.length>25)throw new HttpsError('invalid-argument','El nombre temporal debe tener entre 3 y 25 caracteres.');
 if(/^(admin|mod|moderador|propietario|owner|soporte|1up|1up anime|one up|verificado|verified)$/i.test(str))
  throw new HttpsError('invalid-argument','Este nombre está reservado.');
 return str;
}
function threadName(anime,episode){
 const id=clean(anime,42),ep=Number(episode);
 if(!/^(mal|al)-\d{1,11}$/.test(id)||!Number.isInteger(ep)||ep<1||ep>9999)
  throw new HttpsError('invalid-argument','Anime o número de episodio incorrecto.');
 return id+'_ep_'+ep;
}
async function throttleAndWrite(req,kind,write){
 requireAuth(req);
 const uid=req.auth.uid;
 const ref=db.collection('rateLimits').doc(uid);
 return db.runTransaction(async tx=>{
  const snap=await tx.get(ref),data=snap.exists?snap.data():{},now=Date.now();
  const previous=Number(data[kind]||0);
  if(previous&&now-previous<GUARD_MS[kind])throw new HttpsError('resource-exhausted','Espera un momento antes de publicar de nuevo.');
  const windowStart=Number(data.windowStart||0),hourly=now-windowStart<3600000?Number(data.hourly||0):0;
  if(hourly>=55)throw new HttpsError('resource-exhausted','Límite de publicaciones alcanzado; inténtalo más tarde.');
  tx.set(ref,{[kind]:now,windowStart:now-windowStart<3600000?windowStart:now,hourly:hourly+1},{merge:true});
  return write(tx,uid,now);
 });
}
function publicFlags(uid){return db.collection('creatorFlags').doc(uid).get().then(d=>d.exists?d.data():{})}
async function publicAuthor(req){
 const [flags,prof]=await Promise.all([
  publicFlags(req.auth.uid),
  db.collection('creatorProfiles').doc(req.auth.uid).get()
 ]);
 const profile=prof.exists?prof.data():{};
 return {displayName:clean(profile.displayName||nameOf(req),28),
  icon:clean(profile.icon||'⚔️',10),
  avatarPath:clean(profile.avatarPath||'',270),
  verified:flags.verified===true,
  owner:flags.owner===true};
}
async function requireModerator(req){
 requireRegistered(req);
 const snap=await db.collection('adminRoles').doc(req.auth.uid).get();
 if(!snap.exists || !['owner','moderator'].includes(snap.data()?.role))
  throw new HttpsError('permission-denied','Solo puede aprobarlo el equipo de moderación.');
 return snap.data();
}

function caller(fn){return onCall(common,fn)}
exports.submitEpisodeComment=caller(async req=>{
 requireAuth(req);
 const {animeId,episode,text,pseudonym:alias}=req.data||{};
 const id=threadName(animeId,episode),body=validText(text,900);
 if(/(?:https?:\/\/|www\.)/i.test(body)&&account(req)==='anonymous')throw new HttpsError('invalid-argument','Los invitados no pueden publicar enlaces.');
 const guest=account(req)==='anonymous';
 const author=guest?null:await publicAuthor(req);
 const displayName=guest?pseudonym(alias):author.displayName;
 const row=await throttleAndWrite(req,'episode',(tx,uid,now)=>{
  const ref=db.collection('episodeThreads').doc(id).collection('comments').doc();
  tx.set(ref,{authorUid:uid,displayName,guest,verified:author?.verified===true,owner:author?.owner===true,icon:author?.icon||'',text:body,status:'visible',
    episode:Number(episode),animeId:String(animeId),createdAt:Timestamp.fromMillis(now),reports:0});
  return {id:ref.id};
 });
 return {ok:true,...row};
});
exports.createCommunityPost=caller(async req=>{
 requireRegistered(req);
 const {text,kind='debate',mediaPath=''}=req.data||{};
 const body=validText(text,2500,3);
 if(!genres.includes(kind))throw new HttpsError('invalid-argument','Tipo de publicación no admitido.');
 let path='';
 if(mediaPath){
  path=clean(mediaPath,350);
  if(!new RegExp('^postUploads/'+req.auth.uid+'/[a-zA-Z0-9_-]{8,90}/media\\.(jpg|png|webp|mp4)$').test(path))
   throw new HttpsError('invalid-argument','Ruta de archivo incorrecta.');
  const file=admin.storage().bucket().file(path);
  const [exists]=await file.exists();
  if(!exists)throw new HttpsError('invalid-argument','El archivo multimedia no existe.');
  const [meta]=await file.getMetadata();
  const mime=String(meta.contentType||'');
  if(!['image/jpeg','image/png','image/webp','video/mp4'].includes(mime))throw new HttpsError('invalid-argument','Tipo de archivo no permitido.');
  if(Number(meta.size)> (mime==='video/mp4'?25:5)*1024*1024)throw new HttpsError('invalid-argument','El archivo supera el tamaño permitido.');
 }
 const author=await publicAuthor(req);
 const response=await throttleAndWrite(req,'post',(tx,uid,now)=>{
  const ref=db.collection('communityPosts').doc();
  tx.set(ref,{authorUid:uid,displayName:author.displayName,icon:author.icon,avatarPath:author.avatarPath,kind,text:body,mediaPath:path,
   verified:author.verified,owner:author.owner,likes:0,
   status:path?'pending':'visible',createdAt:Timestamp.fromMillis(now),reports:0});
  return {id:ref.id};
 });
 return {ok:true,...response};
});
exports.replyCommunityPost=caller(async req=>{
 requireRegistered(req);
 const postId=clean(req.data?.postId,100),text=validText(req.data?.text,1200);
 if(!/^[A-Za-z0-9]{10,40}$/.test(postId))throw new HttpsError('invalid-argument','Publicación no válida.');
 const post=await db.collection('communityPosts').doc(postId).get();
 if(!post.exists||post.data().status!=='visible')throw new HttpsError('not-found','La publicación no está disponible.');
 const author=await publicAuthor(req);
 const response=await throttleAndWrite(req,'reply',(tx,uid,now)=>{
  const ref=post.ref.collection('comments').doc();
  tx.set(ref,{authorUid:uid,displayName:author.displayName,icon:author.icon,avatarPath:author.avatarPath,verified:author.verified,owner:author.owner,
   text,status:'visible',createdAt:Timestamp.fromMillis(now)});
  return {id:ref.id};
 });
 return {ok:true,...response};
});
exports.sendGlobalMessage=caller(async req=>{
 requireRegistered(req);
 const text=validText(req.data?.text,350);
 const author=await publicAuthor(req);
 const response=await throttleAndWrite(req,'chat',(tx,uid,now)=>{
  const ref=db.collection('globalMessages').doc();
  tx.set(ref,{authorUid:uid,displayName:author.displayName,icon:author.icon,avatarPath:author.avatarPath,verified:author.verified,owner:author.owner,
   text,status:'visible',createdAt:Timestamp.fromMillis(now)});
  return {id:ref.id};
 });
 return {ok:true,...response};
});
exports.toggleCommunityReaction=caller(async req=>{
 requireRegistered(req);
 const id=clean(req.data?.postId,100);
 if(!/^[A-Za-z0-9]{10,40}$/.test(id))throw new HttpsError('invalid-argument','Publicación no válida.');
 const post=db.collection('communityPosts').doc(id),reaction=post.collection('reactions').doc(req.auth.uid);
 return db.runTransaction(async tx=>{
  const [postSnap,reactionSnap]=await Promise.all([tx.get(post),tx.get(reaction)]);
  if(!postSnap.exists||postSnap.data().status!=='visible')throw new HttpsError('not-found','Publicación no disponible.');
  const delta=reactionSnap.exists?-1:1;
  if(delta<0)tx.delete(reaction);else tx.set(reaction,{uid:req.auth.uid,createdAt:FieldValue.serverTimestamp()});
  tx.update(post,{likes:FieldValue.increment(delta)});
  return {liked:delta>0};
 });
});
exports.reportContent=caller(async req=>{
 requireAuth(req);
 const {type,id,reason}=req.data||{};
 if(!['episodeComment','communityPost','communityComment','globalMessage'].includes(type))
  throw new HttpsError('invalid-argument','Tipo de reporte inválido.');
 const key=clean(id,240);
 if(!/^[A-Za-z0-9_:\/.-]{10,240}$/.test(key))throw new HttpsError('invalid-argument','Referencia inválida.');
 return throttleAndWrite(req,'report',(tx,uid,now)=>{
  const ref=db.collection('moderationReports').doc();
  tx.set(ref,{uid,type,target:key,reason:validText(reason||'Contenido inapropiado',160,4),status:'pending',
   createdAt:Timestamp.fromMillis(now)});
  return {ok:true};
 });
});
exports.setMyCommunityProfile=caller(async req=>{
 requireRegistered(req);
 const handle=pseudonym(req.data?.displayName);
 const icon=clean(req.data?.icon||'⚔️',10);
 if(!['⚔️','🔥','🦇','🌙','🐉','🎃','💀','✨'].includes(icon))
  throw new HttpsError('invalid-argument','Icono no admitido.');
 const avatarPath=clean(req.data?.avatarPath||'',270);
 if(avatarPath&&!new RegExp('^avatars/'+req.auth.uid+'/[A-Za-z0-9_-]{8,90}\\.(jpg|png|webp)$').test(avatarPath))
  throw new HttpsError('invalid-argument','Ruta de foto incorrecta.');
 const author=await publicAuthor(req);
 return throttleAndWrite(req,'profile',(tx,uid,now)=>{
  tx.set(db.collection('creatorProfiles').doc(uid),{displayName:handle,icon,avatarPath,
   verified:author.verified,owner:author.owner,updatedAt:Timestamp.fromMillis(now)},
   {merge:true});
  return {ok:true};
 });
});
exports.toggleFollow=caller(async req=>{
 requireRegistered(req);
 const target=clean(req.data?.targetUid,128);
 if(!/^[A-Za-z0-9_-]{10,128}$/.test(target)||target===req.auth.uid)
  throw new HttpsError('invalid-argument','No puedes seguir ese perfil.');
 const profile=db.collection('creatorProfiles').doc(target);
 const reference=db.collection('userFollowing').doc(req.auth.uid).collection('users').doc(target);
 return db.runTransaction(async tx=>{
  const [targetSnap,followingSnap]=await Promise.all([tx.get(profile),tx.get(reference)]);
  if(!targetSnap.exists)throw new HttpsError('not-found','El creador aún no tiene perfil público.');
  const on=!followingSnap.exists;
  if(on)tx.set(reference,{targetUid:target,createdAt:FieldValue.serverTimestamp()});
  else tx.delete(reference);
  tx.update(profile,{followers:FieldValue.increment(on?1:-1)});
  return {following:on};
 });
});
exports.moderateCommunityPost=caller(async req=>{
 const role=await requireModerator(req);
 const postId=clean(req.data?.postId,80),action=clean(req.data?.action,20);
 if(!/^[A-Za-z0-9]{10,40}$/.test(postId)||!['approve','remove'].includes(action))
  throw new HttpsError('invalid-argument','Operación de moderación incorrecta.');
 const ref=db.collection('communityPosts').doc(postId);
 const snap=await ref.get();
 if(!snap.exists)throw new HttpsError('not-found','Publicación no encontrada.');
 await ref.update({status:action==='approve'?'visible':'removed',reviewedBy:req.auth.uid,
  reviewedAt:FieldValue.serverTimestamp()});
 return {ok:true};
});
exports.reviewVerification=caller(async req=>{
 const role=await requireModerator(req);
 if(role.role!=='owner')throw new HttpsError('permission-denied','Solo el propietario puede conceder verificaciones.');
 const target=clean(req.data?.targetUid,130),decision=clean(req.data?.decision,16);
 if(!/^[A-Za-z0-9_-]{10,128}$/.test(target)||!['approve','reject'].includes(decision))
  throw new HttpsError('invalid-argument','Solicitud no válida.');
 const request=db.collection('verificationRequests').doc(target),pending=await request.get();
 if(!pending.exists||pending.data().status!=='pending')
  throw new HttpsError('failed-precondition','No hay una solicitud pendiente.');
 const approved=decision==='approve';
 const batch=db.batch();
 batch.update(request,{status:approved?'approved':'rejected',reviewedBy:req.auth.uid,
  reviewedAt:FieldValue.serverTimestamp()});
 if(approved){
  batch.set(db.collection('creatorFlags').doc(target),{verified:true,verifiedAt:FieldValue.serverTimestamp()}, {merge:true});
  batch.set(db.collection('creatorProfiles').doc(target),{verified:true}, {merge:true});
 }
 await batch.commit();
 return {ok:true,verified:approved};
});
exports.requestVerification=caller(async req=>{
 requireRegistered(req);
 const reason=validText(req.data?.reason,600,30);
 return throttleAndWrite(req,'verify',(tx,uid,now)=>{
  tx.set(db.collection('verificationRequests').doc(uid),{authorUid:uid,reason,
   status:'pending',requestedAt:Timestamp.fromMillis(now)},{merge:true});
  return {ok:true,message:'Recibimos tu solicitud. No garantiza verificación.'};
 });
});


/* Mutual friendships are not automatically created by follows.
 * Friends require an invitation plus explicit acceptance by the other user.
 */
exports.requestFriendship=caller(async req=>{
 requireRegistered(req);
 const target=clean(req.data?.targetUid,128);
 if(!/^[A-Za-z0-9_-]{10,128}$/.test(target)||target===req.auth.uid)
  throw new HttpsError('invalid-argument','No puedes enviar invitación a ese perfil.');
 const profile=await db.collection('creatorProfiles').doc(target).get();
 if(!profile.exists)throw new HttpsError('not-found','Este usuario aún no tiene perfil público.');
 const mine=await db.collection('friendships').doc(req.auth.uid).collection('contacts').doc(target).get();
 if(mine.exists)throw new HttpsError('already-exists','Ya son amigos.');
 const author=await publicAuthor(req);
 return throttleAndWrite(req,'friend',(tx,uid,now)=>{
  const ref=db.collection('friendRequests').doc(target).collection('incoming').doc(uid);
  tx.set(ref,{fromUid:uid,toUid:target,displayName:author.displayName,status:'pending',createdAt:Timestamp.fromMillis(now)});
  return {ok:true,message:'Invitación de amistad enviada.'};
 });
});
exports.listMyFriendRequests=caller(async req=>{
 requireRegistered(req);
 const [incoming,friends]=await Promise.all([
  db.collection('friendRequests').doc(req.auth.uid).collection('incoming').where('status','==','pending').limit(30).get(),
  db.collection('friendships').doc(req.auth.uid).collection('contacts').limit(60).get()
 ]);
 return {
  incoming:incoming.docs.map(d=>({fromUid:d.id,displayName:d.data().displayName||'Fan del anime',createdAt:d.data().createdAt?.toMillis()||0})),
  friends:friends.docs.map(d=>({uid:d.id,displayName:d.data().displayName||'Amigo de 1UP'}))
 };
});
exports.respondFriendship=caller(async req=>{
 requireRegistered(req);
 const sender=clean(req.data?.fromUid,128);
 const accept=req.data?.accept===true;
 if(!/^[A-Za-z0-9_-]{10,128}$/.test(sender)||sender===req.auth.uid)
  throw new HttpsError('invalid-argument','Invitación incorrecta.');
 const owner=req.auth.uid,ref=db.collection('friendRequests').doc(owner).collection('incoming').doc(sender);
 const author=await publicAuthor(req);
 return db.runTransaction(async tx=>{
  const request=await tx.get(ref);
  if(!request.exists||request.data().status!=='pending')throw new HttpsError('not-found','La invitación ya no está disponible.');
  tx.update(ref,{status:accept?'accepted':'declined',respondedAt:FieldValue.serverTimestamp()});
  if(accept){
   const mine=db.collection('friendships').doc(owner).collection('contacts').doc(sender);
   const theirs=db.collection('friendships').doc(sender).collection('contacts').doc(owner);
   tx.set(mine,{uid:sender,displayName:request.data().displayName||'Amigo',since:FieldValue.serverTimestamp()});
   tx.set(theirs,{uid:owner,displayName:author.displayName,since:FieldValue.serverTimestamp()});
  }
  return {ok:true,accepted:accept};
 });
});
exports.moderateEpisodeComment=caller(async req=>{
 await requireModerator(req);
 const thread=clean(req.data?.thread,60),comment=clean(req.data?.commentId,60);
 const action=clean(req.data?.action,16);
 if(!/^(mal|al)-\d+_ep_\d+$/.test(thread)||!/^[A-Za-z0-9]{10,40}$/.test(comment)||!['remove','restore'].includes(action))
  throw new HttpsError('invalid-argument','Operación incorrecta.');
 const ref=db.collection('episodeThreads').doc(thread).collection('comments').doc(comment);
 const snap=await ref.get();
 if(!snap.exists)throw new HttpsError('not-found','Comentario inexistente.');
 await ref.update({status:action==='remove'?'removed':'visible',reviewedBy:req.auth.uid,reviewedAt:FieldValue.serverTimestamp()});
 return {ok:true};
});


/* Protected moderation workspace. All access is server-authorized.
 * Frontend controls never grant a role or change creatorFlags directly.
 */
exports.moderationDashboard=caller(async req=>{
 const role=await requireModerator(req);
 const [posts,reports,verify]=await Promise.all([
  db.collection('communityPosts').where('status','==','pending').limit(40).get(),
  db.collection('moderationReports').where('status','==','pending').limit(40).get(),
  role.role==='owner'?db.collection('verificationRequests').where('status','==','pending').limit(40).get():Promise.resolve(null)
 ]);
 return {role:role.role,
  posts:posts.docs.map(d=>({id:d.id,displayName:d.data().displayName||'Fan',kind:d.data().kind,text:d.data().text||'',mediaPath:d.data().mediaPath||''})),
  reports:reports.docs.map(d=>({id:d.id,type:d.data().type,target:d.data().target,reason:d.data().reason||''})),
  verification:verify?verify.docs.map(d=>({uid:d.id,reason:d.data().reason||''})):[]
 };
});
exports.reviewReport=caller(async req=>{
 await requireModerator(req);
 const id=clean(req.data?.reportId,100),decision=clean(req.data?.decision,20);
 if(!/^[A-Za-z0-9]{10,50}$/.test(id)||!['resolved','dismissed'].includes(decision))
  throw new HttpsError('invalid-argument','Reporte o resolución incorrectos.');
 const ref=db.collection('moderationReports').doc(id),snap=await ref.get();
 if(!snap.exists||snap.data().status!=='pending')throw new HttpsError('not-found','Reporte no disponible.');
 await ref.update({status:decision,reviewedBy:req.auth.uid,reviewedAt:FieldValue.serverTimestamp()});
 return {ok:true};
});

exports.moderateGlobalMessage=caller(async req=>{
 await requireModerator(req);
 const id=clean(req.data?.messageId,80),action=clean(req.data?.action,16);
 if(!/^[A-Za-z0-9]{10,40}$/.test(id)||!['remove','restore'].includes(action))
  throw new HttpsError('invalid-argument','Operación no válida.');
 const ref=db.collection('globalMessages').doc(id),snap=await ref.get();
 if(!snap.exists)throw new HttpsError('not-found','Mensaje inexistente.');
 await ref.update({status:action==='remove'?'removed':'visible',reviewedBy:req.auth.uid,
  reviewedAt:FieldValue.serverTimestamp()});
 return {ok:true};
});
exports.moderateCommunityReply=caller(async req=>{
 await requireModerator(req);
 const postId=clean(req.data?.postId,80),commentId=clean(req.data?.commentId,80);
 const action=clean(req.data?.action,16);
 if(!/^[A-Za-z0-9]{10,40}$/.test(postId)||!/^[A-Za-z0-9]{10,40}$/.test(commentId)||!['remove','restore'].includes(action))
  throw new HttpsError('invalid-argument','Operación no válida.');
 const ref=db.collection('communityPosts').doc(postId).collection('comments').doc(commentId),snap=await ref.get();
 if(!snap.exists)throw new HttpsError('not-found','Respuesta inexistente.');
 await ref.update({status:action==='remove'?'removed':'visible',reviewedBy:req.auth.uid,
  reviewedAt:FieldValue.serverTimestamp()});
 return {ok:true};
});


/** Public read-only anime discovery backed by FxxMorgan's Anime1v API.
 * Firebase environment: ANIME1V_BASE_URL (https://...), secret ANIME1V_API_KEY.
 * Disabled until configured; no episode/resolve/download endpoints exposed.
 */
const anime1vAllowedOrigin='https://h4cklaboratory.github.io';
const anime1vRate=new Map();
let anime1vCachedClient=null,anime1vClientSignature='';
exports.anime1vDiscovery=onRequest({
 region:'us-east1',maxInstances:2,timeoutSeconds:15,
 secrets:[anime1vKey],cors:[anime1vAllowedOrigin]
},async (req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Vary','Origin');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method==='OPTIONS'){res.status(204).end();return}
 if(req.method!=='GET'){res.status(405).json({error:'Método no permitido.'});return}
 if(req.headers.origin&&req.headers.origin!==anime1vAllowedOrigin){
  res.status(403).json({error:'Origen no permitido.'});return;
 }
 const ip=String(req.ip||req.socket?.remoteAddress||'unknown').slice(0,85),now=Date.now();
 const old=anime1vRate.get(ip);
 const value=old&&now-old.start<60_000?old:{start:now,count:0};
 value.count++;anime1vRate.set(ip,value);
 if(anime1vRate.size>5000)anime1vRate.clear();
 if(value.count>20){res.status(429).json({error:'Demasiadas consultas. Inténtalo más tarde.'});return}
 try{
  const type=req.query.kind==='search'?'search':req.query.kind==='catalog'?'catalog':null;
  if(!type)throw anime1vError(400,'Operación no reconocida.');
  const origin=process.env.ANIME1V_BASE_URL||'';
  const secret=anime1vKey.value();
  const signature=origin+'|'+(secret?secret.length:0);
  if(!anime1vCachedClient||signature!==anime1vClientSignature){
   anime1vCachedClient=buildClient({baseUrl:origin,apiKey:secret});
   anime1vClientSignature=signature;
  }
  const body=await anime1vCachedClient.query(type,{
   q:req.query.q,provider:req.query.provider,page:req.query.page
  });
  res.status(200).json(body);
 }catch(error){
  const status=Number.isInteger(error.status)?error.status:502;
  res.status(status).json({error:status===503?'Anime1v aún no está configurada.':status===400?error.message:'Anime1v no está disponible ahora.'});
 }
});
