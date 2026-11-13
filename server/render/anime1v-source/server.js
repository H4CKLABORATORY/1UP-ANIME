/* 1UP Anime — metadata-only runtime powered by FxxMorgan Anime1v.
 * Upstream MIT original code is downloaded at build time from a pinned SHA.
 * Only the upstream animeav1.service's searchAnime/getCatalog are exposed.
 * No episode, resolve, download, image proxy or arbitrary URL endpoints.
 */
'use strict';
const http=require('node:http');
const PINNED_ANIME1V_SHA='6e54a75d894532b033c9e933772cdf3720842206';
const cache=new Map(),buckets=new Map(),TTL=180_000;
const API_KEY=(process.env.API_KEYS||'').trim();
const PORT=Number(process.env.PORT||10000);
const HEADER_MAX=120;
function trim(value,n=120){return String(value??'').replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,n)}
function json(res,status,value){
 res.writeHead(status,{
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'X-Anime1v-Author':'FxxMorgan',
  'X-Anime1v-Upstream-Commit':PINNED_ANIME1V_SHA
 });
 res.end(JSON.stringify(value));
}
function imageUrl(val){
 try{
  const u=new URL(val);
  if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||
   /(^|\.)(localhost|internal|local|test|invalid)$/.test(u.hostname))return '';
  return u.href.slice(0,500)
 }catch{return ''}
}
function filter(data,type){
 const list=data?.data?.results;
 return {
  success:true,
  data:{
   results:(Array.isArray(list)?list:[]).slice(0,30).map(i=>({
    title:trim(i.title||i.name,150),
    image:imageUrl(i.image||i.poster||i.cover),
    provider:'AnimeAV1'
   })).filter(i=>i.title),
   hasMore:type==='catalog'&&(data?.data?.hasMore===true)
  }
 };
}
function handler({search,catalog},secret=API_KEY){
 if(!secret||secret.length<32)throw Error('Configure API_KEYS with 32+ characters: fail closed');
 const self=async(req,res)=>{
  if(req.method!=='GET')return json(res,405,{success:false,message:'Método no permitido'});
  let u;
  try{u=new URL(req.url,'http://localhost')}catch{return json(res,400,{success:false,message:'URL inválida'})}
  if(u.pathname==='/health')return json(res,200,{success:true,status:'ok',service:'anime1v-metadata-only',
   streaming:false,version:PINNED_ANIME1V_SHA});
  if(u.pathname!=='/api/v1/anime/search'&&u.pathname!=='/api/v1/anime/catalog')
   return json(res,404,{success:false,message:'Ruta no disponible'});
  const supplied=trim(req.headers['x-api-key'],HEADER_MAX);
  // Compare in constant time to reduce information leakage from auth attempts.
  const crypto=require('node:crypto');
  const actual=Buffer.from(supplied), expected=Buffer.from(secret);
  if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))
   return json(res,401,{success:false,message:'Autenticación necesaria'});
  const ip=trim(req.socket.remoteAddress,80),now=Date.now();
  let bucket=buckets.get(ip);
  if(!bucket||now-bucket.start>60_000)bucket={start:now,count:0};
  bucket.count++;buckets.set(ip,bucket);
  if(buckets.size>1500)buckets.clear();
  if(bucket.count>15)return json(res,429,{success:false,message:'Límite temporal alcanzado'});
  const type=u.pathname.endsWith('/search')?'search':'catalog';
  const provider=trim(u.searchParams.get(type==='search'?'domain':'provider')||'animeav1',35).toLowerCase();
  if(!['animeav1','animeav1.com'].includes(provider))
   return json(res,400,{success:false,message:'Solo el catálogo AnimeAV1 está habilitado'});
  const q=trim(u.searchParams.get('q'),90),page=Number(u.searchParams.get('page')||1);
  if(type==='search'&&(q.length<2||q.length>90))
   return json(res,400,{success:false,message:'Búsqueda inválida'});
  if(type==='catalog'&&(!Number.isInteger(page)||page<1||page>30))
   return json(res,400,{success:false,message:'Página inválida'});
  const key=type+'|'+(type==='search'?q.toLowerCase():page),hit=cache.get(key);
  if(hit?.expires>now)return json(res,200,hit.result);
  try{
   const result=filter(type==='search'?await search(q,'animeav1.com'):await catalog(page),type);
   if(cache.size>160)cache.clear();
   cache.set(key,{result,expires:Date.now()+TTL});
   json(res,200,result);
  }catch(error){
   console.error('Anime1v metadata lookup failed:',trim(error?.message,145));
   json(res,502,{success:false,message:'El catálogo del proveedor no está disponible'})
  }
 };
 return self;
}
function createServer(dependencies,secret=API_KEY){return http.createServer(handler(dependencies,secret))}
if(require.main===module){
 // Only load the pinned upstream service at runtime; the original Express
 // router, download engine and unrestricted image proxy are never loaded.
 const src=require('./upstream/src/services/animeav1.service.js');
 createServer({search:src.searchAnime,catalog:src.getCatalog}).listen(PORT,'0.0.0.0',
  ()=>console.log('1UP Anime — FxxMorgan Anime1v metadata-only runtime on '+PORT));
}
module.exports={createServer,handler,filter};
