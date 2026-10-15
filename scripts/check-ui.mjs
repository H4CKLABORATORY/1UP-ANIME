/* ONE UP production smoke checks. Built-in Node modules only. */
import fs from 'node:fs';
import vm from 'node:vm';
const read=f=>fs.readFileSync(f,'utf8');
const html=read('index.html');
const js=read('studio.js');
const sw=read('sw.js');
const css=read('spotlight.css');
let checks=0;
const assert=(ok,reason)=>{checks++;if(!ok)throw Error(reason)};
for(const file of ['studio.js','auth.js','motion.js','sonic.js','sw.js']){
 new vm.Script(read(file),{filename:file});
}
const ids=['hero-poster','hero-title','hero-description','hero-badges','hero-feature-cover',
 'hero-feature-title','hero-feature-caption','hero-picks','hero-save','hero-detail',
 'anime-dialog','anime-dialog-body','anime-close','browse-grid','trending-rail'];
for(const id of ids)assert(html.includes('id="'+id+'"'),'Missing required HTML ID: '+id);
for(const asset of ['./studio.css','./motion.css','./spotlight.css','./studio.js','./auth.js','./motion.js']){
 assert(html.includes(asset.replace('./','')),'Asset not linked: '+asset);
}
assert(!html.includes('Entrar con sonido'),'Legacy audio login gate still present');
assert(js.includes('function hero(a, chosen=false)'),'Selected artwork hero not implemented');
assert(js.includes('hero(a,true)'),'Clicking anime must update selected hero');
assert(js.includes('oneup-detail-cover'),'Hero artwork missing from modal');
assert(js.includes('data-feature'),'Manual selected anime picker missing');
assert(css.includes('@media(prefers-reduced-motion:reduce)'),'Reduced motion support missing');
assert(sw.includes("'./spotlight.css'"),'PWA does not cache spotlight stylesheet');
const snapshot=JSON.parse(read('data/catalog.json'));
for(const [group,entries] of Object.entries(snapshot.groups||{})){
 assert(Array.isArray(entries)&&entries.length>0,'Empty anime snapshot group: '+group);
 for(const entry of entries.slice(0,2)){
  assert(Boolean(entry.title)&&Boolean(entry.id),'Snapshot entry incomplete in '+group);
 }
}
console.log('1UP smoke checks passed ('+checks+' assertions).');
