/* v0.6.0 — Private GitHub repository sync for cross-device data. */
(() => {
  const VERSION = "0.6.0";
  const CONFIG_KEY = "wowCharacterPlanner.githubSync.v1";
  const TOKEN_LOCAL_KEY = "wowCharacterPlanner.githubToken.local";
  const TOKEN_SESSION_KEY = "wowCharacterPlanner.githubToken.session";
  const TOMBSTONE_KEY = "wowCharacterPlanner.githubTombstones.v1";
  const MEDIA_META_KEY = "wowCharacterPlanner.githubMediaMeta.v1";

  let applyingSync = false;
  let config = {repo:"domxx1/wow-character-planner-data", branch:"main", dataPath:"data/characters.json"};
  try { config = {...config, ...JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}")}; } catch {}

  function readJson(key, fallback) {
    try { const value = JSON.parse(localStorage.getItem(key) || "null"); return value ?? fallback; } catch { return fallback; }
  }
  let tombstones = readJson(TOMBSTONE_KEY, []);
  let mediaMeta = readJson(MEDIA_META_KEY, {});

  function saveAux() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    localStorage.setItem(TOMBSTONE_KEY, JSON.stringify(tombstones));
    localStorage.setItem(MEDIA_META_KEY, JSON.stringify(mediaMeta));
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_SESSION_KEY) || localStorage.getItem(TOKEN_LOCAL_KEY) || "";
  }
  function setToken(token, remember) {
    sessionStorage.removeItem(TOKEN_SESSION_KEY);
    localStorage.removeItem(TOKEN_LOCAL_KEY);
    if (!token) return;
    (remember ? localStorage : sessionStorage).setItem(remember ? TOKEN_LOCAL_KEY : TOKEN_SESSION_KEY, token);
  }

  function setStatus(text, state="") {
    const el = document.querySelector("#v6GithubStatus");
    if (!el) return;
    el.textContent = text;
    el.dataset.state = state;
  }

  function validRepo(value) { return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(String(value||"").trim()); }
  function apiBase() { return `https://api.github.com/repos/${config.repo}`; }
  function apiHeaders() {
    const token = getToken();
    return {
      "Accept":"application/vnd.github+json",
      "Authorization":`Bearer ${token}`,
      "X-GitHub-Api-Version":"2022-11-28",
      "Content-Type":"application/json"
    };
  }
  function encodePath(path) { return String(path).split("/").map(encodeURIComponent).join("/"); }

  async function ghRequest(url, options={}) {
    if (!getToken()) throw new Error("GitHub-Token fehlt.");
    const response = await fetch(url, {...options, headers:{...apiHeaders(), ...(options.headers||{})}, cache:"no-store"});
    if (response.status === 404) return {notFound:true, response};
    let body = null;
    try { body = await response.json(); } catch {}
    if (!response.ok) throw new Error(body?.message || `GitHub API: HTTP ${response.status}`);
    return body;
  }

  function bytesToBase64(bytes) {
    let binary="";
    const step=0x8000;
    for(let i=0;i<bytes.length;i+=step) binary += String.fromCharCode(...bytes.subarray(i, i+step));
    return btoa(binary);
  }
  function base64ToBytes(base64) {
    const binary=atob(String(base64||"").replace(/\s/g,""));
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return bytes;
  }
  function textToBase64(text) { return bytesToBase64(new TextEncoder().encode(text)); }
  function base64ToText(base64) { return new TextDecoder().decode(base64ToBytes(base64)); }

  async function getRepo() {
    const result = await ghRequest(apiBase());
    if (result?.notFound) throw new Error("Repository nicht gefunden oder Token hat keinen Zugriff.");
    return result;
  }
  async function getFile(path) {
    const url = `${apiBase()}/contents/${encodePath(path)}?ref=${encodeURIComponent(config.branch)}`;
    const result = await ghRequest(url);
    if (result?.notFound) return null;
    if (Array.isArray(result)) throw new Error(`${path} ist ein Ordner.`);
    return result;
  }
  async function putFile(path, contentBase64, message, sha="") {
    const url = `${apiBase()}/contents/${encodePath(path)}`;
    const payload = {message, content:contentBase64, branch:config.branch};
    if (sha) payload.sha = sha;
    return ghRequest(url,{method:"PUT",body:JSON.stringify(payload)});
  }

  function nowIso() { return new Date().toISOString(); }
  function charSignature(c) {
    const copy={};
    Object.keys(c||{}).sort().forEach(k=>{
      if (["updatedAt","avatarSha","avatarPath","avatarMime"].includes(k)) return;
      const v=c[k];
      if (k==="avatarUrl" && /^data:image\//i.test(String(v||""))) copy[k]=`${String(v).slice(0,64)}|${String(v).length}`;
      else copy[k]=v;
    });
    return JSON.stringify(copy);
  }
  function restoreMediaMeta() {
    characters.forEach(c=>{
      const m=mediaMeta[c.id]; if(!m) return;
      if(!c.avatarPath && m.avatarPath) c.avatarPath=m.avatarPath;
      if(!c.avatarMime && m.avatarMime) c.avatarMime=m.avatarMime;
      if(!c.avatarSha && m.avatarSha) c.avatarSha=m.avatarSha;
    });
  }
  restoreMediaMeta();

  let signatures = new Map(characters.filter(c=>c.id).map(c=>[c.id,charSignature(c)]));
  const previousSaveCharacters = saveCharacters;
  saveCharacters = function() {
    if (!applyingSync) {
      const now=nowIso();
      const currentIds=new Set();
      characters.forEach(c=>{
        if(!c.id) c.id=uid();
        currentIds.add(c.id);
        const sig=charSignature(c), old=signatures.get(c.id);
        if(!c.updatedAt || (old !== undefined && old !== sig)) c.updatedAt=now;
        signatures.set(c.id, charSignature(c));
        if(c.avatarPath||c.avatarSha||c.avatarMime) mediaMeta[c.id]={avatarPath:c.avatarPath||"",avatarSha:c.avatarSha||"",avatarMime:c.avatarMime||""};
      });
      [...signatures.keys()].forEach(id=>{
        if(currentIds.has(id)) return;
        const existing=tombstones.find(t=>t.id===id);
        if(existing) existing.deletedAt=now; else tombstones.push({id,deletedAt:now});
        signatures.delete(id);
        delete mediaMeta[id];
      });
      saveAux();
    }
    previousSaveCharacters();
  };

  function parseDataImage(url) {
    const m=String(url||"").match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
    if(!m) return null;
    const mime=m[1].toLowerCase().replace("jpeg","jpg");
    const ext=mime.includes("png")?"png":mime.includes("webp")?"webp":"jpg";
    return {mime:m[1], ext, base64:m[2].replace(/\s/g,"")};
  }
  function safeId(value) { return String(value||uid()).replace(/[^A-Za-z0-9_.-]/g,"_"); }

  async function uploadAvatar(c) {
    const img=parseDataImage(c.avatarUrl);
    if(!img) return {...c};
    const path=`images/${safeId(c.id)}.${img.ext}`;
    let sha=c.avatarPath===path ? (c.avatarSha||"") : "";
    if(!sha) { const old=await getFile(path); sha=old?.sha||""; }
    const result=await putFile(path,img.base64,`Sync portrait: ${c.name||c.id}`,sha);
    const newSha=result?.content?.sha||sha;
    c.avatarPath=path; c.avatarMime=img.mime; c.avatarSha=newSha;
    mediaMeta[c.id]={avatarPath:path,avatarMime:img.mime,avatarSha:newSha};
    return {...c,avatarUrl:"",avatarPath:path,avatarMime:img.mime,avatarSha:newSha};
  }

  async function prepareCloudCharacters() {
    const out=[];
    for(const c of characters) out.push(await uploadAvatar(c));
    saveAux();
    return out;
  }

  async function hydrateCloudCharacters(list) {
    const localById=new Map(characters.map(c=>[c.id,c]));
    const out=[];
    for(const raw of list||[]) {
      const c={...raw};
      if(c.avatarPath) {
        const local=localById.get(c.id);
        if(local?.avatarUrl && /^data:image\//i.test(local.avatarUrl) && local.avatarSha && local.avatarSha===c.avatarSha) c.avatarUrl=local.avatarUrl;
        else {
          const file=await getFile(c.avatarPath);
          if(file?.content) c.avatarUrl=`data:${c.avatarMime||"image/png"};base64,${String(file.content).replace(/\s/g,"")}`;
        }
        mediaMeta[c.id]={avatarPath:c.avatarPath,avatarMime:c.avatarMime||"image/png",avatarSha:c.avatarSha||""};
      }
      out.push(c);
    }
    saveAux();
    return out;
  }

  async function readCloudPayload() {
    const file=await getFile(config.dataPath);
    if(!file) return {file:null,payload:{version:1,characters:[],tombstones:[]}};
    const payload=JSON.parse(base64ToText(file.content));
    if(!Array.isArray(payload.characters)) payload.characters=[];
    if(!Array.isArray(payload.tombstones)) payload.tombstones=[];
    return {file,payload};
  }

  async function writeCloudPayload(existingFile=null, sourceCharacters=null, sourceTombstones=null) {
    const cloudChars=sourceCharacters || await prepareCloudCharacters();
    const payload={version:1,updatedAt:nowIso(),characters:cloudChars,tombstones:sourceTombstones||tombstones};
    const content=textToBase64(JSON.stringify(payload,null,2));
    return putFile(config.dataPath,content,`Sync WoW character planner ${new Date().toLocaleString("de-DE")}`,existingFile?.sha||"");
  }

  function newer(a,b) { return new Date(a||0).getTime() > new Date(b||0).getTime(); }
  function mergePayloads(remote) {
    const localChars=new Map(characters.map(c=>[c.id,c]));
    const remoteChars=new Map((remote.characters||[]).map(c=>[c.id,c]));
    const localDel=new Map(tombstones.map(t=>[t.id,t]));
    const remoteDel=new Map((remote.tombstones||[]).map(t=>[t.id,t]));
    const ids=new Set([...localChars.keys(),...remoteChars.keys(),...localDel.keys(),...remoteDel.keys()]);
    const merged=[], mergedDel=[];
    ids.forEach(id=>{
      const lc=localChars.get(id), rc=remoteChars.get(id), ld=localDel.get(id), rd=remoteDel.get(id);
      const bestDel = !ld ? rd : !rd ? ld : newer(ld.deletedAt,rd.deletedAt)?ld:rd;
      const bestChar = !lc ? rc : !rc ? lc : newer(lc.updatedAt,rc.updatedAt)?lc:rc;
      if(bestDel && (!bestChar || newer(bestDel.deletedAt,bestChar.updatedAt))) mergedDel.push(bestDel);
      else if(bestChar) merged.push(bestChar);
    });
    return {characters:merged,tombstones:mergedDel};
  }

  async function applyCharacters(list,newTombstones=[]) {
    applyingSync=true;
    try {
      characters=await hydrateCloudCharacters(list);
      tombstones=newTombstones;
      signatures=new Map(characters.filter(c=>c.id).map(c=>[c.id,charSignature(c)]));
      saveAux();
      previousSaveCharacters();
      renderAll();
    } finally { applyingSync=false; }
  }

  function saveConfigFromUi() {
    const repo=document.querySelector("#v6Repo")?.value.trim()||"";
    if(!validRepo(repo)) throw new Error("Repository muss im Format Benutzer/Repository angegeben werden.");
    config.repo=repo;
    config.branch=document.querySelector("#v6Branch")?.value.trim()||"main";
    config.dataPath=document.querySelector("#v6DataPath")?.value.trim()||"data/characters.json";
    const token=document.querySelector("#v6Token")?.value.trim()||getToken();
    const remember=!!document.querySelector("#v6Remember")?.checked;
    if(token) setToken(token,remember);
    saveAux();
    if(document.querySelector("#v6Token")) document.querySelector("#v6Token").value="";
  }

  async function testConnection() {
    saveConfigFromUi();
    setStatus("Verbindung wird geprüft …","working");
    const repo=await getRepo();
    setStatus(`Verbunden mit ${repo.full_name}. ${repo.private?"Privates Repository":"Achtung: Repository ist öffentlich!"}`,repo.private?"ok":"warning");
  }
  async function pullFromCloud() {
    saveConfigFromUi();
    setStatus("Cloud-Daten werden geladen …","working");
    const {payload}=await readCloudPayload();
    await applyCharacters(payload.characters,payload.tombstones||[]);
    setStatus(`${characters.length} Datensätze von GitHub geladen.`,"ok");
    toast("Cloud-Daten geladen");
  }
  async function pushToCloud() {
    saveConfigFromUi();
    setStatus("Daten und Bilder werden hochgeladen …","working");
    const {file}=await readCloudPayload();
    await writeCloudPayload(file);
    applyingSync=true; try { previousSaveCharacters(); } finally { applyingSync=false; }
    setStatus(`${characters.length} Datensätze auf GitHub gespeichert.`,"ok");
    toast("Cloud-Daten gespeichert");
  }
  async function syncBoth() {
    saveConfigFromUi();
    setStatus("Geräte werden synchronisiert …","working");
    const {file,payload}=await readCloudPayload();
    const merged=mergePayloads(payload);
    const hydrated=await hydrateCloudCharacters(merged.characters);
    applyingSync=true;
    try {
      characters=hydrated;
      tombstones=merged.tombstones;
      signatures=new Map(characters.filter(c=>c.id).map(c=>[c.id,charSignature(c)]));
      saveAux();
      previousSaveCharacters();
      renderAll();
    } finally { applyingSync=false; }
    const cloudChars=await prepareCloudCharacters();
    await writeCloudPayload(file,cloudChars,tombstones);
    setStatus(`${characters.length} Datensätze synchronisiert.`,"ok");
    toast("Synchronisierung abgeschlossen");
  }

  document.querySelector("#v6CloudSync")?.remove();
  const grid=document.querySelector("#settings .settings-grid");
  if(grid && !document.querySelector("#v6GithubSync")) {
    const panel=document.createElement("article");
    panel.id="v6GithubSync";
    panel.className="panel";
    panel.innerHTML=`
      <div class="panel-head"><div><div class="eyebrow">CLOUD SYNC</div><h3>Privates GitHub-Repository</h3></div></div>
      <p class="muted">Synchronisiert Charaktere und lokale Portraits über ein separates privates Repository. Der Token wird niemals in das App-Repository geschrieben.</p>
      <div class="form-grid">
        <label class="field field-full"><span>Daten-Repository</span><input id="v6Repo" autocomplete="off" placeholder="domxx1/wow-character-planner-data"></label>
        <label class="field"><span>Branch</span><input id="v6Branch" autocomplete="off" value="main"></label>
        <label class="field"><span>Datendatei</span><input id="v6DataPath" autocomplete="off" value="data/characters.json"></label>
        <label class="field field-full"><span>Fine-grained GitHub Token</span><input id="v6Token" type="password" autocomplete="off" placeholder="github_pat_…"></label>
        <label class="field field-full"><span><input id="v6Remember" type="checkbox"> Token auf diesem Gerät merken</span></label>
      </div>
      <div class="v6-actions">
        <button id="v6Test" type="button" class="btn btn-secondary">Verbindung testen</button>
        <button id="v6Pull" type="button" class="btn btn-ghost">Cloud → Gerät</button>
        <button id="v6Push" type="button" class="btn btn-ghost">Gerät → Cloud</button>
        <button id="v6Sync" type="button" class="btn btn-primary">Jetzt synchronisieren</button>
        <button id="v6Forget" type="button" class="btn btn-ghost">Token entfernen</button>
      </div>
      <div id="v6GithubStatus" class="muted">Noch nicht verbunden.</div>
    `;
    grid.insertAdjacentElement("afterbegin",panel);
    document.querySelector("#v6Repo").value=config.repo;
    document.querySelector("#v6Branch").value=config.branch;
    document.querySelector("#v6DataPath").value=config.dataPath;
    document.querySelector("#v6Remember").checked=!!localStorage.getItem(TOKEN_LOCAL_KEY);

    const run=fn=>async()=>{try{await fn();}catch(err){setStatus(err.message||String(err),"error");toast("Synchronisierung fehlgeschlagen");}};
    document.querySelector("#v6Test").addEventListener("click",run(testConnection));
    document.querySelector("#v6Pull").addEventListener("click",run(pullFromCloud));
    document.querySelector("#v6Push").addEventListener("click",run(pushToCloud));
    document.querySelector("#v6Sync").addEventListener("click",run(syncBoth));
    document.querySelector("#v6Forget").addEventListener("click",()=>{
      sessionStorage.removeItem(TOKEN_SESSION_KEY); localStorage.removeItem(TOKEN_LOCAL_KEY);
      document.querySelector("#v6Remember").checked=false;
      setStatus("Token auf diesem Gerät entfernt.");
    });
  }

  const style=document.createElement("style");
  style.textContent=`
    .v6-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 10px}
    #v6GithubStatus[data-state="ok"]{color:#86d49a}#v6GithubStatus[data-state="warning"]{color:#e3bd62}#v6GithubStatus[data-state="error"]{color:#e27a7a}
    #v6GithubStatus[data-state="working"]{color:var(--text)}
  `;
  document.head.appendChild(style);

  const brandSub=document.querySelector(".brand-sub");
  if(brandSub) brandSub.textContent=`WoW Retail · 12.1 · ${VERSION}`;
})();
