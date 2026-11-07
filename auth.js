/* ONE UP Anime — native accounts (email + password, Supabase Authentication).
 * No third-party sign-in: accounts are created here with username + email + password.
 * Passwords are NEVER stored by 1UP: Supabase Authentication hashes them.
 * Usernames are unique: claimed in Postgres (public.profiles, unique username).
 * A database trigger creates the profile from the sign-up metadata; the unique
 * constraint is the atomic guard against races (see supabase/sql/oneup_auth.sql).
 * Guests can browse freely; a 1UP account is required to comment or save favorites.
 * Without a Supabase project configured (supabase-config.js), only guest/local
 * profiles work and the account forms explain what is missing.
 * Supabase JS SDK is loaded on demand from the official jsDelivr CDN (v2.117.3).
 */
(()=>{
"use strict";
const SUPABASE_SDK_VERSION="2.117.3";
const SDK_URL="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@"+SUPABASE_SDK_VERSION+"/+esm";
const KEY="oneup_identity_v2";
const $=s=>document.querySelector(s);
const listeners=new Set();
let current={kind:"guest",key:"guest",name:"Invitado"};
let supa=null;
let supaPromise=null;
let listenerAttached=false;
const RESERVED_USERNAMES=["admin","moderador","moderator","owner","propietario","soporte","support","1up","oneup","verificado","verified","sistema","system","invitado","guest"];
function validateUsername(raw){
 const username=String(raw||"").trim().toLowerCase();
 if(username.length<3)return {ok:false,error:"El nombre de usuario necesita al menos 3 caracteres."};
 if(username.length>20)return {ok:false,error:"El nombre de usuario admite 20 caracteres como máximo."};
 if(!/^[a-z0-9_]+$/.test(username))return {ok:false,error:"Usa solo letras (a-z), números y guion bajo, sin espacios ni acentos."};
 if(RESERVED_USERNAMES.includes(username))return {ok:false,error:"Ese nombre de usuario está reservado."};
 return {ok:true,username};
}
function validateEmail(raw){
 const email=String(raw||"").trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))return {ok:false,error:"Escribe un correo válido, por ejemplo: fan@ejemplo.com."};
 return {ok:true,email};
}
function validatePassword(raw){
 const password=String(raw||"");
 if(password.length<8)return {ok:false,error:"La contraseña necesita al menos 8 caracteres."};
 if(!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))return {ok:false,error:"La contraseña necesita al menos una letra y un número."};
 return {ok:true,password};
}
function configured(){
 // String checks on purpose (no URL constructor): auth.js also runs inside
 // vm test sandboxes where URL is not a global.
 const c=window.ONEUP_SUPABASE_CONFIG;
 const url=typeof c?.url==="string"?c.url:"";
 const host=url.slice("https://".length);
 return url.startsWith("https://")&&host.length>0&&!host.includes("@")&&!host.includes("/")&&
  typeof c?.publishableKey==="string"&&c.publishableKey.startsWith("sb_publishable_");
}
function missing(){
 return "Las cuentas 1UP aún no están disponibles. Puedes explorar el catálogo como invitado.";
}
function friendlyAuthError(e){
 const msg=String(e?.message||"").toLowerCase();
 const code=String(e?.code||"");
 if(msg.includes("user already registered")||msg.includes("already registered"))
  return "Ese correo ya tiene una cuenta. Inicia sesión o restablece tu contraseña.";
 if(msg.includes("invalid login credentials")||msg.includes("invalid email or password"))
  return "Correo o contraseña incorrectos.";
 if(msg.includes("email rate limit")||msg.includes("too many requests")||code==="429")
  return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
 if(msg.includes("network")||msg.includes("fetch failed")||msg.includes("failed to fetch"))
  return "Sin conexión con el servidor. Revisa tu internet e inténtalo de nuevo.";
 if(msg.includes("signups not allowed")||msg.includes("provider is not enabled"))
  return "El registro con correo aún no está habilitado. Inténtalo más tarde.";
 if(msg.includes("user is banned")||msg.includes("user disabled"))
  return "Esta cuenta está deshabilitada.";
 if(msg.includes("username")&&msg.includes("taken")||code==="23505")
  return "Ese nombre de usuario ya está en uso. Elige otro.";
 if(msg.includes("password")&&msg.includes("at least"))
  return "La contraseña es demasiado débil: mínimo 8 caracteres, con letra y número.";
 const raw=String(e?.message||"").slice(0,160);
 return "No se pudo completar: "+(raw||"error desconocido");
}
function defaultLoader(){
 if(supaPromise)return supaPromise;
 supaPromise=import(SDK_URL).then(({createClient})=>{
  const c=window.ONEUP_SUPABASE_CONFIG;
  supa=createClient(c.url,c.publishableKey,{
   auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  return supa;
 }).catch(e=>{supaPromise=null;throw e});
 return supaPromise;
}
function loadSupabase(){
 if(typeof window.__ONEUP_SUPABASE_LOADER__==="function"){
  if(supaPromise)return supaPromise;
  supaPromise=window.__ONEUP_SUPABASE_LOADER__().then(loaded=>{
   supa=loaded;return supa;
  }).catch(e=>{supaPromise=null;throw e});
  return supaPromise;
 }
 return defaultLoader();
}
function emit(){for(const cb of listeners){try{cb({...current})}catch{}}}
function read(){try{const v=JSON.parse(localStorage.getItem(KEY)||"null");if(v&&v.kind==="local"&&typeof v.key==="string")current=v}catch{}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(current))}catch{}emit()}
function guest(){current={kind:"guest",key:"guest",name:"Invitado"};save()}
function local(key,name){current={kind:"local",key:"local_"+key,name:name||"Perfil"};save()}
function get(){return {...current}}
function isAccount(){return current.kind==="account"}
function onChange(cb){listeners.add(cb);return()=>listeners.delete(cb)}
async function loadProfileUsername(client,user){
 // Username lives ONLY in public.profiles (created by the sign-up trigger).
 // Returns "" when the profile row is missing, so signUp() can detect it
 // and run the fallback insert below.
 try{
  const {data,error}=await client.from("profiles").select("username").eq("id",user.id).maybeSingle();
  if(!error&&data?.username)return String(data.username);
 }catch{}
 return "";
}
async function applySupabaseUser(user){
 if(!user)return false;
 const username=(await loadProfileUsername(supa,user))
  ||String(user.user_metadata?.username||"")||(user.email||"").split("@")[0]||"Fan 1UP";
 current={kind:"account",key:"account_"+user.id,name:username,email:user.email||"",uid:user.id};
 save();render();
 return true;
}
function attachAuthListener(){
 if(listenerAttached||!supa)return;
 listenerAttached=true;
 if(typeof supa.auth.onAuthStateChange==="function"){
  supa.auth.onAuthStateChange(async (_event,session)=>{
   const user=session?.user||null;
   if(!user){if(current.kind==="account"){guest();render()}return}
   await applySupabaseUser(user);
  });
 }
}
async function restoreAccount(){
 if(!configured())return;
 try{
  await loadSupabase();
  attachAuthListener();
  const {data}=await supa.auth.getSession();
  if(data?.session?.user)await applySupabaseUser(data.session.user);
 }catch(e){console.warn("Supabase authentication unavailable",e?.message)}
}
async function signUp({username,email,password}){
 const vu=validateUsername(username);if(!vu.ok)return {ok:false,message:vu.error};
 const ve=validateEmail(email);if(!ve.ok)return {ok:false,message:ve.error};
 const vp=validatePassword(password);if(!vp.ok)return {ok:false,message:vp.error};
 if(!configured())return {ok:false,message:missing()};
 try{
  const client=await loadSupabase();
  const pre=await client.from("profiles").select("username").eq("username",vu.username).maybeSingle();
  if(pre?.data)return {ok:false,message:"Ese nombre de usuario ya está en uso. Elige otro."};
  const {data,error}=await client.auth.signUp({
   email:ve.email,password:vp.password,
   options:{data:{username:vu.username}}
  });
  if(error)throw error;
  const user=data?.user;
  if(!user)return {ok:false,message:"No se pudo crear la cuenta. Inténtalo de nuevo."};
  if(!data.session){
   return {ok:true,needsConfirmation:true,name:vu.username,
    message:"Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión."};
  }
  const claimed=await loadProfileUsername(client,user);
  if(claimed!==vu.username){
   const ins=await client.from("profiles").insert({id:user.id,username:vu.username});
   if(ins.error){
    try{await client.auth.signOut()}catch{}
    return {ok:false,message:friendlyAuthError(ins.error)};
   }
  }
  current={kind:"account",key:"account_"+user.id,name:vu.username,email:ve.email,uid:user.id};
  save();render();
  return {ok:true,name:vu.username};
 }catch(e){return {ok:false,message:friendlyAuthError(e)}}
}
async function signIn({email,password}){
 const ve=validateEmail(email);if(!ve.ok)return {ok:false,message:ve.error};
 if(!String(password||""))return {ok:false,message:"Escribe tu contraseña."};
 if(!configured())return {ok:false,message:missing()};
 try{
  const client=await loadSupabase();
  const {data,error}=await client.auth.signInWithPassword({email:ve.email,password:String(password)});
  if(error)throw error;
  if(!data?.user)return {ok:false,message:"Correo o contraseña incorrectos."};
  await applySupabaseUser(data.user);
  return {ok:true,name:current.name};
 }catch(e){return {ok:false,message:friendlyAuthError(e)}}
}
async function resetPassword(email){
 const ve=validateEmail(email);if(!ve.ok)return {ok:false,message:ve.error};
 if(!configured())return {ok:false,message:missing()};
 try{
  const client=await loadSupabase();
  const origin=typeof window.location?.origin==="string"?window.location.origin:"";
  const path=typeof window.location?.pathname==="string"?window.location.pathname:"/";
  const {error}=await client.auth.resetPasswordForEmail(ve.email,
   origin?{redirectTo:origin+path}:{});
  if(error)throw error;
  return {ok:true,message:"Te enviamos un correo para restablecer tu contraseña. Revisa también la carpeta de spam."};
 }catch(e){
  if(String(e?.message||"").toLowerCase().includes("user not found"))
   return {ok:true,message:"Si ese correo tiene una cuenta, te enviamos un correo para restablecer tu contraseña. Revisa también la carpeta de spam."};
  return {ok:false,message:friendlyAuthError(e)}
 }
}
async function updatePassword(password){
 const vp=validatePassword(password);if(!vp.ok)return {ok:false,message:vp.error};
 if(!configured())return {ok:false,message:missing()};
 try{
  const client=await loadSupabase();
  const {error}=await client.auth.updateUser({password:vp.password});
  if(error)throw error;
  return {ok:true,message:"Contraseña actualizada. Ya puedes iniciar sesión."};
 }catch(e){return {ok:false,message:friendlyAuthError(e)}}
}
async function signOut(){
 try{
  if(supa){await loadSupabase();await supa.auth.signOut();}
 }catch(e){console.warn("Sign-out failed",e?.message)}
 guest();render();
}
function requireAccount(action){
 if(isAccount())return true;
 openDialog("Inicia sesión para "+(action||"usar esta función")+". Si aún no tienes cuenta, crea una: solo necesitas un nombre de usuario, un correo y una contraseña.");
 return false;
}
function showTab(tab){
 const login=$("#auth-login-form"),signup=$("#auth-signup-form"),reset=$("#auth-reset-form"),np=$("#auth-new-password-form");
 if(login)login.hidden=tab!=="login";
 if(signup)signup.hidden=tab!=="signup";
 if(reset)reset.hidden=tab!=="reset";
 if(np)np.hidden=tab!=="newpassword";
 const tabLogin=$("#auth-tab-login"),tabSignup=$("#auth-tab-signup");
 if(tabLogin)tabLogin.setAttribute("aria-selected",String(tab==="login"));
 if(tabSignup)tabSignup.setAttribute("aria-selected",String(tab==="signup"));
}
function openDialog(message){
 render();
 showTab("login");
 const dialog=$("#auth-dialog");
 if(message){const m=$("#auth-message");if(m)m.textContent=message;}
 if(dialog&&!dialog.open)dialog.showModal();
}
function render(){
 const label=$("#auth-label");
 if(label)label.textContent=(current.name||"Invitado").slice(0,17);
 const signout=$("#auth-signout");
 if(signout)signout.hidden=current.kind!=="account";
 const help=$("#auth-service-note");
 if(help)help.textContent=configured()
  ?"Tu cuenta 1UP guarda tu nombre de usuario. También puedes entrar sin registrarte, pero comentar y guardar favoritos necesitan una cuenta."
  :"Las cuentas 1UP aún no están disponibles. Puedes explorar el catálogo como invitado.";
}
function refreshProfiles(){
 const details=$("#auth-profiles"),select=$("#auth-profile-select");
 if(!details||!select)return;
 const profiles=storedProfiles();
 const keep=select.value;
 select.replaceChildren();
 for(const profile of profiles){
  const option=document.createElement("option");
  option.value=profile.id;option.textContent=profile.name.slice(0,50);
  select.append(option);
 }
 if(profiles.some(profile=>profile.id===keep))select.value=keep;
 details.hidden=profiles.length===0;
 if(!profiles.length)details.open=false;
}
function storedProfiles(){
 try{
  const profiles=JSON.parse(localStorage.getItem("oneup_profiles_v1")||"[]");
  return Array.isArray(profiles)?profiles.filter(p=>p&&typeof p.id==="string"&&typeof p.name==="string"&&p.name.trim()).slice(0,6):[];
 }catch{return []}
}
function isRecoveryLink(){
 try{
  const hash=String(window.location.hash||"");
  return hash.includes("type=recovery")&&hash.includes("access_token=");
 }catch{return false}
}
function init(){
 read();render();void restoreAccount();
 const dialog=$("#auth-dialog"),open=$("#auth-open");
 if(!dialog||!open)return;
 const message=$("#auth-message"),close=$("#auth-close");
 const show=()=>{
  render();refreshProfiles();showTab(isAccount()?"login":"login");
  if(message)message.textContent="";
  if(!dialog.open)dialog.showModal();
  close?.focus({preventScroll:true});
 };
 open.addEventListener("click",show);
 close?.addEventListener("click",()=>dialog.close());
 dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
 $("#guest-login")?.addEventListener("click",()=>{guest();render();dialog.close();});
 $("#auth-profile-enter")?.addEventListener("click",()=>{
  const id=$("#auth-profile-select")?.value;
  const profile=storedProfiles().find(entry=>entry.id===id);
  if(!profile){if(message)message.textContent="Selecciona un perfil guardado válido.";return}
  local(profile.id,profile.name);render();dialog.close();
 });
 $("#auth-signout")?.addEventListener("click",async()=>{await signOut();dialog.close();});
 $("#auth-tab-login")?.addEventListener("click",()=>showTab("login"));
 $("#auth-tab-signup")?.addEventListener("click",()=>showTab("signup"));
 $("#auth-forgot")?.addEventListener("click",()=>showTab("reset"));
 $("#auth-back-login")?.addEventListener("click",()=>showTab("login"));
 $("#auth-back-login2")?.addEventListener("click",()=>showTab("login"));
 const setBusy=(form,on)=>{const b=form?.querySelector("button[type=submit]");if(b)b.disabled=on};
 $("#auth-login-form")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  if(message)message.textContent="Conectando…";
  setBusy(form,true);
  try{
   const data=new FormData(form);
   const response=await signIn({email:data.get("email"),password:data.get("password")});
   if(message)message.textContent=response.ok?"Sesión iniciada correctamente.":response.message;
   if(response.ok){render();dialog.close();}
  }finally{setBusy(form,false);}
 });
 $("#auth-signup-form")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const data=new FormData(form);
  if(String(data.get("password")||"")!==String(data.get("password2")||"")){
   if(message)message.textContent="Las contraseñas no coinciden.";
   return;
  }
  if(message)message.textContent="Creando tu cuenta…";
  setBusy(form,true);
  try{
   const response=await signUp({username:data.get("username"),email:data.get("email"),password:data.get("password")});
   if(message)message.textContent=response.ok?("Cuenta creada. ¡Bienvenido a 1UP, "+response.name+"!"):response.message;
   if(response.ok){render();dialog.close();}
  }finally{setBusy(form,false);}
 });
 $("#auth-reset-form")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const data=new FormData(form);
  if(message)message.textContent="Enviando correo…";
  setBusy(form,true);
  try{
   const response=await resetPassword(String(data.get("email")||""));
   if(message)message.textContent=response.message;
   if(response.ok)showTab("login");
  }finally{setBusy(form,false);}
 });
 $("#auth-new-password-form")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const form=e.currentTarget;
  const data=new FormData(form);
  if(String(data.get("password")||"")!==String(data.get("password2")||"")){
   if(message)message.textContent="Las contraseñas no coinciden.";
   return;
  }
  if(message)message.textContent="Actualizando contraseña…";
  setBusy(form,true);
  try{
   const response=await updatePassword(String(data.get("password")||""));
   if(message)message.textContent=response.message;
   if(response.ok)showTab("login");
  }finally{setBusy(form,false);}
 });
 if(isRecoveryLink()&&configured()){
  showTab("newpassword");
  if(message)message.textContent="Escribe tu nueva contraseña.";
  if(!dialog.open)dialog.showModal();
 }
 emit();
}
window.OneUpAuth={
 guest,local,get,onChange,isAccount,requireAccount,openDialog,
 signUp,signIn,resetPassword,updatePassword,signOut,configured,
 validate:{validateUsername,validateEmail,validatePassword},
 SUPABASE_SDK_VERSION
};
document.addEventListener("DOMContentLoaded",init);
})();
