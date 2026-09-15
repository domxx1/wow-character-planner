const CACHE="wow-charplan-v12";
const ASSETS=[
  "./","./index.html","./app.css","./app.js","./patch-v2.js","./patch-v2-1.js","./patch-v3.js","./patch-v3-1.js","./patch-v4.js","./patch-v4-1.js","./patch-v5.js","./patch-v6.js","./manifest.webmanifest",
  "./icons/icon-192.png","./icons/icon-512.png","./icons/apple-touch-icon.png"
];

self.addEventListener("install",e=>{
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(async c=>{
    for(const asset of ASSETS){
      const response=await fetch(asset,{cache:"reload"});
      if(response&&response.status===200) await c.put(asset,response.clone());
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

  if(url.pathname.endsWith("/app.js")){
    e.respondWith(caches.open(CACHE).then(async c=>{
      const urls=["./app.js","./patch-v2.js","./patch-v2-1.js","./patch-v3.js","./patch-v3-1.js","./patch-v4.js","./patch-v4-1.js","./patch-v5.js","./patch-v6.js"]
        .map(p=>new URL(p,self.location.href).href);
      const responses=[];
      for(const u of urls){
        let r=null;
        try{
          const fresh=await fetch(u,{cache:"no-store"});
          if(fresh&&fresh.status===200){
            await c.put(u,fresh.clone());
            r=fresh;
          }
        }catch{}
        if(!r) r=await c.match(u);
        responses.push(r);
      }
      if(responses.every(Boolean)){
        const parts=[];
        for(const r of responses) parts.push(await r.text());
        return new Response(parts.join("\n\n"),{
          headers:{"Content-Type":"application/javascript; charset=utf-8","Cache-Control":"no-store"}
        });
      }
      return fetch(e.request,{cache:"no-store"});
    }));
    return;
  }

  e.respondWith((async()=>{
    try{
      const fresh=await fetch(e.request,{cache:"no-store"});
      if(fresh&&fresh.status===200){
        const copy=fresh.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy));
      }
      return fresh;
    }catch{
      return (await caches.match(e.request)) || Response.error();
    }
  })());
});
