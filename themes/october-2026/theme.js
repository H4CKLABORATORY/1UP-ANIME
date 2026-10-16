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
let featuredMedia=null,context=null,audioEnabled=false;
try{audioEnabled=localStorage.getItem('oneup-october-audio')==='on'}catch{}
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
   '<a id="oct-black-clover-link" class="cta primary" href="'+externalLink+'" target="_blank" rel="noopener noreferrer">Conocer el anime ↗</a>'+
   '<p class="oct-footnote">Inspiración temática original de 1UP. No es una colaboración con el estudio ni un servicio de reproducción.</p>'+
  '</div>'+
  '<div class="oct-event-art" aria-hidden="true">'+
   '<div class="oct-event-frame"><span class="oct-art-fallback">1UP</span><img id="oct-feature-poster" alt="" loading="lazy" hidden></div>'+
   '<div class="oct-stamp">ESTRENO<br>DE TEMPORADA<small>FOCO EDITORIAL · 2026</small></div>'+
  '</div>'+
 '</section>';
}
function visibleAudioLabel(btn){
 btn.setAttribute('aria-pressed',String(audioEnabled));
 btn.setAttribute('aria-label',audioEnabled?'Desactivar sonido de temporada':'Activar sonido de temporada');
 btn.innerHTML='<span class="oct-audio-indicator" aria-hidden="true"></span>'+
  '<span aria-hidden="true">'+(audioEnabled?'SONIDO ACTIVADO':'ACTIVAR SONIDO')+'</span>';
}
async function playSting(){
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio||!audioEnabled)return;
 try{
  if(!context)context=new Audio();
  if(context.state==='suspended')await context.resume();
  const ctx=context,start=ctx.currentTime+.008;
  const master=ctx.createGain();
  master.gain.setValueAtTime(.0001,start);
  master.gain.linearRampToValueAtTime(.065,start+.075);
  master.gain.exponentialRampToValueAtTime(.0001,start+.92);
  master.connect(ctx.destination);
  const notes=[{f:196,len:.63,t:0,v:.27},{f:392,len:.46,t:.08,v:.21},{f:588,len:.53,t:.18,v:.09}];
  for(const n of notes){
   const oscillator=ctx.createOscillator(),envelope=ctx.createGain();
   oscillator.type='sine';
   oscillator.frequency.setValueAtTime(n.f,start+n.t);
   oscillator.frequency.exponentialRampToValueAtTime(n.f*.996,start+n.t+n.len);
   envelope.gain.setValueAtTime(.0001,start+n.t);
   envelope.gain.linearRampToValueAtTime(n.v,start+n.t+.025);
   envelope.gain.exponentialRampToValueAtTime(.0001,start+n.t+n.len);
   oscillator.connect(envelope);envelope.connect(master);
   oscillator.start(start+n.t);oscillator.stop(start+n.t+n.len+.02);
  }
  // Deterministic filtered wind: no copyrighted or downloaded sound sample.
  const frames=Math.floor(ctx.sampleRate*.31);
  const buffer=ctx.createBuffer(1,frames,ctx.sampleRate);
  const channel=buffer.getChannelData(0);
  let seed=90731;
  for(let i=0;i<frames;i++){seed=(seed*1664525+1013904223)>>>0;channel[i]=(seed/2147483647-1)*.19}
  const wind=ctx.createBufferSource();wind.buffer=buffer;
  const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=920;
  const gain=ctx.createGain();gain.gain.value=.08;
  wind.connect(filter);filter.connect(gain);gain.connect(master);
  wind.start(start);wind.stop(start+.31);
 }catch(error){console.info('1UP: el navegador ha restringido el sonido.',error?.message)}
}
function audioControl(){
 const btn=document.createElement('button');
 btn.type='button';btn.className='oct-event-control';btn.id='oct-audio-control';
 visibleAudioLabel(btn);
 btn.addEventListener('click',()=>{
  audioEnabled=!audioEnabled;
  try{localStorage.setItem('oneup-october-audio',audioEnabled?'on':'off')}catch{}
  visibleAudioLabel(btn);
  if(audioEnabled)void playSting();
 });
 const row=document.createElement('div');
 row.className='oct-sound-wrap';
 row.appendChild(btn);
 const actions=$('.hero .hero-actions');
 if(actions)actions.after(row);
 else $('.hero-copy')?.appendChild(row);
}
async function fetchFeature(){
 const q='query { Page(page:1,perPage:10){ media(search:"Black Clover",type:ANIME,sort:[START_DATE_DESC]){id idMal isAdult format seasonYear startDate{year}title{english romaji} coverImage{extraLarge large} bannerImage description(asHtml:false) episodes averageScore genres } } }';
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
 try{
  const response=await fetch('https://graphql.anilist.co',{
   method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({query:q}),signal:controller.signal
  });
  if(!response.ok)throw Error('AniList '+response.status);
  const json=await response.json();
  const results=json.data?.Page?.media;
  if(!Array.isArray(results))throw Error('No se recibieron datos del anime');
  const safe=results.filter(x=>!x.isAdult && /black\s*clover/i.test([x.title?.english,x.title?.romaji].join(' ')));
  const anime=safe[0]?normalize(safe[0]):null;
  if(!anime)return;
  featuredMedia=anime;
  const poster=$('#oct-feature-poster');
  if(poster&&anime.image){
   poster.src=anime.image;
   poster.alt='Portada promocional de '+anime.title;
   poster.onload=()=>{poster.hidden=false;poster.parentElement?.classList.add('has-poster');poster.previousElementSibling?.remove()};
   poster.onerror=()=>{poster.hidden=true};
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
 }catch(e){console.info('1UP Octubre: disponible el enlace oficial aunque AniList no responda.',e?.message)}
 finally{clearTimeout(timer)}
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
 if(anchor)anchor.insertAdjacentHTML('afterend',featureHTML());
 audioControl();
 // No automatic sound on load: iPhone requires an eligible user gesture.
 void fetchFeature();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
