/**
 * Editorial Pro preview: isolated browser contract + screenshots.
 * No remote requests, no real users, no video/episode content assertions.
 */
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import assert from 'node:assert/strict';

const root = resolve('.');
const base = 'http://127.0.0.1:8798/';
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.mp4':'video/mp4','.webmanifest':'application/manifest+json'};
const server = createServer(async(req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, base).pathname);
    const name = resolve(root, '.' + pathname);
    if (!name.startsWith(root + sep)) throw Error('Path outside root');
    const contents = await readFile(name);
    res.writeHead(200, {'Content-Type':types[extname(name)] || 'application/octet-stream'});
    res.end(contents);
  } catch {
    res.writeHead(404);res.end('Not Found');
  }
});
await new Promise(resolveReady=>server.listen(8798, '127.0.0.1', resolveReady));
let browser;
try {
  const html = await readFile('preview-kokomi-mobile.html','utf8');
  const main = await readFile('index.html','utf8');
  assert(html.includes('class="oneup-kokomi kokomi-mobile-reference oneup-editorial-pro"'));
  assert(html.includes('href="./themes/kokomi-mobile-preview/editorial-pro.css"'));
  assert(!main.includes('editorial-pro.css') && !main.includes('oneup-editorial-pro'), 'Production must be untouched');

  browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  for (const width of [320,390,1366]) {
    const mobile = width < 600;
    const context = await browser.newContext({
      viewport: {width, height: mobile?844:860}, isMobile: mobile, hasTouch: mobile,
      reducedMotion: 'reduce'
    });
    await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
    const page = await context.newPage();
    try {
      await page.goto(base+'preview-kokomi-mobile.html',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>{
        const link=document.querySelector('link[href$="editorial-pro.css"]');
        return !!link?.sheet && document.body.classList.contains('oneup-editorial-pro');
      },null,{timeout:7000});
      await page.addStyleTag({content:'#oneup-opening{display:none!important}'});
      // Fixture ensures poster styles work regardless of network API or current catalogue.
      await page.evaluate(()=>{
        const test=document.createElement('article');
        test.className='anime-card';
        test.setAttribute('data-editorial-fixture','1');
        test.innerHTML='<div class="anime-art"><div class="placeholder-art">DEMO</div></div><div class="card-info"><b class="card-name">Título de prueba legible en dos líneas</b><small class="card-sub">Catálogo de prueba</small></div>';
        document.querySelector('#trending-rail').prepend(test);
      });
      const data = await page.evaluate(()=>{
        const style=sel=>getComputedStyle(document.querySelector(sel));
        const card=document.querySelector('[data-editorial-fixture]'),rect=card.getBoundingClientRect();
        return {
          scroll:document.documentElement.scrollWidth,
          width:innerWidth,
          stylesheetRules:document.querySelector('link[href$="editorial-pro.css"]').sheet.cssRules.length,
          ctaHeight:parseFloat(style('#hero-detail').minHeight),
          sectionKicker:style('.section-heading .micro').display,
          cardRadius:parseFloat(style('[data-editorial-fixture]').borderTopLeftRadius),
          artRatio:style('[data-editorial-fixture] .anime-art').aspectRatio,
          cardRight:rect.right,
          cardWidth:rect.width,
          inputFont:parseFloat(style('.searchbar input').fontSize),
          reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
          cardTransition:style('[data-editorial-fixture]').transitionDuration,
        };
      });
      assert(data.stylesheetRules > 25, 'Style sheet is missing/unparsed');
      assert(data.ctaHeight >= 44, 'Main CTA too small: '+JSON.stringify(data));
      assert(data.sectionKicker !== 'none', 'Editorial kicker hidden');
      assert(data.cardRadius >= 7, 'Card frame not applied');
      assert(data.artRatio.includes('/'), 'Poster aspect ratio not reserved');
      assert(data.cardWidth > 45 && data.cardRight <= width+14, 'Poster overflows '+JSON.stringify(data));
      assert(data.scroll <= width+14, 'Horizontal viewport overflow '+JSON.stringify(data));
      assert(data.reducedMotion, 'Reduced motion override not active');
      if(mobile) assert(data.inputFont >= 16, 'Mobile search input can trigger Safari zoom');
      await page.screenshot({path:'e2e-editorial-pro-'+width+'.png',animations:'disabled',fullPage:false});
      console.log('PASS editorial preview '+width+'px '+JSON.stringify(data));
    } finally {await context.close()}
  }
} finally {
  await browser?.close();
  await new Promise(done=>server.close(done));
}
