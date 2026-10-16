'use strict';
/**
 * 1UP Anime / Anime1v metadata adapter.
 * Upstream project: https://github.com/FxxMorgan/anime1v-api (MIT).
 * Uses search and catalog only. Does not invoke upstream episode, resolve,
 * image-proxy or download routes. No browser-exposed API keys.
 */
const SEARCH_PROVIDERS=new Set(['animeav1','animeflv','tioanime','jkanime','monoschinos']);
const CATALOG_PROVIDERS=new Set(['animeav1','animeflv']);
const MAX_RESULTS=30;
const MAX_BYTES=768*1024;
const FALLBACK_TTL=180_000;

function err(status,message){
 const e=new Error(message);e.status=status;return e;
}
function clean(s,max=110){return String(s??'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,max)}
function imageUrl(value){
 try{
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||
   /(^|\.)(localhost|local|internal|invalid|test)$/.test(u.hostname)||/^[\d.]+$/.test(u.hostname))return '';
  return u.href.slice(0,500);
 }catch{return ''}
}
function normalized(raw,provider,kind){
 const records=raw?.data?.results??raw?.results??raw?.data?.animes??[];
 const items=Array.isArray(records)?records:[];
 return {
  source:'anime1v',
  mode:'catalog_only',
  kind,
  provider,
  results:items.slice(0,MAX_RESULTS).map(item=>({
   title:clean(item.title||item.name||item.nombre,150),
   image:imageUrl(item.image||item.poster||item.cover||item.thumbnail),
   provider:clean(item.provider||provider,35)
  })).filter(item=>item.title),
  hasMore:raw?.data?.hasMore===true||raw?.hasMore===true
 };
}
function args(type,params={}){
 if(type==='search'){
  const q=clean(params.q,90);
  if(q.length<2)throw err(400,'La búsqueda debe tener al menos dos caracteres.');
  const provider=clean(params.provider||'animeav1',25).toLowerCase();
  if(!SEARCH_PROVIDERS.has(provider))throw err(400,'Proveedor de búsqueda no admitido.');
  return {endpoint:'search',query:{q,domain:provider},provider};
 }
 if(type==='catalog'){
  const provider=clean(params.provider||'animeav1',25).toLowerCase();
  if(!CATALOG_PROVIDERS.has(provider))throw err(400,'Catálogo de proveedor no disponible.');
  const n=Number(params.page||1);
  if(!Number.isInteger(n)||n<1||n>30)throw err(400,'Página de catálogo inválida.');
  return {endpoint:'catalog',query:{provider,page:String(n)},provider};
 }
 throw err(404,'Operación no disponible.');
}
function upstreamUrl(base){
 if(!base)throw err(503,'Backend Anime1v sin configurar.');
 let u;
 try{u=new URL(base)}catch{throw err(503,'Dirección del servicio Anime1v incorrecta.')}
 const local=['localhost','127.0.0.1'].includes(u.hostname);
 if(!['https:','http:'].includes(u.protocol)||(u.protocol==='http:'&&!local)||u.username||u.password||
  u.search||u.hash||u.pathname!=='/')throw err(503,'El origen de Anime1v no es válido.');
 return u;
}
function buildClient({baseUrl,apiKey,fetcher=fetch,now=Date.now}={}){
 const base=upstreamUrl(baseUrl);
 if(!apiKey||String(apiKey).length<12)throw err(503,'Clave privada Anime1v sin configurar.');
 const cache=new Map();
 async function query(type,params={}){
  const {endpoint,query:terms,provider}=args(type,params);
  const url=new URL('/api/v1/anime/'+endpoint,base);
  for(const [key,value] of Object.entries(terms))url.searchParams.set(key,value);
  const cacheKey=url.href;
  const saved=cache.get(cacheKey);
  if(saved&&saved.expires>now())return saved.value;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9_000);
  try{
   const resp=await fetcher(url.href,{
    headers:{'X-API-Key':String(apiKey),'Accept':'application/json'},
    signal:controller.signal,
    redirect:'error'
   });
   if(!resp.ok)throw err(502,'Anime1v no respondió correctamente.');
   const len=Number(resp.headers?.get?.('content-length')||0);
   if(len>MAX_BYTES)throw err(502,'La respuesta de Anime1v es demasiado grande.');
   // Prevent unbounded buffering even if Content-Length is missing.
   let bytes=0,chunks=[];
   if(resp.body?.getReader){
    const reader=resp.body.getReader();
    while(true){
     const {done,value}=await reader.read();if(done)break;
     bytes+=value.byteLength;
     if(bytes>MAX_BYTES){await reader.cancel();throw err(502,'La respuesta supera el límite.');}
     chunks.push(value);
    }
   }else{
    const text=await resp.text();
    bytes=Buffer.byteLength(text);
    if(bytes>MAX_BYTES)throw err(502,'La respuesta supera el límite.');
    chunks=[Buffer.from(text)];
   }
   const text=Buffer.concat(chunks.map(x=>Buffer.from(x))).toString('utf8');
   let parsed;try{parsed=JSON.parse(text)}catch{throw err(502,'Respuesta no válida de Anime1v.')}
   if(parsed?.success===false)throw err(502,'El servicio Anime1v rechazó la consulta.');
   const value=normalized(parsed,provider,type);
   if(cache.size>100)cache.clear();
   cache.set(cacheKey,{value,expires:now()+FALLBACK_TTL});
   return value;
  }catch(error){
   if(error.status)throw error;
   throw err(502,'Anime1v no está disponible en este momento.');
  }finally{clearTimeout(timer)}
 }
 return {query};
}
module.exports={buildClient,normalized,args,upstreamUrl,err};
