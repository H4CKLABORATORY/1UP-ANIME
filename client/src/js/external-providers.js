/* 1UP Anime — permission-aware external provider directory.
 * Catalogue links are distinguished from playable licensed videos.
 * No stream extraction, DRM bypass, iframe guessing or retransmission.
 */
(()=>{
'use strict';
let directoryPromise=null;
const $=q=>document.querySelector(q);
const escape=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const allowedHosts={
 animeonline_castellano:['animeonline.ninja'],
 iqiyi_anime:['iq.com'],
};
const allowedUrl=(id,raw)=>{
 try{
  const u=new URL(raw);
  const allow=allowedHosts[id]||[];
  if(u.protocol!=='https:'||u.username||u.password)return '';
  return allow.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:'';
 }catch{return ''}
};
async function getDirectory(){
 if(directoryPromise)return directoryPromise;
 directoryPromise=(async()=>{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6500);
  try{
   const response=await fetch('./data/external-providers.json',{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('Unavailable directory');
   const parsed=await response.json();
   return parsed && typeof parsed==='object'?parsed:{};
  }catch{return {}}
  finally{clearTimeout(timer)}
 })();
 return directoryPromise;
}
const descriptions={
 animeonline_castellano:{
  eyebrow:'CATÁLOGO DOBLADO',
  heading:'ANIME EN CASTELLANO',
  body:'Explora anime doblado al español de España. El contenido y sus reproductores permanecen en el sitio externo.',
  number:'01',glyph:'ES',className:'castellano'
 },
 iqiyi_anime:{
  eyebrow:'PLATAFORMA OFICIAL',
  heading:'ANIME EN iQIYI',
  body:'Descubre series y animación asiática en iQIYI. El acceso, los idiomas y la disponibilidad dependen de su plataforma.',
  number:'02',glyph:'iQ',className:'iqiyi'
 }
};
function providerCard(entry){
 const template=descriptions[entry.id];
 const url=allowedUrl(entry.id,entry.url);
 if(!template||!url)return '';
 return '<article class="oneup-provider-card '+template.className+'">'+
  '<div class="oneup-provider-visual" aria-hidden="true"><span class="oneup-provider-number">'+template.number+'</span>'+
  '<span class="oneup-provider-glyph">'+template.glyph+'</span><span class="oneup-provider-swoosh"></span></div>'+
  '<div class="oneup-provider-copy"><span class="oneup-provider-kicker">'+template.eyebrow+' <b>↗</b></span>'+
  '<h3>'+template.heading+'</h3><p>'+template.body+'</p>'+
  '<a class="oneup-provider-open" href="'+escape(url)+'" target="_blank" rel="noopener noreferrer">'+
   'Abrir en '+escape(entry.provider)+' <span aria-hidden="true">↗</span></a>'+
  '<span class="oneup-provider-status">ENLACE EXTERNO · NO REPRODUCCIÓN INTEGRADA</span></div>'+
  '</article>';
}
async function addDirectory(){
 const host=$('#home-screen');
 if(!host||$('#oneup-external-directory'))return;
 const dir=await getDirectory();
 const cards=(Array.isArray(dir.external_catalogs)?dir.external_catalogs:[]).map(providerCard).filter(Boolean);
 if(!cards.length)return;
 const section=document.createElement('section');
 section.id='oneup-external-directory';
 section.className='wrap oneup-external-directory';
 section.setAttribute('aria-label','Explorar catálogos de anime en servicios externos');
 section.innerHTML='<div class="oneup-provider-title"><div>'+
  '<span class="micro">EXPLORA OTROS CATÁLOGOS</span>'+
  '<h2>DOS UNIVERSOS. <em>MÁS ANIME.</em></h2></div>'+
  '<p>1UP te ayuda a descubrir opciones; cada proveedor controla sus propios videos, suscripciones y disponibilidad.</p></div>'+
  '<div class="oneup-provider-grid">'+cards.join('')+'</div>';
 const anchor=host.querySelector('.marquee');
 if(anchor)anchor.after(section);
 else host.appendChild(section);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addDirectory,{once:true});
else void addDirectory();
window.OneUpExternalProviders={directory:getDirectory,link:allowedUrl};
})();
