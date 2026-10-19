/* 1UP · Relaciones reales de anime con AniList y respaldo Jikan.
   Sólo metadatos. Módulo independiente y opcional. */
export const QUERY = [
 'query OneUpFranchise($id:Int,$idMal:Int){Media(id:$id,idMal:$idMal,type:ANIME){',
 'relations{edges{relationType node{id idMal type isAdult title{english romaji} coverImage{large} format seasonYear}}}',
 'recommendations(perPage:12){nodes{mediaRecommendation{id idMal type isAdult title{english romaji} coverImage{large} format seasonYear}}}',
 '}}'
].join(' ');
const NAMES={PREQUEL:'Precuela',SEQUEL:'Secuela',SIDE_STORY:'Historia paralela',
 SPIN_OFF:'Spin-off',ALTERNATIVE:'Versión alternativa',PARENT:'Historia principal',
 SUMMARY:'Resumen',COMPILATION:'Compilación',OTHER:'Relacionado',ADAPTATION:'Adaptación'};
const PRIORITY=['PREQUEL','SEQUEL','PARENT','SIDE_STORY','SPIN_OFF','ALTERNATIVE','SUMMARY','COMPILATION','OTHER','ADAPTATION'];
const cache=new Map();
let currentController=null,sequence=0,lastCall=0;
const safeUrl=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}};
const number=value=>Number.isSafeInteger(Number(value))&&Number(value)>0&&Number(value)<1000000000?Number(value):null;
const trim=(value,max=180)=>String(value||'').trim().slice(0,max);

export function animeIdentity(anime){
 const match=/^(mal|al)-([1-9][0-9]{0,8})$/.exec(String(anime?.id||''));
 if(!match)return null;
 return match[1]==='mal'?{idMal:Number(match[2])}:{id:Number(match[2])};
}
export function normalizeAni(media){
 if(!media||media.type!=='ANIME'||media.isAdult===true)return null;
 const id=number(media.id),mal=number(media.idMal);
 if(!id)return null;
 const title=trim(media.title?.english||media.title?.romaji);
 if(!title)return null;
 return {id:mal?'mal-'+mal:'al-'+id,mal_id:mal,title,
  image:safeUrl(media.coverImage?.large),banner:'',description:'',averageScore:0,
  year:number(media.seasonYear)||'',genres:[],format:trim(media.format,24),
  episodes:0,status:'',next:null,streaming:[],
  siteUrl:'https://anilist.co/anime/'+id,source:'anilist'};
}
export function parseAni(payload,activeId){
 const media=payload?.data?.Media;
 const relations=[],recommendations=[],seen=new Set([activeId]);
 if(!media)return {relations,recommendations,source:'AniList'};
 for(const edge of media.relations?.edges||[]){
  const item=normalizeAni(edge?.node);
  const type=trim(edge?.relationType||'OTHER',35).toUpperCase();
  if(!item||seen.has(item.id)||!NAMES[type])continue;
  seen.add(item.id);relations.push({...item,relationLabel:NAMES[type],relationType:type});
  if(relations.length>=12)break;
 }
 relations.sort((a,b)=>PRIORITY.indexOf(a.relationType)-PRIORITY.indexOf(b.relationType));
 for(const node of media.recommendations?.nodes||[]){
  const item=normalizeAni(node?.mediaRecommendation);
  if(!item||seen.has(item.id))continue;
  seen.add(item.id);recommendations.push(item);
  if(recommendations.length>=8)break;
 }
 return {relations,recommendations,source:'AniList'};
}
export function parseJikan(payload,activeId){
 const relations=[],seen=new Set([activeId]);
 for(const group of payload?.data||[]){
  const type=trim(group?.relation||'Other',40).toUpperCase().replace(/[\s-]+/g,'_');
  if(!NAMES[type])continue;
  for(const row of group?.entry||[]){
   if(String(row?.type||'').toLowerCase()!=='anime')continue;
   const mal=number(row?.mal_id),title=trim(row?.name);
   if(!mal||!title||seen.has('mal-'+mal))continue;
   const id='mal-'+mal;seen.add(id);
   relations.push({id,mal_id:mal,title,image:'',banner:'',description:'',averageScore:0,
    year:'',genres:[],format:'',episodes:0,status:'',next:null,streaming:[],
    siteUrl:'https://myanimelist.net/anime/'+mal,source:'jikan',
    relationLabel:NAMES[type],relationType:type});
   if(relations.length>=12)break;
  }
  if(relations.length>=12)break;
 }
 relations.sort((a,b)=>PRIORITY.indexOf(a.relationType)-PRIORITY.indexOf(b.relationType));
 return {relations,recommendations:[],source:'Jikan'};
}
export function statusText(data){
 return data.relations.length||data.recommendations.length
 ?'Información de franquicias de '+data.source+'. No garantiza episodios disponibles.'
 :'Todavía no hay relaciones verificadas en '+data.source+' para esta obra.';
}
const element=(tag,cls,text)=>{
 const node=document.createElement(tag);if(cls)node.className=cls;
 if(text!==undefined)node.textContent=text;
 return node;
};
function section(title,items,relations=false){
 const block=element('section','oneup-detail-section franchise-group');
 block.append(element('h3','',title));
 const grid=element('div','oneup-franchise-grid');
 for(const item of items){
  const button=element('button','oneup-franchise-tile');
  button.type='button';button.dataset.details=item.id;
  button.setAttribute('aria-label','Ver ficha de '+item.title);
  if(item.image){
   const pic=element('img','oneup-franchise-cover');pic.src=item.image;
   pic.alt='';pic.loading='lazy';pic.decoding='async';pic.referrerPolicy='no-referrer';
   button.append(pic);
  }else button.append(element('span','oneup-franchise-placeholder','1UP'));
  const text=element('span','oneup-franchise-caption');
  text.append(element('strong','',item.title));
  if(relations)text.append(element('span','oneup-franchise-type',item.relationLabel));
  else if(item.year)text.append(element('span','oneup-franchise-type',String(item.year)));
  button.append(text);grid.append(button);
 }
 block.append(grid);return block;
}
function display(host,data){
 host.replaceChildren();
 host.append(element('p','oneup-franchise-eyebrow','EXPLORA SU UNIVERSO / FRANQUICIAS'));
 if(data.relations.length)host.append(section('CONTINÚA LA HISTORIA',data.relations,true));
 if(data.recommendations.length)host.append(section('TAMBIÉN TE PUEDE GUSTAR',data.recommendations));
 host.append(element('p','oneup-franchise-state',statusText(data)));
 window.OneUpCatalog?.register?.([...data.relations,...data.recommendations]);
}
const isCurrent=(id,token)=>token===sequence&&window.OneUpCatalog?.active?.()===id&&
 Boolean(document.querySelector('#anime-dialog')?.open);
async function fromAni(identity,signal){
 const gap=Math.max(0,1300-(Date.now()-lastCall));
 if(gap)await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{signal.removeEventListener('abort',aborted);resolve()},gap);
  function aborted(){clearTimeout(timer);reject(new Error('Abortado'))}
  signal.addEventListener('abort',aborted,{once:true});
 });
 if(signal.aborted)throw new Error('Abortado');
 lastCall=Date.now();
 const response=await fetch('https://graphql.anilist.co',{method:'POST',
  headers:{Accept:'application/json','Content-Type':'application/json'},
  body:JSON.stringify({query:QUERY,variables:{id:identity.id||null,idMal:identity.idMal||null}}),signal});
 if(!response.ok)throw new Error('AniList HTTP '+response.status);
 const payload=await response.json();
 if(payload.errors?.length)throw new Error('AniList GraphQL error');
 return payload;
}
async function fromJikan(idMal,signal){
 const r=await fetch('https://api.jikan.moe/v4/anime/'+idMal+'/relations',{
  headers:{Accept:'application/json'},signal});
 if(!r.ok)throw new Error('Jikan HTTP '+r.status);
 return r.json();
}
async function fetchFranchise(anime,host,token,ctrl){
 const identity=animeIdentity(anime);
 if(!identity){host.textContent='No hay ID válido para explorar esta franquicia.';return}
 const stored=cache.get(anime.id);
 if(stored&&Date.now()-stored.at<6*3600000){
  if(isCurrent(anime.id,token))display(host,stored.result);return;
 }
 const timeout=setTimeout(()=>ctrl.abort(),11500);
 let result;
 try{
  try{result=parseAni(await fromAni(identity,ctrl.signal),anime.id)}
  catch(error){
   if(ctrl.signal.aborted||!identity.idMal)throw error;
   result=parseJikan(await fromJikan(identity.idMal,ctrl.signal),anime.id);
  }
 }catch{
  if(isCurrent(anime.id,token))host.textContent='Las relaciones están temporalmente fuera de servicio. El resto de la ficha funciona normalmente.';
  return;
 }finally{clearTimeout(timeout)}
 if(!isCurrent(anime.id,token))return;
 if(cache.size>35)cache.delete(cache.keys().next().value);
 cache.set(anime.id,{at:Date.now(),result});
 display(host,result);
}
function opened(event){
 const anime=event.detail;if(!anime?.id)return;
 sequence++;currentController?.abort();
 const token=sequence,ctrl=new AbortController();currentController=ctrl;
 const parent=document.querySelector('#anime-dialog-body .oneup-detail-lower');
 if(!parent)return;
 const host=element('section','oneup-franchise-host');
 host.setAttribute('aria-label','Secuelas y recomendaciones verificadas');
 host.append(element('p','oneup-franchise-state','Buscando precuelas, secuelas y títulos relacionados…'));
 parent.append(host);fetchFranchise(anime,host,token,ctrl).catch(()=>{});
}
if(typeof document!=='undefined'){
 document.addEventListener('oneup-anime-opened',opened);
 document.addEventListener('oneup-anime-closed',()=>{sequence++;currentController?.abort();currentController=null});
}
