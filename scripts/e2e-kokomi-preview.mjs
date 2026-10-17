import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const ROOT=resolve('.'),port=8789,base='http://127.0.0.1:'+port+'/';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4'};
const server=createServer(async(req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,base).pathname);const filename=resolve(ROOT,'.'+name);
 if(!filename.startsWith(ROOT+sep))throw Error('Path');const data=await readFile(filename);
 res.writeHead(200,{'Content-Type':types[extname(filename)]||'application/octet-stream'});res.end(data);
 }catch{res.writeHead(404);res.end('Not Found')}
});
await new Promise(ok=>server.listen(port,'127.0.0.1',ok));
let browser,failed=0;
const check=async(label,fn)=>{try{await fn();console.log('PASS '+label)}catch(e){failed++;console.error('FAIL '+label+': '+e.message)}};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 // Focused brand continuity checks; reuse the full journeys below only twice.
 // The owner's original video signature is the primary brand, not the old crest.

 // Original movie signature is a separate first screen, not a header logo.
 for(const width of [320,375,390,1366]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const page=await context.newPage();
  try{await check('opening '+width+' displays owner intro before homepage',async()=>{
   await page.goto(base+'index.html?intro=1',{waitUntil:'domcontentloaded'});
   const gate=page.locator('#oneup-opening');
   await gate.waitFor({state:'visible',timeout:9000});
   const source=await page.locator('#oneup-opening-video').getAttribute('src');
   if(!source.endsWith('/assets/1up-anime-intro-firma-3seg.mp4'))
     throw Error('Original logo film not wired into opening');
   await page.locator('.oneup-opening-poster').evaluate(img=>img.decode());
   await page.screenshot({path:'e2e-oneup-opening-'+width+'.png',animations:'disabled'});
   if(await page.locator('.header video.oneup-motion-logo').count())
     throw Error('Animated logo must not be embedded in header');
   if(await page.locator('#oneup-opening-skip,#oneup-opening-sound').count())
     throw Error('No intro controls should be visible or present');
   await gate.waitFor({state:'detached',timeout:4500});
   await page.locator('#km-open').click();
   await page.locator('#km-drawer:not([hidden])').waitFor();
   const drawerBrand=page.locator('#km-drawer .km-drawer-brand');
   if(await drawerBrand.getAttribute('href')!=='#inicio')throw Error('Menu logo not linked to home');
   await drawerBrand.click();
   await page.locator('#km-drawer').waitFor({state:'hidden'});
   await page.locator('#home-screen:not([hidden])').waitFor();
   if(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)>12)
     throw Error('Intro caused overflow');
  })}finally{await context.close()}
 }
 await check('opening tries automatic sound, falls back muted, then opens site',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
   // Simulate browser policy: audible autoplay rejects, silent media is allowed.
   window.__oneupPlayAttempts=[];
   HTMLMediaElement.prototype.play=function(){
     window.__oneupPlayAttempts.push(this.muted?'muted':'audible');
     return this.muted?Promise.resolve():Promise.reject(new DOMException('Gesture required','NotAllowedError'));
   };
   HTMLMediaElement.prototype.pause=function(){};
  });
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  try{
   const page=await context.newPage();
   await page.goto(base+'index.html?intro=1',{waitUntil:'domcontentloaded'});
   const gate=page.locator('#oneup-opening');
   await gate.waitFor({state:'visible'});
   const tries=await page.evaluate(()=>window.__oneupPlayAttempts);
   if(tries[0]!=='audible')throw Error('Audio should be requested automatically first: '+tries);
   await page.waitForFunction(()=>window.__oneupPlayAttempts.includes('muted'));
   if(await page.locator('#oneup-opening-skip,#oneup-opening-sound').count())
     throw Error('Controls must not appear in the opening');
   await page.locator('#oneup-opening-video').dispatchEvent('ended');
   await gate.waitFor({state:'detached',timeout:3000});
   await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
   await page.locator('#oneup-opening').waitFor({state:'detached',timeout:2500});
  }finally{await context.close()}
 });
 await check('opening plays with audio if browser permits it',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  await context.addInitScript(()=>{
   window.__audioChecks=[];
   HTMLMediaElement.prototype.play=function(){
    window.__audioChecks.push(this.muted?'muted':'audible');
    return Promise.resolve();
   };
   HTMLMediaElement.prototype.pause=function(){};
  });
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  try{
   const page=await context.newPage();
   await page.goto(base+'index.html?intro=1',{waitUntil:'domcontentloaded'});
   await page.locator('#oneup-opening').waitFor({state:'visible'});
   const modes=await page.evaluate(()=>window.__audioChecks);
   if(modes[0]!=='audible'||modes.includes('muted'))throw Error('Audible playback should be attempted and preserved: '+modes);
   await page.locator('#oneup-opening-video').dispatchEvent('ended');
   await page.locator('#oneup-opening').waitFor({state:'detached',timeout:3000});
  }finally{await context.close()}
 });
 for(const env of [{label:'mobile',width:390,height:844,mobile:true},{label:'desktop',width:1366,height:768,mobile:false}]){
 const context=await browser.newContext({viewport:{width:env.width,height:env.height},isMobile:env.mobile,hasTouch:env.mobile,reducedMotion:'reduce'});
 await context.addInitScript(()=>{try{sessionStorage.setItem('oneup-opening-seen-v1','yes')}catch{}});
 await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await check(env.label+' homepage',async()=>{await page.goto(base+'preview-kokomi-mobile.html',{waitUntil:'domcontentloaded'});await page.locator('#km-open').waitFor();await page.locator('#trending-rail .anime-card').first().waitFor({timeout:14000})});

 await check(env.label+' production index renders Codex Kokomi design',async()=>{
   await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
   await page.locator('body.kokomi-mobile-reference #km-open').waitFor({timeout:9000});
   await page.locator('#trending-rail .anime-card').first().waitFor({timeout:14000});
   const theme=await page.locator('body').getAttribute('data-theme-preview');
   if(theme!=='off')throw Error('Published page loaded the wrong theme: '+theme);
   const tracks=await page.locator('#trending-rail').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(' ').filter(Boolean).length);
   if(tracks!==(env.mobile?2:5))throw Error('Wrong poster layout on published index: '+tracks);
   await page.locator('#km-open').click();
   await page.locator('#km-drawer:not([hidden])').waitFor();
   await page.locator('#km-drawer a[data-km-view="settings"]').click();
   await page.locator('#km-preferences').waitFor();
   await page.evaluate(()=>location.hash='#inicio');
   await page.locator('#home-screen:not([hidden])').waitFor();
   if(await page.locator('#km-drawer').isVisible())throw Error('Menu stayed open on published homepage');
   await page.goto(base+'preview-kokomi-mobile.html',{waitUntil:'domcontentloaded'});
   await page.locator('#trending-rail .anime-card').first().waitFor({timeout:14000});
 });
 await check(env.label+' drawer navigation',async()=>{
 await page.locator('#km-open').click();await page.locator('#km-drawer:not([hidden])').waitFor();
 await page.locator('#km-drawer a[data-km-view="upcoming"]').click();
 await page.locator('#km-extra-root:not([hidden])').waitFor({timeout:8000});
 if(await page.locator('#km-drawer').isVisible())throw Error('drawer stayed open')});
 await check(env.label+' interior routes',async()=>{
 for(const route of ['blog','profile','notifications','settings','contact','trailers','404']){
 await page.goto(base+'preview-kokomi-mobile.html#km/'+route,{waitUntil:'domcontentloaded'});
 await page.locator('#km-extra-root:not([hidden]) .km-page-heading h1').waitFor({timeout:8000});
 }
 });

 await check(env.label+' integrated episode discussion without fake media',async()=>{
  await page.goto(base+'preview-kokomi-mobile.html',{waitUntil:'domcontentloaded'});
  await page.locator('#trending-rail [data-details]').first().waitFor({timeout:13000});
  const id=await page.locator('#trending-rail [data-details]').first().getAttribute('data-details');
  if(!id)throw Error('No catalogue identifier');
  await page.goto(base+'preview-kokomi-mobile.html#km/series-play/'+id,{waitUntil:'domcontentloaded'});
  await page.locator('#km-watch-comment-form').waitFor({timeout:9000});
  if(!await page.locator('#km-watch-comment-list').getByText('Firebase').count())throw Error('Disconnected backend not disclosed');
  await page.locator('#km-player-section .oneup-player-placeholder').waitFor();
  if(await page.locator('#km-player-section [data-server-slot]').count()!==7)throw Error('Expected seven shared engine slots');
  if(await page.locator('#km-player-section [data-server-slot]:enabled').count())throw Error('Empty library enabled a server');
  const selected=await page.locator('#km-watch-select option').count();
  if(selected<1)throw Error('Missing episode selector');
  await page.evaluate(()=>location.hash='#inicio');
  await page.locator('#home-screen:not([hidden])').waitFor({timeout:6500});
 });
 await check(env.label+' playable mock fixture changes season and server without real streaming',async()=>{
  const tester=await context.newPage();
  const first=await page.locator('#trending-rail [data-details]').first().getAttribute('data-details');
  await tester.route('**/data/licensed-media.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
   entries:{[first]:{episodes:[
    {season:1,number:1,title:'Prueba uno',sources:[
      {rights:'authorized',name:'Video directo de prueba',src:'https://media.example.com/demo.mp4',mime:'video/mp4'},
      {rights:'authorized',name:'Video externo de prueba',mode:'official_embed',provider:'youtube',videoId:'12345678901'}
    ]},
    {season:2,number:1,title:'Prueba dos',sources:[
      {rights:'authorized',name:'Segundo servidor de prueba',src:'https://media.example.com/two.mp4',mime:'video/mp4'}
    ]}
   ]}}
  })}));
  try{
   await tester.goto(base+'preview-kokomi-mobile.html#km/series-play/'+first,{waitUntil:'domcontentloaded'});
   await tester.locator('#km-watch-comment-form').waitFor({timeout:11000});
   const player=tester.locator('#km-player-section');
   if(await player.locator('[data-server-slot]').count()!==7)throw Error('Shared engine seven positions missing');
   if(await player.locator('[data-server-slot]:enabled').count()!==2)throw Error('Configured server selector missing');
   await player.locator('[data-server-slot="1"]').click();
   if(await player.locator('iframe').count())throw Error('Embed loaded without user consent');
   await player.locator('#oneup-embed-play').click();
   if(!await player.locator('iframe').count())throw Error('Shared engine embed selector did not work');
   await tester.locator('#km-season-select').selectOption('2');
   await tester.waitForFunction(()=>document.querySelector('#km-watch-select option')?.textContent.includes('T2'));
   if(!await tester.locator('#km-watch-select option').getByText('T2 · Episodio 1').count())throw Error('Comment season did not update');
   if(!await player.locator('video').count())throw Error('Season changed but shared video was not re-rendered');
   if(await player.locator('[data-server-slot]:enabled').count()!==1)throw Error('Season inherited unrelated sources');
   await tester.locator('#oneup-watch-episode').selectOption('2');
   await tester.waitForFunction(()=>document.querySelector('#km-watch-select')?.value==='1002');
   await tester.locator('#km-watch-select').selectOption('1001');
   await tester.waitForFunction(()=>document.querySelector('#oneup-watch-episode')?.value==='1');
   await tester.evaluate(()=>location.hash='#km/blog');
   await tester.locator('.km-page-heading h1').waitFor();
   if(await tester.locator('#km-player-section video,#km-player-section iframe').count())throw Error('Route kept stale player media');
  }finally{await tester.close()}
 });
 await check(env.label+' settings local storage',async()=>{
 await page.goto(base+'preview-kokomi-mobile.html#km/settings',{waitUntil:'domcontentloaded'});
 await page.locator('#km-preferences input[name="compact"]').check();
 await page.locator('#km-preferences button[type="submit"]').click();
 const value=await page.evaluate(()=>JSON.parse(localStorage.getItem('oneup_kokomi_preferences_v1')||'{}').compact);
 if(!value)throw Error('preference not saved');
 });
 await check(env.label+' no horizontal overflow or script errors',async()=>{
 const excess=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 if(excess>12)throw Error('overflow '+excess);
 if(errors.length)throw Error(errors.slice(0,2).join('; '));
 });
 await page.goto(base+'preview-kokomi-mobile.html',{waitUntil:'domcontentloaded'});
 await page.locator('#trending-rail .anime-card').first().waitFor({timeout:14000});
 const diagnostic=await page.evaluate(()=>{
 const vw=window.innerWidth;
 return {vw,scroll:document.documentElement.scrollWidth,bodyScroll:document.body.scrollWidth,
 oversized:[...document.querySelectorAll('body *')].map(el=>({el,r:el.getBoundingClientRect()})).filter(x=>x.r.width>vw+30||x.r.right>vw+35).slice(0,20).map(x=>({tag:x.el.tagName,id:x.el.id,cls:String(x.el.className).slice(0,90),w:Math.round(x.r.width),right:Math.round(x.r.right)}))}
 });
 console.log('KOKOMI_LAYOUT_DIAGNOSTIC '+env.label+' '+JSON.stringify(diagnostic));
 await check(env.label+' homepage width',async()=>{if(diagnostic.scroll>env.width+12||diagnostic.vw>env.width+12)throw Error('Homepage horizontal overflow '+JSON.stringify(diagnostic.oversized.slice(0,7)))});
 await page.screenshot({path:'e2e-kokomi-'+env.label+'-hero.png',animations:'disabled'});
 await page.locator('#trending-rail').scrollIntoViewIfNeeded();
 await check(env.label+' exact poster column count',async()=>{
   const columns=await page.locator('#trending-rail').evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(' ').filter(Boolean).length);
   const expected=env.mobile?2:5;
   if(columns!==expected)throw Error('Expected '+expected+' columns, found '+columns);
 });
 await page.screenshot({path:'e2e-kokomi-'+env.label+'-ranking.png',animations:'disabled'});
 const animeId=await page.locator('#trending-rail [data-details]').first().getAttribute('data-details');
 await page.goto(base+'preview-kokomi-mobile.html#km/series/'+animeId,{waitUntil:'domcontentloaded'});
 await page.locator('.km-detail-banner').waitFor({timeout:9000});
 await page.screenshot({path:'e2e-kokomi-'+env.label+'-detail.png',animations:'disabled'});
 await page.goto(base+'preview-kokomi-mobile.html#km/series-play/'+animeId,{waitUntil:'domcontentloaded'});
 await page.locator('#km-watch-comment-form').waitFor({timeout:9000});
 await page.screenshot({path:'e2e-kokomi-'+env.label+'-watch.png',animations:'disabled'});

 await context.close();
 }
}finally{await browser?.close();await new Promise(ok=>server.close(ok))}
if(failed)process.exitCode=1;
