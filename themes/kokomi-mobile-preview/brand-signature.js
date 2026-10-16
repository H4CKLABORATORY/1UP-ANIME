/* 1UP ANIME — official 3.2-second video signature.
 * Video: original MP4 with AAC audio, supplied by the project owner.
 * Playback with sound requires a user gesture on iOS / mobile browsers.
 * Assets are independent of anime streaming and never enter player providers.
 */
(()=>{
'use strict';
const videoUrl='./assets/1up-anime-intro-firma-3seg.mp4';
const posterUrl='./assets/1up-anime-logo-poster.jpg';
const logoTitle='1UP ANIME — firma sonora original';
const hidden=(node,value)=>{if(node)node.hidden=!!value};
const checkAsset=async url=>{
 try{const r=await fetch(url,{method:'HEAD',cache:'no-cache'});return r.ok}
 catch{return false}
};
function install(){
 const mainBrand=document.querySelector('.header .brand');
 if(!mainBrand)return;
 Promise.all([checkAsset(videoUrl),checkAsset(posterUrl)]).then(([videoReady,posterReady])=>{
  if(!posterReady){console.info('1UP ANIME: fotograma original no disponible; se mantiene el logo de respaldo.');return}
  document.body.classList.add('oneup-video-brand-enabled');
  const optionalIcon='./assets/1up-anime-app-icon-512.png';
  checkAsset(optionalIcon).then(iconReady=>{
    if(!iconReady)return;
    const favicon=document.querySelector('link[rel="icon"]');
    if(favicon){favicon.href=optionalIcon;favicon.type='image/png'}
    const apple=document.querySelector('link[rel="apple-touch-icon"]');
    if(apple)apple.href=optionalIcon;
  }).catch(()=>{});

  const oldImage=mainBrand.querySelector('.brand-symbol');
  const oldText=mainBrand.querySelector('.brand-name');
  hidden(oldImage,true);hidden(oldText,true);
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const media=document.createElement((reduced||!videoReady)?'img':'video');
  media.className='oneup-motion-logo';media.setAttribute('aria-hidden','true');
  if(reduced||!videoReady){media.src=posterUrl;media.alt=''}
  else{
   media.src=videoUrl;media.poster=posterUrl;media.autoplay=true;media.loop=true;
   media.muted=true;media.playsInline=true;media.preload='metadata';
   media.setAttribute('muted','');media.setAttribute('playsinline','');
   media.addEventListener('error',()=>{
     const poster=document.createElement('img');
     poster.src=posterUrl;poster.alt='';poster.className='oneup-motion-logo';poster.setAttribute('aria-hidden','true');
     media.replaceWith(poster);
   },{once:true});
  }
  mainBrand.insertBefore(media,mainBrand.firstChild);
  mainBrand.setAttribute('aria-label','1UP Anime, inicio');
  if(media.tagName==='VIDEO')media.play().catch(()=>{});
  // The navigation link remains a navigation link. Sound uses its own button.
  if(videoReady){
  const trigger=document.createElement('button');
  trigger.type='button';trigger.className='oneup-signature-trigger';
  trigger.textContent='♫';trigger.setAttribute('aria-label','Ver el logo animado con sonido');
  trigger.title='Reproducir nuestra firma sonora';
  mainBrand.after(trigger);
  const dialog=document.createElement('dialog');dialog.id='oneup-signature-dialog';
  dialog.className='oneup-signature-dialog';
  dialog.setAttribute('aria-label',logoTitle);
  dialog.innerHTML='<div class="oneup-signature-top"><strong>1UP ANIME</strong>'+
   '<button type="button" class="oneup-signature-close" aria-label="Cerrar presentación">✕</button></div>'+
   '<video class="oneup-signature-video" controls playsinline preload="none" poster="'+posterUrl+'" aria-label="'+logoTitle+'">'+
   '<source src="'+videoUrl+'" type="video/mp4"></video>'+
   '<div class="oneup-signature-meta"><span>Firma sonora original · 3.2 segundos</span>'+
   '<button type="button" class="oneup-signature-replay">↻ Reproducir de nuevo</button></div>';
  document.body.append(dialog);
  const player=dialog.querySelector('video');
  const close=()=>{player.pause();player.currentTime=0;if(dialog.open)dialog.close()};
  dialog.querySelector('.oneup-signature-close').addEventListener('click',close);
  dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
  dialog.addEventListener('close',()=>{player.pause();player.currentTime=0;trigger.focus()});
  dialog.addEventListener('cancel',()=>{player.pause()});
  const begin=()=>{
   dialog.showModal();player.muted=false;player.currentTime=0;
   player.play().catch(()=>{ /* controls remain available for user playback */});
  };
  trigger.addEventListener('click',begin);
  dialog.querySelector('.oneup-signature-replay').addEventListener('click',()=>{
   player.currentTime=0;player.muted=false;player.play().catch(()=>{});
  });
  }
  // The Kokomi drawer creates a linked brand after DOMContentLoaded.
  const drawerBrand=document.querySelector('#km-drawer .km-drawer-brand');
  if(drawerBrand){
   const imageFromFilm=document.createElement('img');
   imageFromFilm.src=posterUrl;imageFromFilm.alt='';imageFromFilm.className='oneup-drawer-logo';
   drawerBrand.replaceChildren(imageFromFilm);
   drawerBrand.setAttribute('aria-label','1UP ANIME, inicio');
  }
  // Footer can show a still of the same intro without generating another design.
  const footer=document.querySelector('.footer-brand img');
  if(footer){footer.src=posterUrl;footer.classList.add('oneup-footer-video-logo')}
 }).catch(()=>{/* Leave previous branding intact until source is available. */});
}
document.addEventListener('DOMContentLoaded',install);
})();
