/* 1UP Anime — enlaces externos oficiales de series. No son archivos de vídeo ni autorizan retransmisión.
 * Enlaces contrastados con las fichas públicas de Crunchyroll el 18-10-2026.
 * NUNCA usar como fuente de iframe ni como ruta MP4/HLS del reproductor integrado.
 */
(()=>{
'use strict';
const verified={
  'mal-61967':'https://www.crunchyroll.com/es-es/series/GRE50KV36/black-clover',
  'mal-34572':'https://www.crunchyroll.com/es-es/series/GRE50KV36/black-clover',
  'mal-61987':'https://www.crunchyroll.com/es/series/G3KHEVDJ7/the-apothecary-diaries',
  'mal-64340':'https://www.crunchyroll.com/es/series/GT00384004/overgeared',
  'mal-63181':'https://www.crunchyroll.com/series/GP5HJ84D2/tougen-anki'
};
function safeSeriesUrl(raw){
 try{
  const url=new URL(raw);
  if(url.protocol!=='https:'||url.username||url.password||
    !['crunchyroll.com','www.crunchyroll.com'].includes(url.hostname.toLowerCase()))return '';
  // Only a real series page, never guessed player URLs or search results.
  if(!/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?series\/[A-Za-z0-9]{8,}(?:\/[A-Za-z0-9_-]+)?\/?$/.test(url.pathname))return '';
  return url.origin+url.pathname;
 }catch{return ''}
}
function get(anime){
 if(!anime || typeof anime!=='object')return null;
 const key=String(anime.id||anime.mal_id&&'mal-'+anime.mal_id||'');
 const handChecked=safeSeriesUrl(verified[key]);
 if(handChecked)return {url:handChecked,provider:'Crunchyroll',origin:'verified'};
 const links=Array.isArray(anime.streaming)?anime.streaming:[];
 for(const entry of links){
   const link=safeSeriesUrl(entry?.url);
   if(link)return {url:link,provider:'Crunchyroll',origin:'catalog'};
 }
 return null;
}
function attachToDetail(anime){
 const root=document.querySelector('#anime-dialog-body');
 if(!root || window.OneUpCatalog?.active()!==anime?.id)return;
 root.querySelector('#oneup-official-watch')?.remove();
 root.querySelector('.oneup-crunchyroll-cta')?.remove();
 const provider=get(anime);
 if(!provider)return;
 const commands=root.querySelector('.oneup-detail-commands');
 if(commands){
   const button=document.createElement('a');
   button.className='cta outline oneup-crunchyroll-cta';
   button.href=provider.url;button.target='_blank';button.rel='noopener noreferrer';
   button.textContent='Ver en Crunchyroll ↗';
   button.setAttribute('aria-label','Abrir página oficial de '+anime.title+' en Crunchyroll');
   commands.append(button);
 }
 const player=root.querySelector('#oneup-player-section');
 if(!player)return;
 const section=document.createElement('section');
 section.id='oneup-official-watch';section.className='oneup-official-watch';
 const copy=document.createElement('div');copy.className='oneup-official-watch-copy';
 const heading=document.createElement('h3');heading.textContent='ELIGE DÓNDE VERLO';
 const note=document.createElement('p');
 note.textContent='Consulta los servidores de 1UP cuando estén habilitados o abre la página oficial. La emisión no garantiza que el episodio ya esté disponible en cada plataforma.';
 copy.append(heading,note);
 const buttons=document.createElement('div');buttons.className='oneup-official-watch-actions';
 const inSite=document.createElement('button');inSite.type='button';inSite.className='cta primary';inSite.textContent='Opciones en 1UP ↓';
 inSite.addEventListener('click',()=>player.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
 const outbound=document.createElement('a');outbound.className='cta outline';
 outbound.href=provider.url;outbound.target='_blank';outbound.rel='noopener noreferrer';outbound.textContent='Ir a Crunchyroll ↗';
 buttons.append(inSite,outbound);section.append(copy,buttons);player.after(section);
}
document.addEventListener('oneup-anime-opened',event=>attachToDetail(event.detail));
window.OneUpOfficialWatch=Object.freeze({get,safeSeriesUrl});
})();