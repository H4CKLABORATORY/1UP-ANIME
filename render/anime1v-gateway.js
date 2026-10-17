/* 1UP ANIME — standalone Render discovery gateway.
 * Uses FxxMorgan's Anime1v API WHEN its upstream and key are configured.
 * Otherwise uses Jikan's public metadata API (never claims Anime1v is active).
 * This server does not offer video extraction, streams, downloads or proxies.
 */
'use strict';
const http=require('node:http');
const {buildClient,args}=require('../functions/anime1v-adapter.js');
const PORT=Number(process.env.PORT||10000);
const ORIGIN='https://h4cklaboratory.github.io';
const LIMIT=640*1024;
const WINDOW=60*1000,MAX_RPM=18;
const buckets=new Map(),cache=new Map();
let animeClient=null;
function json(res,status,value){
 res.writeHead(status,{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
  'Cross-Origin-Resource-Policy':'cross-origin',
  'Access-Control-Allow-Origin':ORIGIN,
  'Access-Control-Allow-Methods':'GET, OPTIONS',
  'Access-Control-Allow-Headers':'Accept',
  'Vary':'Origin'
 });
 res.end(JSON.stringify(value));
}
function normalizeJikan(d,kind){
 const data=Array.isArray(d?.data)?d.data:[];
 return {source:'jikan',mode:'catalog_only',kind,provider:'Jikan',
  results:data.slice(0,24).map(item=>({
   title:String(item.title||item.title_english||'').slice(0,150),
   image:String(item.images?.webp?.large_image_url||item.images?.jpg?.image_url||'').slice(0,500),
   provider:'Jikan'
  })).filter(item=>item.title),
  hasMore:d?.pagination?.has_next_page===true
 };
}
async function limitedJSON(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 try{
  const r=await fetch(url,{redirect:'error',signal:controller.signal,headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('HTTP '+r.status);
  const length=Number(r.headers.get('content-length')||0);
  if(length>LIMIT)throw Error('Oversized result');
  const reader=r.body.getReader();let bytes=0,chunks=[];
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   bytes+=value.byteLength;if(bytes>LIMIT){await reader.cancel();throw Error('Oversized result')}
   chunks.push(Buffer.from(value));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }finally{clearTimeout(timer)}
}
async function lookup(kind,params){
 const key=JSON.stringify([kind,params]);
 const hit=cache.get(key);
 if(hit&&hit.expires>Date.now())return hit.value;
 let data;
 if(process.env.ANIME1V_BASE_URL&&process.env.ANIME1V_API_KEY){
  animeClient ||=buildClient({baseUrl:process.env.ANIME1V_BASE_URL,apiKey:process.env.ANIME1V_API_KEY});
  data=await animeClient.query(kind,params);
 }else{
  // Jikan is metadata only and needs no private API key; label it accurately.
  const u=new URL(kind==='search'?'https://api.jikan.moe/v4/anime':'https://api.jikan.moe/v4/top/anime');
  u.searchParams.set('limit','24');u.searchParams.set('sfw','true');
  if(kind==='search')u.searchParams.set('q',params.q);
  else{
   u.searchParams.set('page',String(params.page||1));
   u.searchParams.set('filter','bypopularity');
  }
  data=normalizeJikan(await limitedJSON(u),kind);
 }
 if(cache.size>100)cache.clear();
 cache.set(key,{value:data,expires:Date.now()+180000});
 return data;
}
const server=http.createServer(async(req,res)=>{
 const requestOrigin=req.headers.origin;
 if(requestOrigin&&requestOrigin!==ORIGIN){
  json(res,403,{error:'Origen no permitido'});return;
 }
 if(req.method==='OPTIONS'){json(res,204,{});return}
 if(req.method!=='GET'){json(res,405,{error:'Método no permitido'});return}
 let u;try{u=new URL(req.url,'http://localhost')}catch{return json(res,400,{error:'URL no válida'})}
 if(u.pathname==='/health'){
  json(res,200,{ok:true,service:'1UP metadata gateway',upstream:process.env.ANIME1V_BASE_URL?'anime1v':'jikan_fallback',streaming:false});return;
 }
 if(u.pathname!=='/anime1vDiscovery')return json(res,404,{error:'Ruta inexistente'});
 const key=String(req.headers['x-forwarded-for']||req.socket.remoteAddress||'unknown').split(',')[0].slice(0,70);
 const now=Date.now();
 let bucket=buckets.get(key);
 if(!bucket||now-bucket.start>WINDOW)bucket={start:now,count:0};
 bucket.count++;buckets.set(key,bucket);
 if(buckets.size>5000)buckets.clear();
 if(bucket.count>MAX_RPM)return json(res,429,{error:'Demasiadas consultas'});
 try{
  const kind=u.searchParams.get('kind');
  const params={q:u.searchParams.get('q'),page:u.searchParams.get('page'),provider:u.searchParams.get('provider')};
  const parsed=args(kind,params);
  const data=await lookup(kind,{...params,provider:parsed.provider});
  json(res,200,data);
 }catch(e){json(res,Number.isInteger(e.status)?e.status:502,{error:e.status===400?e.message:'El servicio de búsqueda no está disponible.'})}
});
server.listen(PORT,'0.0.0.0',()=>console.log('1UP metadata gateway listening on '+PORT));
