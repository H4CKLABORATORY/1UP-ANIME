/*
 1UP / Cinema October study: editorial anime season event + original optional
 audio sting. This file never overrides the catalogue, login, or streaming APIs.
*/
(()=>{
'use strict';
const $=selector=>document.querySelector(selector);
const PREVIEW=document.body?.dataset?.themePreview==='october' ||
 new URLSearchParams(location.search).get('octoberPreview')==='1';
const date=new Date();
const HALLOWEEN=(date.getMonth()===9);
const shouldRun=PREVIEW||HALLOWEEN;
if(!shouldRun)return;
const themeRoot='./themes/october-2026/';
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches??false;
const externalLink='https://bclover.jp/';
let featuredMedia=null;
const escape=str=>String(str??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[ch]));
const normalize=m=>({
 id:m.idMal?'mal-'+m.idMal:'al-'+m.id,
 mal_id:m.idMal??null,ani_id:m.id??null,
 title:m.title?.english||m.title?.romaji||'Black Clover',
 image:m.coverImage?.extraLarge||m.coverImage?.large||'',
 banner:m.bannerImage||'',
 description:String(m.description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim(),
 format:m.format||'TV',episodes:m.episodes||0,averageScore:m.averageScore||0,
 year:m.seasonYear||m.startDate?.year||null,
 genres:Array.isArray(m.genres)?m.genres:[]
});
function featureHTML(){
 return '<section class="oct-event wrap" aria-label="Especial editorial del mes: Black Clover">'+
  '<span class="oct-moon" aria-hidden="true"></span>'+
  '<img class="oct-event-seal" src="'+themeRoot+'arcane-seal.svg" loading="lazy" alt="" aria-hidden="true">'+
  '<div class="oct-event-copy">'+
   '<span class="oct-kicker">EDICIÓN DE OCTUBRE · 1UP ORIGINAL</span>'+
   '<h2>BLACK<br><span>CLOVER.</span></h2>'+
   '<p>Un mes de estrenos, teorías y mundos extraordinarios. Black Clover protagoniza esta selección editorial inspirada en la magia y la atmósfera de Halloween.</p>'+
   '<div class="oct-feature-metadata" id="oct-feature-metadata" aria-label="Datos de la serie"></div>'+
   '<a id="oct-black-clover-link" class="cta primary" href="'+externalLink+'" target="_blank" rel="noopener noreferrer">Conocer el anime ↗</a>'+
   '<p class="oct-footnote">Inspiración temática original de 1UP. No es una colaboración con el estudio ni un servicio de reproducción.</p>'+
  '</div>'+
  '<div class="oct-event-art" aria-hidden="true">'+
   '<div class="oct-event-frame"><span class="oct-art-fallback">1UP</span><img id="oct-feature-poster" alt="" loading="lazy" hidden></div>'+
   '<div class="oct-stamp">ESTRENO<br>DE TEMPORADA<small>FOCO EDITORIAL · 2026</small></div>'+
  '</div>'+
 '</section>';
}
// Intro is automatic; no season sound option or extra synthesizer is displayed.
function showFeaturedAnime(anime){
 if(!anime||!/black\s*clover/i.test(anime.title||''))return;
 featuredMedia=anime;
 const poster=$('#oct-feature-poster');
 if(poster&&anime.image){
  const img=String(anime.image);
  if(/^https:\/\//i.test(img)){
   poster.src=img;
   poster.alt='Portada del anime '+anime.title;
   poster.onload=()=>{
    poster.hidden=false;
    poster.parentElement?.classList.add('has-poster');
    poster.previousElementSibling?.remove();
   };
   poster.onerror=()=>{poster.hidden=true};
  }
 }
 const metadata=$('#oct-feature-metadata');
 if(metadata){
  const entries=[
   'FICHA DE ANIME',
   Number(anime.year)>=1990&&Number(anime.year)<=2100?String(anime.year):null,
   anime.format==='TV'?'SERIE':anime.format==='MOVIE'?'PELÍCULA':null
  ].filter(Boolean);
  metadata.replaceChildren(...entries.map(value=>{
   const tag=document.createElement('span');
   tag.textContent=value;
   return tag;
  }));
 }
 window.OneUpCatalog?.register?.([anime]);
 const link=$('#oct-black-clover-link');
 if(link){
  link.textContent='Ver ficha del anime ↗';
  link.href='#anime-dialog';
  link.removeAttribute('target');link.removeAttribute('rel');
  link.addEventListener('click',event=>{
   event.preventDefault();
   window.OneUpCatalog?.register?.([anime]);
   if(window.OneUpCatalog?.open)window.OneUpCatalog.open(anime.id);
   else window.open(externalLink,'_blank','noopener,noreferrer');
  });
 }
}
async function localFeaturedAnime(){
 try{
  const response=await fetch('./data/catalog.json',{cache:'no-store'});
  if(!response.ok)return null;
  const data=await response.json();
  const groups=data.groups||{};
  const all=Object.values(groups).flatMap(items=>Array.isArray(items)?items:[]);
  const matched=all.find(a=>/^black clover$/i.test(String(a?.title||'').trim()))||
   all.find(a=>/black\s*clover/i.test(String(a?.title||'')));
  return matched?{...matched}:null;
 }catch{return null}
}
async function fetchFeature(){
 // First paint uses the site's own durable data; the remote metadata is an upgrade.
 const cached=await localFeaturedAnime();
 if(cached)showFeaturedAnime(cached);
 const query='query { Page(page:1,perPage:10){ media(search:"Black Clover",type:ANIME,sort:[START_DATE_DESC]){id idMal isAdult format seasonYear startDate{year}title{english romaji} coverImage{extraLarge large} bannerImage description(asHtml:false) episodes averageScore genres } } }';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
 try{
  const response=await fetch('https://graphql.anilist.co',{
   method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({query}),signal:controller.signal
  });
  if(!response.ok)throw Error('AniList '+response.status);
  const json=await response.json();
  const results=json.data?.Page?.media;
  if(!Array.isArray(results))throw Error('No se recibieron datos del anime');
  const safe=results.filter(x=>!x.isAdult && /black\s*clover/i.test([x.title?.english,x.title?.romaji].join(' ')));
  if(safe.length && !cached)showFeaturedAnime(normalize(safe[0]));
 }catch(e){
  if(!cached)console.info('1UP Octubre: la ficha externa no está disponible. Sigue habilitado el enlace oficial.',e?.message);
 }finally{clearTimeout(timer)}
}
function activateEditorialMotion(){
 const section=$('.oct-event');
 if(!section||reduced||!('IntersectionObserver' in window))return;
 const observer=new IntersectionObserver(entries=>{
  for(const item of entries){
   if(!item.isIntersecting)continue;
   observer.unobserve(item.target);
   section.classList.add('oct-revealed');
   if(typeof Element.prototype.animate!=='function')return;
   const targets=section.querySelectorAll('.oct-kicker,.oct-event h2,.oct-event-copy>p:not(.oct-footnote),.oct-event-copy>.cta,.oct-event-art');
   targets.forEach((node,index)=>{
    node.animate([
     {opacity:.06,transform:'translate3d(0,18px,0)'},
     {opacity:1,transform:'translate3d(0,0,0)'}
    ],{
     duration:460+(index===1?130:0),delay:index*80,
     easing:'cubic-bezier(.16,1,.3,1)',fill:'both'
    });
   });
  }
 },{threshold:.15});
 observer.observe(section);
}
// On desktop the entire illustration shifts by at most 5 px.
// Mobile devices avoid pointer effects for performance and touch ergonomics.
function activateParallax(){
 const section=$('.oct-event');
 if(!section||reduced||!matchMedia('(hover:hover) and (pointer:fine)').matches)return;
 let queued=false,x=0,y=0;
 const flush=()=>{
  queued=false;
  section.style.setProperty('--oct-shift-x',x.toFixed(2)+'px');
  section.style.setProperty('--oct-shift-y',y.toFixed(2)+'px');
 };
 section.addEventListener('pointermove',event=>{
  const box=section.getBoundingClientRect();
  x=(((event.clientX-box.left)/box.width)-.5)*9;
  y=(((event.clientY-box.top)/box.height)-.5)*9;
  if(!queued){queued=true;requestAnimationFrame(flush)}
 },{passive:true});
 section.addEventListener('pointerleave',()=>{
  x=0;y=0;if(!queued){queued=true;requestAnimationFrame(flush)}
 },{passive:true});
}

function init(){
 if(!$('#home-screen')||!$('.hero'))return;
 document.body.classList.add('oneup-october');
 const hero=$('.hero');
 const stamp=document.createElement('img');
 stamp.className='oct-arcane-mark';stamp.src=themeRoot+'arcane-seal.svg';stamp.alt='';
 stamp.setAttribute('aria-hidden','true');stamp.decoding='async';
 hero.append(stamp);
 const line=$('.limited-tag');
 if(line)line.textContent='OCTUBRE 2026 · ESPECIAL HALLOWEEN';
 const anchor=$('#home-screen .marquee');
 if(anchor){
  const editorialEnd=$('#oneup-studio-airing')||anchor;
  editorialEnd.insertAdjacentHTML('afterend',featureHTML());
 }
 activateEditorialMotion();
 activateParallax();
 // The original cinema intro attempts audio automatically. Safari may deny it.
 void fetchFeature();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
