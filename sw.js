const CACHE="wow-charplan-v2";
const ASSETS=[
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];
self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener("activate",e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      const network=fetch(e.request).then(response=>{
        if(response && response.status===200){
          const copy=response.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached || network;
    })
  );
});
