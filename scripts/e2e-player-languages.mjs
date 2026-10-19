/* Browser regression fixtures only: no remote media is fetched or claimed playable.
 * Verifies integration with the HLS adapter; codec/network playback is separate. */
import {chromium} from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('.');
const requestedPort=Number(process.env.E2E_PLAYER_PORT)||0;
const server=http.createServer(async(req,res)=>{try{const pathname=new URL(req.url,'http://localhost').pathname;const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));if(!file.startsWith(root+path.sep))throw Error('Invalid path');res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(requestedPort,'127.0.0.1',resolve)});
const base='http://127.0.0.1:'+server.address().port+'/';
let browser;
try{
browser=await chromium.launch({headless:true,args:['--no-sandbox']});for(const width of [390,1360]){
const page=await browser.newPage({viewport:{width,height:844}});
await page.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
await page.goto(base);
await page.waitForFunction(()=>window.OneUpEpisodePlayer&&window.OneUpCatalog);
await page.evaluate(()=>window.OneUpCatalog.open('mal-21'));
await page.locator('#oneup-watch-episode').waitFor();
await page.route('**/data/licensed-media.json',route=>route.fulfill({json:{version:1,entries:{'al-999990':{episodes:[{episode:1,rights:'owned',sources:[
{name:'Latino MP4',src:'https://media.example.com/latino.mp4',language:'Español latino'},
{name:'Castellano HLS',src:'https://media.example.com/es.m3u8',language:'Español castellano'},
{name:'Sub japonés',src:'https://media.example.com/ja.mp4',language:'Japonés subtitulado',subtitles_es:'./media/fixture.vtt'},
{name:'Original japonés',src:'https://media.example.com/raw.mp4',language:'Japonés original'},
{name:'English',src:'https://media.example.com/en.mp4',language:'English'}]}]}}}}));
await page.evaluate(()=>{window.__hlsCalls=[];window.__hlsDisposals=0;window.OneUpHLS={attach:(video,url)=>{window.__hlsCalls.push(url);return ()=>window.__hlsDisposals++}};return window.OneUpEpisodePlayer.show({id:'al-999990',episodes:2})});
const select=page.locator('#oneup-watch-language');
assert.deepEqual(await select.locator('option').evaluateAll(nodes=>nodes.map(n=>n.value)),['all','latino','castellano','sub','original','other']);
for(const [language,slot] of [['latino',0],['castellano',1],['sub',2],['original',3],['other',4]]){
 await select.selectOption(language);
 assert.equal(await page.locator('[data-server-slot]:enabled').count(),1,language);
 assert.equal(await page.locator('[data-server-slot]:enabled').getAttribute('data-server-slot'),String(slot));
 if(language==='castellano')assert.equal(await page.evaluate(()=>window.__hlsCalls.at(-1)),'https://media.example.com/es.m3u8');
 if(language==='sub')assert.equal(await page.locator('#oneup-playback-display track').getAttribute('src'),'./media/fixture.vtt');
}
await select.selectOption('sub');
const subtitleFont=page.locator('.oneup-subtitle-studio [data-subtitle="font"]');
await subtitleFont.waitFor({timeout:3000});
assert.equal(await subtitleFont.inputValue(),'bangers','Bangers must be the default anime font');
await subtitleFont.selectOption('arial');
assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('oneup.subtitle.studio.v1')).font),'arial');
assert.match(await page.locator('.oneup-subtitle-overlay').evaluate(el=>getComputedStyle(el).fontFamily),/Arial/);
await page.locator('.oneup-subtitle-studio [data-subtitle="theme"]').selectOption('neon');
assert.equal(await page.locator('.oneup-subtitle-overlay').getAttribute('data-subtitle-theme'),'neon');
await page.locator('.oneup-subtitle-studio [data-subtitle="lang"]').selectOption('es');
assert.match(await page.locator('.oneup-subtitle-notice').innerText(),/Español|subtítulos/i);
await page.screenshot({path:'e2e-player-languages-'+width+'.png',fullPage:true,animations:'disabled'});
await page.locator('#oneup-watch-episode').selectOption('2');
assert.equal(await page.locator('[data-server-slot]:enabled').count(),0);
assert.equal(await select.isDisabled(),true);
assert.match(await page.locator('#oneup-player-message').innerText(),/Solo se habilitan/);
console.log('PASS '+width+' language grouping, actual configured slots, HLS adapter call, per-source WebVTT, honest empty episode');
await page.unroute('**/data/licensed-media.json');
await page.route('**/data/licensed-media.json',route=>route.fulfill({json:{entries:{'al-999990':{episodes:[
{season:1,episode:100,rights:'owned',src:'https://media.example.com/season1.mp4'},
{season:2,episode:1,rights:'owned',src:'https://media.example.com/season2.m3u8'}]}}}}));
await page.evaluate(()=>window.OneUpEpisodePlayer.show({id:'al-999990',episodes:1},{season:2}));
assert.equal(await page.locator('#oneup-watch-episode option').count(),1,'Other season episode count leaks');
assert.equal(await page.evaluate(()=>window.__hlsCalls.at(-1)),'https://media.example.com/season2.m3u8');
await page.evaluate(()=>{document.dispatchEvent(new CustomEvent('oneup-episode-selected',{detail:{animeId:'al-999990',season:1,episode:100}}))});
assert.equal(await page.locator('#oneup-watch-episode').inputValue(),'1');
const disposedBefore=await page.evaluate(()=>window.__hlsDisposals);
await page.evaluate(()=>window.OneUpEpisodePlayer.close());
assert.equal(await page.evaluate(()=>window.__hlsDisposals),disposedBefore+1,'close must release active HLS');
await page.evaluate(()=>window.OneUpEpisodePlayer.close());
assert.equal(await page.evaluate(()=>window.__hlsDisposals),disposedBefore+1,'Repeated close must not release twice');

console.log('PASS '+width+' season filtering, episode count isolation, mismatched season event ignored and explicit close');
await page.close();
}}finally{await browser?.close();await new Promise(r=>server.close(r));}
