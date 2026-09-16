/* v0.7.1 — Preserve private Blizzard image archive metadata after media refreshes. */
(() => {
  const VERSION = "0.7.1";
  const CONFIG_KEY = "wowCharacterPlanner.githubSync.v1";
  const TOKEN_LOCAL_KEY = "wowCharacterPlanner.githubToken.local";
  const TOKEN_SESSION_KEY = "wowCharacterPlanner.githubToken.session";
  const STATUS_PATH = "data/blizzard-media-status.json";
  let timer = 0;
  let lastRequestId = "";

  function getToken() {
    return sessionStorage.getItem(TOKEN_SESSION_KEY) || localStorage.getItem(TOKEN_LOCAL_KEY) || "";
  }
  function getConfig() {
    try {
      return {repo:"domxx1/wow-character-planner-data",branch:"main",...JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}")};
    } catch {
      return {repo:"domxx1/wow-character-planner-data",branch:"main"};
    }
  }
  function base64ToText(base64) {
    const binary=atob(String(base64||"").replace(/\s/g,""));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  async function readStatus() {
    const token=getToken();
    if(!token) return null;
    const config=getConfig();
    const path=STATUS_PATH.split("/").map(encodeURIComponent).join("/");
    const response=await fetch(`https://api.github.com/repos/${config.repo}/contents/${path}?ref=${encodeURIComponent(config.branch||"main")}`,{
      cache:"no-store",
      headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`,"X-GitHub-Api-Version":"2022-11-28"}
    });
    if(!response.ok) return null;
    const file=await response.json();
    return JSON.parse(base64ToText(file.content));
  }
  async function preserveMetadata() {
    try {
      const status=await readStatus();
      if(!status?.requestId || status.requestId===lastRequestId || !Array.isArray(status.results)) return;
      lastRequestId=status.requestId;
      let changed=false;
      status.results.forEach(result=>{
        const c=characters.find(item=>String(item.id)===String(result.id));
        if(!c) return;
        if(result.avatarPath && c.avatarPath!==result.avatarPath){c.avatarPath=result.avatarPath;changed=true;}
        if(result.avatarMime && c.avatarMime!==result.avatarMime){c.avatarMime=result.avatarMime;changed=true;}
        if(result.avatarSha && c.avatarSha!==result.avatarSha){c.avatarSha=result.avatarSha;changed=true;}
      });
      if(changed) saveCharacters();
    } catch {}
  }
  function schedulePreserve() {
    clearTimeout(timer);
    timer=setTimeout(preserveMetadata,450);
  }
  function observeStatus(id) {
    const el=document.querySelector(id);
    if(!el) return;
    const observer=new MutationObserver(()=>{
      if(/aktualisiert|fehlgeschlagen|übersprungen/i.test(el.textContent||"")) schedulePreserve();
    });
    observer.observe(el,{childList:true,characterData:true,subtree:true});
  }
  observeStatus("#v70SingleStatus");
  observeStatus("#v70MediaStatus");

  const brandSub=document.querySelector(".brand-sub");
  if(brandSub) brandSub.textContent=`WoW Retail · 12.1 · ${VERSION}`;
})();
