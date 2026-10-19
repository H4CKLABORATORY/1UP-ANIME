/* Prueba Chromium con APIs simuladas. Móvil 390 y escritorio 1366.
   Verifica que el módulo ESM se cargue, los IDs correspondan y el clic abra la ficha correcta. */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';

const ROOT=resolve('.'),PORT=8798,BASE='http://127.0.0.1:'+PORT+'/';
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8',
 '.mjs':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8',
 '.json':'application/json;charset=utf-8','.svg':'image/svg+xml',
 '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,BASE).pathname);
  const file=resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(ROOT+sep))throw Error('Unsafe path');
  const content=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});
  res.end(content);
 }catch{res.writeHead(404);res.end('Not Found')}
});
const media=(id,title,more={})=>({
 id,idMal:id,type:'ANIME',isAdult:false,
 title:{english:title},coverImage:{large:'https://s4.anilist.co/test.jpg'},
 format:'TV',seasonYear:2026,...more
});
const fixture={data:{Media:{
 relations:{edges:[
  {relationType:'PREQUEL',node:media(100,'Temporada anterior')},
  {relationType:'SEQUEL',node:media(101,'Temporada siguiente')},
  {relationType:'SEQUEL',node:{...media(103,'Excluido por edad'),isAdult:true}},
  {relationType:'ADAPTATION',node:{...media(104,'Excluido por tipo'),type:'MANGA'}}
 ]},
 recommendations:{nodes:[{mediaRecommendation:media(102,'Anime recomendado')}]}
}}};
await new Promise(resolveListen=>server.listen(PORT,'127.0.0.1',resolveListen));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [390,1366]){
  const context=await browser.newContext({viewport:{width,height:860},
   isMobile:width===390,hasTouch:width===390,reducedMotion:'reduce'});
  const page=await context.newPage();
  const pageErrors=[];let franchiseRequests=0;
  page.on('pageerror',e=>pageErrors.push(e.message));
  await page.route('**/*',async route=>{
   const url=route.request().url();
   if(url.startsWith(BASE)){await route.continue();return}
   if(url.startsWith('https://graphql.anilist.co')){
    const input=route.request().postData()||'';
    if(input.includes('OneUpFranchise')){
     franchiseRequests++;
     await route.fulfill({status:200,headers:{
      'access-control-allow-origin':'*','content-type':'application/json;charset=utf-8'
     },body:JSON.stringify(fixture)});
     return;
    }
   }
   await route.abort();
  });
  try{
   await page.goto(BASE+'index.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>Boolean(window.OneUpCatalog?.register&&window.OneUpCatalog?.open),null,{timeout:15000});
   await page.evaluate(()=>{
    window.OneUpCatalog.register([{
     id:'mal-21',mal_id:21,title:'Anime principal de prueba',image:'',banner:'',
     description:'',averageScore:80,year:2026,genres:[],format:'TV',
     episodes:12,streaming:[],source:'fixture'
    }]);
    window.OneUpCatalog.open('mal-21');
   });
   await page.locator('#anime-dialog[open] .oneup-franchise-tile').first().waitFor({timeout:14000});
   await page.waitForFunction(()=>document.querySelectorAll('#anime-dialog .oneup-franchise-tile').length===3,null,{timeout:14000});
   const ids=await page.locator('#anime-dialog .oneup-franchise-tile').evaluateAll(nodes=>nodes.map(el=>el.dataset.details));
   assert.deepEqual(ids,['mal-100','mal-101','mal-102']);
   assert.equal(franchiseRequests,1,'La consulta AniList se duplicó');
   assert.equal(await page.locator('#anime-dialog .oneup-franchise-host').getByText('Precuela').count(),1);
   await page.evaluate(()=>{
    document.querySelector('#anime-dialog [data-details="mal-101"]').click();
   });
   await page.locator('#detail-anime-name').waitFor({state:'visible'});
   assert.equal((await page.locator('#detail-anime-name').innerText()).trim(),'Temporada siguiente');
   assert.equal(pageErrors.length,0,'Errores JS: '+pageErrors.join('; '));
   console.log('PASS franquicia ESM '+width+'px: fuentes, filtros y navegación');
  }finally{await context.close()}
 }
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
