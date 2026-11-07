/* ONE UP Anime — native accounts (email + password, Firebase Authentication).
 * No third-party sign-in: accounts are created here with username + email + password.
 * Passwords are NEVER stored by 1UP: Firebase Authentication hashes them.
 * Usernames are unique: claimed in Firestore (usernames/{username} + users/{uid}).
 * Guests can browse freely; a 1UP account is required to comment or save favorites.
 * Without a Firebase project configured (auth-config.js), only guest/local
 * profiles work and the account forms explain what is missing.
 * Firebase SDK is loaded on demand from the official gstatic CDN (v12.19.0).
 */
(()=>{
'use strict';
const FIREBASE_SDK_VERSION='12.19.0';
const SDK_BASE='https://www.gstatic.com/firebasejs/'+FIREBASE_SDK_VERSION+'/';
const KEY='oneup_identity_v2';
const $=s=>document.querySelector(s);
const listeners=new Set();
let current={kind:'guest',key:'guest',name:'Invitado'};
let fb=null;           // {app, auth, db, instance} Firebase modules
let firebaseAuth=null; // Auth instance
let firebaseDb=null;   // Firestore instance
let fbPromise=null;
let listenerAttached=false;
const RESERVED_USERNAMES=['admin','moderador','moderator','owner','propietario','soporte','support','1up','oneup','verificado','verified','sistema','system','invitado','guest'];

/* ---------------- validation (pure functions) ---------------- */
function validateUsername(raw){
 const username=String(raw||'').trim().toLowerCase();
 if(username.length<3)return {ok:false,error:'El nombre de usuario necesita al menos 3 caracteres.'};
 if(username.length>20)return {ok:false,error:'El nombre de usuario admite 20 caracteres como máximo.'};
 if(!/^[a-z0-9_]+$/.test(username))return {ok:false,error:'Usa solo letras (a-z), números y guion bajo, sin espacios ni acentos.'};
 if(RESERVED_USERNAMES.includes(username))return {ok:false,error:'Ese nombre de usuario está reservado.'};
 return {ok:true,username};
}
function validateEmail(raw){
 const email=String(raw||'').trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))return {ok:false,error:'Escribe un correo válido, por ejemplo: fan@ejemplo.com.'};
 return {ok:true,email};
}
function validatePassword(raw){
 const password=String(raw||'');
 if(password.length<8)return {ok:false,error:'La contraseña necesita al menos 8 caracteres.'};
 if(!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))return {ok:false,error:'La contraseña necesita al menos una letra y un número.'};
 return {ok:true,password};
}
function configured(){
 const c=window.ONEUP_FIREBASE_CONFIG;
 return Boolean(c?.apiKey&&c?.projectId&&c?.authDomain&&c?.appId);
}
function missing(){
 return 'Las cuentas 1UP aún no están activadas: el propietario debe crear el proyecto Firebase, habilitar el registro con correo y contraseña y pegar la configuración en auth-config.js (ver docs/AUTH_SETUP.md). Mientras tanto puedes explorar como invitado.';
}
function friendlyAuthError(e){
 const code=String(e?.code||'');
 const map={
  'auth/email-already-in-use':'Ese correo ya tiene una cuenta. Inicia sesión o restablece tu contraseña.',
  'auth/invalid-email':'Ese correo no es válido.',
  'auth/weak-password':'La contraseña es demasiado débil: mínimo 8 caracteres, con letra y número.',
  'auth/invalid-credential':'Correo o contraseña incorrectos.',
  'auth/user-not-found':'Correo o contraseña incorrectos.',
  'auth/wrong-password':'Correo o contraseña incorrectos.',
  'auth/too-many-requests':'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
  'auth/network-request-failed':'Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.',
  'auth/operation-not-allowed':'El registro con correo y contraseña no está habilitado en este proyecto Firebase.',
  'auth/user-disabled':'Esta cuenta está deshabilitada.',
  'auth/requires-recent-login':'Vuelve a iniciar sesión para completar esta acción.',
  'permission-denied':'No se pudo guardar tu perfil: faltan las reglas de Firestore. El propietario debe desplegar firestore.rules (ver docs/AUTH_SETUP.md).',
  'username-taken':'Ese nombre de usuario ya está en uso. Elige otro.'
 };
 if(map[code])return map[code];
 const msg=String(e?.message||'').slice(0,160);
 return 'No se pudo completar: '+(msg||'error desconocido');
}

/* ---------------- Firebase loading (local persistence) ---------------- */
function defaultLoader(){
 if(fbPromise)return fbPromise;
 fbPromise=(async()=>{
  const [app,auth,db]=await Promise.all([
   import(SDK_BASE+'firebase-app.js'),
   import(SDK_BASE+'firebase-auth.js'),
   import(SDK_BASE+'firebase-firestore.js')
  ]);
  const config=window.ONEUP_FIREBASE_CONFIG;
  const instance=app.getApps().length?app.getApp():app.initializeApp(config);
  firebaseAuth=auth.getAuth(instance);
  firebaseDb=db.getFirestore(instance);
  // Explicit local persistence: the session survives reloads and restarts.
  try{await auth.setPersistence(firebaseAuth,auth.browserLocalPersistence);}catch(err){console.warn('Auth persistence could not be set',err?.message)}
  fb={app,auth,db,instance};
  return fb;
 })().catch(e=>{fbPromise=null;throw e});
 return fbPromise;
}
function loadFirebase(){
 // Test seam: tests inject a fake Firebase implementation here.
 if(typeof window.__ONEUP_FIREBASE_LOADER__==='function'){
  if(fbPromise)return fbPromise;
  fbPromise=window.__ONEUP_FIREBASE_LOADER__().then(async loaded=>{
   fb=loaded;
   firebaseAuth=loaded.auth.getAuth(loaded.instance);
   firebaseDb=loaded.db.getFirestore(loaded.instance);
   try{await loaded.auth.setPersistence(firebaseAuth,loaded.auth.browserLocalPersistence);}catch(err){console.warn('Auth persistence could not be set',err?.message)}
   return fb;
  }).catch(e=>{fbPromise=null;throw e});
  return fbPromise;
 }
 return defaultLoader();
}

/* ---------------- identity state ---------------- */
function emit(){for(const cb of listeners){try{cb({...current})}catch{}}}
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.kind==='local'&&typeof v.key==='string')current=v}catch{}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(current))}catch{}emit()}
function guest(){current={kind:'guest',key:'guest',name:'Invitado'};save()}
function local(key,name){current={kind:'local',key:'local_'+key,name:name||'Perfil'};save()}
function get(){return {...current}}
function isAccount(){return current.kind==='account'}
function onChange(cb){listeners.add(cb);return()=>listeners.delete(cb)}

async function applyFirebaseUser(user){
 if(!user)return false;
 let username='';
 try{
  const snap=await fb.db.getDoc(fb.db.doc(firebaseDb,'users',user.uid));
  if(snap.exists())username=String(snap.data()?.username||'');
 }catch{}
 username=username||user.displayName||(user.email||'').split('@')[0]||'Fan 1UP';
 current={kind:'account',key:'account_'+user.uid,name:username,email:user.email||'',uid:user.uid};
 save();render();
 return true;
}
function attachAuthListener(){
 if(listenerAttached||!fb)return;
 listenerAttached=true;
 fb.auth.onAuthStateChanged(firebaseAuth,async user=>{
  if(!user){if(current.kind==='account'){guest();render()}return}
  await applyFirebaseUser(user);
 });
}
async function restoreAccount(){
 if(!configured())return;
 try{
  await loadFirebase();
  attachAuthListener();
  await fb.auth.authStateReady(firebaseAuth);
  const user=firebaseAuth.currentUser;
  if(user)await applyFirebaseUser(user);
 }catch(e){console.warn('Firebase authentication unavailable',e?.message)}
}

/* ---------------- native account operations ---------------- */
async function signUp({username,email,password}){
 const vu=validateUsername(username);if(!vu.ok)return {ok:false,message:vu.error};
 const ve=validateEmail(email);if(!ve.ok)return {ok:false,message:ve.error};
 const vp=validatePassword(password);if(!vp.ok)return {ok:false,message:vp.error};
 if(!configured())return {ok:false,message:missing()};
 try{
  await loadFirebase();
  const {auth,db}=fb;
  const claimRef=db.doc(firebaseDb,'usernames',vu.username);
  // Friendly pre-check; the transaction below is the atomic guard against races.
  const existing=await db.getDoc(claimRef);
  if(existing.exists())return {ok:false,message:'Ese nombre de usuario ya está en uso. Elige otro.'};
  const cred=await auth.createUserWithEmailAndPassword(firebaseAuth,ve.email,vp.password);
  const user=cred.user;
  try{
   await db.runTransaction(firebaseDb,async tx=>{
    const snap=await tx.get(claimRef);
    if(snap.exists())throw Object.assign(new Error('username-taken'),{code:'username-taken'});
    tx.set(claimRef,{uid:user.uid,username:vu.username,createdAt:db.serverTimestamp()});
    tx.set(db.doc(firebaseDb,'users',user.uid),{uid:user.uid,username:vu.username,createdAt:db.serverTimestamp()});
   });
  }catch(claimErr){
   // Do not leave an orphan Auth account behind when the username cannot be claimed.
   try{await auth.deleteUser(user);}catch{}
   return {ok:false,message:friendlyAuthError(claimErr)};
  }
  try{await auth.updateProfile(user,{displayName:vu.username});}catch{}
  current={kind:'account',key:'account_'+user.uid,name:vu.username,email:ve.email,uid:user.uid};
  save();render();
  return {ok:true,name:vu.username};
 }catch(e){return {ok:false,message:friendlyAuthError(e)}}
}
async function signIn({email,password}){
 const ve=validateEmail(email);if(!ve.ok)return {ok:false,message:ve.error};
 if(!String(password||''))return {ok:false,message:'Escribe tu contraseña.'};
 if(!configured())return {ok:false,message:missing()};
 try{
  await loadFirebase();
  const cred=await fb.auth.signInWithEmailAndPassword(firebaseAuth,ve.email,String(password));
  await applyFirebaseUser(cred.user);
  return {ok:true,name:current.name};
 }catch(e){return {ok:false,message:friendlyAuthError(e)}}
}
async function resetPassword(email){
 const ve=validateEmail(email);if(!ve.ok)return {ok:false,message:ve.error};
 if(!configured())return {ok:false,message:missing()};
 try{
  await loadFirebase();
  await fb.auth.sendPasswordResetEmail(firebaseAuth,ve.email);
  return {ok:true,message:'Te enviamos un correo para restablecer tu contraseña. Revisa también la carpeta de spam.'};
 }catch(e){
  // Do not reveal whether the email has an account.
  if(String(e?.code||'')==='auth/user-not-found')
   return {ok:true,message:'Si ese correo tiene una cuenta, te enviamos un correo para restablecer tu contraseña. Revisa también la carpeta de spam.'};
  return {ok:false,message:friendlyAuthError(e)};
 }
}
async function signOut(){
 try{
  if(firebaseAuth){await loadFirebase();await fb.auth.signOut(firebaseAuth);}
 }catch(e){console.warn('Sign-out failed',e?.message)}
 guest();render();
}

/* ---------------- gating + dialog ---------------- */
function requireAccount(action){
 if(isAccount())return true;
 openDialog('Inicia sesión para '+(action||'usar esta función')+'. Si aún no tienes cuenta, crea una: solo necesitas un nombre de usuario, un correo y una contraseña.');
 return false;
}
function showTab(tab){
 const login=$('#auth-login-form'),signup=$('#auth-signup-form'),reset=$('#auth-reset-form');
 if(login)login.hidden=tab!=='login';
 if(signup)signup.hidden=tab!=='signup';
 if(reset)reset.hidden=tab!=='reset';
 const tabLogin=$('#auth-tab-login'),tabSignup=$('#auth-tab-signup');
 if(tabLogin)tabLogin.setAttribute('aria-selected',String(tab==='login'));
 if(tabSignup)tabSignup.setAttribute('aria-selected',String(tab==='signup'));
}
function openDialog(message){
 render();
 showTab('login');
 const dialog=$('#auth-dialog');
 if(message){const m=$('#auth-message');if(m)m.textContent=message;}
 if(dialog&&!dialog.open)dialog.showModal();
}
function render(){
 const label=$('#auth-label');
 if(label)label.textContent=(current.name||'Invitado').slice(0,17);
 const signout=$('#auth-signout');
 if(signout)signout.hidden=current.kind!=='account';
 const help=$('#auth-service-note');
 if(help)help.textContent=configured()
  ?'Tu cuenta 1UP guarda tu nombre de usuario. También puedes entrar sin registrarte, pero comentar y guardar favoritos necesitan una cuenta.'
  :'Las cuentas 1UP estarán disponibles cuando el propietario configure Firebase.';
}
function refreshProfiles(){
 const details=$('#auth-profiles'),select=$('#auth-profile-select');
 if(!details||!select)return;
 const profiles=storedProfiles();
 const keep=select.value;
 select.replaceChildren();
 for(const profile of profiles){
  const option=document.createElement('option');
  option.value=profile.id;option.textContent=profile.name.slice(0,50);
  select.append(option);
 }
 if(profiles.some(profile=>profile.id===keep))select.value=keep;
 details.hidden=profiles.length===0;
 if(!profiles.length)details.open=false;
}
function storedProfiles(){
 try{
  const profiles=JSON.parse(localStorage.getItem('oneup_profiles_v1')||'[]');
  return Array.isArray(profiles)?profiles.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim()).slice(0,6):[];
 }catch{return []}
}
function init(){
 read();render();void restoreAccount();
 const dialog=$('#auth-dialog'),open=$('#auth-open');
 if(!dialog||!open)return;
 const message=$('#auth-message'),close=$('#auth-close');
 const show=()=>{
  render();refreshProfiles();showTab(isAccount()?'login':'login');
  if(message)message.textContent='';
  if(!dialog.open)dialog.showModal();
  close?.focus({preventScroll:true});
 };
 open.addEventListener('click',show);
 close?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 $('#guest-login')?.addEventListener('click',()=>{guest();render();dialog.close();});
 $('#auth-profile-enter')?.addEventListener('click',()=>{
  const id=$('#auth-profile-select')?.value;
  const profile=storedProfiles().find(entry=>entry.id===id);
  if(!profile){if(message)message.textContent='Selecciona un perfil guardado válido.';return}
  local(profile.id,profile.name);render();dialog.close();
 });
 $('#auth-signout')?.addEventListener('click',async()=>{await signOut();dialog.close();});
 $('#auth-tab-login')?.addEventListener('click',()=>showTab('login'));
 $('#auth-tab-signup')?.addEventListener('click',()=>showTab('signup'));
 $('#auth-forgot')?.addEventListener('click',()=>showTab('reset'));
 $('#auth-back-login')?.addEventListener('click',()=>showTab('login'));
 const setBusy=(form,on)=>{const b=form?.querySelector('button[type=submit]');if(b)b.disabled=on};
 $('#auth-login-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  if(message)message.textContent='Conectando…';
  setBusy(form,true);
  try{
   const data=new FormData(form);
   const response=await signIn({email:data.get('email'),password:data.get('password')});
   if(message)message.textContent=response.ok?'Sesión iniciada correctamente.':response.message;
   if(response.ok){render();dialog.close();}
  }finally{setBusy(form,false);}
 });
 $('#auth-signup-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const data=new FormData(form);
  if(String(data.get('password')||'')!==String(data.get('password2')||'')){
   if(message)message.textContent='Las contraseñas no coinciden.';
   return;
  }
  if(message)message.textContent='Creando tu cuenta…';
  setBusy(form,true);
  try{
   const response=await signUp({username:data.get('username'),email:data.get('email'),password:data.get('password')});
   if(message)message.textContent=response.ok?'Cuenta creada. ¡Bienvenido a 1UP, '+response.name+'!':response.message;
   if(response.ok){render();dialog.close();}
  }finally{setBusy(form,false);}
 });
 $('#auth-reset-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const data=new FormData(form);
  if(message)message.textContent='Enviando correo…';
  setBusy(form,true);
  try{
   const response=await resetPassword(String(data.get('email')||''));
   if(message)message.textContent=response.message;
   if(response.ok)showTab('login');
  }finally{setBusy(form,false);}
 });
 emit();
}
window.OneUpAuth={
 guest,local,get,onChange,isAccount,requireAccount,openDialog,
 signUp,signIn,resetPassword,signOut,configured,
 validate:{validateUsername,validateEmail,validatePassword},
 FIREBASE_SDK_VERSION
};
document.addEventListener('DOMContentLoaded',init);
})();
