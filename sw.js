const CACHE="wow-charplan-v4";
const ASSETS=[
  "./","./index.html","./app.css","./app.js","./patch-v2.js","./manifest.webmanifest",
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
      const baseUrl=new URL("./app.js",self.location.href).href;
      const patchUrl=new URL("./patch-v2.js",self.location.href).href;
      let base=await c.match(baseUrl), patch=await c.match(patchUrl);
      if(!base) base=await fetch(baseUrl);
      if(!patch) patch=await fetch(patchUrl);
      if(base&&patch){
        const body=(await base.text())+"\n\n"+(await patch.text());
        return new Response(body,{headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-cache"}});
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
