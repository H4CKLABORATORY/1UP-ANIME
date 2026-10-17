/* ONE UP - mobile PWA offline-first shell, update-aware.
   External providers and video URLs are NEVER mirrored by this worker. */
// CacheStorage is origin-wide: GitHub Pages apps on the same domain share it.
// Restrict cleanup to caches that belong to this 1UP Anime service worker.
const CACHE_PREFIX='oneup-stream-integrated-';
const CACHE=CACHE_PREFIX+'v23-cinematic-opening-20261016';
const SHELL=[
 './','./index.html','./studio.css','./studio.js','./spotlight.css',
 './motion.css','./motion.js','./brand-v2.css','./player.css','./auth.js',
 './auth-config.js','./manifest.webmanifest','./assets/oneup-crest.svg',
 './assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png',
 './assets/1up-anime-logo-poster.jpg','./assets/1up-anime-app-icon-512.png',
 './data/catalog.json','./data/translations-es.json','./data/licensed-media.json',
 './data/airing.json','./airing-ui.js','./airing-ui.css','./comunidad.html',
 './community.js','./community.css','./social-backend.js','./social-config.js',
 './hls-adapter.js','./episode-player.js','./supabase-config.js','./supabase-episode-backend.js','./episode-comments.js','./episode-comments.css',
 './themes/kokomi-studio/theme.css','./themes/kokomi-studio/theme.js',
 './themes/kokomi-mobile-preview/theme.css','./themes/kokomi-mobile-preview/theme.js',
 './themes/kokomi-mobile-preview/opening.css','./themes/kokomi-mobile-preview/opening.js',
 './themes/kokomi-mobile-preview/pages.css','./themes/kokomi-mobile-preview/pages.js',
 './themes/kokomi-mobile-preview/watch-comments.css','./themes/kokomi-mobile-preview/watch-comments.js',
 './themes/october-2026/theme.css','./themes/october-2026/theme.js',
 './themes/october-2026/arcane-seal.svg','./preview-kokomi.html','./external-providers.js','./data/external-providers.json','./external-providers.css','./motor.html','./motor.js','./motor.css',
 './moderacion.html','./moderacion.js','./moderacion.css',
 './data/dexter/status.json','./data/dexter/history.json','./data/guard/status.json',
 './gremio.html','./data/guild-license.json'
];
self.addEventListener('install',event=>{
 // Core shell is required; optional assets must not block an otherwise healthy update.
 const core=['./index.html','./studio.css','./studio.js'];
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  await cache.addAll(core);
  const optional=SHELL.filter(item=>!core.includes(item));
  const results=await Promise.allSettled(optional.map(file=>cache.add(file)));
  const failed=results.filter(item=>item.status==='rejected').length;
  if(failed)console.warn('ONEUP PWA: '+failed+' optional assets were not cached.');
 }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 const scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin || !url.pathname.startsWith(scope.pathname))return;
 const offline=()=>caches.open(CACHE).then(async cache=>(await cache.match(event.request)) || (event.request.mode==='navigate'?await cache.match('./index.html'):Response.error()));
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{
   if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())).catch(()=>{});
   return response;
  }).catch(offline));
  return;
 }
 // Network-first for site code, styling, manifest and localized metadata.
 // Browser cache can otherwise display an outdated English UI after PWA upgrades.
 if(/\.(?:js|css|svg|webmanifest)$/.test(url.pathname) ||
    /\/data\/(?:catalog|translations-es|licensed-media|airing|external-providers|guild-license)\.json$/.test(url.pathname) ||
    /\/data\/(?:guard|dexter)\/(?:status|history)\.json$/.test(url.pathname)){
  event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{
   if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())).catch(()=>{});
   return response;
  }).catch(offline));
  return;
 }
 event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request)).then(hit=>hit||fetch(event.request)));
});
