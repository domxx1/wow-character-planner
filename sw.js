const CACHE="wow-charplan-v9";
const ASSETS=[
  "./","./index.html","./app.css","./app.js","./patch-v2.js","./patch-v2-1.js","./patch-v3.js","./patch-v3-1.js","./patch-v4.js","./patch-v4-1.js","./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"
];
self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
});
self.addEventListener("activate",e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  const url=new URL(e.request.url);
  if(url.pathname.endsWith("/app.js")){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const urls=["./app.js","./patch-v2.js","./patch-v2-1.js","./patch-v3.js","./patch-v3-1.js","./patch-v4.js","./patch-v4-1.js"].map(p=>new URL(p,self.location.href).href);
      const responses=[];
      for(const u of urls){let r=await c.match(u);if(!r)r=await fetch(u);responses.push(r);}
      if(responses.every(Boolean)){
        const parts=[];for(const r of responses)parts.push(await r.text());
        return new Response(parts.join("\n\n"),{headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-cache"}});
      }
      return fetch(e.request);
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>{
    const network=fetch(e.request).then(response=>{
      if(response&&response.status===200){const copy=response.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}
      return response;
    }).catch(()=>cached);
    return cached||network;
  }));
});
