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
assert(js.includes('oneup-synopsis-text'),'Full anime synopsis is missing');
assert(js.includes('const synopsis=chosenSynopsis(a)'),'Auto-sourced localized synopsis is missing');
assert(js.includes('loadSpanishSynopses()'),'Spanish synopsis loader missing');
assert(js.includes('data-synopsis-original'),'Original language option missing');
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
// Spanish-first and licensed-media checks: prevent regression seen on iPhone.
assert(js.includes('function spanishSynopsis(a)'),'Spanish synopsis lookup not found');
assert(js.includes('row?.es'),'Spanish text must be keyed to anime identity');
assert(js.includes('Sinopsis en español pendiente'),'Do not show untranslated English automatically');
assert(js.includes('oneup-player-section'),'Optional authorized player not integrated');
assert(html.includes('brand-v2.css')&&html.includes('player.css'),'Missing new UI stylesheets');
assert(html.includes('oneup-crest.svg'),'New emblem missing from page');
assert(sw.includes('oneup-crest.svg')&&sw.includes('translations-es.json'),'iPhone PWA cache missing localized assets');
const translated=JSON.parse(read('data/translations-es.json'));
assert(translated.language==='es','Translation pack must be Spanish');
assert(Number(translated.translated)>0,'No Spanish translations');
const allAnime=Object.values(snapshot.groups).flat();
assert(allAnime.some(x=>x.id==='mal-59741'&&x.description_es&&x.description_es!==(x.description||'')),
 'Screenshot anime still lacks Spanish synopsis');
assert(allAnime.filter(x=>typeof x.description_es==='string').length>=20,
 'Snapshot no longer includes translated Spanish synopsis');
const library=JSON.parse(read('data/licensed-media.json'));
assert(typeof library.entries==='object','Authorized media manifest missing');
console.log('1UP smoke checks passed ('+checks+' assertions).');
