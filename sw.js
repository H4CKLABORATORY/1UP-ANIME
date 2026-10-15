/* ONE UP - mobile PWA offline-first shell, update-aware.
   External providers and video URLs are NEVER mirrored by this worker. */
const CACHE='oneup-es-brand-v10-20261015';
const SHELL=[
 './','./index.html','./studio.css','./studio.js','./spotlight.css',
 './motion.css','./motion.js','./brand-v2.css','./player.css','./auth.js',
 './auth-config.js','./manifest.webmanifest','./assets/oneup-crest.svg',
 './assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png',
 './data/catalog.json','./data/translations-es.json','./data/licensed-media.json'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 const scope=new URL(self.registration.scope);
 if(url.origin!==scope.origin || !url.pathname.startsWith(scope.pathname))return;
 const offline=()=>caches.match(event.request).then(hit=>hit || (event.request.mode==='navigate'?caches.match('./index.html'):Response.error()));
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{
   if(response.ok)caches.open(CACHE).then(cache=>cache.put('./index.html',response.clone())).catch(()=>{});
   return response;
  }).catch(offline));
  return;
 }
 // Network-first for site code, styling, manifest and localized metadata.
 // Browser cache can otherwise display an outdated English UI after PWA upgrades.
 if(/\.(?:js|css|svg|webmanifest)$/.test(url.pathname) ||
    /\/data\/(?:catalog|translations-es|licensed-media)\.json$/.test(url.pathname)){
  event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{
   if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())).catch(()=>{});
   return response;
  }).catch(offline));
  return;
 }
 event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
