/* ONEUP Editorial Finale: Chromium viewport móvil/escritorio (no Safari físico).
   APIs externas bloqueadas; comprueba navegación real, modal, overflow y CSS. */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';

const root=resolve('.'),port=8799,base='http://127.0.0.1:'+port+'/';
const types={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8',
 '.mjs':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8',
 '.json':'application/json;charset=utf-8','.png':'image/png','.jpg':'image/jpeg',
 '.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4',
 '.webmanifest':'application/manifest+json'};
const server=createServer(async(request,response)=>{
 try{
  const path=decodeURIComponent(new URL(request.url,base).pathname);
  const file=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!file.startsWith(root+sep))throw Error('Unsafe path');
  const contents=await readFile(file);
  response.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});
  response.end(contents);
 }catch{response.writeHead(404);response.end('Not found')}
});
await new Promise(resolveListen=>server.listen(port,'127.0.0.1',resolveListen));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [390,1366]){
  const context=await browser.newContext({
   viewport:{width,height:860},deviceScaleFactor:1,
   isMobile:width===390,hasTouch:width===390,reducedMotion:'reduce'
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  try{
   await page.goto(base,{waitUntil:'domcontentloaded',timeout:15000});
   await page.addStyleTag({content:'#oneup-opening{display:none!important}'});
   await page.waitForFunction(()=>Boolean(window.OneUpCatalog?.register)&&Boolean(document.querySelector('.oneup-finale-action')),{timeout:15000});
   await page.waitForFunction(()=>!document.querySelector('[data-finale-status]').textContent.startsWith('Consultando'),{timeout:9000});
   const observed=await page.locator('[data-finale-status]').innerText();
   assert.match(observed,/fichas|actualización no se pudo comprobar/i);
   assert.equal(await page.locator('.oneup-finale-action').count(),4);
   assert.equal(await page.locator('link[href$="oneup-finale.css"]').count(),1);
   const padding=await page.locator('#oneup-finale-deck').evaluate(x=>getComputedStyle(x).borderRadius);
   assert.notEqual(padding,'0px');
   const layout=await page.locator('#oneup-finale-deck').evaluate(node=>{
    const rect=node.getBoundingClientRect(),style=getComputedStyle(node);
    return {top:rect.top+scrollY,height:rect.height,width:rect.width,
      display:style.display,visibility:style.visibility,hidden:node.hidden};
   });
   console.log('Editorial deck '+width+'px: '+JSON.stringify(layout));
   assert.ok(layout.display!=='none'&&!layout.hidden&&layout.height>50,'Deck debe ser visible');
   assert.ok(layout.top<2300,'El menú de descubrimiento queda demasiado abajo: '+JSON.stringify(layout));
   await page.screenshot({path:'e2e-finale-'+width+'.png',fullPage:true,animations:'disabled'});

   await page.evaluate(()=>document.querySelector('#oneup-finale-deck [data-route="catalogo"]').click());
   await page.waitForFunction(()=>location.hash==='#catalogo'&&!document.querySelector('#browse-screen').hidden,{timeout:9000});
   await page.evaluate(()=>document.querySelector('#oneup-finale-deck [data-route="milista"]').click());
   await page.waitForFunction(()=>location.hash==='#milista'&&!document.querySelector('#browse-screen').hidden,{timeout:9000});
   await page.evaluate(()=>{
    window.OneUpCatalog.register([{
     id:'mal-999932',mal_id:999932,title:'Finale QA: serie de prueba',
     image:'',banner:'',description:'Prueba interna de interfaz',
     genres:[],format:'TV',episodes:12,averageScore:0,year:2026,
     status:'',siteUrl:'',streaming:[],source:'sample'
    }]);
    window.OneUpCatalog.open('mal-999932');
   });
   await page.waitForFunction(()=>Boolean(document.querySelector('#anime-dialog')?.open),{timeout:4500});
   assert.equal(await page.locator('#detail-anime-name').count(),1);
   await page.evaluate(()=>document.querySelector('#anime-close').click());
   await page.waitForFunction(()=>!document.querySelector('#anime-dialog')?.open,{timeout:5000});
   await page.evaluate(()=>document.querySelector('[data-route="inicio"]').click());
   await page.waitForFunction(()=>!document.querySelector('#home-screen').hidden,{timeout:8000});
   const overflow=await page.evaluate(()=>({
    doc:document.documentElement.scrollWidth,viewport:innerWidth,
    deck:document.getElementById('oneup-finale-deck').getBoundingClientRect().width
   }));
   assert.ok(overflow.doc<=overflow.viewport+2,'Horizontal overflow '+JSON.stringify(overflow));
   assert.equal(errors.length,0,'JS errors: '+errors.join(' | '));
   console.log('PASS editorial '+width+'px: estado, enlaces, dialog, diseño y overflow');
  }finally{await context.close()}
 }
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
