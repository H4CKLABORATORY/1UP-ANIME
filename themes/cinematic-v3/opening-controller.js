/* Full-screen V3 studio opening, once per session.
 * Scene playback uses the owner's original 3.2s AAC source via studio.js.
 * No buttons, no interception after finish and no dependency on audio autoplay.
 */
(()=>{
'use strict';
const overlay=document.querySelector('#oneup-opening');
if(!overlay)return;
const KEY='oneup-v3-opening-seen-v1';
const forced=new URLSearchParams(location.search).get('intro')==='1';
let seen=false;
try{seen=sessionStorage.getItem(KEY)==='yes'}catch{}
if(seen&&!forced){overlay.remove();return;}
document.body.classList.add('oneup-opening-active');
const others=Array.from(document.body.children).filter(el=>el!==overlay&&el.tagName!=='SCRIPT');
for(const el of others)el.inert=true;
let finished=false,stopped=false;
const timer=setTimeout(finish,6500);
function finish(){
 if(finished)return;
 finished=true;clearTimeout(timer);
 try{sessionStorage.setItem(KEY,'yes')}catch{}
 if(!stopped){
  stopped=true;
  overlay.querySelector('#cinema')?.dispatchEvent(new Event('oneup-opening-stop'));
 }
 overlay.classList.add('oneup-opening-out');
 const cleanup=()=>{
  for(const el of others)el.inert=false;
  document.body.classList.remove('oneup-opening-active');
  overlay.remove();
 };
 // A transition may not fire on iOS, on hidden tabs or reduced motion.
 const exit=setTimeout(cleanup,520);
 overlay.addEventListener('transitionend',e=>{
  if(e.target===overlay){clearTimeout(exit);cleanup()}
 },{once:true});
}
overlay.addEventListener('oneup-opening-finished',finish);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden&&!finished){
  // Do not strand a visitor behind a partially-rendered intro in background.
  finish();
 }
});
})();
