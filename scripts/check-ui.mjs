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
for(const file of ['studio.js','auth.js','motion.js','sonic.js','sw.js','airing-ui.js','episode-comments.js','community.js','social-backend.js','functions/index.js','moderacion.js']){
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
assert(/function hero\(a, chosen=false(?:, persist=chosen)?\)/.test(js),'Selected artwork hero not implemented');
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
// New verified publication calendar and community integration.
const airing=JSON.parse(read('data/airing.json'));
assert(Array.isArray(airing.airing)&&airing.airing.length>12,'Airing schedule missing or too small');
assert(Array.isArray(airing.seasonal?.entries)&&airing.seasonal.entries.length>10,'Seasonal anime metadata missing');
for(const show of airing.airing.slice(0,20)){
 assert(/^(mal|al)-\d+$/.test(show.id),'Unstable airing anime ID');
 assert(Number.isInteger(show.episode)&&show.episode>=1,'Invalid airing episode');
 assert(Number.isInteger(show.airingAt)&&show.airingAt>1000000000,'Invalid airing timestamp');
}
assert(html.includes('airing-ui.js')&&html.includes('airing-ui.css'),'Airing UI not loaded');
assert(read('airing-ui.js').includes('airing-today')&&read('airing-ui.js').includes('airing-yesterday'),'Today and yesterday shelves are absent');
assert(read('airing-ui.js').includes('youtube-nocookie.com'),'Consent-based YouTube trailer panel missing');
assert(read('comunidad.html').includes('community.js'),'Community javascript missing');
assert(read('comunidad.html').includes('social-backend.js'),'Realtime backend adapter missing');
assert(read('community.js').includes('data-answer-friend'),'Mutual friend approval screen missing');
assert(read('episode-comments.js').includes('oneup-guest-name'),'Temporary names in guest episode comments missing');
assert(read('functions/index.js').includes('exports.respondFriendship'),'Friend request backend missing');
assert(read('functions/index.js').includes('exports.submitEpisodeComment'),'Guest comment backend missing');
assert(read('functions/index.js').includes('exports.moderateEpisodeComment'),'Episode moderation missing');
assert(sw.includes("'./airing-ui.js'")&&sw.includes("'./comunidad.html'"),'PWA cache lacks new interfaces');
assert(read('moderacion.html').includes('moderacion.js'),'Moderator console not linked');
assert(read('moderacion.js').includes('moderationDashboard'),'Moderation queue not loaded');
assert(read('functions/index.js').includes('exports.moderationDashboard'),'Moderation backend absent');
assert(read('functions/index.js').includes('exports.listMyFriendRequests'),'Mutual friendship inbox absent');
assert(read('functions/index.js').includes('exports.reviewVerification'),'Owner verification backend absent');
assert(read('functions/index.js').includes('exports.reviewReport'),'Report processing backend absent');
assert(read('social-backend.js').includes('requestFriend'),'Friend requests not connected');
assert(read('firebase.json').includes('firestore.rules'),'Firestore rules not configured');
assert(read('FIREBASE_COMUNIDAD_SETUP.md').includes('FIREBASE_SERVICE_ACCOUNT'),'Phone-only deployment docs incomplete');
const storageRules=read('storage.rules');
assert(storageRules.includes(String.raw`media\\.(jpg|png|webp|mp4)`),'Firebase Storage regex escaping regressed');
assert(storageRules.includes(String.raw`{8,90}\\.(jpg|png|webp)`),'Avatar upload extension regex must escape dot');
assert(html.includes('external-providers.js'),'Public anime pages provider script is not loaded');
assert(sw.includes("'./external-providers.js'"),'Offline cache missing authorized external links');
assert(read('community.js').includes("for(const badge of $('[data-avatar-file]'))"),'Multiple community avatars must use querySelectorAll');
assert(html.includes('external-providers.css'),'External catalog style not loaded');
assert(read('external-providers.js').includes('iqiyi_anime'),'iQIYI external platform missing');
assert(read('external-providers.js').includes('animeonline_castellano'),'Castellano external platform missing');
assert(read('sw.js').includes('external-providers.css'),'PWA has not cached external platform design');
const external=JSON.parse(read('data/external-providers.json'));
assert(external.external_catalogs.some(p=>p.id==='iqiyi_anime' && p.kind==='external_only'),'iQIYI must remain clearly external');
assert(external.external_catalogs.some(p=>p.id==='animeonline_castellano' && p.kind==='external_only'),'Castellano must remain external');
console.log('1UP smoke checks passed ('+checks+' assertions).');
