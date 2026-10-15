/* ONE UP service worker V4: independent offline-first shell.
   Browser requests for external anime services are never intercepted or mirrored. */
const CACHE='oneup-anime-synopsis-v7-20261015';
const SHELL=['./','./index.html','./studio.css','./studio.js','./spotlight.css','./motion.css','./motion.js','./auth.js','./auth-config.js','./sonic.js','./manifest.webmanifest','./assets/oneup-mascot.svg','./assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
 if(u.origin!==self.location.origin || !u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(e.request.mode==='navigate'){
  e.respondWith(fetch(e.request).then(r=>{
    if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))}
    return r
   }).catch(()=>caches.match('./index.html')));
  return;
 }
 e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request)));
});