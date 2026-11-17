/* ONE UP accounts: 100% in-page. Name + email + password, kept on this
 * device with a SHA-256 hash (never plain text). No Google, nothing external. */
(()=>{
'use strict';
const KEY='oneup_identity_v2';
const ACCOUNTS_KEY='oneup_accounts_v1';
const PROFILES_KEY='oneup_profiles_v1';
const $=s=>document.querySelector(s);
const listeners=new Set();
let current={kind:'guest',key:'guest',name:'Invitado'};
function emit(){for(const cb of listeners){try{cb({...current})}catch{}}}
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.kind==='local'&&typeof v.key==='string')current=v}catch{}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(current))}catch{}emit()}
function guest(){current={kind:'guest',key:'guest',name:'Invitado'};save()}
function local(key,name){current={kind:'local',key:'local_'+key,name:name||'Perfil'};save()}
function get(){return {...current}}
function onChange(cb){listeners.add(cb);return()=>listeners.delete(cb)}
function readAccounts(){try{const v=JSON.parse(localStorage.getItem(ACCOUNTS_KEY)||'[]');return Array.isArray(v)?v:[]}catch{return[]}}
function writeAccounts(list){try{localStorage.setItem(ACCOUNTS_KEY,JSON.stringify(list))}catch{}}
function upsertProfile(id,name){try{const v=JSON.parse(localStorage.getItem(PROFILES_KEY)||'[]');const list=Array.isArray(v)?v:[];const i=list.findIndex(p=>p&&p.id===id);if(i>=0)list[i]={id,name};else list.unshift({id,name});localStorage.setItem(PROFILES_KEY,JSON.stringify(list.slice(0,6)))}catch{}}
async function sha256(text){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function newSalt(){const b=new Uint8Array(8);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join('')}
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
async function register(input){
 const name=String(input?.name||'').trim();
 const email=String(input?.email||'').trim().toLowerCase();
 const recoveryEmail=String(input?.recoveryEmail||'').trim().toLowerCase();
 const password=String(input?.password||'');
 if(name.length<2)return {ok:false,message:'Escribe tu nombre.'};
 if(!emailOk(email))return {ok:false,message:'Escribe un correo válido.'};
 if(password.length<6)return {ok:false,message:'La contraseña necesita al menos 6 caracteres.'};
 if(recoveryEmail&&!emailOk(recoveryEmail))return {ok:false,message:'El correo de recuperación no es válido.'};
 const accounts=readAccounts();
 if(accounts.some(a=>a.email===email))return {ok:false,message:'Ya existe una cuenta con ese correo. Entra con tu contraseña.'};
 const salt=newSalt();
 const account={id:'u_'+Date.now().toString(36)+newSalt().slice(0,4),name,email,salt,passHash:await sha256(salt+':'+password),recoveryEmail,createdAt:Date.now()};
 accounts.push(account);writeAccounts(accounts);upsertProfile(account.id,account.name);
 local(account.id,account.name);
 return {ok:true,name:account.name};
}
async function login(email,password){
 email=String(email||'').trim().toLowerCase();
 const account=readAccounts().find(a=>a.email===email);
 if(!account)return {ok:false,message:'No hay una cuenta con ese correo. Crea una primero.'};
 const hash=await sha256(account.salt+':'+String(password||''));
 if(hash!==account.passHash)return {ok:false,message:'Contraseña incorrecta. Inténtalo de nuevo.'};
 upsertProfile(account.id,account.name);
 local(account.id,account.name);
 return {ok:true,name:account.name};
}
async function requestRecovery(email){
 email=String(email||'').trim().toLowerCase();
 const accounts=readAccounts();
 const account=accounts.find(a=>a.email===email||(a.recoveryEmail&&a.recoveryEmail===email));
 if(!account)return {ok:false,message:'No encontramos una cuenta con ese correo.'};
 const code=String(Math.floor(100000+Math.random()*900000));
 account.recovery={codeHash:await sha256('recovery:'+code),exp:Date.now()+10*60*1000};
 writeAccounts(accounts);
 return {ok:true,code,accountEmail:account.email};
}
async function resetPassword(email,code,newPassword){
 email=String(email||'').trim().toLowerCase();
 const accounts=readAccounts();
 const account=accounts.find(a=>a.email===email||(a.recoveryEmail&&a.recoveryEmail===email));
 if(!account||!account.recovery)return {ok:false,message:'Pide primero tu código de recuperación.'};
 if(Date.now()>account.recovery.exp){delete account.recovery;writeAccounts(accounts);return {ok:false,message:'El código venció. Genera uno nuevo.'}};
 const hash=await sha256('recovery:'+String(code||'').trim());
 if(hash!==account.recovery.codeHash)return {ok:false,message:'Código incorrecto.'};
 if(String(newPassword||'').length<6)return {ok:false,message:'La nueva contraseña necesita al menos 6 caracteres.'};
 account.salt=newSalt();account.passHash=await sha256(account.salt+':'+newPassword);delete account.recovery;writeAccounts(accounts);
 upsertProfile(account.id,account.name);local(account.id,account.name);
 return {ok:true,name:account.name};
}
function storedProfiles(){
 try{
  const profiles=JSON.parse(localStorage.getItem(PROFILES_KEY)||'[]');
  return Array.isArray(profiles)?profiles.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim()).slice(0,6):[];
 }catch{return[]}
}
function render(){
 const label=$('#auth-label');
 if(label)label.textContent=(current.name||'Invitado').slice(0,17);
 const signout=$('#auth-signout');
 if(signout)signout.hidden=current.kind!=='local';
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
function showForm(which){
 for(const pair of [['#auth-login-form',which==='login'],['#auth-register-form',which==='register'],['#auth-recovery-form',which==='recovery']]){
  const el=$(pair[0]);if(el)el.hidden=!pair[1];
 }
 const tl=$('#auth-tab-login'),tr=$('#auth-tab-register');
 if(tl)tl.classList.toggle('active',which==='login');
 if(tr)tr.classList.toggle('active',which==='register');
}
function init(){
 read();render();
 const dialog=$('#auth-dialog'),open=$('#auth-open');
 if(!dialog||!open)return;
 const message=$('#auth-message'),close=$('#auth-close');
 const dismiss=()=>{
  if(!dialog.open)return;
  if(!window.OneUpMotion?.closeDialog?.(dialog))dialog.close();
 };
 const show=()=>{
  render();refreshProfiles();showForm('login');
  if(message)message.textContent='';
  window.OneUpMotion?.prepareOpen?.(dialog);
  for(const a of dialog?.getAnimations?.()||[]){if(a.id==='oneup-motion-close')a.cancel()}
  if(!dialog.open)dialog.showModal();
  close?.focus({preventScroll:true});
 };
 open.addEventListener('click',show);
 close?.addEventListener('click',dismiss);
 dialog.addEventListener('click',event=>{if(event.target===dialog)dismiss()});
 $('#guest-login')?.addEventListener('click',()=>{guest();render();dismiss()});
 $('#auth-signout')?.addEventListener('click',()=>{guest();render();dismiss()});
 $('#auth-profile-enter')?.addEventListener('click',()=>{
  const id=$('#auth-profile-select')?.value;
  const profile=storedProfiles().find(entry=>entry.id===id);
  if(!profile){if(message)message.textContent='Selecciona un perfil guardado válido.';return}
  local(profile.id,profile.name);render();dialog.close();
 });
 $('#auth-tab-login')?.addEventListener('click',()=>showForm('login'));
 $('#auth-tab-register')?.addEventListener('click',()=>showForm('register'));
 $('#auth-forgot')?.addEventListener('click',()=>showForm('recovery'));
 $('#auth-back-login')?.addEventListener('click',()=>showForm('login'));
 $('#auth-login-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const r=await login($('#auth-login-email')?.value,$('#auth-login-password')?.value);
  if(message)message.textContent=r.ok?('Hola, '+r.name+'. Sesión iniciada.'):r.message;
  if(r.ok){render();refreshProfiles();dismiss()}
 });
 $('#auth-register-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const r=await register({name:$('#auth-reg-name')?.value,email:$('#auth-reg-email')?.value,password:$('#auth-reg-password')?.value,recoveryEmail:$('#auth-reg-recovery')?.value});
  if(message)message.textContent=r.ok?('Cuenta creada. Hola, '+r.name+'.'):r.message;
  if(r.ok){render();refreshProfiles();dismiss()}
 });
 let recoveryEmail='';
 $('#auth-code-send')?.addEventListener('click',async()=>{
  const r=await requestRecovery($('#auth-rec-email')?.value);
  if(!r.ok){if(message)message.textContent=r.message;return}
  recoveryEmail=r.accountEmail;
  const showEl=$('#auth-code-show');
  if(showEl){showEl.hidden=false;showEl.textContent='Tu código: '+r.code}
  if(message)message.textContent='Código generado. Úsalo aquí para restablecer tu contraseña.';
 });
 $('#auth-recovery-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const r=await resetPassword(recoveryEmail||$('#auth-rec-email')?.value,$('#auth-rec-code')?.value,$('#auth-rec-password')?.value);
  if(message)message.textContent=r.ok?('Contraseña restablecida. Hola, '+r.name+'.'):r.message;
  if(r.ok){render();refreshProfiles();dismiss()}
 });
 emit();
}
window.OneUpAuth={guest,local,get,onChange,register,login,logout:guest,requestRecovery,resetPassword};
document.addEventListener('DOMContentLoaded',init);
})();
