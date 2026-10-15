/* ONEUP SELF HEALING ENGINE
 * Monitors rather than silently changes production.
 * Verification, bounded retries, incident history, safe backups in GitHub Actions.
 * No credential storage, stream mirroring, or destructive auto-reverts.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';

const ROOT=process.cwd();
const BASE='https://h4cklaboratory.github.io/1UP-ANIME/';
const STATUS='data/guard/status.json';
const HISTORY='data/guard/history.json';
const MAX_HISTORY=72;
const NOW=new Date();
const iso=NOW.toISOString();
const argumentsSet=new Set(process.argv.slice(2));
const offline=argumentsSet.has('--offline');
const strict=argumentsSet.has('--strict');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const report=[];
const mk=(id,level,message,details={})=>report.push({id,level,message,...details});
const ageHours=time=>(NOW.getTime()-Date.parse(time))/3600000;
async function readFile(name){return fs.readFile(path.join(ROOT,name),'utf8')}
async function json(name){return JSON.parse(await readFile(name))}
async function optional(name){try{return await json(name)}catch{return null}}
async function save(name,value){
 const file=path.join(ROOT,name);
 await fs.mkdir(path.dirname(file),{recursive:true});
 const tmp=file+'.tmp';
 await fs.writeFile(tmp,JSON.stringify(value,null,2)+'\n','utf8');
 await fs.rename(tmp,file);
}
function requireValid(condition,id,message,details){
 mk(id,condition?'ok':'critical',condition?'Validado: '+message:message,details);
 return condition;
}
async function checkFiles(){
 const mandatory=[
  'index.html','comunidad.html','moderacion.html','studio.js','studio.css',
  'sw.js','auth.js','airing-ui.js','episode-comments.js','community.js',
  'social-backend.js','functions/index.js','data/catalog.json','data/airing.json',
  'data/translations-es.json','data/dexter/records.json',
  'config/dexter-providers.json','data/licensed-media.json',
  'scripts/dexter-anime-sync.mjs','scripts/check-ui.mjs'
 ];
 for(const filename of mandatory){
  try{const stat=await fs.stat(path.join(ROOT,filename));requireValid(stat.isFile()&&stat.size>0,'file:'+filename,'Archivo requerido '+filename,{bytes:stat.size})}
  catch{mk('file:'+filename,'critical','No existe o no puede leerse: '+filename)}
 }
 for(const filename of ['studio.js','auth.js','sw.js','airing-ui.js','episode-comments.js','community.js','social-backend.js','moderacion.js']){
  try{new vm.Script(await readFile(filename),{filename});mk('syntax:'+filename,'ok','JavaScript válido: '+filename)}
  catch(e){mk('syntax:'+filename,'critical','Error de sintaxis '+filename+': '+e.message)}
 }
}
const validId=s=>/^(mal|al)-[0-9]+$/.test(String(s||''));
const noDuplicates=(list,key)=>new Set(list.map(x=>x[key])).size===list.length;
async function checkCatalog(){
 try{
  const c=await json('data/catalog.json');
  const groups=Object.values(c.groups||{});
  const entries=groups.flat();
  requireValid(entries.length>=25,'catalog:data','El catálogo debe conservar al menos 25 entradas',{entries:entries.length});
  requireValid(groups.every(group=>Array.isArray(group)),'catalog:structure','El catálogo debe contener grupos de series');
  const age=ageHours(c.updated);
  if(!Number.isFinite(age)||age< -2 || age>72)mk('catalog:freshness','warning','El catálogo lleva más de 72 horas sin actualizarse',{ageHours:Number(age.toFixed(1))});
  else mk('catalog:freshness','ok','Catálogo actualizado',{ageHours:Number(age.toFixed(1))});
 }catch(e){mk('catalog:data','critical','Catálogo corrupto o ausente: '+e.message)}
 try{
  const a=await json('data/airing.json');
  requireValid(Array.isArray(a.airing)&&a.airing.length>=15,'airing:entries','El calendario debe tener al menos 15 emisiones',{entries:a.airing?.length});
  requireValid(Array.isArray(a.seasonal?.entries)&&a.seasonal.entries.length>=10,'airing:season','Debe conservar 10 o más animes de temporada');
  const age=ageHours(a.updated);
  mk('airing:freshness',!Number.isFinite(age)||age>36?'warning':'ok',
   !Number.isFinite(age)||age>36?'Calendario desactualizado (más de 36h)':'Calendario con fecha reciente',
   {ageHours:Number.isFinite(age)?Number(age.toFixed(1)):null});
 }catch(e){mk('airing:data','critical','Calendario corrupto o ausente: '+e.message)}
 try{
  const l=await json('data/translations-es.json');
  requireValid(l.language==='es'&&Object.keys(l.translations||{}).length>=15,'spanish:pack','Sinopsis en español disponibles',{count:l.translated||0});
 }catch(e){mk('spanish:pack','critical','Archivo de traducciones ausente o ilegible: '+e.message)}
}
async function checkSync(){
 try{
  const d=await json('data/dexter/records.json');
  const eps=d.episodes||[],animes=d.anime||[],sources=d.sources||[];
  requireValid(animes.length>=20&&eps.length>=20,'engine:population','Registros del motor existentes',{anime:animes.length,episodes:eps.length,playbackSources:sources.length});
  requireValid(noDuplicates(eps,'id')&&noDuplicates(animes,'id')&&noDuplicates(sources,'id'),'engine:dedup','IDs únicos sin duplicados');
  requireValid(eps.every(e=>validId(e.animeId)&&Number.isInteger(e.episodeNumber)&&e.episodeNumber>0),'engine:episode','IDs y números de capítulo válidos');
  const lookup=new Set(animes.map(a=>a.id));
  requireValid(eps.every(e=>lookup.has(e.animeId)),'engine:relations','Cada episodio pertenece a un anime válido');
  const sourceIDs=new Set(sources.map(s=>s.id));
  requireValid(eps.every(e=>(e.playbackSourceIds||[]).every(x=>sourceIDs.has(x))),'engine:sources','Las fuentes referenciadas existen');
  mk('engine:playback',sources.length?'ok':'info',
   sources.length?String(sources.length)+' fuentes autorizadas configuradas':'No hay fuentes de video configuradas; los capítulos son solamente metadatos');
 }catch(e){mk('engine:records','critical','Registros del motor ilegibles: '+e.message)}
 try{
  const s=await json('data/dexter/status.json'),age=ageHours(s.updatedAt);
  mk('engine:freshness',Number.isFinite(age)&&age<=18?'ok':'warning',
   Number.isFinite(age)&&age<=18?'Sincronización reciente':'DexterAnimeSync supera 18 horas sin actualizar',
   {ageHours:Number.isFinite(age)?Number(age.toFixed(1)):null,status:s.job?.status});
  const failures=(s.providers||[]).filter(p=>p.state==='error');
  if(failures.length)mk('engine:providers','warning','Adaptadores con errores: '+failures.map(p=>p.name).join(', '));
  else mk('engine:providers','ok','Adaptadores sin errores detectados');
 }catch(e){mk('engine:status','warning','Estado reciente de sincronización no disponible: '+e.message)}
 try{
  const cfg=await json('config/dexter-providers.json');
  requireValid(Array.isArray(cfg.providers)&&cfg.providers.length>=3,'engine:adapters','Configuración modular de proveedores existente');
 }catch(e){mk('engine:adapters','critical','Configuración de proveedores corrupta: '+e.message)}
}
async function checkDependencies(){
 try{
  const pkg=await json('integrations/jkanime-v2/package.json');
  const pinned=pkg.dependencies?.['jkanime-v2']==='1.0.1'&&pkg.overrides?.cheerio==='1.0.0-rc.12';
  mk('dependency:jkanime',pinned?'ok':'warning',
   pinned?'JKAnime V2 aislado y Cheerio fijado en versión compatible':'Se modificaron versiones de JKAnime V2/Cheerio; ejecutar auditoría de compatibilidad');
 }catch(e){mk('dependency:jkanime','warning','Adaptador JKAnime no disponible: '+e.message)}
 const parts=['scripts/dexter-anime-sync.mjs','scripts/refresh-airing.mjs','scripts/refresh-catalog.mjs'];
 for(const name of parts){
  const source=await readFile(name).catch(()=>'');
  if(!source)mk('dependency:'+name,'critical','Archivo de sincronización desaparecido: '+name);
  else mk('dependency:'+name,'ok','Herramienta de sincronización presente: '+name);
 }
}
async function remoteGet(url,{jsonBody=false}={}){
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
  const ctrl=new AbortController();
  const timer=setTimeout(()=>ctrl.abort(),7000);
  try{
   const response=await fetch(url,{redirect:'follow',cache:'no-store',signal:ctrl.signal,headers:{Accept:jsonBody?'application/json':'text/html'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const content=await response.text();
   if(!content)throw Error('Respuesta vacía');
   return jsonBody?JSON.parse(content):content;
  }catch(e){lastError=e}
  finally{clearTimeout(timer)}
  if(attempt<2)await delay(1000*(2**attempt));
 }
 throw lastError||Error('Servicio no disponible');
}
async function checkPublicSite(){
 for(const [id,url,kind] of [
  ['site:home',BASE,'html'],
  ['site:community',BASE+'comunidad.html','html'],
  ['site:catalog',BASE+'data/catalog.json','json'],
  ['site:airing',BASE+'data/airing.json','json']
 ]){
  try{
   const content=await remoteGet(url,{jsonBody:kind==='json'});
   const valid=kind==='json'?(id==='site:catalog'?Boolean(content.groups):Array.isArray(content.airing)):/1UP/i.test(content);
   mk(id,valid?'ok':'warning',valid?'Página pública respondió correctamente':'El sitio respondió con contenido inesperado',{url});
  }catch(e){mk(id,'warning','No fue posible comprobar el sitio tras 3 intentos: '+e.message,{url})}
 }
}
async function main(){
 const previous=await optional(HISTORY)||{checks:[]};
 await checkFiles();
 await checkCatalog();
 await checkSync();
 await checkDependencies();
 if(!offline)await checkPublicSite();
 const levels={ok:0,info:0,warning:1,critical:2};
 const issues=report.filter(r=>levels[r.level]>0);
 const prev=(previous.checks||[]).slice(0,2);
 const repeated=issues.filter(r=>prev.some(p=>(p.issues||[]).some(x=>x.id===r.id)));
 const summary={
  schemaVersion:1,engine:'ONEUP SELF HEALING ENGINE',updatedAt:iso,site:BASE,
  mode:offline?'solo_local':'local_y_publico',
  verdict:issues.some(x=>x.level==='critical')?'fallo':issues.length?'atencion':'correcto',
  totalChecks:report.length,critical:issues.filter(x=>x.level==='critical').length,
  warnings:issues.filter(x=>x.level==='warning').length,
  persistentAlerts:repeated.filter(x=>x.level==='critical'||x.level==='warning').map(x=>x.id),
  requiresManualAction:true,
  lastKnownGoodCommit:process.env.GITHUB_SHA||null,
  checks:report,
  recommendations:[
   'No se modifica el código de producción automáticamente.',
   'Comprobar el historial de Actions y los respaldos antes de preparar una reversión.',
   'Una actualización se publica solo después de sus pruebas.'
  ]
 };
 const history={schemaVersion:1,checks:[{at:iso,verdict:summary.verdict,issues:issues.map(x=>({id:x.id,level:x.level}))},...(previous.checks||[])].slice(0,MAX_HISTORY)};
 await save(STATUS,summary);
 await save(HISTORY,history);
 console.log('ONEUP guard:',JSON.stringify({verdict:summary.verdict,totalChecks:summary.totalChecks,critical:summary.critical,warnings:summary.warnings,persistent:summary.persistentAlerts}));
 for(const issue of issues)console.warn('['+issue.level+'] '+issue.id+': '+issue.message);
 if(strict&&summary.critical)process.exitCode=1;
}
main().catch(e=>{console.error('ONEUP SELF HEALING ENGINE could not run:',e.stack);process.exitCode=1});
