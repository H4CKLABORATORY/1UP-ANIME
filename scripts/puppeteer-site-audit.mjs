/**
 * 1UP Anime — Puppeteer quality smoke check.
 * Runs only in Node / GitHub Actions, never on GitHub Pages visitors' devices.
 * Opens only a localhost copy of the repository, blocks external requests,
 * takes screenshots and validates navigation/auth without real credentials.
 */
import puppeteer from 'puppeteer';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT=process.cwd();
const OUTPUT=path.resolve(ROOT,'artifacts/puppeteer');
const MIMES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8',
 '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
 '.webp':'image/webp','.woff2':'font/woff2','.mp4':'video/mp4',
 '.webmanifest':'application/manifest+json'};
const ROUTES=['/index.html','/comunidad.html','/motor.html','/moderacion.html','/gremio.html'];
const SCREENS=[{name:'iphone',width:390,height:844,mobile:true},
 {name:'desktop',width:1365,height:864,mobile:false}];
const report={engine:'Puppeteer',pages:[],checks:[],failures:[],note:
 'Local Chromium automation only; neither physical Safari nor connected backend is certified.'};

function serve(){
 return createServer(async(req,res)=>{
  try{
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return}
   const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   const filename=path.resolve(ROOT,'.'+(pathname==='/'?'/index.html':pathname));
   if(filename!==ROOT && !filename.startsWith(ROOT+path.sep)){
    res.writeHead(403).end();return;
   }
   const info=await stat(filename);
   if(!info.isFile())throw Error('Not a file');
   res.setHeader('content-type',MIMES[path.extname(filename)]||'application/octet-stream');
   res.setHeader('cache-control','no-store');
   res.writeHead(200);
   if(req.method==='HEAD'){res.end();return}
   res.end(await readFile(filename));
  }catch{res.writeHead(404).end('Not Found')}
 });
}
async function check(name,run){
 try{await run();report.checks.push({name,passed:true});console.log('PASS '+name)}
 catch(error){report.failures.push({name,error:String(error?.message||error)});console.error('FAIL '+name+': '+(error?.message||error))}
}
function wait(milliseconds){return new Promise(resolve=>setTimeout(resolve,milliseconds))}
async function waitIntroToFinish(page){
 // The real 1UP cinematic intro intentionally intercepts taps until finished.
 // Puppeteer must not mistake an intro click for a working login action.
 await page.waitForFunction(()=>{
  const overlay=document.querySelector('#oneup-opening');
  const cinematicReady=!overlay||!overlay.isConnected||overlay.hidden||
   getComputedStyle(overlay).display==='none';
  const logo=document.querySelector('#startup');
  const logoReady=!logo||logo.hidden||getComputedStyle(logo).display==='none';
  return cinematicReady&&logoReady;
 },{timeout:11000});
}

await mkdir(OUTPUT,{recursive:true});
const server=serve();
await new Promise((resolve,reject)=>{
 server.once('error',reject);server.listen(0,'127.0.0.1',resolve);
});
const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await puppeteer.launch({
  headless:'shell',
  args:process.env.CI?['--no-sandbox','--disable-setuid-sandbox']:[],
  timeout:60000
 });
 for(const viewport of SCREENS){
  const page=await browser.newPage();
  const pageErrors=[];
  page.on('pageerror',error=>pageErrors.push(String(error.message||error)));
  await page.setViewport({
   width:viewport.width,height:viewport.height,
   isMobile:viewport.mobile,hasTouch:viewport.mobile,
   deviceScaleFactor:viewport.mobile?2:1
  });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(()=>{
   try{
    sessionStorage.setItem('oneup-v3-opening-seen-v1','yes');
    sessionStorage.setItem('oneup_intro_seen','v5');
   }catch{}
  });
  await page.setRequestInterception(true);
  page.on('request',request=>{
   const address=request.url();
   if(address.startsWith(origin+'/'))request.continue();
   else request.abort();
  });
  try{
   for(const route of ROUTES){
    const label=viewport.name+' '+route;
    await check(label,async()=>{
     pageErrors.length=0;
     const response=await page.goto(origin+route,{waitUntil:'domcontentloaded',timeout:25000});
     assert.equal(response?.status(),200,'Local route must load');
     if(route==='/index.html')await waitIntroToFinish(page);
     await wait(300);
     const info=await page.evaluate(()=>({
      title:document.title,
      width:document.documentElement.scrollWidth,
      viewport:document.documentElement.clientWidth,
      body:document.body.scrollWidth,
      qualityCss:[...document.styleSheets].some(s=>s.href?.includes('/ui-quality.css'))
     }));
     assert.ok(info.title&&info.title.includes('1UP'),'Page title missing 1UP');
     assert.ok(info.qualityCss,'Sitewide UX stylesheet not loaded');
     assert.ok(info.width-info.viewport<=5,
       'Horizontal overflow '+(info.width-info.viewport)+'px');
     assert.deepEqual(pageErrors,[],'Uncaught runtime errors: '+pageErrors.join('; '));
     report.pages.push({viewport:viewport.name,route,
       title:info.title,horizontalOverflow:Math.max(0,info.width-info.viewport)});
     if(route==='/index.html'||(viewport.mobile&&route==='/comunidad.html')){
      await page.screenshot({path:path.join(OUTPUT,viewport.name+'-'+route.slice(1)+'.png')});
     }
    });
   }
   await check(viewport.name+' guest login and close button',async()=>{
    pageErrors.length=0;
    await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded',timeout:25000});
    await waitIntroToFinish(page);
    await page.waitForSelector('#auth-open',{visible:true,timeout:15000});
    await page.click('#auth-open');
    await page.waitForSelector('#auth-dialog[open]',{visible:true,timeout:5000});
    const geometry=await page.$eval('#auth-close',button=>{
     const r=button.getBoundingClientRect(),center=document.elementFromPoint(
      r.left+r.width/2,r.top+r.height/2);
     return {x:r.x,y:r.y,width:r.width,height:r.height,
      clickable:center===button||button.contains(center)};
    });
    assert.ok(geometry.clickable,'Close X must receive pointer input');
    assert.ok(geometry.x>=0&&geometry.x+geometry.width<=viewport.width+2,
       'Close button outside viewport');
    if(viewport.mobile){
     await page.screenshot({path:path.join(OUTPUT,'iphone-login.png')});
    }
    await page.click('#auth-close');
    assert.equal(await page.$eval('#auth-dialog',x=>x.open),false,'Close action');
    await page.click('#auth-open');
    await page.click('#guest-login');
    assert.equal(await page.$eval('#auth-dialog',x=>x.open),false,'Guest action');
    assert.deepEqual(pageErrors,[],'Uncaught auth errors');
   });
  }finally{await page.close()}
 }
}finally{
 try{await browser?.close()}catch{}
 await new Promise(resolve=>server.close(resolve));
 report.finishedAt=new Date().toISOString();
 await writeFile(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2)+'\n');
}
if(report.failures.length)process.exitCode=1;
console.log('Puppeteer results: '+report.checks.filter(x=>x.passed).length+
 ' passed, '+report.failures.length+' failed. Screenshots and JSON: '+OUTPUT);
