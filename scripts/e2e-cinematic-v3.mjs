import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const ROOT=resolve('.'),port=8797,base='http://127.0.0.1:'+port+'/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.mp4':'video/mp4','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,base),file=resolve(ROOT,'.'+decodeURIComponent(u.pathname));
  if(!file.startsWith(ROOT+sep))throw Error('invalid path');
  const bytes=await readFile(file);
  res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});
  res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found')}
});
await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
let browser;const results=[];
async function check(label,fn){
 try{await fn();console.log('PASS '+label);results.push(true)}
 catch(e){console.error('FAIL '+label+': '+e.message);results.push(false)}
}
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const spec of [{name:'iPhone',width:390,height:844,mobile:true},
                    {name:'desktop',width:1366,height:768,mobile:false}]){
  const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},isMobile:spec.mobile,hasTouch:spec.mobile,deviceScaleFactor:1});
  const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await check(spec.name+' 1UP V3 multi-layer preview starts and respects aspect',async()=>{
   await page.goto(base+'preview-cinematic-v3.html',{waitUntil:'domcontentloaded'});
   await page.locator('#cinema.playing').waitFor({timeout:4000});
   const state=await page.evaluate(()=>({
    title:document.title,
    w:document.documentElement.scrollWidth,viewport:innerWidth,
    h:document.documentElement.scrollHeight,vh:innerHeight,
    beams:document.querySelectorAll('.energy-column').length,
    fog:document.querySelectorAll('.scene-fog').length,
    rings:document.querySelectorAll('.ring').length,
    characterCount:document.querySelectorAll('.authorized-character').length,
    media:document.querySelector('#original-signature').getAttribute('src'),
    logo:document.querySelector('.logo-main').getAttribute('src'),
    rendered:document.querySelector('#particles').width>0
   }));
   if(state.w>state.viewport+2||state.h>state.vh+3)throw Error('Overflow '+JSON.stringify(state));
   if(state.beams!==2||state.fog!==2||state.rings!==2||!state.rendered)throw Error('Missing multi-layer effects');
   if(state.characterCount!==0)throw Error('Unlicensed anime cutouts appeared');
   if(!state.media.endsWith('1up-anime-intro-firma-3seg.mp4'))throw Error('Audio track replaced');
   if(!state.logo.endsWith('oneup-header-letters.png'))throw Error('Approved wordmark replaced');
   await page.locator('.logo-main').evaluate(img=>img.decode());
   if(errors.length)throw Error('Runtime errors '+errors);
   await page.screenshot({path:'e2e-cinematic-v3-'+spec.name+'.png',animations:'disabled'});
  });
  await check(spec.name+' replay keeps cinematic layers reusable',async()=>{
   await page.locator('#replay').waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelector('#replay')?.disabled===false,{timeout:6500});
   await page.locator('#replay').click();
   await page.locator('#cinema.playing').waitFor({timeout:3000});
   if(errors.length)throw Error('Runtime errors '+errors);
  });
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();
 await check('reduced-motion fallback keeps original logo legible',async()=>{
  await page.goto(base+'preview-cinematic-v3.html',{waitUntil:'domcontentloaded'});
  await page.locator('.logo-main').evaluate(img=>img.decode());
  const style=await page.locator('.logo-group').evaluate(el=>getComputedStyle(el).animationName);
  if(style!=='none')throw Error('Motion preference ignored: '+style);
  await page.waitForTimeout(1100);
  if(await page.locator('#cinema.playing').count())throw Error('Reduced-motion animation did not finish');
 });
 await context.close();
}finally{await browser?.close();await new Promise(ok=>server.close(ok))}
if(results.some(ok=>!ok))process.exitCode=1;
