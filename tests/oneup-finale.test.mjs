import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('La portada integra la capa editorial al final y usa rutas reales',()=>{
 const html=read('index.html');
 assert.equal((html.match(/id="oneup-finale-deck"/g)||[]).length,1);
 assert.ok(html.indexOf('id="oneup-finale-deck"')<html.indexOf('class="marquee"'),'quick actions should be directly after hero');
 assert.ok(html.indexOf('oneup-finale.css')>html.indexOf('ui-quality.css'));
 assert.ok(html.indexOf('oneup-finale.js')>html.indexOf('studio.js'));
 for(const route of ['catalogo','temporada','programacion','milista'])
  assert.ok(html.includes('class="oneup-finale-action" data-route="'+route+'"'));
});
test('El estilo preserva el tema Original y no oculta botones nativos',()=>{
 const css=read('oneup-finale.css');
 assert.match(css,/:root:not\(\[data-oneup-theme="original"\]\) body\.oneup-kokomi \.hero/);
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('#anime-close{z-index:150'));
 assert.ok(!css.includes('iframe{display:none'));
});
test('Las métricas del catálogo son reales y el script no usa datos ficticios',()=>{
 const code=read('oneup-finale.js');
 assert.match(code,/fetch\('\.\/data\/catalog\.json'/);
 assert.match(code,/unique\.add\(item\.id\)/);
 assert.match(code,/!data\.groups\|\|!data\.updated/);
 assert.ok(!code.includes('Math.random'));
 assert.ok(!code.includes('fakeOnline'));
});
test('El service worker cachea ambos recursos y aísla otros proyectos',()=>{
 const sw=read('sw.js');
 assert.ok(sw.includes("'./oneup-finale.css'"));
 assert.ok(sw.includes("'./oneup-finale.js'"));
 assert.ok(sw.includes('v34-editorial-finale-20261019'));
 assert.ok(sw.includes("key.startsWith(CACHE_PREFIX)"));
});
