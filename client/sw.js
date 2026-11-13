/* ONE UP - mobile PWA offline-first shell, update-aware.
   External providers and video URLs are NEVER mirrored by this worker. */
// CacheStorage is origin-wide: GitHub Pages apps on the same domain share it.
// Restrict cleanup to caches that belong to this 1UP Anime service worker.
const CACHE_PREFIX='oneup-stream-integrated-';
const CACHE=CACHE_PREFIX+'v39-motion-v2-camera-20261020';
const SHELL=[
 './','./index.html','./src/styles/studio.css','./src/js/studio.js','./src/js/anime-title-search.js','./src/js/premiere-ranking.js','./src/js/premiere-hero.js','./src/styles/premiere-hero.css','./src/styles/spotlight.css',
 './pages/dexter-motion-studio.html','./motion-studio/scene.mjs','./motion-studio/camera.mjs','./motion-studio/renderer.mjs','./motion-studio/app.mjs','./motion-studio/studio.css',
 './src/js/dexter-motion-engine.js','./src/styles/dexter-motion-engine.css','./src/js/franchise-explorer.mjs','./src/styles/franchise-explorer.css','./src/styles/oneup-finale.css','./src/js/oneup-finale.js','./src/styles/ui-quality.css','./assets/oneup-crest-mark.svg','./src/styles/motion.css','./src/js/motion.js','./src/js/subtitle-studio.js','./src/styles/subtitle-studio.css','./src/js/official-watch.js','./src/styles/official-watch.css','./src/styles/brand-v2.css','./src/styles/player.css','./src/js/auth.js',
 './src/js/auth-config.js','./manifest.webmanifest','./assets/oneup-crest.svg',
 './assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png',
 './assets/1up-anime-logo-poster.jpg','./assets/1up-anime-app-icon-512.png',
 './assets/oneup-header-letters.png','./assets/oneup-poster-portrait.png',
 './data/catalog.json','./data/translations-es.json','./data/licensed-media.json',
 './data/anime1v-config.json','./src/js/anime1v-discovery.js','./src/styles/anime1v-discovery.css',
 './data/airing.json','./src/js/airing-ui.js','./src/styles/airing-ui.css','./pages/comunidad.html',
 './src/js/community.js','./src/styles/community.css','./src/js/social-backend.js','./src/js/social-config.js',
 './src/js/hls-adapter.js','./src/js/episode-player.js','./src/js/supabase-config.js','./src/js/supabase-episode-backend.js','./src/js/episode-comments.js','./src/styles/episode-comments.css',
 './themes/kokomi-studio/theme.css','./themes/kokomi-studio/theme.js',
 './themes/kokomi-mobile-preview/theme.css','./themes/kokomi-mobile-preview/theme.js',
 './themes/kokomi-mobile-preview/opening.css','./themes/kokomi-mobile-preview/opening.js',
 './themes/cinematic-v3/production.css','./themes/cinematic-v3/studio.js','./themes/cinematic-v3/opening-controller.js',
 './themes/kokomi-mobile-preview/official-textmark.css',
 './themes/kokomi-mobile-preview/pages.css','./themes/kokomi-mobile-preview/pages.js',
 './themes/kokomi-mobile-preview/watch-comments.css','./themes/kokomi-mobile-preview/watch-comments.js',
 './themes/october-2026/theme.css','./themes/october-2026/theme.js',
 './themes/oneup-palette/selector.css','./themes/oneup-palette/selector.js',
 './themes/oneup-motion/windows.css','./themes/oneup-motion/windows.js',
 './themes/october-2026/arcane-seal.svg','./pages/preview-kokomi.html','./src/js/external-providers.js','./data/external-providers.json','./src/styles/external-providers.css','./pages/motor.html','./src/js/motor.js','./src/styles/motor.css',
 './pages/moderacion.html','./src/js/moderacion.js','./src/styles/moderacion.css',
 './data/dexter/status.json','./data/dexter/history.json','./data/guard/status.json',
 './pages/gremio.html','./data/guild-license.json'
];
self.addEventListener('install',event=>{
 // Core shell is required; optional assets must not block an otherwise healthy update.
 const core=['./index.html','./src/styles/studio.css','./src/js/studio.js'];
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
 if(/\.(?:mjs|js|css|svg|webmanifest)$/.test(url.pathname) ||
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
