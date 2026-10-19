import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const pages=['index.html','comunidad.html'];

for(const page of pages){
  test(page+' contiene un solo indicador y las dependencias ordenadas',()=>{
    const html=read(page);
    assert.equal((html.match(/data-oneup-presence(?=\s|>)/g)||[]).length,1);
    assert.match(html,/presence-counter\.css/);
    assert.match(html,/presence-config\.js/);
    assert.match(html,/presence-counter\.js/);
    assert.ok(html.indexOf('presence-config.js')<html.indexOf('presence-counter.js'));
    assert.match(html,/data-oneup-presence-count/);
  });
}

test('el contador comparte la sala y no inventa visitantes',()=>{
  const source=read('presence-counter.js');
  assert.match(source,/oneup_anime_global_presence/);
  assert.match(source,/presenceState\(\)/);
  assert.match(source,/event:'sync'/);
  assert.match(source,/track\(\{online:true\}\)/);
  assert.match(source,/untrack\(\)/);
  assert.match(source,/visibilitychange/);
  assert.match(source,/widget\.dataset\.state='unavailable'/);
  assert.match(source,/value\.textContent='—'/);
  assert.doesNotMatch(source,/Math\.floor\(Math\.random\(\)\s*\*/);
});

test('la presencia está opt-in y evita exponer secretos',()=>{
  const config=read('presence-config.js');
  assert.match(config,/ONEUP_PRESENCE_CONFIG = null/);
  assert.doesNotMatch(config,/sb_secret_/);
  const script=read('presence-counter.js');
  assert.match(script,/startsWith\('sb_publishable_'\)/);
  assert.doesNotMatch(script,/localStorage|document\.cookie/);
});

test('cache PWA incluye estilos y scripts del contador',()=>{
  const worker=read('sw.js');
  for(const file of ['presence-config.js','presence-counter.js','presence-counter.css']){
    assert.ok(worker.includes("'./"+file+"'"),file);
  }
});
