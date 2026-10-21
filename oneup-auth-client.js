/* Static Pages client. Credentials and opaque session tokens are never persisted. */
(()=>{
'use strict';
let access=null,recovery=null,timer=null,widget=null,captcha='',busy=false,generation=0;
const $=s=>document.querySelector(s);
const config=()=>window.ONEUP_AUTH_CONFIG;
function configured(){try{const c=config(),u=new URL(c?.endpoint);return u.protocol==='https:'&&u.pathname.endsWith('/functions/v1/oneup-auth')&&Boolean(c.turnstileSiteKey)}catch{return false}}
function emit(identity){window.dispatchEvent(new CustomEvent('oneup-auth-identity',{detail:identity}));}
function clear(){generation++;access=null;recovery=null;clearTimeout(timer);emit(null);}
async function request(action,values={},token){
 if(!configured())throw Error('1UP Auth está pendiente de configuración. Puedes continuar como invitado.');
 const r=await fetch(config().endpoint,{method:'POST',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',
  headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
  body:JSON.stringify({action,...values}),signal:AbortSignal.timeout(20000)});
 const data=await r.json();
 if(!r.ok)throw Error(data.message||'No se pudo completar la operación.');
 return data;
}
async function logout(){
 const token=access?.token;clear();
 if(token)await request('logout',{},token);
}
window.OneUpEmailAuth={configured,logout};
function accept(data){
 if(!data.identity||data.identity.kind!=='oneup'||!/^oneup_[a-f0-9-]{36}$/.test(data.identity.key)||!data.token)throw Error('Respuesta de sesión inválida.');
 const lifetime=Date.parse(data.expires_at)-Date.now();
 if(!Number.isFinite(lifetime)||lifetime<=0)throw Error('La sesión expiró. Inicia sesión de nuevo.');
 access=data;clearTimeout(timer);timer=setTimeout(clear,Math.min(lifetime,3600000));emit(data.identity);
}
function init(){
 const form=$('#oneup-auth-form'),details=$('#oneup-auth-details');if(!form||!details)return;
 const mode=$('#oneup-auth-mode'),status=$('#oneup-auth-status');
 const say=text=>{status.textContent=text;};
 function fields(){
  const m=mode.value;
  for(const el of form.querySelectorAll('[data-modes]')){
   const visible=el.dataset.modes.split(' ').includes(m);el.hidden=!visible;
   for(const input of el.querySelectorAll('input')){input.disabled=!visible;input.required=visible;}
  }
  const password=$('#oneup-auth-password');password.autocomplete=m==='login'?'current-password':'new-password';password.minLength=m==='login'?1:15;
  $('#oneup-auth-submit').textContent=({login:'Entrar',signup:'Crear cuenta',verify:'Verificar correo',recover:'Recuperar cuenta','recover-verify':'Verificar código',password:'Guardar contraseña'})[m];
  $('#oneup-auth-resend').hidden=m!=='verify';
  $('#oneup-auth-captcha').hidden=!['signup','login','recover','verify'].includes(m);
  if(m==='password'&&!recovery){mode.value='recover';fields();return;}
 }
 async function loadCaptcha(){
  if(!configured()){say('1UP Auth está pendiente de configuración. Invitado y perfiles guardados siguen disponibles.');return;}
  if(widget!==null)return;
  if(!window.turnstile){
   await new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.onload=resolve;script.onerror=()=>reject(Error('No se pudo cargar la comprobación de seguridad.'));document.head.append(script);
   });
  }
  widget=window.turnstile.render('#oneup-auth-captcha',{sitekey:config().turnstileSiteKey,theme:'dark',
   callback:token=>{captcha=token;},'expired-callback':()=>{captcha='';},'error-callback':()=>{captcha='';say('Reintenta la comprobación de seguridad.');}});
 }
 details.addEventListener('toggle',()=>{if(details.open)void loadCaptcha().catch(e=>say(e.message));});
 mode.addEventListener('change',()=>{say('');fields();});fields();
 async function submit(action){
  if(busy)return;busy=true;
  const version=generation;
  for(const button of form.querySelectorAll('button'))button.disabled=true;
  try{
   if(['signup','login','recover','resend'].includes(action)&&!captcha)throw Error('Completa la comprobación de seguridad.');
   const values={username:$('#oneup-auth-username').value,email:$('#oneup-auth-email').value,
    password:$('#oneup-auth-password').value,code:$('#oneup-auth-code').value,captcha};
   const data=await request(action,values,action==='password'?recovery?.token:undefined);
   if(version!==generation)return;
   if(action==='login'||action==='verify'){
    accept(data);say('Sesión iniciada.');$('#auth-dialog')?.close();
   }else if(action==='recover-verify'){recovery=data;mode.value='password';say('Elige una contraseña nueva.');}
   else if(action==='password'){clear();mode.value='login';say(data.message);}
   else if(action==='signup'){mode.value='verify';say(data.message);}
   else if(action==='recover'){mode.value='recover-verify';say(data.message);}
   else say(data.message);
  }catch(e){say(e.message||'Servicio no disponible.');}
  finally{
   busy=false;$('#oneup-auth-password').value='';$('#oneup-auth-code').value='';captcha='';
   if(widget!==null)window.turnstile?.reset(widget);
   for(const button of form.querySelectorAll('button'))button.disabled=false;
   fields();
  }
 }
 form.addEventListener('submit',event=>{event.preventDefault();if(form.reportValidity())void submit(mode.value);});
 $('#oneup-auth-resend').addEventListener('click',()=>{if($('#oneup-auth-email').reportValidity())void submit('resend');});
 $('#auth-dialog')?.addEventListener('close',()=>{generation++;form.querySelectorAll('input[type=password],input[name=code]').forEach(i=>{i.value='';});recovery=null;if(mode.value==='password'){mode.value='recover';fields();}});
 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&access)request('session',{},access.token).then(data=>{if(access)emit(data.identity);}).catch(clear);
 });
}
document.addEventListener('DOMContentLoaded',init);
})();
