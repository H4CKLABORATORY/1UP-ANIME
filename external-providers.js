/* 1UP Anime — verified external series pages.
 * Opens JKAnime on its own website, where its own player stays under its control.
 * No video scraping, stream downloading, frame interception or proxying.
 */
(()=>{
'use strict';
let indexed=null;
const escape=s=>String(s||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const lookup=async()=>{
 if(indexed)return indexed;
 indexed=(async()=>{
  try{
   const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),6000);
   try{
    const r=await fetch('./data/external-providers.json',{cache:'no-cache',signal:ctrl.signal});
    if(!r.ok)throw Error('Provider directory unavailable');
    const j=await r.json();
    return j.external_series&&typeof j.external_series==='object'?j.external_series:{};
   }finally{clearTimeout(timer)}
  }catch{return {}}
 })();
 return indexed;
};
document.addEventListener('oneup-anime-opened',async ({detail:anime})=>{
 const id=anime?.id;
 if(!id)return;
 const panel=document.querySelector('#anime-dialog-body .oneup-detail-lower');
 if(!panel)return;
 const providers=await lookup();
 if(window.OneUpCatalog?.active()!==id||!panel.isConnected)return;
 panel.querySelector('#oneup-external-availability')?.remove();
 const selected=providers[id]||(anime.mal_id?providers['mal-'+anime.mal_id]:null);
 const url=selected?.url;
 if(!url||!/^https:\/\/jkanime\.net\/[a-z0-9-]+\/$/.test(url))return;
 const section=document.createElement('section');
 section.id='oneup-external-availability';
 section.className='oneup-detail-section oneup-external-source';
 section.innerHTML='<div><span class="micro">CONSULTAR EN EL SITIO EXTERNO</span>'+
  '<h3>JKANIME</h3><p>Encontramos una página de esta serie en JKAnime. La reproducción ocurre en su propia web; 1UP Anime no reproduce ni aloja esos episodios.</p></div>'+
  '<a href="'+escape(url)+'" class="cta outline" target="_blank" rel="noopener noreferrer" aria-label="Abrir '+escape(anime.title)+' en JKAnime (sitio externo)">Abrir serie en JKAnime ↗</a>';
 const where=panel.querySelector('#oneup-player-section');
 if(where)where.after(section);else panel.prepend(section);
});
})();