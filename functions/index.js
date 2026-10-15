// 1UP Anime — authoritative Firebase server.
'use strict';
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const admin=require('firebase-admin');
if(!admin.apps.length)admin.initializeApp();
const db=admin.firestore();
const FieldValue=admin.firestore.FieldValue;
const Timestamp=admin.firestore.Timestamp;
const common={region:'us-east1',enforceAppCheck:true,maxInstances:6};
const GUARD_MS={episode:18000,post:45000,reply:14000,react:2000,chat:15000,report:30000,profile:60000,verify:86400000};
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
 const displayName=guest?pseudonym(alias):nameOf(req);
 const row=await throttleAndWrite(req,'episode',(tx,uid,now)=>{
  const ref=db.collection('episodeThreads').doc(id).collection('comments').doc();
  tx.set(ref,{authorUid:uid,displayName,guest,verified:false,text:body,status:'visible',
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
 if(avatarPath&&!new RegExp('^avatars/'+req.auth.uid+'/profile\\.(jpg|png|webp)$').test(avatarPath))
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
