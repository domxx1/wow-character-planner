const CACHE="wow-charplan-v27";
const ASSETS=[
  "./","./index.html","./app.css","./bundle.js","./version.json","./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"
];

self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(async c=>{
    for(const asset of ASSETS){
      try{
        const response=await fetch(asset,{cache:"reload"});
        if(response&&response.status===200) await c.put(asset,response.clone());
      }catch{}
    }
  }));
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
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin) return;

  e.respondWith((async()=>{
    try{
      const fresh=await fetch(e.request,{cache:"no-store"});
      if(fresh&&fresh.status===200){
        const copy=fresh.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy));
      }
      return fresh;
    }catch{
      const cached=await caches.match(e.request,{ignoreSearch:true});
      if(cached) return cached;
      if(e.request.mode==="navigate") return (await caches.match("./index.html")) || Response.error();
      return Response.error();
    }
  })());
});
