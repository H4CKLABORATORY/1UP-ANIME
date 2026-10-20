/* ONE UP optional identity; Firebase Google requires owner configuration. */
(()=>{
'use strict';
const KEY='oneup_identity_v2';
const $=s=>document.querySelector(s);
const listeners=new Set();
let current={kind:'guest',key:'guest',name:'Invitado'};
let firebaseAuth=null;
let identityVersion=0;
function emit(){for(const cb of listeners){try{cb({...current})}catch{}}}
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.kind==='local'&&typeof v.key==='string')current=v}catch{}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(current))}catch{}emit()}
function guest(){
 identityVersion++;
 void window.OneUpEmailAuth?.logout().catch(()=>{});
 if(firebaseAuth)void import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js').then(mod=>mod.signOut(firebaseAuth)).catch(()=>{});
 current={kind:'guest',key:'guest',name:'Invitado'};save();render();
}
function local(key,name){identityVersion++;void window.OneUpEmailAuth?.logout().catch(()=>{});current={kind:'local',key:'local_'+key,name:name||'Perfil'};save()}
function get(){return {...current}}
function onChange(cb){listeners.add(cb);return()=>listeners.delete(cb)}
function missing(){return 'Google necesita configurar Firebase: crea un proyecto, habilita Google en Authentication, autoriza h4cklaboratory.github.io y completa auth-config.js. Invitado ya funciona.'}
async function google(){
 const config=window.ONEUP_FIREBASE_CONFIG;
 if(!config?.apiKey||!config?.projectId||!config?.authDomain)return {ok:false,message:missing()};
 try{
  await window.OneUpEmailAuth?.logout();identityVersion++;
  const [app,auth]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);
  const instance=app.getApps().length?app.getApp():app.initializeApp(config);
  firebaseAuth=auth.getAuth(instance);
  const provider=new auth.GoogleAuthProvider();
  let result;
  try{result=await auth.signInWithPopup(firebaseAuth,provider)}
  catch(e){
   if(['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(e.code)){
    await auth.signInWithRedirect(firebaseAuth,provider);return {ok:false,message:'Redirigiendo a Google…'}
   }throw e;
  }
  const u=result.user;
  current={kind:'google',key:'google_'+u.uid,name:u.displayName||u.email?.split('@')[0]||'Google',email:u.email||''};
  save();return {ok:true,name:current.name}
 }catch(e){return {ok:false,message:'No fue posible iniciar sesión con Google: '+(e?.message||'Error desconocido')}}
}
async function restoreVerifiedGoogle(){
 const version=identityVersion;
 const config=window.ONEUP_FIREBASE_CONFIG;
 if(!config?.apiKey||!config?.authDomain||!config?.projectId)return;
 try{
  const [app,auth]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);
  const instance=app.getApps().length?app.getApp():app.initializeApp(config);
  firebaseAuth=auth.getAuth(instance);
  const result=await auth.getRedirectResult(firebaseAuth).catch(()=>null);
  await firebaseAuth.authStateReady();
  const u=result?.user||firebaseAuth.currentUser;
  if(u&&version===identityVersion&&current.kind!=='oneup'){
   current={kind:'google',key:'google_'+u.uid,name:u.displayName||u.email?.split('@')[0]||'Google',email:u.email||''};
   save();render();
  }
 }catch(e){console.warn('Firebase authentication unavailable',e?.message)}
}
function storedProfiles(){
 try{
  const profiles=JSON.parse(localStorage.getItem('oneup_profiles_v1')||'[]');
  return Array.isArray(profiles)?profiles.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim()).slice(0,6):[];
 }catch{return []}
}
function googleConfigured(){
 const c=window.ONEUP_FIREBASE_CONFIG;
 return Boolean(c?.apiKey&&c?.projectId&&c?.authDomain);
}
function render(){
 const label=$('#auth-label');
 if(label)label.textContent=(current.name||'Invitado').slice(0,17);
 const signout=$('#auth-signout');
 if(signout){signout.hidden=!['google','oneup'].includes(current.kind);signout.textContent='Cerrar sesión';}
 const googleButton=$('#google-login');
 if(googleButton){
  const configured=googleConfigured();
  googleButton.disabled=!configured;
  googleButton.title=configured?'Continuar con Google':'El acceso con Google está pendiente de configuración';
  const caption=$('#auth-google-label');
  if(caption)caption.textContent=configured?'Continuar con Google':'Google · próximamente';
 }
 const help=$('#auth-service-note');
 if(help)help.textContent=googleConfigured()
  ?'También puedes entrar sin registrarte. Tus listas locales se guardan solo en este dispositivo.'
  :'Google estará disponible cuando se configure el acceso. Puedes continuar como invitado sin esperar.';
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
function init(){
 read();render();void restoreVerifiedGoogle();
 const dialog=$('#auth-dialog'),open=$('#auth-open');
 if(!dialog||!open)return;
 const message=$('#auth-message'),close=$('#auth-close');
 const show=()=>{
  render();refreshProfiles();
  if(message)message.textContent='';
  if(!dialog.open)dialog.showModal();
  close?.focus({preventScroll:true});
 };
 open.addEventListener('click',show);
 close?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 $('#guest-login')?.addEventListener('click',()=>{
  guest();render();dialog.close();
 });
 $('#auth-profile-enter')?.addEventListener('click',()=>{
  const id=$('#auth-profile-select')?.value;
  const profile=storedProfiles().find(entry=>entry.id===id);
  if(!profile){if(message)message.textContent='Selecciona un perfil guardado válido.';return}
  local(profile.id,profile.name);render();dialog.close();
 });
 $('#auth-signout')?.addEventListener('click',async()=>{
  try{
   if(firebaseAuth){
    const mod=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');
    await mod.signOut(firebaseAuth);
   }
  }catch(error){console.warn('Google sign-out failed',error?.message)}
  guest();render();dialog.close();
 });
 $('#google-login')?.addEventListener('click',async()=>{
  const button=$('#google-login');
  if(!googleConfigured()||!button||button.disabled)return;
  button.disabled=true;
  if(message)message.textContent='Conectando con Google…';
  try{
   const response=await google();
   if(message)message.textContent=response.ok?'Sesión iniciada correctamente.':response.message;
   if(response.ok){render();dialog.close()}
  }finally{
   render();
  }
 });
 emit();
}
window.OneUpAuth={guest,local,google,get,onChange};
// Identity is presentation only. Backend authorization never trusts this event or localStorage.
window.addEventListener('oneup-auth-identity',event=>{
 if(event.detail?.kind==='oneup'){
  identityVersion++;
  if(firebaseAuth)void import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js').then(mod=>mod.signOut(firebaseAuth)).catch(()=>{});
  current={...event.detail};emit();render();
 }else if(current.kind==='oneup'){
  current={kind:'guest',key:'guest',name:'Invitado'};emit();render();
 }
});
document.addEventListener('DOMContentLoaded',init);
})();
