const {test,expect}=require('@playwright/test');
const fake=(id,name,at,episode)=>({
 id:'mal-'+id,mal_id:id,ani_id:id+10000,title:name,
 image:'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/sample.jpg',
 banner:'',description:'Descripción de la emisión confirmada por la programación',
 year:2026,format:'TV',status:'RELEASING',averageScore:80,
 episodes:12,genres:['Action'],siteUrl:'https://anilist.co/anime/'+id,
 airingAt:Math.round(at/1000),episode,streaming:[]
});
test('cinematic premieres operate on iPhone and desktop, with working arrows and real status',async({browser})=>{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const now=new Date();
  const day=new Date(now.getFullYear(),now.getMonth(),now.getDate(),13).getTime();
  const schedule={updated:new Date().toISOString(),airing:[
   fake(5001,'Premiere Today Alpha',day,3),
   fake(5002,'Premiere Today Beta',day+2*3600000,4),
   fake(5003,'Premiere Tomorrow',day+86400000,1)
  ],seasonal:{entries:[]}};
  await page.addInitScript(()=>{
   sessionStorage.setItem('oneup-v3-opening-seen-v1','yes');
   sessionStorage.setItem('oneup_intro_seen','v5');
  });
  await page.route('**/data/airing.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(schedule)}));
  try{
   await page.goto('/index.html',{waitUntil:'domcontentloaded'});
   await expect(page.locator('.hero')).toHaveClass(/premiere-mode/,{timeout:18000});
   await expect(page.locator('#premiere-status')).toContainText('HOY');
   await expect(page.locator('#premiere-controls')).toBeVisible();
   const first=await page.evaluate(()=>window.OneUpPremiereHero?.current());
   expect(first).toBeTruthy();
   await page.locator('#premiere-next').click();
   const second=await page.evaluate(()=>window.OneUpPremiereHero?.current());
   expect(second).not.toEqual(first);
   await expect(page.locator('#hero-detail')).toBeVisible();
   await expect(page.locator('#hero-save')).toBeVisible();
   expect(await page.locator('#premiere-progress .premiere-marker').count()).toBeGreaterThan(1);
   await expect(page.locator('#premiere-source-note')).toContainText('no garantiza reproducción');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow).toBeLessThanOrEqual(5);
   const path='qa-premieres-'+width+'.png';
   await page.screenshot({path,animations:'disabled'});
   expect(errors,'JS errors on '+width+'px').toEqual([]);
  }finally{await context.close()}
 }
});
