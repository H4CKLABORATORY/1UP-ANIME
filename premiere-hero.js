/* 1UP Anime · elegant cinematic on-air premieres for mobile + desktop.
 * Dates originate in AniList's current broadcast snapshot, NOT video uploads.
 * No server keys, no streaming extraction, no heavy carousel dependencies.
 */
(()=>{
 'use strict';
 const ranking=window.OneUpPremiereRanking;
 const $=q=>document.querySelector(q);
 if(!ranking||!$('.hero'))return;
 const section=$('.hero'),rail=$('#premiere-progress'),prev=$('#premiere-prev'),next=$('#premiere-next');
 const status=$('#premiere-status'),note=$('#premiere-source-note'),external=$('#hero-crunchyroll');
 let slides=[],current=0,timeout=null,hovered=false,focused=false,visible=true,ready=false,pauseUntil=0;
 let images=new Set(),updated='';
 const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 const canAuto=()=>ready&&slides.length>1&&!document.hidden&&visible&&!hovered&&!focused&&!reduced()&&
  !$('#anime-dialog')?.open&&location.hash!=='#buscar'&&
  !$('#home-screen')?.hidden;
 const cancel=()=>{if(timeout!==null){clearTimeout(timeout);timeout=null}};
 function schedule(){
  cancel();
  if(!canAuto())return;
  timeout=setTimeout(()=>{
   if(Date.now()<pauseUntil){schedule();return}
   switchTo((current+1)%slides.length);
  },7200);
 }
 function preload(index){
  const candidate=slides[(index+1)%slides.length]?.anime;
  const url=candidate?.banner||candidate?.image;
  if(!url||images.has(url))return;
  images.add(url);
  const image=new Image();image.decoding='async';image.src=url;
  if(images.size>20)images.clear();
 }
 function stringifyDate(epoch){
  if(!Number.isFinite(epoch)||epoch<=0)return '';
  return new Intl.DateTimeFormat('es',{weekday:'short',day:'numeric',month:'short',
   hour:'numeric',minute:'2-digit'}).format(new Date(epoch));
 }
 function update(){
  const item=slides[current];if(!item)return;
  const anime=item.anime;
  const success=window.OneUpCatalog?.feature?.(anime.id);
  if(!success)return;
  section.classList.add('premiere-mode');
  const episode=item.episode?' · EPISODIO '+item.episode:'';
  if(status){status.hidden=false;status.textContent=ranking.label(item)+episode;}
  const date=item.at?stringifyDate(item.at):'';
  const publicationDate=window.OneUpPremiereHero?.updated||'';
  if(note){note.hidden=false;note.textContent=(date?'Horario programado: '+date+'. ':'')+
   'Emisión de AniList; no garantiza reproducción.'+
   (publicationDate?' · Datos: '+publicationDate:'');}
  const verified=window.OneUpOfficialWatch?.get(anime);
  if(external){
   external.hidden=!verified?.url;
   if(verified?.url){external.href=verified.url;external.setAttribute('aria-label','Abrir '+anime.title+' en Crunchyroll');}
   else external.removeAttribute('href');
  }
  if(rail){
   for(const [index,button] of [...rail.querySelectorAll('[data-premiere-index]')].entries()){
    const active=index===current;
    button.classList.toggle('active',active);
    button.setAttribute('aria-current',active?'true':'false');
    button.setAttribute('aria-label',(index+1)+' de '+slides.length+': '+slides[index].anime.title+(active?', seleccionado':''));
   }
  }
  section.classList.remove('premiere-switching');
  void section.offsetWidth;
  section.classList.add('premiere-switching');
  preload(current);
  schedule();
 }
 function switchTo(index,manual=false){
  if(!slides.length)return;
  const chosen=((Number(index)||0)%slides.length+slides.length)%slides.length;
  if(manual)pauseUntil=Date.now()+12000;
  current=chosen;
  update();
 }
 function controls(){
  if(!rail)return;
  rail.replaceChildren();
  for(let i=0;i<slides.length;i++){
   const button=document.createElement('button');
   button.type='button';button.className='premiere-marker';button.dataset.premiereIndex=i;
   button.title=slides[i].anime.title;
   const bar=document.createElement('span');bar.className='premiere-marker-bar';bar.setAttribute('aria-hidden','true');
   button.append(bar);rail.append(button);
  }
  $('#premiere-controls')?.removeAttribute('hidden');
  rail.addEventListener('click',event=>{
   const target=event.target.closest('[data-premiere-index]');
   if(target)switchTo(Number(target.dataset.premiereIndex),true);
  });
  prev?.addEventListener('click',()=>switchTo(current-1,true));
  next?.addEventListener('click',()=>switchTo(current+1,true));
 }
 function apply(scheduleData){
  if(ready)return;
  const found=ranking.select(scheduleData,Date.now(),7);
  if(!found.length)return;
  const all=found.map(({anime})=>({
   ...anime,source:'airing',
   description_es:anime.description_es||'',
   genres:Array.isArray(anime.genres)?anime.genres:[],
   streaming:Array.isArray(anime.streaming)?anime.streaming:[],
   siteUrl:anime.siteUrl||'',next:anime.next||null
  }));
  window.OneUpCatalog?.register?.(all);
  slides=found;ready=true;
  const stamp=Date.parse(scheduleData.updated||'');
  const sourceDate=Number.isFinite(stamp)
   ?new Intl.DateTimeFormat('es',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}).format(new Date(stamp)):'';
  updated=sourceDate;
  controls();switchTo(0);
 }
 document.addEventListener('oneup-airing-ready',e=>{if(e.detail)apply(e.detail)});
 // The separate airing dashboard may fail or be delayed. Use only our published
 // SAME snapshot as a fallback; never manufacture releases from a random title.
 setTimeout(async()=>{
  if(ready)return;
  try{
   const res=await fetch('./data/airing.json',{cache:'no-cache'});
   if(res.ok)apply(await res.json());
  }catch{/* Keep existing trending hero; no fictitious "today" badge. */}
 },2600);
 section.addEventListener('mouseenter',()=>{hovered=true;cancel()});
 section.addEventListener('mouseleave',()=>{hovered=false;schedule()});
 section.addEventListener('focusin',event=>{
  if(event.target.closest('#premiere-controls')||event.target.closest('.hero-actions')){
   focused=true;cancel();
  }
 });
 section.addEventListener('focusout',event=>{
  if(!section.contains(event.relatedTarget)){focused=false;schedule()}
 });
 section.addEventListener('keydown',event=>{
  if(!event.target.closest('#premiere-controls')||!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();
  switchTo(current+(event.key==='ArrowRight'?1:-1),true);
 });
 let x=null,y=null;
 section.addEventListener('touchstart',event=>{
  if(event.touches.length!==1||event.target.closest('button,a,input'))return;
  x=event.touches[0].clientX;y=event.touches[0].clientY;
 },{passive:true});
 section.addEventListener('touchend',event=>{
  if(x===null||!ready||!event.changedTouches.length)return;
  const dx=event.changedTouches[0].clientX-x,dy=event.changedTouches[0].clientY-y;
  x=null;y=null;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.5)switchTo(current+(dx<0?1:-1),true);
 },{passive:true});
 document.addEventListener('visibilitychange',schedule);
 window.addEventListener('hashchange',schedule);
 window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',schedule);
 if('IntersectionObserver'in window){
  const io=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting===true;schedule()},{threshold:.12});
  io.observe(section);
 }
 window.OneUpPremiereHero=Object.freeze({isReady:()=>ready,current:()=>slides[current]?.anime.id||null,get updated(){return updated;}});
})();
