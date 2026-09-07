const CACHE="bookshelf-v16.0";
const STATIC=["./index.html","./reading-sessions.js?v=15.8","./reading-sessions.css?v=15.8","./worldbuilding.js?v=15.8.2","./worldbuilding.css?v=15.8.2","./character-network-layout.js?v=15.9.3","./character-network.js?v=15.9.3","./character-network.css?v=15.9.3","./world-timeline-core.js?v=16.0","./world-timeline.js?v=16.0","./world-timeline.css?v=16.0","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("bookshelf-v")&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener("fetch",event=>{
  const req=event.request;if(req.method!=="GET")return;
  const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  if(req.mode==="navigate"){event.respondWith(fetch(req,{cache:"no-store"}).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put("./index.html",copy)).catch(()=>{})}return res}).catch(()=>caches.match("./index.html")));return}
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{})}return res})));
});
