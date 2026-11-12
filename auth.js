/* 1UP Auth, guest and on-device profiles. Legacy account data remains untouched. */
(()=>{
'use strict';
const KEY='oneup_identity_v2';
const $=s=>document.querySelector(s);
const listeners=new Set();
let current={kind:'guest',key:'guest',name:'Invitado'};
function emit(){for(const cb of listeners){try{cb({...current})}catch{}}}
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&v.kind==='local'&&typeof v.key==='string')current=v}catch{}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(current))}catch{}emit()}
function guest(){
 void window.OneUpEmailAuth?.logout().catch(()=>{});
 current={kind:'guest',key:'guest',name:'Invitado'};save();render();
}
function local(key,name){void window.OneUpEmailAuth?.logout().catch(()=>{});current={kind:'local',key:'local_'+key,name:name||'Perfil'};save()}
function get(){return {...current}}
function onChange(cb){listeners.add(cb);return()=>listeners.delete(cb)}
function storedProfiles(){
 try{
  const profiles=JSON.parse(localStorage.getItem('oneup_profiles_v1')||'[]');
  return Array.isArray(profiles)?profiles.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string'&&p.name.trim()).slice(0,6):[];
 }catch{return []}
}
function render(){
 const label=$('#auth-label');
 if(label)label.textContent=(current.name||'Invitado').slice(0,17);
 const signout=$('#auth-signout');
 if(signout){signout.hidden=current.kind!=='oneup';signout.textContent='Cerrar sesión';}
 const help=$('#auth-service-note');
 if(help)help.textContent='Entra con 1UP Auth o continúa como invitado. Tus listas locales se conservan en este dispositivo.';
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
 read();render();
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
 $('#auth-signout')?.addEventListener('click',()=>{guest();dialog.close();});
 emit();
}
window.OneUpAuth={guest,local,get,onChange};
// Identity is presentation only. Backend authorization never trusts this event or localStorage.
window.addEventListener('oneup-auth-identity',event=>{
 if(event.detail?.kind==='oneup'){
  current={...event.detail};emit();render();
 }else if(current.kind==='oneup'){
  current={kind:'guest',key:'guest',name:'Invitado'};emit();render();
 }
});
document.addEventListener('DOMContentLoaded',init);
})();
