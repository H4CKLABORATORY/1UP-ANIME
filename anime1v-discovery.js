/* 1UP Anime + FxxMorgan Anime1v discovery (optional).
 * Frontend never receives or stores X-API-Key. Catalog/search only.
 */
(()=>{
'use strict';
const CONFIG='./data/anime1v-config.json';
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;', '"':'&quot;',"'":'&#39;'}[c]));
const endpointFrom=v=>{
 try{
  const u=new URL(v);
  if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search||
   !u.pathname.endsWith('/anime1vDiscovery'))return '';
  return u.href;
 }catch{return ''}
};
async function install(){
 const host=document.querySelector('#browse-screen');
 if(!host)return;
 let config;try{
  const res=await fetch(CONFIG,{cache:'no-store'});
  if(!res.ok)return;config=await res.json();
 }catch{return}
 const url=config?.enabled===true?endpointFrom(config.endpoint):'';
 if(!url)return;
 const area=document.createElement('section');area.className='oneup-anime1v';
 area.setAttribute('aria-label','Descubrimiento opcional de anime');
 area.innerHTML='<div class="oneup-anime1v-head"><span class="micro">CONEXIÓN OPCIONAL</span>'+
 '<h2>Explorar con Anime1v</h2><p>Explora información de catálogo sin salir de 1UP ANIME. Los resultados no son fuentes de reproducción.</p></div>'+
 '<form id="oneup-anime1v-form"><input id="oneup-anime1v-query" type="search" minlength="2" maxlength="90" required '+
 'autocomplete="off" placeholder="Nombre del anime" aria-label="Buscar anime con Anime1v">'+
 '<select id="oneup-anime1v-provider" aria-label="Proveedor del catálogo"><option value="animeav1">AnimeAV1</option><option value="animeflv">AnimeFLV</option></select>'+
 '<button type="submit">Buscar ↗</button></form>'+
 '<p id="oneup-anime1v-status" role="status" aria-live="polite"></p>'+
 '<div class="oneup-anime1v-grid" id="oneup-anime1v-results"></div>'+
 '<p class="oneup-anime1v-credit">Datos de búsqueda: <a target="_blank" rel="noopener noreferrer" href="https://github.com/FxxMorgan/anime1v-api">Anime1v API por FxxMorgan</a>. La disponibilidad no implica permiso de retransmisión.</p>';
 host.append(area);
 const form=area.querySelector('form'),status=area.querySelector('#oneup-anime1v-status');
 const results=area.querySelector('#oneup-anime1v-results');
 let counter=0,controller=null;
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  const q=area.querySelector('#oneup-anime1v-query').value.trim().slice(0,90);
  if(q.length<2)return;
  const provider=area.querySelector('#oneup-anime1v-provider').value;
  if(!['animeav1','animeflv'].includes(provider))return;
  controller?.abort();controller=new AbortController();
  const current=++counter;status.textContent='Buscando…';results.replaceChildren();
  const query=new URL(url);
  query.searchParams.set('kind','search');query.searchParams.set('provider',provider);query.searchParams.set('q',q);
  const timer=setTimeout(()=>controller.abort(),12_000);
  try{
   const response=await fetch(query.href,{signal:controller.signal,headers:{'Accept':'application/json'}});
   if(!response.ok)throw Error('No se pudo consultar la búsqueda.');
   const data=await response.json();
   if(current!==counter)return;
   const items=Array.isArray(data.results)?data.results.slice(0,30):[];
   status.textContent=items.length?items.length+' resultados informativos encontrados.':'Sin resultados para esa búsqueda.';
   results.innerHTML=items.map(a=>{
    let safe='';
    try{const link=new URL(a.image);if(link.protocol==='https:')safe=link.href}catch{}
    return '<article class="oneup-anime1v-item">'+
     (safe?'<img src="'+escapeHtml(safe)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'<div class="oneup-anime1v-art" aria-hidden="true">1UP</div>')+
     '<strong>'+escapeHtml(a.title)+'</strong><small>'+escapeHtml(a.provider)+'</small></article>';
   }).join('');
  }catch(error){if(current===counter)status.textContent='Anime1v no está disponible. Puedes seguir usando el catálogo de 1UP.'}
  finally{clearTimeout(timer)}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else void install();
})();
