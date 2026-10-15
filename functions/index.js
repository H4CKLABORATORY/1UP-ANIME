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
 const flags=await publicFlags(req.auth.uid);
 const response=await throttleAndWrite(req,'post',(tx,uid,now)=>{
  const ref=db.collection('communityPosts').doc();
  tx.set(ref,{authorUid:uid,displayName:nameOf(req),kind,text:body,mediaPath:path,
   verified:flags.verified===true,owner:flags.owner===true,likes:0,
   status:'visible',createdAt:Timestamp.fromMillis(now),reports:0});
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
 const flags=await publicFlags(req.auth.uid);
 const response=await throttleAndWrite(req,'reply',(tx,uid,now)=>{
  const ref=post.ref.collection('comments').doc();
  tx.set(ref,{authorUid:uid,displayName:nameOf(req),verified:flags.verified===true,owner:flags.owner===true,
   text,status:'visible',createdAt:Timestamp.fromMillis(now)});
  return {id:ref.id};
 });
 return {ok:true,...response};
});
exports.sendGlobalMessage=caller(async req=>{
 requireRegistered(req);
 const text=validText(req.data?.text,350);
 const flags=await publicFlags(req.auth.uid);
 const response=await throttleAndWrite(req,'chat',(tx,uid,now)=>{
  const ref=db.collection('globalMessages').doc();
  tx.set(ref,{authorUid:uid,displayName:nameOf(req),verified:flags.verified===true,owner:flags.owner===true,
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
 const flags=await publicFlags(req.auth.uid);
 return throttleAndWrite(req,'profile',(tx,uid,now)=>{
  tx.set(db.collection('creatorProfiles').doc(uid),{displayName:handle,icon,avatarPath,
   verified:flags.verified===true,owner:flags.owner===true,updatedAt:Timestamp.fromMillis(now)},
   {merge:true});
  return {ok:true};
 });
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
