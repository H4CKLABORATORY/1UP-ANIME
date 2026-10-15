/* 1UP ANIME — cinematic splash and on-device profile gateway. */
(()=>{
'use strict';
const PKEY='oneup_profiles_v1',ACTIVE='oneup_active_profile',INTRO='oneup_intro_seen_session_v1';
const ICONS=['⚔️','🔥','🦇','🌙','🐉','🎃','💀','✨'];
const COLORS=['linear-gradient(135deg,#4b285c,#e84c36)','linear-gradient(135deg,#281a59,#d85a96)','linear-gradient(135deg,#063c45,#50b2a1)','linear-gradient(135deg,#45222f,#fb9b3d)','linear-gradient(135deg,#242755,#6f79c9)','linear-gradient(135deg,#1f3826,#a7df70)','linear-gradient(135deg,#611d35,#e86565)','linear-gradient(135deg,#3d245b,#f1ba78)'];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ps=id=>'1up_anime_profile_'+id;
let profiles=[],managing=false,editId=null,avatar=0,welcomeTimer,introTimer;
function saveProfiles(){try{localStorage.setItem(PKEY,JSON.stringify(profiles))}catch{}}
function loadProfiles(){try{const data=JSON.parse(localStorage.getItem(PKEY)||'[]');profiles=Array.isArray(data)?data.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string').slice(0,6):[]}catch{profiles=[]}}
function gate(on){document.body.classList.toggle('oneup-gated',on);if(document.querySelector('main'))document.querySelector('main').inert=on}
function build(){
 const container=document.createElement('div');container.id='oneup-overlays';
 container.innerHTML='<section id="oneup-intro" class="oneup-intro" aria-label="Introducción sonora de ONE UP Anime" role="dialog" aria-modal="true"><div class="intro-halo"></div><div class="intro-flare"></div><div class="intro-brand"><strong>ONE<span> UP</span></strong><small>A N I M E</small><em>UNA VIDA EXTRA · UN UNIVERSO ANIME</em></div><div class="oneup-intro-controls"><p>UNA FIRMA. UN SONIDO. UNA NUEVA VIDA.</p><button type="button" id="oneup-play-sound" class="oneup-intro-start">▶ &nbsp; ENTRAR CON SONIDO</button><button type="button" id="oneup-play-muted" class="oneup-intro-muted">Continuar en silencio</button></div><span class="intro-bottom">1UP ANIME ORIGINAL</span><button type="button" id="oneup-intro-skip" class="oneup-skip">SALTAR ↗</button></section>'+
 '<section id="oneup-profiles" class="oneup-profiles" aria-label="Seleccionar perfil" role="dialog" aria-modal="true" hidden><div class="oneup-profiles-content"><div class="oneup-gate-brand">1<span>UP</span> ANIME</div><p class="oneup-gate-tag">HALLOWEEN · ANTI-MAGIC EDITION</p><h2 id="oneup-profiles-heading">¿Quién entra al universo?</h2><p id="oneup-profiles-desc">Elige un perfil para continuar tu aventura.</p><div id="oneup-profile-grid" class="oneup-profile-grid"></div><div class="oneup-profile-utilities"><button type="button" id="oneup-manage">Administrar perfiles</button><button type="button" id="oneup-done-manage" hidden>Terminar</button></div><p class="oneup-gate-foot">Perfiles y progreso guardados únicamente en este dispositivo.</p></div></section>'+
 '<section id="oneup-welcome" class="oneup-welcome" role="status" hidden><div class="welcome-inner"><div class="welcome-avatar" id="oneup-welcome-avatar">⚔️</div><p>LA AVENTURA COMIENZA</p><h2 id="oneup-welcome-title">BIENVENIDO</h2><p>PREPARANDO TU UNIVERSO ANIME · ✦</p></div></section>';
 document.body.appendChild(container);
 $('oneup-intro-skip').addEventListener('click',finishIntro);
 $('oneup-play-sound').addEventListener('click',()=>playIntro(true));
 $('oneup-play-muted').addEventListener('click',()=>playIntro(false));
 $('oneup-manage').addEventListener('click',()=>{managing=true;render()});
 $('oneup-done-manage').addEventListener('click',()=>{managing=false;render()});
 $('oneup-profile-grid').addEventListener('click',e=>{
  const plus=e.target.closest('[data-new-profile]');if(plus){edit();return}
  const tile=e.target.closest('[data-profile]');if(!tile)return;
  const p=profiles.find(x=>x.id===tile.dataset.profile);if(!p)return;
  if(managing)edit(p);else choose(p);
 });
 const switchBtn=$('oneup-change-profile');if(switchBtn)switchBtn.addEventListener('click',openProfiles);
 const nav=document.querySelector('.mobile-nav');if(nav){
  const b=document.createElement('button');b.id='oneup-mobile-profile';b.type='button';b.innerHTML='<span>♙</span>Perfil';
  b.addEventListener('click',openProfiles);nav.appendChild(b);
 }
}
function playIntro(withSound){
 const splash=$('oneup-intro');
 if(!splash||splash.hidden||splash.dataset.playing==='1')return;
 splash.dataset.playing='1';
 splash.classList.add('playing');
 if(withSound){try{window.OneUpSonic?.play()}catch{}}
 $('oneup-play-sound').disabled=true;
 $('oneup-play-muted').disabled=true;
 clearTimeout(introTimer);
 introTimer=setTimeout(finishIntro,2280);
}
function finishIntro(){
 const splash=$('oneup-intro');if(!splash||splash.hidden)return;
 clearTimeout(introTimer);try{sessionStorage.setItem(INTRO,'1')}catch{}
 splash.classList.add('exit');setTimeout(()=>{splash.hidden=true;openProfiles()},550);
}
function openProfiles(){
 clearTimeout(welcomeTimer);$('oneup-welcome').hidden=true;$('oneup-profiles').hidden=false;
 managing=false;editId=null;gate(true);render();
}
function render(){
 const grid=$('oneup-profile-grid');
 $('oneup-profiles-heading').textContent=managing?'ADMINISTRAR PERFILES':'¿Quién entra al universo?';
 $('oneup-profiles-desc').textContent=profiles.length?(managing?'Selecciona un avatar para editar o eliminar el perfil.':'Cada usuario conserva su propia lista y sus episodios vistos.'):'Crea tu primer perfil para empezar.';
 $('oneup-manage').hidden=managing||!profiles.length;
 $('oneup-done-manage').hidden=!managing;
 let html='';
 for(const p of profiles){
  const i=Math.max(0,Math.min(7,Number(p.avatar)||0));
  html+='<button type="button" class="oneup-profile-tile" data-profile="'+esc(p.id)+'" aria-label="'+(managing?'Editar ':'Entrar como ')+esc(p.name)+'"><span class="oneup-avatar" style="background:'+COLORS[i]+'">'+ICONS[i]+(managing?'<span style="position:absolute;right:5px;bottom:4px;font-size:19px">✎</span>':'')+'</span><strong>'+esc(p.name)+'</strong></button>';
 }
 if(profiles.length<6)html+='<button type="button" class="oneup-profile-tile" data-new-profile="1"><span class="oneup-avatar oneup-avatar-add">＋</span><strong>Nuevo perfil</strong></button>';
 grid.innerHTML=html;
}
function edit(p){
 editId=p?.id||null;avatar=Math.max(0,Math.min(7,Number(p?.avatar)||0));
 $('oneup-manage').hidden=true;$('oneup-done-manage').hidden=true;
 const options=ICONS.map((x,i)=>'<button class="oneup-avatar-choice'+(i===avatar?' active':'')+'" data-avatar="'+i+'" type="button" aria-label="Elegir avatar '+(i+1)+'">'+x+'</button>').join('');
 $('oneup-profile-grid').innerHTML='<div class="oneup-profile-editor"><h3>'+(p?'EDITAR PERFIL':'NUEVO PERFIL')+'</h3><label for="oneup-profile-name">Nombre</label><input id="oneup-profile-name" maxlength="22" placeholder="Nombre de tu perfil" value="'+esc(p?.name||'')+'"><label>Elige un avatar</label><div class="oneup-avatar-choices" id="oneup-avatar-choices">'+options+'</div><div class="editor-actions"><button id="oneup-editor-cancel">Cancelar</button><button id="oneup-editor-save" class="confirm">Guardar</button></div>'+(p?'<button type="button" id="oneup-editor-delete" style="width:100%;margin-top:14px;color:#ffd2d2">Eliminar perfil</button>':'')+'</div>';
 $('oneup-avatar-choices').addEventListener('click',e=>{
  const b=e.target.closest('[data-avatar]');if(!b)return;avatar=Number(b.dataset.avatar);
  document.querySelectorAll('.oneup-avatar-choice').forEach(x=>x.classList.toggle('active',Number(x.dataset.avatar)===avatar));
 });
 $('oneup-editor-save').addEventListener('click',saveEditor);
 $('oneup-editor-cancel').addEventListener('click',render);
 if(p)$('oneup-editor-delete').addEventListener('click',deleteEditor);
 $('oneup-profile-name').addEventListener('keydown',e=>{if(e.key==='Enter')saveEditor()});
 $('oneup-profile-name').focus();
}
function saveEditor(){
 const field=$('oneup-profile-name'),name=field.value.trim().replace(/\s+/g,' ');
 if(!name){field.focus();return}
 const old=profiles.find(x=>x.id===editId);
 if(old){old.name=name;old.avatar=avatar}
 else{
  if(profiles.length>=6)return;
  const uid=Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  profiles.push({id:uid,name,avatar});
  if(profiles.length===1){
   try{const legacy=localStorage.getItem('1up_anime_v1');if(legacy&&!localStorage.getItem(ps(uid)))localStorage.setItem(ps(uid),legacy)}catch{}
  }
 }
 saveProfiles();render();
}
function deleteEditor(){
 const p=profiles.find(x=>x.id===editId);
 if(!p||!confirm('¿Eliminar '+p.name+' y su progreso guardado en este dispositivo?'))return;
 profiles=profiles.filter(x=>x.id!==editId);saveProfiles();
 try{localStorage.removeItem(ps(editId));if(localStorage.getItem(ACTIVE)===editId)localStorage.removeItem(ACTIVE)}catch{}
 editId=null;render();
}
function choose(p){
 try{localStorage.setItem(ACTIVE,p.id)}catch{}
 if(window.OneUpProfileAPI?.activate)window.OneUpProfileAPI.activate(p.id);
 const i=Math.max(0,Math.min(7,Number(p.avatar)||0));
 const header=$('oneup-change-profile');if(header){header.textContent=ICONS[i];header.title='Cambiar perfil: '+p.name;header.setAttribute('aria-label','Cambiar perfil: '+p.name)}
 const mobile=$('oneup-mobile-profile');if(mobile)mobile.innerHTML='<span>'+ICONS[i]+'</span>Perfil';
 $('oneup-profiles').hidden=true;$('oneup-welcome-avatar').textContent=ICONS[i];$('oneup-welcome-title').textContent='¡HOLA, '+p.name.toUpperCase()+'!';
 $('oneup-welcome').hidden=false;
 welcomeTimer=setTimeout(()=>{$('oneup-welcome').hidden=true;gate(false)},1150);
}
function start(){
 loadProfiles();build();gate(true);
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 if(reduced){$('oneup-intro').hidden=true;openProfiles()}
 // iOS Safari blocks sound autoplay. Keep the sonic-logo launch user initiated.
 // A tap plays the 2-second brand signature; silent/skip paths stay available.
}
document.addEventListener('DOMContentLoaded',start);
})();