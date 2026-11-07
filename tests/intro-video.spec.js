const {test,expect}=require('@playwright/test');

test.setTimeout(60000);
const MP4='1up-anime-intro-firma-3seg.mp4';

// Regression test for the Phase 0 finding: on a fresh visit the intro video
// request was aborted (net::ERR_ABORTED) because the <video> had
// preload="auto" + src in the markup and the intro overlay was removed while
// the 1.6 MB file was still downloading. The fix: no src in the markup
// (preload="none"), the source is attached only when the intro actually
// plays, and the opening controller cancels any in-flight fetch before
// removing the overlay.
test('intro video never aborts its download (fresh visit)',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await context.newPage();
 const errors=[];const failed=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('requestfailed',r=>failed.push(r.url()+' :: '+(r.failure()?.errorText||'?')));
 try{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(9000);
  expect(failed.filter(u=>u.includes(MP4)),'intro video request failed: '+failed.join(' | ')).toEqual([]);
  expect(errors,'console/page errors: '+errors.join(' | ')).toEqual([]);
  const m=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  expect(m.sw-m.cw,'horizontal overflow at 390px').toBeLessThanOrEqual(3);
 }finally{await context.close()}
});

test('repeat visit does not download the intro video at all',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.addInitScript(()=>{try{sessionStorage.setItem('oneup-v3-opening-seen-v1','yes')}catch{}});
 const failed=[];
 page.on('requestfailed',r=>failed.push(r.url()));
 try{
  await page.goto('/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(5000);
  const hits=await page.evaluate(mp4=>performance.getEntriesByName(window.location.origin+'/assets/'+mp4).length,MP4);
  expect(hits,'intro video fetched on repeat visit').toBe(0);
  expect(failed.filter(u=>u.includes(MP4))).toEqual([]);
 }finally{await context.close()}
});
