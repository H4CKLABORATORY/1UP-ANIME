(()=>{'use strict';
const $=id=>document.getElementById(id);
const allowedFormats=new Set(['TV','Película','OVA','ONA']);
let records=[],origin='Wikipedia';
const safeLink=url=>{try{const u=new URL(url);return u.protocol==='https:'&&['en.wikipedia.org','anilist.co'].includes(u.hostname)?u.href:null}catch{return null}};
const node=(tag,cls,value)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(value!=null)el.textContent=value;return el};
const date=iso=>{const d=new Date(iso);return Number.isFinite(d.getTime())?d.toLocaleDateString('es',{year:'numeric',month:'short',day:'numeric'}):'Pendiente'};
function render(){
 const term=$('query').value.trim().toLocaleLowerCase(),kind=$('format').value;
 const filtered=records.filter(r=>(kind==='all'||r.format===kind)&&(!term||r.title.toLocaleLowerCase().includes(term)||r.studio.toLocaleLowerCase().includes(term)));
 const fragment=document.createDocumentFragment();
 for(const r of filtered.slice(0,300)){
  const card=node('article','result');
  card.append(node('span','tag',r.format),node('h3','',r.title));
  if(r.release)card.append(node('p','',r.release));
  if(r.studio)card.append(node('p','',r.studio));
  if(r.episodes!=null)card.append(node('p','',r.episodes+' episodios informados'));
  const url=safeLink(r.sourceUrl);
  if(url){const link=node('a','', 'Consultar fuente ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';card.append(link)}
  fragment.append(card);
 }
 $('results').replaceChildren(fragment);
 $('status').textContent=origin+': '+filtered.length+' resultados'+(filtered.length>300?' (mostrando 300)':'')+'. Datos sujetos a cambios.';
}
async function fetchJSON(url){const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);return res.json()}
async function load(){
 try{
  const data=await fetchJSON('./data/encyclopedia-anime.json');
  if(!Array.isArray(data.items)||!data.items.length)throw Error('Sin datos extraídos todavía');
  records=data.items;origin='Scraping educativo Wikipedia';$('updated').textContent=date(data.updated);
  $('source-link').href=safeLink(data.source?.url)||'https://en.wikipedia.org/wiki/2026_in_anime';
 }catch{
  try{
   const backup=await fetchJSON('./data/catalog.json');
   const groups=Object.values(backup.groups||{}).flat(),seen=new Set();
   records=groups.filter(item=>{if(!item?.id||seen.has(item.id))return false;seen.add(item.id);return true}).map(item=>({
    title:String(item.title||'Anime'),format:item.format==='MOVIE'?'Película':'TV',
    release:item.year?String(item.year):'',studio:'',episodes:item.episodes||null,sourceUrl:item.siteUrl||''
   }));
   origin='Respaldo AniList (API, no scraping)';$('updated').textContent=date(backup.updated);
   $('source-link').href='https://anilist.co/';
   $('source-link').textContent='Ver fuente AniList ↗';
  }catch{records=[];origin='Sin datos disponibles';$('updated').textContent='Sin conexión'}
 }
 records=records.filter(r=>r&&typeof r.title==='string'&&r.title.trim()&&allowedFormats.has(r.format)).slice(0,900).map(r=>({
  title:r.title.slice(0,220),format:r.format,studio:String(r.studio||'').slice(0,110),
  release:String(r.release||'').slice(0,100),episodes:Number.isInteger(r.episodes)?r.episodes:null,
  sourceUrl:r.sourceUrl
 }));
 $('total').textContent=records.length.toLocaleString('es');
 $('movies').textContent=records.filter(r=>r.format==='Película').length.toLocaleString('es');
 $('series').textContent=records.filter(r=>r.format==='TV').length.toLocaleString('es');
 render();
}
$('query').addEventListener('input',render);$('format').addEventListener('change',render);load();
})();