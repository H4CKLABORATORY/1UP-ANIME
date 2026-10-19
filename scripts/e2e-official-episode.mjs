/* Real Chromium release test of the official TMS iframe integration.
   External requests blocked; verifies local player, consent, exact video ID,
   mobile and desktop, but never claims the YouTube stream played in this runner. */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const ROOT=resolve('.'),PORT=8837,BASE='http://127.0.0.1:'+PORT+'/';
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8',
'.mjs':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8',
'.json':'application/json;charset=utf-8','.svg':'image/svg+xml',
'.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=createServer(async(req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,BASE).pathname);
  const file=resolve(ROOT,'.'+(p==='/'?'/index.html':p));
  if(!file.startsWith(ROOT+sep))throw Error('Invalid path');
  const data=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});
  res.end(data);
 }catch{res.writeHead(404);res.end('Not Found')}
});
await new Promise(resolveListen=>server.listen(PORT,'127.0.0.1',resolveListen));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of [390,1366]){
  const context=await browser.newContext({viewport:{width,height:870},isMobile:width===390,
   hasTouch:width===390,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
  try{
   await page.goto(BASE,{waitUntil:'domcontentloaded',timeout:12000});
   await page.waitForFunction(()=>Boolean(window.OneUpCatalog?.get?.('mal-27947')),{timeout:12000});
   assert.equal(await page.locator('#oneup-official-episode').count(),1);
   await page.locator('#oneup-opening').waitFor({state:'detached',timeout:10000});
   await page.locator('#oneup-official-episode-open').click({timeout:8000});
   await page.locator('#anime-dialog[open] #detail-anime-name').waitFor({timeout:8000});
   assert.match(await page.locator('#detail-anime-name').textContent(),/LUPIN THE 3rd PART 4/i);
   await page.locator('#oneup-watch-episode').waitFor({timeout:8000});
   const one=page.locator('[data-server-slot="0"]');
   assert.equal(await one.isDisabled(),false);
   assert.equal(await page.locator('[data-server-slot]:enabled').count(),1);
   const link=page.locator('.oneup-embed-external');
   assert.equal(await link.getAttribute('href'),'https://www.youtube.com/watch?v=K8LrLO_omys');
   assert.equal(await page.locator('iframe#oneup-embed-frame').count(),0);
   await page.locator('#oneup-embed-play').click();
   const frame=page.locator('#oneup-embed-frame iframe');
   await frame.waitFor({timeout:5000});
   assert.equal(await frame.getAttribute('src'),'https://www.youtube-nocookie.com/embed/K8LrLO_omys');
   assert.equal(await frame.getAttribute('sandbox'),'allow-scripts allow-same-origin allow-presentation allow-popups');
   assert.equal(errors.length,0,'Browser JS errors: '+errors.join(' | '));
   console.log('PASS TMS official episode '+width+'px: correct anime, server, iframe and external link');
  }finally{await context.close()}
 }
}finally{
 await browser?.close();await new Promise(done=>server.close(done));
}
