const CACHE='birdkas-v1-2';
const FILES=['./','./index.html','./styles.css','./js/app.js','./js/api.js','./js/model.js','./manifest.json','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(
 caches.open(CACHE).then(cache=>cache.addAll(FILES.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
 caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('birdkas-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
 // Only static, same-origin GET assets. Never store sessions, POSTs or Drive photos.
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(new Request(event.request,{cache:'no-cache'})).then(response=>{
  if(response.ok)event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,response.clone())));
  return response;
 }).catch(()=>caches.match(event.request).then(response=>response||Response.error())));
});
