/* 1UP Community adapter: the site is public; participation requires Firebase.
   Episode comments require a 1UP account (email + password); anonymous sessions are only used for reports.
   Community posts and replies require a non-anonymous 1UP account (email + password).
   All writes go through rate-limited server functions; never trust client flags. */
(()=>{
'use strict';
let sdkPromise=null;
const REGION='us-east1';
const EXPLAIN='La comunidad todavía necesita activar Firebase y sus reglas de seguridad. Puedes explorar anime como invitado.';
const getConfig=()=>window.ONEUP_FIREBASE_CONFIG;
const normalizeId=value=>String(value||'').trim().slice(0,100);
const maskError=e=>{
 const code=String(e?.code||'');
 if(code.includes('resource-exhausted'))return 'Has publicado demasiado rápido. Espera antes de volver a comentar.';
 if(code.includes('unauthenticated'))return 'Necesitas iniciar sesión para esta acción.';
 if(code.includes('permission-denied'))return 'No tienes permisos para esta acción.';
 if(code.includes('failed-precondition'))return 'La comunidad aún no está configurada por completo.';
 if(code.includes('not-found'))return 'Falta publicar el servidor de la comunidad.';
 return e?.message?.slice(0,180)||'No se pudo conectar con la comunidad.';
};
async function sdk(){
 if(sdkPromise)return sdkPromise;
 if(!getConfig()?.apiKey||!getConfig()?.projectId||!getConfig()?.authDomain)
  throw new Error(EXPLAIN);
 sdkPromise=(async()=>{
  const [app,auth,db,funcs,storage,appCheck]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-functions.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-check.js')
  ]);
  const config=getConfig();
  const instance=app.getApps().length?app.getApp():app.initializeApp(config);
  if(!window.ONEUP_APP_CHECK_SITE_KEY){
   throw new Error('La comunidad requiere una clave pública de App Check reCAPTCHA Enterprise en social-config.js.');
  }
  try{
   appCheck.initializeAppCheck(instance,{
    provider:new appCheck.ReCaptchaEnterpriseProvider(window.ONEUP_APP_CHECK_SITE_KEY),
    isTokenAutoRefreshEnabled:true
   });
  }catch(error){
   if(!String(error.message||'').includes('already initialized'))throw error;
  }
  return {app,auth,db,funcs,storage,instance,
   authentication:auth.getAuth(instance),
   firestore:db.getFirestore(instance),
   functions:funcs.getFunctions(instance,REGION),
   files:storage.getStorage(instance)};
 })().catch(e=>{sdkPromise=null;throw e});
 return sdkPromise;
}
async function firebaseAccount(){
 const x=await sdk();
 await x.authentication.authStateReady();
 return x.authentication.currentUser;
}
function registered(user){
 // Any non-anonymous Firebase account counts: 1UP accounts are email + password only.
 return Boolean(user&&!user.isAnonymous);
}
async function guestAccess(){
 const x=await sdk();
 await x.authentication.authStateReady();
 if(!x.authentication.currentUser){
  await x.auth.signInAnonymously(x.authentication);
 }
 return x.authentication.currentUser;
}
async function loginWithEmail(email,password){
 const x=await sdk();
 const result=await x.auth.signInWithEmailAndPassword(x.authentication,String(email||'').trim(),String(password||''));
 return result.user||await firebaseAccount();
}
async function callable(name,values){
 const x=await sdk();
 const fn=x.funcs.httpsCallable(x.functions,name);
 const response=await fn(values);
 return response.data;
}
function episodeThread(animeId,episode){
 const aid=normalizeId(animeId),number=Number(episode);
 if(!/^(mal|al)-\d+$/.test(aid)||!Number.isInteger(number)||number<1||number>9999)throw Error('Identificador de capítulo incorrecto.');
 return aid+'_ep_'+number;
}
function subscribeEpisode(animeId,episode,cb,onError){
 return sdk().then(x=>{
  const thread=episodeThread(animeId,episode);
  const ref=x.db.collection(x.firestore,'episodeThreads',thread,'comments');
  const q=x.db.query(ref,x.db.where('status','==','visible'),x.db.orderBy('createdAt','desc'),x.db.limit(40));
  return x.db.onSnapshot(q,snap=>{
   const items=snap.docs.map(doc=>({id:doc.id,...doc.data()}));
   cb(items);
  },err=>(onError||(()=>{}))(maskError(err)));
 });
}
function subscribeGlobal(cb,onError){
 return sdk().then(x=>{
  const q=x.db.query(x.db.collection(x.firestore,'globalMessages'),x.db.where('status','==','visible'),x.db.orderBy('createdAt','desc'),x.db.limit(60));
  return x.db.onSnapshot(q,snap=>cb(snap.docs.map(d=>({id:d.id,...d.data()}))),e=>(onError||(()=>{}))(maskError(e)));
 });
}
async function sendGlobal(text){
 const user=await firebaseAccount();
 if(!registered(user))throw Error('Para escribir en el chat global necesitas una cuenta 1UP.');
 return callable('sendGlobalMessage',{text});
}
async function updateProfile({displayName,icon,avatarPath}) {
 const user=await firebaseAccount();
 if(!registered(user))throw Error('Inicia sesión con tu cuenta 1UP para personalizar tu perfil.');
 return callable('setMyCommunityProfile',{displayName,icon,avatarPath});
}
async function verificationRequest(reason){
 const user=await firebaseAccount();
 if(!registered(user))throw Error('Inicia sesión con tu cuenta 1UP para solicitar verificación.');
 return callable('requestVerification',{reason});
}
async function follow(uid){
 const user=await firebaseAccount();
 if(!registered(user))throw Error('Inicia sesión con tu cuenta 1UP para seguir perfiles.');
 return callable('toggleFollow',{targetUid:uid});
}
async function myProfile(){
 const user=await firebaseAccount();
 if(!registered(user))return null;
 const x=await sdk();
 const s=await x.db.getDoc(x.db.doc(x.firestore,'creatorProfiles',user.uid));
 return s.exists()?s.data():null;
}
async function uploadAvatar(file){
 const user=await firebaseAccount();
 if(!registered(user))throw Error('Inicia sesión con tu cuenta 1UP para subir foto de perfil.');
 const valid={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
 const ext=valid[file.type];
 if(!ext||file.size>5*1024*1024)throw Error('Se admiten fotos JPG, PNG o WebP de hasta 5 MB.');
 const x=await sdk(),path='avatars/'+user.uid+'/'+crypto.randomUUID()+'.'+ext;
 await x.storage.uploadBytes(x.storage.ref(x.files,path),file,{contentType:file.type});
 return path;
}
async function sendEpisodeComment(animeId,episode,pseudonym,text){
 await guestAccess();
 return callable('submitEpisodeComment',{animeId,episode,pseudonym,text});
}
function subscribeFeed(cb,onError){
 return sdk().then(x=>{
  const q=x.db.query(x.db.collection(x.firestore,'communityPosts'),x.db.where('status','==','visible'),x.db.orderBy('createdAt','desc'),x.db.limit(35));
  return x.db.onSnapshot(q,snap=>cb(snap.docs.map(d=>({id:d.id,...d.data()}))),(err)=>(onError||(()=>{}))(maskError(err)));
 });
}
async function publishPost({text,kind='debate',mediaPath=''}){const user=await firebaseAccount();if(!registered(user))throw Error('Para publicar en 1UP Comunidad necesitas iniciar sesión con tu cuenta 1UP.');return callable('createCommunityPost',{text,kind,mediaPath})}
async function replyToPost(postId,text){const user=await firebaseAccount();if(!registered(user))throw Error('Para comentar publicaciones de la comunidad necesitas una cuenta 1UP.');return callable('replyCommunityPost',{postId,text})}
function subscribeReplies(postId,cb,onError){
 return sdk().then(x=>{
  const q=x.db.query(x.db.collection(x.firestore,'communityPosts',postId,'comments'),x.db.where('status','==','visible'),x.db.orderBy('createdAt','asc'),x.db.limit(60));
  return x.db.onSnapshot(q,snap=>cb(snap.docs.map(d=>({id:d.id,...d.data()}))),e=>(onError||(()=>{}))(maskError(e)));
 });
}
async function react(postId){const user=await firebaseAccount();if(!registered(user))throw Error('Para reaccionar en la comunidad necesitas una cuenta 1UP.');return callable('toggleCommunityReaction',{postId})}
async function report(type,id,reason){await guestAccess();return callable('reportContent',{type,id,reason})}
async function uploadCommunityFile(file,postId){
 const user=await firebaseAccount();
 if(!registered(user))throw Error('Necesitas iniciar sesión con tu cuenta 1UP para subir contenido.');
 const types=['image/jpeg','image/png','image/webp','video/mp4'];
 if(!types.includes(file.type))throw Error('Solo se admiten JPG, PNG, WebP o MP4.');
 const max=file.type==='video/mp4'?25*1024*1024:5*1024*1024;
 if(file.size>max)throw Error('El archivo excede el límite de '+(max/1024/1024)+' MB.');
 const x=await sdk();
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4'}[file.type];
 const path='postUploads/'+user.uid+'/'+postId+'/media.'+ext;
 await x.storage.uploadBytes(x.storage.ref(x.files,path),file,{contentType:file.type,customMetadata:{ownerUid:user.uid}});
 return path;
}
async function requestFriend(uid){
 const user=await firebaseAccount();
 if(!registered(user))throw Error('Inicia sesión con tu cuenta 1UP para enviar invitaciones.');
 return callable('requestFriendship',{targetUid:uid});
}
async function listFriends(){
 const user=await firebaseAccount();
 if(!registered(user))throw Error('Necesitas iniciar sesión con tu cuenta 1UP para consultar amigos.');
 return callable('listMyFriendRequests',{});
}
async function answerFriend(uid,accept){
 const user=await firebaseAccount();
 if(!registered(user))throw Error('Necesitas iniciar sesión con tu cuenta 1UP.');
 return callable('respondFriendship',{fromUid:uid,accept:!!accept});
}
async function mediaURL(path){
 const x=await sdk();
 return x.storage.getDownloadURL(x.storage.ref(x.files,path));
}
window.OneUpSocialBackend={sdk,firebaseAccount,guestAccess,registered,loginWithEmail,episodeThread,
 subscribeEpisode,sendEpisodeComment,subscribeFeed,publishPost,replyToPost,subscribeReplies,react,report,
 subscribeGlobal,sendGlobal,updateProfile,verificationRequest,follow,requestFriend,listFriends,answerFriend,myProfile,uploadAvatar,
 uploadCommunityFile,mediaURL,callable,maskError,enabled:()=>Boolean(getConfig()?.apiKey),explain:EXPLAIN};
})();
