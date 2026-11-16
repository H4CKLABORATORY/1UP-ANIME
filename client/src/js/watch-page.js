(()=>{'use strict';
const $=s=>document.querySelector(s),params=new URLSearchParams(location.search),raw=params.get('anime')||'';
const id=raw.replace(/^(al-|mal-)/,'');
const isMal=raw.startsWith('mal-');
const query=isMal
?'query($id:Int){Media(idMal:$id,type:ANIME,isAdult:false){id idMal title{english romaji native} coverImage{extraLarge large} bannerImage description(asHtml:false) averageScore episodes format status seasonYear startDate{year} genres siteUrl externalLinks{site url type}}}'
:'query($id:Int){Media(id:$id,type:ANIME,isAdult:false){id idMal title{english romaji native} coverImage{extraLarge large} bannerImage description(asHtml:false) averageScore episodes format status seasonYear startDate{year} genres siteUrl externalLinks{site url type}}}';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safe=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return ''}};
function fail(message){$('#title').textContent='No se pudo cargar este anime';$('#synopsis').textContent=message;$('#providers').innerHTML='<div class="status">Vuelve al catálogo y selecciona el anime otra vez. Si el problema continúa, intenta recargar esta pestaña.</div>';}
async function load(){
 if(!/^\d+$/.test(id)){fail('El enlace del anime no es válido.');return}
 try{
  const response=await fetch('https://graphql.anilist.co',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({query,variables:{id:Number(id)}})});
  if(!response.ok)throw Error('El catálogo respondió con HTTP '+response.status);
  const json=await response.json(),a=json.data?.Media;
  if(!a)throw Error('No encontramos este título en el catálogo.');
  const title=a.title?.english||a.title?.romaji||a.title?.native||'Anime';
  document.title=title+' | 1UP Anime';$('#title').textContent=title;
  const image=safe(a.coverImage?.extraLarge||a.coverImage?.large);
  if(image)$('#poster').src=image;else $('#poster').hidden=true;
  const banner=safe(a.bannerImage);if(banner)$('#hero').style.setProperty('--banner','url("'+banner.replace(/["\\]/g,'')+'")');
  const meta=[a.format==='TV'?'Serie':a.format,a.seasonYear||a.startDate?.year,a.episodes?(a.episodes+' episodios'):'',a.averageScore?'★ '+(a.averageScore/10).toFixed(1):''].filter(Boolean);
  $('#meta').innerHTML=meta.map(x=>'<span>'+esc(x)+'</span>').join('');
  $('#synopsis').textContent=String(a.description||'Sinopsis no disponible.').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  const site=safe(a.siteUrl);if(site){$('#official').href=site;$('#official').hidden=false}
  const providers=(a.externalLinks||[]).filter(x=>x.type==='STREAMING'&&safe(x.url));
  $('#providers').innerHTML=providers.length?providers.map(x=>'<a href="'+esc(safe(x.url))+'" target="_blank" rel="noopener noreferrer">'+esc(x.site||'Plataforma oficial')+' ↗</a>').join(''):'<div class="status">Todavía no hay plataformas oficiales registradas para este anime. No mostraremos servidores ficticios ni fuentes no verificadas.</div>';
  $('#details').innerHTML='<p><strong>Formato:</strong> '+esc(a.format||'No disponible')+'</p><p><strong>Estado:</strong> '+esc(a.status||'No disponible')+'</p><p><strong>Géneros:</strong> '+esc((a.genres||[]).join(', ')||'No disponibles')+'</p>';
 }catch(error){console.error('1UP watch page:',error);fail(error.message||'Error de conexión.')}
}
load();
})();