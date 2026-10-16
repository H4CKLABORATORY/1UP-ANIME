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
 for(const width of [320,375,390,1366]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const page=await context.newPage();
  try{await check('brand '+width+' real MP4 poster appears in header and drawer',async()=>{
   await page.goto(base+'preview-kokomi-mobile.html',{waitUntil:'domcontentloaded'});
   await page.locator('#km-open').waitFor();
   await page.locator('body.oneup-video-brand-enabled').waitFor({timeout:9000});
   const verifyLogo=async(selector)=>{
    const logo=page.locator(selector);await logo.waitFor({state:'visible'});
    await logo.evaluate(image=>image.decode());
    const state=await logo.evaluate(image=>{
      const box=image.getBoundingClientRect();
      return {complete:image.complete,naturalWidth:image.naturalWidth,path:new URL(image.currentSrc).pathname,x:box.x,y:box.y,width:box.width,height:box.height,viewport:innerWidth}
    });
    if(!state.complete||!state.naturalWidth||!state.path.endsWith('/assets/1up-anime-logo-poster.jpg'))throw Error('Owner logo poster failed to load: '+JSON.stringify(state));
    if(state.width<24||state.height<24||state.x<0||state.x+state.width>state.viewport)throw Error('Video poster outside viewport: '+JSON.stringify(state));
   };
   await verifyLogo('.header .oneup-motion-logo');
   if(await page.locator('.header .brand-symbol').isVisible())throw Error('Legacy logo visible instead of original');
   const overlaps=await page.evaluate(()=>{const brand=document.querySelector('.header .brand').getBoundingClientRect();return ['#km-open','.header-right'].some(selector=>{const box=document.querySelector(selector).getBoundingClientRect();return box.width>0&&box.left<brand.right&&box.right>brand.left&&box.top<brand.bottom&&box.bottom>brand.top})});
   if(overlaps)throw Error('Brand overlaps header controls');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   if(overflow>12)throw Error('Brand viewport overflow '+overflow);
   await page.screenshot({path:'e2e-kokomi-brand-'+width+'-header.png',animations:'disabled'});
   await page.locator('#km-open').click();
   await page.locator('#km-drawer:not([hidden])').waitFor();
   await verifyLogo('#km-drawer .km-drawer-brand .oneup-drawer-logo');
   await page.screenshot({path:'e2e-kokomi-brand-'+width+'-drawer.png',animations:'disabled'});
   const drawerBrand=page.locator('#km-drawer .km-drawer-brand');
   if(await drawerBrand.getAttribute('href')!=='#inicio')throw Error('Drawer brand is not linked to home');
   await drawerBrand.click();
   if(await page.locator('#km-drawer').isVisible())throw Error('Drawer brand failed to close navigation');
   await page.locator('#home-screen:not([hidden])').waitFor();
  })}finally{await context.close()}
 }

 await check('brand video auto-mutes and allows sound after a tap',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  try{
   const page=await context.newPage();
   await page.goto(base+'index.html',{waitUntil:'domcontentloaded'});
   const video=page.locator('.header video.oneup-motion-logo');
   await video.waitFor({state:'visible',timeout:9000});
   const auto=await video.evaluate(el=>({muted:el.muted,autoplay:el.autoplay,loop:el.loop,playsInline:el.playsInline}));
   if(!auto.muted||!auto.autoplay||!auto.loop||!auto.playsInline)throw Error('Header video must loop silently to satisfy iOS autoplay policy');
   await page.locator('.oneup-signature-trigger').click();
   await page.locator('#oneup-signature-dialog[open]').waitFor({timeout:5500});
   if(await page.locator('.oneup-signature-video').evaluate(el=>el.muted))throw Error('Sound preview was muted after user interaction');
   await page.locator('.oneup-signature-close').click();
   if(await page.locator('#oneup-signature-dialog').evaluate(el=>el.open))throw Error('Sound dialog failed to close');
  }finally{await context.close()}
 });
 for(const env of [{label:'mobile',width:390,height:844,mobile:true},{label:'desktop',width:1366,height:768,mobile:false}]){
 const context=await browser.newContext({viewport:{width:env.width,height:env.height},isMobile:env.mobile,hasTouch:env.mobile,reducedMotion:'reduce'});
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
