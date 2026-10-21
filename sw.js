/* SPIDER — app shell. Network first, so a new version is always picked up; the cache is only a fallback when offline. */
const V="spider-v16";
const SHELL=["./","./index.html","./boot.js","./app.js","./ui.css","./games.css","./js/domino_engine.js","./js/minigames.js","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./favicon-32.png"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).catch(()=>{}))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin)return;
  e.respondWith(fetch(r).then(res=>{if(res&&res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp)).catch(()=>{})}return res})
    .catch(()=>caches.match(r).then(m=>m||(r.mode==="navigate"?caches.match("./index.html"):undefined))));
});
