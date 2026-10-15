/* ONE UP optional identity; Firebase Google requires owner configuration. */
(()=>{
'use strict';
const KEY='oneup_identity_v2';
const $=s=>document.querySelector(s);
const listeners=new Set();
let current={kind:'guest',key:'guest',name:'Invitado'};
let firebaseAuth=null;
function emit(){for(const cb of listeners){try{cb({...current})}catch{}}}
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.kind==='local'&&typeof v.key==='string')current=v}catch{}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(current))}catch{}emit()}
function guest(){current={kind:'guest',key:'guest',name:'Invitado'};save()}
function local(key,name){current={kind:'local',key:'local_'+key,name:name||'Perfil'};save()}
function get(){return {...current}}
function onChange(cb){listeners.add(cb);return()=>listeners.delete(cb)}
function missing(){return 'Google necesita configurar Firebase: crea un proyecto, habilita Google en Authentication, autoriza h4cklaboratory.github.io y completa auth-config.js. Invitado ya funciona.'}
async function google(){
 const config=window.ONEUP_FIREBASE_CONFIG;
 if(!config?.apiKey||!config?.projectId||!config?.authDomain)return {ok:false,message:missing()};
 try{
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
 const config=window.ONEUP_FIREBASE_CONFIG;
 if(!config?.apiKey||!config?.authDomain||!config?.projectId)return;
 try{
  const [app,auth]=await Promise.all([import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')]);
  const instance=app.getApps().length?app.getApp():app.initializeApp(config);
  firebaseAuth=auth.getAuth(instance);
  const result=await auth.getRedirectResult(firebaseAuth).catch(()=>null);
  await firebaseAuth.authStateReady();
  const u=result?.user||firebaseAuth.currentUser;
  if(u){
   current={kind:'google',key:'google_'+u.uid,name:u.displayName||u.email?.split('@')[0]||'Google',email:u.email||''};
   save();render();
  }
 }catch(e){console.warn('Firebase authentication unavailable',e?.message)}
}
function storedProfiles(){try{const p=JSON.parse(localStorage.getItem('oneup_profiles_v1')||'[]');return Array.isArray(p)?p.filter(x=>x&&x.id&&x.name):[]}catch{return []}}
function render(){
 const label=$('#auth-label');if(label)label.textContent=(current.name||'Invitado').slice(0,17);
 const out=$('#auth-signout');if(out)out.hidden=current.kind!=='google';
}
function init(){
 read();render();restoreVerifiedGoogle();
 const dialog=$('#auth-dialog'),open=$('#auth-open');
 if(!dialog||!open)return;
 open.addEventListener('click',()=>{render();$('#auth-message').textContent='';if(!dialog.open)dialog.showModal()});
 $('#auth-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
 $('#guest-login').addEventListener('click',()=>{guest();render();dialog.close()});
 $('#auth-signout').addEventListener('click',async()=>{
   try{if(firebaseAuth){const mod=await import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js');await mod.signOut(firebaseAuth)}}catch{}
   guest();render();dialog.close();
 });
 $('#google-login').addEventListener('click',async()=>{
  const b=$('#google-login');b.disabled=true;$('#auth-message').textContent='Conectando con Google…';
  const response=await google();b.disabled=false;$('#auth-message').textContent=response.ok?'Sesión iniciada correctamente.':response.message;
  if(response.ok){render();dialog.close()}
 });
 if(storedProfiles().length){
  const el=document.createElement('button');el.type='button';el.id='existing-profiles';el.className='guest-login';el.textContent='Usar perfil guardado en este dispositivo';
  $('#guest-login').after(el);
  el.addEventListener('click',()=>{
   const profiles=storedProfiles();
   const names=profiles.map((p,i)=>(i+1)+'. '+p.name).join('\n');
   const answer=prompt('Selecciona el número de tu perfil:\n'+names,'1');
   const p=profiles[Number(answer)-1];if(!p)return;
   local(p.id,p.name);render();dialog.close();
  });
 }
 emit();
}
window.OneUpAuth={guest,local,google,get,onChange};
document.addEventListener('DOMContentLoaded',init);
})();