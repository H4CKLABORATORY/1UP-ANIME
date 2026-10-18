/* ONEUP motion regressions. No live provider API or licensed media fixture required.
 * Simulated mobile viewport is NOT a physical Safari device.
 */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import assert from 'node:assert/strict';

const ROOT=resolve('.'), PORT=8795, BASE='http://127.0.0.1:'+PORT+'/';
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp4':'video/mp4','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,BASE).pathname);
  const file=resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(ROOT+sep))throw Error('Unsafe path');
  const body=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(body);
 }catch{res.writeHead(404);res.end('Not Found')}
});
await new Promise(done=>server.listen(PORT,'127.0.0.1',done));
let browser;
try{
 const html=await readFile('index.html','utf8');
 const sw=await readFile('sw.js','utf8');
 assert(html.includes('themes/oneup-motion/windows.css')&&html.includes('themes/oneup-motion/windows.js'));
 assert(sw.includes('./themes/oneup-motion/windows.css')&&sw.includes('./themes/oneup-motion/windows.js'));
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const setting of [
  {width:390,reduced:false},
  {width:1366,reduced:false},
  {width:390,reduced:true},
  {width:1366,reduced:true}
 ]){
  const {width,reduced}=setting, mobile=width<600;
  const context=await browser.newContext({viewport:{width,height:844},
   isMobile:mobile,hasTouch:mobile,reducedMotion:reduced?'reduce':'no-preference'});
  await context.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(BASE+'index.html',{waitUntil:'domcontentloaded'});
   await page.addStyleTag({content:'#oneup-opening{display:none!important}'});
   await page.waitForFunction(()=>!!window.OneUpMotion&&!!document.querySelector('link[href$="windows.css"]')?.sheet);
   const motion=await page.evaluate(()=>({
     reduced:window.OneUpMotion.prefersReducedMotion(),
     disabledByPref:window.matchMedia('(prefers-reduced-motion: reduce)').matches,
   }));
   assert.equal(motion.reduced,reduced);
   assert.equal(motion.disabledByPref,reduced);

   // Core navigation must execute synchronously and never wait for animation.
   const native=await page.evaluate(()=>{
     document.querySelector('[data-route="catalogo"]').click();
     const el=document.querySelector('#browse-screen');
     return {hidden:el.hidden,hash:location.hash,
       running:el.getAnimations().some(a=>a.id==='oneup-motion-enter')};
   });
   assert.equal(native.hidden,false,'Browse route hidden');
   assert.equal(native.hash,'#catalogo','URL/route lost');
   assert.equal(native.running,!reduced,'Main route motion preference violated');
   await page.evaluate(()=>document.querySelector('[data-route="inicio"]').click());
   assert.equal(await page.evaluate(()=>document.querySelector('#home-screen').hidden),false);

   await page.locator('#trending-rail [data-details]').first().waitFor({state:'attached',timeout:17000});
   const detailId=await page.locator('#trending-rail [data-details]').first().getAttribute('data-details');
   await page.evaluate(id=>document.querySelector('#trending-rail [data-details="'+id+'"]').click(),detailId);
   await page.locator('#anime-dialog').waitFor({state:'visible',timeout:5000});
   const dialogAnim=await page.locator('#anime-dialog').evaluate(el=>getComputedStyle(el).animationName);
   assert.equal(dialogAnim.includes('oneup-sheet-in'),!reduced,'Dialog opening preference mismatch: '+dialogAnim);
   await page.locator('#anime-close').click();
   await page.waitForFunction(()=>!document.querySelector('#anime-dialog').open,{timeout:4000});

   // 450 ms iOS ghost-click guard is intentional; wait before a deliberate reopen.
   await page.waitForTimeout(520);
   // Native Escape must always close immediately and restore the application.
   await page.locator('#trending-rail [data-details]').first().click();
   await page.locator('#anime-dialog').waitFor({state:'visible'});
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>!document.querySelector('#anime-dialog').open,{timeout:4000});

   if(mobile){
     await page.locator('#km-open').click();
     await page.locator('#km-drawer').waitFor({state:'visible'});
     const drawer=await page.locator('#km-drawer').evaluate(el=>getComputedStyle(el).animationName);
     assert.equal(drawer.includes('oneup-drawer-in'),!reduced,'Drawer motion not coherent: '+drawer);
     await page.keyboard.press('Escape');
     await page.waitForFunction(()=>document.querySelector('#km-drawer').hidden);
     await page.locator('#header-search').click();
     await page.locator('#km-search-pop').waitFor({state:'visible'});
     const search=await page.locator('#km-search-pop').evaluate(el=>getComputedStyle(el).animationName);
     assert.equal(search.includes('oneup-pop-in'),!reduced,'Search popover preference mismatch: '+search);
     await page.keyboard.press('Escape');
     await page.waitForFunction(()=>document.querySelector('#km-search-pop').hidden);
   }

   const interior=await page.evaluate(()=>{
     location.hash='#km/blog';
     return true;
   });
   assert(interior);
   await page.locator('#km-extra-root').waitFor({state:'visible',timeout:10000});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert(overflow<=15,'Layout overflow at '+width+'px: '+overflow);
   if(errors.length)throw Error('Uncaught JavaScript: '+errors.slice(0,3).join(' | '));
   if(!reduced)await page.screenshot({path:'e2e-oneup-motion-'+width+'.png',animations:'disabled'});
   console.log('PASS ONEUP motion '+width+'px reduced='+reduced+
     ' | route, modal close/Escape, '+(mobile?'drawer/search, ':'')+'interior, overflow');
  }finally{await context.close()}
 }
}finally{
 await browser?.close();
 await new Promise(done=>server.close(done));
}
