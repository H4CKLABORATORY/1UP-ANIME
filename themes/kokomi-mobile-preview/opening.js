/* 1UP ANIME — original cinematic opening, before the site (not a header logo).
   Uses the owner's actual 3.2 s H.264/AAC brand signature.
   A user gesture is required to play sound in Safari/iPhone.
 */
(()=>{
'use strict';
const SESSION_KEY='oneup-opening-seen-v1';
const gate=document.getElementById('oneup-opening');
if(!gate)return;
const video=gate.querySelector('#oneup-opening-video');
const sound=gate.querySelector('#oneup-opening-sound');
const skip=gate.querySelector('#oneup-opening-skip');
const poster=gate.querySelector('.oneup-opening-poster');
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
const replay=new URLSearchParams(window.location.search).get('intro')==='1';
let seen=false;
try{seen=sessionStorage.getItem(SESSION_KEY)==='yes'}catch{}
if(seen&&!replay){gate.remove();return;}
document.body.classList.add('oneup-opening-active');
const blocked=[...document.body.children].filter(x=>x!==gate&&x.tagName!=='SCRIPT');
for(const node of blocked){node.inert=true;}
let done=false,watchdog=null,quickFallback=null;
const clear=()=>{clearTimeout(watchdog);clearTimeout(quickFallback)};
function finish(){
 if(done)return;done=true;clear();
 try{sessionStorage.setItem(SESSION_KEY,'yes')}catch{}
 try{video.pause()}catch{}
 gate.classList.add('oneup-opening-out');
 const end=()=>{
  for(const node of blocked)node.inert=false;
  document.body.classList.remove('oneup-opening-active');
  gate.remove();
 };
 gate.addEventListener('transitionend',end,{once:true});
 setTimeout(end,650);
}
function fallback(){
 if(done)return;
 poster.hidden=false;
 video.hidden=true;
 sound.hidden=true;
 clear();
 quickFallback=setTimeout(finish,1600);
}
sound.addEventListener('click',()=>{
 if(done)return;
 // Unmute and start from the beginning INSIDE the user's trusted click.
 clear();
 poster.hidden=true;video.hidden=false;
 try{video.pause();video.currentTime=0;video.muted=false;video.volume=1;}catch{}
 const p=video.play();
 if(p&&typeof p.catch==='function')p.catch(()=>fallback());
 sound.disabled=true;sound.textContent='♫ Sonido activado';
 watchdog=setTimeout(finish,10000);
});
skip.addEventListener('click',finish);
video.addEventListener('ended',finish);
video.addEventListener('error',fallback);
if(reduced){
 poster.hidden=false;video.hidden=true;sound.hidden=true;
 quickFallback=setTimeout(finish,1200);
}else{
 video.muted=true;video.autoplay=true;video.playsInline=true;
 video.setAttribute('playsinline','');video.setAttribute('muted','');
 // Start as silent intro; visitors may tap "Escuchar con sonido".
 const p=video.play();
 if(p&&typeof p.catch==='function')p.catch(fallback);
 watchdog=setTimeout(finish,10000);
}
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden'&&!done){try{video.pause()}catch{}}
 else if(document.visibilityState==='visible'&&!done&&!video.hidden){
  video.play().catch(fallback);
 }
});
})();