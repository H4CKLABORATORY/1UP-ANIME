/* Regression checks for cache ownership and correct popularity snapshots.
 * Uses only Node built-ins; no external media, network or browser credentials. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sw=fs.readFileSync('sw.js','utf8');
const studio=fs.readFileSync('studio.js','utf8');
const refresh=fs.readFileSync('scripts/refresh-catalog.mjs','utf8');

assert.match(sw,/const CACHE_PREFIX='oneup-stream-integrated-'/);
assert.match(sw,/key\.startsWith\(CACHE_PREFIX\)&&key!==CACHE/);
const currentCache=sw.match(/const CACHE=CACHE_PREFIX\+'([^']+)'/)?.[1];
assert.ok(currentCache,'Versioned 1UP cache name missing');

const events={};
const removed=[],claimed=[];
const swEnv={
 self:{addEventListener:(name,fn)=>events[name]=fn,clients:{claim:async()=>{claimed.push(true)}}},
 caches:{
  keys:async()=>[
   'another-pwa-v1','oneup-stream-integrated-v18-20261015',
   'oneup-another-product-v1','oneup-stream-integrated-'+currentCache,
   'oneup-stream-integrated-v17-20261014','some-shared-cache'
  ],
  delete:async key=>{removed.push(key);return true}
 },
 console
};
vm.runInNewContext(sw,swEnv,{filename:'sw.js'});
assert.equal(typeof events.activate,'function','Service worker activation handler missing');
let lifecycle;
events.activate({waitUntil(promise){lifecycle=promise}});
await lifecycle;
assert.deepEqual(removed.sort(),[
 'oneup-stream-integrated-v17-20261014',
 'oneup-stream-integrated-v18-20261015'
].sort(),'Cache cleanup removed other app caches or failed to evict owned old versions');
assert.equal(claimed.length,1,'SW clients not claimed');

const start=studio.indexOf('async function fromSnapshot(o){');
const stop=studio.indexOf('\nasync function fetchCatalog(o){',start);
assert.ok(start>=0&&stop>start,'Catalog snapshot adapter missing');
const fnSource='('+studio.slice(start,stop)+')';
const sample=id=>({id,title:'Show '+id,genres:['Action'],format:'TV',status:'FINISHED'});
const trendy=sample('trending'),popular=sample('popular'),movie={...sample('movie'),format:'MOVIE'};
const fresh=sample('fresh'),season={...sample('season'),status:'RELEASING'};
const data={updated:'2026-10-16T00:00:00.000Z',groups:{
 trending:[trendy],popular:[popular],season:[season],movies:[movie],recent:[fresh]
}};
let registered=[];
const context=vm.createContext({getSnapshot:async()=>data,register:list=>{registered=list}});
const fromSnapshot=vm.runInContext(fnSource,context);
const selection=async options=>(await fromSnapshot({perPage:20,...options}))?.items?.[0]?.id||null;
assert.equal(await selection({sort:'POPULARITY_DESC'}),'popular','Popular ranking mistakenly used trending');
assert.equal(await selection({sort:'TRENDING_DESC'}),'trending','Trending view changed');
assert.equal(await selection({sort:'POPULARITY_DESC',format:'MOVIE'}),'movie','Movie ranking should use movies snapshot');
assert.equal(await selection({status:'RELEASING'}),'season','Airing series should use season snapshot');
assert.equal(await selection({sort:'START_DATE_DESC'}),'fresh','Recent titles should use recent snapshot');
assert.equal(registered[0].id,'fresh','Selected catalog entries not registered');
delete data.groups.popular;
assert.equal(await selection({sort:'POPULARITY_DESC'}),null,
 'Must fall through to live API instead of mislabeling trends as popularity');
assert.match(refresh,/popular:\{sort:\['POPULARITY_DESC'\]\}/,
 'Next catalog refresh must build the actual popularity snapshot');

console.log('PASS: scoped CacheStorage cleanup, 5 ranking selectors, missing popularity fallback, snapshot generator');
