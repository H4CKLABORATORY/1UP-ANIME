/* Optional JKAnime V2 public metadata probe (not a video downloader).
 * Uses its latestAnimeAdded() method once per run and stores a small, factual
 * directory with original source attribution. No getAnimeServers() calls.
 * Does not copy thumbnails, descriptions or video URLs into the website.
 */
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const timeout=(promise,ms)=>Promise.race([
 promise,
 new Promise((_,reject)=>setTimeout(()=>reject(new Error('JKAnime no respondió dentro del plazo de '+ms+'ms')),ms))
]);
function normalized(a){
 const slug=String(a?.slug||'').trim().toLowerCase();
 if(!/^[a-z0-9-]{2,120}$/.test(slug))return null;
 const title=String(a?.title||'').replace(/\s+/g,' ').trim().slice(0,150);
 if(!title)return null;
 return {slug,title,type:String(a?.type||'No especificado').trim().slice(0,40),
  status:String(a?.status||'Sin información').trim().slice(0,50),
  externalUrl:'https://jkanime.net/'+slug+'/'};
}
async function run(){
 if(process.env.JKANIME_METADATA_OPT_IN!=='yes'){
  console.log('No se consultó JKAnime: establece JKANIME_METADATA_OPT_IN=yes para autorizar la prueba.');
  return;
 }
 const sdk=await import('jkanime-v2');
 const method=(sdk.default||sdk).latestAnimeAdded;
 if(typeof method!=='function')throw Error('JKAnime V2 no presenta latestAnimeAdded');
 const records=await timeout(Promise.resolve().then(()=>method()),14000);
 if(!Array.isArray(records))throw Error('El extractor no devolvió una lista compatible.');
 const found=new Map();
 for(const item of records.slice(0,40)){const safe=normalized(item);if(safe&&!found.has(safe.slug))found.set(safe.slug,safe)}
 if(!found.size)throw Error('JKAnime V2 devolvió cero entradas verificables; no publicar datos vacíos.');
 const out={updated:new Date().toISOString(),provider:'jkanime_v2_unofficial',
  status:'unverified_external_catalog',type:'external_metadata_links_only',
  note:'Herramienta comunitaria no oficial; no es un servidor de video autorizado. Comprobar vigencia de cada página.',
  series:[...found.values()].slice(0,16)};
 await fs.mkdir('data/dexter',{recursive:true});
 await fs.writeFile('data/dexter/jkanime-discovery.json',JSON.stringify(out,null,2)+'\n');
 console.log('JKAnime V2: '+out.series.length+' fichas públicas detectadas (sin extracción de video).');
}
run().catch(e=>{console.error('JKAnime V2 metadata probe unavailable:',e.message);process.exitCode=1});
