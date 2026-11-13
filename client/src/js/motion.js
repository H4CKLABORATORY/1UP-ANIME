/* 1UP Anime cinematic polish. Browser-native and dependency-free.
   Does not modify anime catalog, accounts, or private user data. */
(()=>{
'use strict';
function ready(){
 const hero=document.querySelector('.hero');
 if(!hero)return;
 const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const small=window.matchMedia?.('(max-width: 780px)').matches;
 if(reduce)return;
 const effect=document.createElement('div');
 effect.className='oneup-visual-fx';
 effect.setAttribute('aria-hidden','true');
 const total=small?9:20;
 // Deterministic pseudo-random positions avoid jumpy repeated loads.
 for(let i=0;i<total;i++){
  const seed=(i*71+13)%101,seed2=(i*43+28)%97;
  const dot=document.createElement('i');
  dot.className='oneup-ember';
  dot.style.left=(5+seed*.9)+'%';
  dot.style.width=dot.style.height=(2+(i%4))+'px';
  dot.style.setProperty('--ember-duration',(10+seed2*.11)+'s');
  dot.style.setProperty('--ember-x',((i%2?1:-1)*(30+seed2))+'px');
  dot.style.animationDelay=-(i*.89)+'s';
  effect.append(dot);
 }
 // Hero layers are decorative only and never intercept touches.
 hero.insertBefore(effect,hero.querySelector('.hero-grid'));
 const sections=document.querySelectorAll('.section,.explore-section,.season-banner,.community-note');
 if('IntersectionObserver'in window){
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
    if(entry.isIntersecting){
     entry.target.classList.add('oneup-revealed');
     observer.unobserve(entry.target);
    }
   }
  },{threshold:.07,rootMargin:'0px 0px 45px 0px'});
  sections.forEach(el=>{el.classList.add('oneup-motion-reveal');observer.observe(el)});
 }
 // Pause the animated decorative layer when a PWA is backgrounded.
 const visibility=()=>{
  effect.style.animationPlayState=document.hidden?'paused':'running';
  effect.querySelectorAll('.oneup-ember').forEach(node=>{
   node.style.animationPlayState=document.hidden?'paused':'running';
  });
 };
 document.addEventListener('visibilitychange',visibility,{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
else ready();
})();