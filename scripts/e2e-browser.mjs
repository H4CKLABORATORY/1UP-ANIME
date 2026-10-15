/* Real browser journey checks for GitHub Pages pages.
 * Loads the exact static project through a local HTTP server; no Firebase or
 * unauthorized media integrations are simulated as successful.
 */
import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT=path.resolve('.');
const port=Number(process.env.E2E_PORT)||8765;
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const decoded=decodeURIComponent(url.pathname);
  const safe=path.resolve(ROOT,'.'+(decoded==='/'?'/index.html':decoded));
  if(!safe.startsWith(ROOT+path.sep))throw new Error('Invalid path');
  const data=await fs.readFile(safe);
  res.setHeader('Content-Type',mime[path.extname(safe)]||'application/octet-stream');
  res.end(data);
 }catch{res.writeHead(404);res.end('Not Found')}
});
await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+port+'/';
let browser;
const failures=[];
const test=async(name,fn)=>{
 try{await fn();console.log('PASS '+name)}catch(e){failures.push({name,error:String(e?.stack||e).slice(0,1200)});console.error('FAIL '+name+': '+e.message)}
};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const device of [{name:'iPhone',width:390,height:844,mobile:true},{name:'desktop',width:1360,height:860,mobile:false}]){
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:device.mobile,hasTouch:device.mobile,deviceScaleFactor:1,reducedMotion:'reduce'});
  // No reliance on an external API/CDN to pass functional navigation testing.
  await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await test(device.name+' loads homepage and local anime snapshot',async()=>{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.locator('#trending-rail [data-details]').first().waitFor({timeout:15000});
   const title=await page.locator('#hero-title').innerText();
   if(!title.trim())throw new Error('Hero title is blank');
   if(await page.locator('#trending-rail [data-details]').count()<3)throw new Error('Missing anime cards');
  });
  await test(device.name+' anime detail, poster and episode discussion',async()=>{
   await page.locator('#hero-detail').click();
   await page.locator('#anime-dialog[open] #detail-anime-name').waitFor({timeout:9000});
   await page.locator('#oneup-comments-section').waitFor({timeout:4000});
   const text=await page.locator('#anime-dialog').innerText();
   if(!/SINOPSIS|HISTORIA|COMENTARIOS/i.test(text))throw new Error('Detail lacks synopsis and discussion');
   await page.locator('#anime-close').click();
  });
  await test(device.name+' calendar navigation',async()=>{
   const menu=page.locator('.desktop-links [data-route="temporada"]');
   if(device.mobile)await page.locator('.mobile-navigation [data-route="temporada"]').click();
   else await menu.click();
   await page.locator('#browse-screen:not([hidden])').waitFor({timeout:6500});
   await page.locator('#oneup-airing-dashboard').waitFor({timeout:6500});
   const v=await page.locator('#airing-today').count();
   if(!v)throw new Error('Today airing section is missing');
   const ancestor=await page.locator('#oneup-airing-dashboard').evaluate(el=>el.parentElement?.id);
   if(ancestor!=='browse-screen')throw new Error('Calendar did not move into season browsing section');
  });
  await test(device.name+' search and anime catalogue',async()=>{
   if(device.mobile)await page.locator('.mobile-navigation [data-route="inicio"]').click();
   else await page.locator('.desktop-links [data-route="inicio"]').click();
   await page.locator('#search-input').fill('Naruto');
   await page.locator('#search-form button[type="submit"]').click();
   await page.locator('#browse-screen:not([hidden])').waitFor({timeout:9000});
   const heading=await page.locator('#browse-title').innerText();
   if(!heading.trim())throw new Error('Search route rendered no heading');
  });
  await test(device.name+' public community degrades clearly without Firebase',async()=>{
   await page.goto(base+'comunidad.html',{waitUntil:'domcontentloaded'});
   await page.locator('#feed-list').waitFor({timeout:9000});
   const all=await page.locator('body').innerText();
   if(!/Firebase|servidor|cuenta|publicaciones|registr/i.test(all))throw new Error('Community error message is missing');
  });
  await test(device.name+' management displays actual provider data',async()=>{
   await page.goto(base+'motor.html',{waitUntil:'domcontentloaded'});
   await page.locator('#motor-providers .motor-provider').first().waitFor({timeout:10000});
   const episodes=(await page.locator('#motor-episodes').innerText()).replace(/[,. ]/g,'');
   if(!Number(episodes))throw new Error('Published engine episode count missing');
  });
  await test(device.name+' has no uncaught JavaScript errors',async()=>{
   if(errors.length)throw new Error(errors.join(' | '));
  });
  try{await page.screenshot({path:'e2e-'+device.name+'.png',fullPage:true,animations:'disabled'})}catch{}
  await context.close();
 }
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exitCode=1}
else console.log('All real-browser smoke journeys passed.');
