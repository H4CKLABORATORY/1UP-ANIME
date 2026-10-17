/* 1UP ANIME — opening plays before Kokomi, never inside the header.
 * Attempt original audio automatically. iOS/Safari may reject audible autoplay:
 * if so, replay silently and continue into the site without getting stuck.
 */
(()=>{
'use strict';
const SESSION_KEY='oneup-opening-seen-v2';
const gate=document.getElementById('oneup-opening');
if(!gate)return;
const video=gate.querySelector('#oneup-opening-video');
const poster=gate.querySelector('.oneup-opening-poster');
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
const replay=new URLSearchParams(location.search).get('intro')==='1';
let seen=false;
try{seen=sessionStorage.getItem(SESSION_KEY)==='yes'}catch{}
if(seen&&!replay){gate.remove();return}
document.body.classList.add('oneup-opening-active');
const blocked=[...document.body.children].filter(node=>node!==gate&&node.tagName!=='SCRIPT');
for(const node of blocked)node.inert=true;
let done=false,watchdog=null,quickFallback=null,finishedDom=false;
const clear=()=>{clearTimeout(watchdog);clearTimeout(quickFallback)};
function unblock(){
 if(finishedDom)return;
 finishedDom=true;
 for(const node of blocked)node.inert=false;
 document.body.classList.remove('oneup-opening-active');
 gate.remove();
}
function finish(){
 if(done)return;
 done=true;clear();
 try{sessionStorage.setItem(SESSION_KEY,'yes')}catch{}
 try{video.pause()}catch{}
 gate.classList.add('oneup-opening-out');
 gate.addEventListener('transitionend',unblock,{once:true});
 setTimeout(unblock,500);
}
function fallback(){
 if(done)return;
 poster.hidden=false;video.hidden=true;
 clear();quickFallback=setTimeout(finish,1200);
}
function startSilent(){
 if(done)return;
 try{
  video.pause();
  video.currentTime=0;
  video.muted=true;
  video.defaultMuted=true;
 }catch{}
 const next=video.play();
 if(next&&typeof next.catch==='function')next.catch(fallback);
}
video.addEventListener('ended',finish);
video.addEventListener('error',fallback);
if(reduced){
 poster.hidden=false;video.hidden=true;
 quickFallback=setTimeout(finish,950);
}else{
 // An audible attempt may succeed on browsers with autoplay permission.
 // Never claim we can override the browser's audio policy.
 video.muted=false;
 video.defaultMuted=false;
 video.autoplay=true;video.playsInline=true;
 video.setAttribute('playsinline','');
 video.removeAttribute('muted');
 try{
  const playback=video.play();
  if(playback&&typeof playback.catch==='function')playback.catch(startSilent);
 }catch{startSilent()}
 watchdog=setTimeout(finish,6200);
}
document.addEventListener('visibilitychange',()=>{
 if(done)return;
 if(document.visibilityState==='hidden'){try{video.pause()}catch{}}
 else if(document.visibilityState==='visible'&&!video.hidden){
  const playback=video.play();
  if(playback?.catch)playback.catch(startSilent);
 }
});
})();