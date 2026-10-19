const {test,expect}=require('@playwright/test');

test.setTimeout(85000);
const screens=[
 {name:'iPhone SE',width:320,height:720},
 {name:'iPhone',width:390,height:844},
 {name:'tablet',width:768,height:1024},
 {name:'desktop',width:1440,height:900}
];
async function skipIntro(page){
 await page.addInitScript(()=>{try{sessionStorage.setItem('oneup-v3-opening-seen-v1','yes')}catch{}});
}
async function checkNoOverflow(page,description){
 const m=await page.evaluate(()=>({
   document:document.documentElement.scrollWidth,
   viewport:document.documentElement.clientWidth,
   body:document.body.scrollWidth
 }));
 expect(m.document-m.viewport,description+' causes horizontal overflow: '+JSON.stringify(m)).toBeLessThanOrEqual(3);
}
for(const device of screens){
 test('auth modal is readable, tappable and dismissible on '+device.name,async({browser})=>{
  const context=await browser.newContext({viewport:{width:device.width,height:device.height},isMobile:device.width<500,hasTouch:device.width<500});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await skipIntro(page);
  try{
   await page.goto('/index.html',{waitUntil:'domcontentloaded'});
   await page.locator('#auth-open').click({timeout:14000});
   await expect(page.locator('#auth-dialog')).toBeVisible();
   const img=page.locator('#auth-dialog .auth-crest');
   await expect(img).toBeVisible();
   await expect(img).toHaveAttribute('src','./assets/oneup-crest-mark.svg');
   const isImageLoaded=await img.evaluate(el=>el.complete&&el.naturalWidth>0);
   expect(isImageLoaded).toBe(true);
   await expect(page.locator('#auth-google-label')).toHaveText(/Google/);
   await expect(page.locator('#google-login')).toBeDisabled(); // no Firebase project configured
   await expect(page.locator('#guest-login')).toBeEnabled();
   const close=page.locator('#auth-close');
   const box=await close.boundingBox();
   expect(box).not.toBeNull();
   expect(box.x).toBeGreaterThanOrEqual(0);
   expect(box.x+box.width).toBeLessThanOrEqual(device.width+1);
   expect(box.y).toBeGreaterThanOrEqual(0);
   expect(box.y+box.height).toBeLessThanOrEqual(device.height+1);
   const hit=await close.evaluate(el=>{
     const r=el.getBoundingClientRect();
     const found=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
     return found===el||el.contains(found);
   });
   expect(hit,'Close X is blocked by dialog artwork').toBe(true);
   await checkNoOverflow(page,device.name+' with modal');
   await close.click({timeout:6000});
   await expect(page.locator('#auth-dialog')).not.toBeVisible();
   await page.locator('#auth-open').click();
   await page.locator('#guest-login').click();
   await expect(page.locator('#auth-dialog')).not.toBeVisible();
   await expect(page.locator('#auth-label')).toContainText('Invitado');
   await checkNoOverflow(page,device.name+' after closing');
   expect(errors).toEqual([]);
  }finally{await context.close()}
 });
}

test('local profiles use accessible inline selector instead of browser prompt',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();await skipIntro(page);
 await page.addInitScript(()=>localStorage.setItem('oneup_profiles_v1',JSON.stringify([{id:'profile_A',name:'Mi perfil'},{id:'profile_B',name:'Otro perfil'}])));
 try{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('#auth-open').click();
  await expect(page.locator('#auth-profiles')).toBeVisible();
  await page.locator('#auth-profiles summary').click();
  await page.locator('#auth-profile-select').selectOption('profile_B');
  await page.locator('#auth-profile-enter').click();
  await expect(page.locator('#auth-dialog')).not.toBeVisible();
  await expect(page.locator('#auth-label')).toHaveText('Otro perfil');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('oneup_identity_v2')).key)).toBe('local_profile_B');
 }finally{await context.close()}
});

for(const device of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}]){
 test('public pages fit '+device.name+' without horizontal overflow',async({browser})=>{
  const context=await browser.newContext({viewport:{width:device.width,height:device.height}});
  const page=await context.newPage();await skipIntro(page);
  try{
   for(const pathname of ['/index.html','/comunidad.html','/motor.html','/moderacion.html','/gremio.html']){
    await page.goto(pathname,{waitUntil:'domcontentloaded',timeout:25000});
    await page.waitForTimeout(450);
    await checkNoOverflow(page,device.name+' '+pathname);
    const cssLoaded=await page.evaluate(()=>Array.from(document.styleSheets).some(s=>s.href?.includes('ui-quality.css')));
    expect(cssLoaded,pathname+' missing polish stylesheet').toBe(true);
   }
  }finally{await context.close()}
 });
}
