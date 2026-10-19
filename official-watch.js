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

/* Enlaces puntuales comprobados en páginas publicas oficiales, NO fuentes de video.
 * Las rutas cambian según idioma/territorio y requieren abrir Crunchyroll.
 */
const verifiedEpisodes=Object.freeze({
  'mal-34572': Object.freeze({
    1:{title:'Asta and Yuno',url:'https://www.crunchyroll.com/watch/G69P9MD9Y/asta-and-yuno'},
    2:{title:"The Boys' Promise",url:'https://www.crunchyroll.com/watch/G6DQG759R/the-boys-promise'},
    3:{title:'To the Royal Capital of the Clover Kingdom!',url:'https://www.crunchyroll.com/watch/GX9UQW5X0/to-the-royal-capital-of-the-clover-kingdom'},
    4:{title:'The Magic Knights Entrance Exam',url:'https://www.crunchyroll.com/watch/G31UX0X2D/the-magic-knights-entrance-exam'},
    5:{title:'The Path to the Wizard King',url:'https://www.crunchyroll.com/watch/G6XJJ2PMR/the-path-to-the-wizard-king'},
    6:{title:'The Black Bulls',url:'https://www.crunchyroll.com/watch/G4VUQXMMG/the-black-bulls'}
  })
});
function safeEpisodeUrl(raw){
 try{
  const url=new URL(raw);
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||
    !['crunchyroll.com','www.crunchyroll.com'].includes(url.hostname.toLowerCase()))return '';
  if(!/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?watch\/[A-Z0-9]{8,}(?:\/[a-z0-9][a-z0-9-]*)?\/?$/.test(url.pathname))return '';
  return url.origin+url.pathname;
 }catch{return ''}
}
function getEpisode(animeId,season=1,number=1){
 const id=String(animeId||'');
 const seasonNumber=Number(season),episodeNumber=Number(number);
 if(!/^mal-[1-9]\d*$/.test(id)||seasonNumber!==1||
    !Number.isInteger(episodeNumber)||episodeNumber<1||episodeNumber>9999)return null;
 const item=verifiedEpisodes[id]?.[episodeNumber];
 const url=safeEpisodeUrl(item?.url);
 return url?{url,title:item.title,episode:episodeNumber,provider:'Crunchyroll',origin:'verified',kind:'external_episode'}:null;
}
function updateEpisodeLink(animeId,season,episode){
 const section=document.querySelector('#oneup-official-watch');
 if(!section||section.dataset.animeId!==String(animeId)||window.OneUpCatalog?.active()!==animeId)return;
 const target=section.querySelector('[data-oneup-official-episode]');
 if(!target)return;
 target.replaceChildren();
 const entry=getEpisode(animeId,season,episode);
 if(!entry)return;
 const link=document.createElement('a');
 link.className='oneup-official-episode-link';
 link.href=entry.url;
 link.target='_blank';
 link.rel='noopener noreferrer';
 link.textContent='Abrir episodio '+entry.episode+' en Crunchyroll ↗';
 link.setAttribute('aria-label','Abrir episodio '+entry.episode+' de '+entry.title+' en el sitio oficial de Crunchyroll');
 const note=document.createElement('small');
 note.textContent='Enlace externo al episodio, no reproducción ni descarga desde 1UP. El acceso depende de Crunchyroll.';
 target.append(link,note);
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
 const episodeTarget=document.createElement('div');episodeTarget.className='oneup-official-episode';
 episodeTarget.dataset.oneupOfficialEpisode='true';copy.append(episodeTarget);
 const buttons=document.createElement('div');buttons.className='oneup-official-watch-actions';
 const inSite=document.createElement('button');inSite.type='button';inSite.className='cta primary';inSite.textContent='Opciones en 1UP ↓';
 inSite.addEventListener('click',()=>player.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}));
 const outbound=document.createElement('a');outbound.className='cta outline';
 outbound.href=provider.url;outbound.target='_blank';outbound.rel='noopener noreferrer';outbound.textContent='Ir a Crunchyroll ↗';
 buttons.append(inSite,outbound);section.dataset.animeId=String(anime.id);
 section.append(copy,buttons);player.after(section);
 updateEpisodeLink(anime.id,1,1);
}
document.addEventListener('oneup-anime-opened',event=>attachToDetail(event.detail));
document.addEventListener('oneup-episode-selected',event=>{
 const detail=event.detail||{};
 if(detail.animeId)updateEpisodeLink(detail.animeId,detail.season,detail.episode);
});
window.OneUpOfficialWatch=Object.freeze({get,safeSeriesUrl,safeEpisodeUrl,getEpisode});
})();