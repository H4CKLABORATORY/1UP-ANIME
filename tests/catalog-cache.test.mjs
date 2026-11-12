import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../studio.js', import.meta.url), 'utf8');
const begin = source.indexOf('function cacheKey(o)');
const end = source.indexOf('let snapshotPromise=', begin);
function readCache(value) {
  const ctx = vm.createContext({localStorage: {getItem: () => JSON.stringify(value)}, Date});
  vm.runInContext(source.slice(begin, end), ctx);
  return vm.runInContext('cached({})', ctx);
}
test('corrupt cached items cannot abort catalog loading before provider fallback', () => {
  for (const items of [{length: 1}, [null], ['bad'], [{id:'x'}], [42]]) {
    assert.equal(readCache({at:Date.now(),items}), null, JSON.stringify(items));
  }
});
test('cache timestamps must be finite, recent and not from the future', () => {
  const items = [{id:'mal-1',title:'Anime',genres:['Action']}];
  for (const at of [undefined, 'now', Date.now()+3600000, Date.now()-9*3600000]) {
    assert.equal(readCache({at,items}), null);
  }
  assert.equal(readCache({at:Date.now(),items,source:'snapshot'}).items[0].title, 'Anime');
});
test('catalog actually falls back to a snapshot after a corrupt cache hit', async () => {
  const fallback = {items:[{id:'mal-1',title:'Fallback',genres:[]}],source:'snapshot'};
  const ctx = vm.createContext({localStorage:{getItem:()=>JSON.stringify({at:Date.now(),items:[null]}),setItem(){}},
    Date, fromSnapshot:async()=>fallback,
    register(items){ for (const item of items) assert.ok(item.id); }});
  vm.runInContext(source.slice(begin,end),ctx);
  const start=source.indexOf('async function fetchCatalog(o){');
  const stop=source.indexOf('function identityKey()',start);
  vm.runInContext(source.slice(start,stop),ctx);
  assert.equal((await vm.runInContext('fetchCatalog({})',ctx)).source,'snapshot');
});
