// UI contract with a simulated broker/CAPTCHA. This does NOT prove email delivery.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.ONEUP_PLAYWRIGHT_PATH||'@playwright/test');
const root=resolve('.');
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
  res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.ONEUP_BROWSER_PATH?{executablePath:process.env.ONEUP_BROWSER_PATH}:{})});
 for(const width of [390,1366]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await context.newPage();const sent=[];
  await page.addInitScript(()=>{sessionStorage.setItem('oneup-v3-opening-seen-v1','yes');sessionStorage.setItem('oneup_intro_seen','v5');});
  await context.route('**/*',async route=>{
   const url=route.request().url();
   if(url.startsWith(base))return route.continue();
   if(url.includes('challenges.cloudflare.com'))return route.fulfill({contentType:'text/javascript',body:`window.turnstile={render:(selector,options)=>{window.testCaptcha=()=>options.callback('simulated-captcha');window.testCaptcha();return 1},reset:()=>window.testCaptcha()};`});
   if(url==='https://test.supabase.co/functions/v1/oneup-auth'){
    const body=route.request().postDataJSON();sent.push(body);
    const data=body.action==='recover-verify'?{token:'b'.repeat(64),recovery:true}:
     ['login','verify'].includes(body.action)?{token:'a'.repeat(64),identity:{kind:'oneup',key:'oneup_12345678-1234-1234-1234-123456789012',name:'dexter'},expires_at:new Date(Date.now()+600000).toISOString()}:
     {message:'Si los datos corresponden a una cuenta, recibirás un código.'};
    return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
   }
   return route.abort();
  });
  await page.goto(base+'/index.html');
  await page.locator('#auth-open').click({force:true});
  await page.locator('#oneup-auth-details summary').click();
  await page.getByText('1UP Auth está pendiente de configuración.',{exact:false}).waitFor();
  await page.locator('#auth-close').click();
  await page.locator('#auth-open').click({force:true});
  await page.locator('#guest-login').click();assert.equal(await page.locator('#auth-dialog').evaluate(el=>el.open),false);
  // Supply only public endpoint/site key to exercise the form, with no live backend.
  await page.evaluate(()=>{window.ONEUP_AUTH_CONFIG={endpoint:'https://test.supabase.co/functions/v1/oneup-auth',turnstileSiteKey:'test-public'};});
  await page.locator('#auth-open').click({force:true});
  await page.locator('#oneup-auth-details').evaluate(el=>{el.open=false;});
  await page.locator('#oneup-auth-details summary').click();
  await page.waitForFunction(()=>Boolean(window.testCaptcha));
  await page.locator('#oneup-auth-mode').selectOption('signup');
  await page.locator('#oneup-auth-username').fill('dexter');await page.locator('#oneup-auth-email').fill('test@example.com');
  await page.locator('#oneup-auth-password').fill('A unique nebula phrase!');await page.locator('#oneup-auth-submit').click();
  await page.waitForFunction(()=>document.querySelector('#oneup-auth-mode').value==='verify');
  assert.equal(await page.locator('#oneup-auth-password').inputValue(),'');
  await page.locator('#oneup-auth-code').fill('123456');await page.locator('#oneup-auth-submit').click();
  await page.waitForFunction(()=>!document.querySelector('#auth-dialog').open);
  assert.equal(await page.locator('#auth-label').textContent(),'dexter');
  const stored=await page.evaluate(()=>JSON.stringify({...localStorage}));assert.ok(!stored.includes('aaaaaaaa'));assert.ok(!stored.includes('nebula phrase'));
  await page.locator('#auth-open').click({force:true});await page.locator('#oneup-auth-mode').selectOption('recover');
  await page.locator('#oneup-auth-submit').click();await page.waitForFunction(()=>document.querySelector('#oneup-auth-mode').value==='recover-verify');
  await page.locator('#oneup-auth-code').fill('123456');await page.locator('#oneup-auth-submit').click();
  await page.waitForFunction(()=>document.querySelector('#oneup-auth-mode').value==='password');
  await page.locator('#oneup-auth-password').fill('Another unique galaxy phrase!');await page.locator('#oneup-auth-submit').click();
  await page.waitForFunction(()=>document.querySelector('#oneup-auth-mode').value==='login');
  assert.ok(sent.some(b=>b.action==='password'));assert.ok(sent.some(b=>b.action==='signup'));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
  const dialogBox=await page.locator('#auth-dialog').boundingBox();assert.ok(dialogBox.width<=width);
  console.log('PASS simulated signup/verify/recovery, guest, no token persistence, no overflow: '+width+'px');
  await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r));}
