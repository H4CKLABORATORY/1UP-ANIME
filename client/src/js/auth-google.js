/* Real Google OAuth integration point; requires owner's Firebase web config and authorization.
   Guest and on-device profiles work without Firebase. */
(()=>{
'use strict';
const config=window.ONEUP_FIREBASE_CONFIG;
let prepared=null,auth=null,api=null;
const hasConfig=Boolean(config?.apiKey&&config?.projectId&&config?.authDomain&&config?.appId);
async function init(){
 if(!hasConfig)throw Error('Primero configura Firebase Authentication y habilita Google como proveedor.');
 if(prepared)return prepared;
 prepared=(async()=>{
  const [{initializeApp},{getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged}]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js')
  ]);
  const app=initializeApp(config,'1up-anime');
  auth=getAuth(app);
  api={GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged};
  return api;
 })().catch(e=>{prepared=null;throw e});
 return prepared;
}
function info(text){const e=document.getElementById('oneup-google-status');if(e)e.textContent=text}
async function login(choose){
 if(!hasConfig){info('Pendiente: configurar Google en Firebase');alert('Para habilitar el inicio de sesión real con Google falta registrar 1UP Anime en Firebase, habilitar Google y autorizar h4cklaboratory.github.io. Puedes entrar como invitado.');return}
 const btn=document.getElementById('oneup-google-login');
 if(btn)btn.disabled=true;
 try{
  const tools=await init(),provider=new tools.GoogleAuthProvider();
  provider.setCustomParameters({prompt:'select_account'});
  const result=await tools.signInWithPopup(auth,provider);
  const user=result.user;
  if(!user?.uid)throw Error('Google no devolvió una cuenta válida.');
  choose({id:'google-'+user.uid,name:user.displayName||'Usuario Google',avatar:0});
  info('Cuenta verificada con Google');
 }catch(err){
  info('Google: '+String(err.code||err.message||'No se pudo iniciar sesión').slice(0,115));
 }finally{if(btn)btn.disabled=false}
}
window.OneUpGoogle={login,configured:hasConfig};
if(hasConfig){window.addEventListener('DOMContentLoaded',()=>{info('Continuar con Google');init().catch(()=>info('Google no está disponible'))})}
})();