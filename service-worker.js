const CACHE='birdkas-static-v4';
const ASSETS=['./','./index.html','./styles.css','./js/app.js','./js/store.js','./js/data.js','./js/attachments.js','./js/sale-payment.js','./manifest.json','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/bird-1.svg','./assets/bird-2.svg','./assets/bird-3.svg'];
const allowed=new Set(ASSETS.map(p=>new URL(p,self.registration.scope).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('birdkas-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!allowed.has(e.request.url))return;e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request)))});
