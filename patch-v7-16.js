/* v0.7.16 — Retail/Forever parity and strict mode isolation. */
(() => {
  const VERSION = "0.7.16";
  const MODE_KEY = "wowCharacterPlanner.gameMode.v1";
  const LEGACY_CHARACTER_KEY = "wowCharacterPlanner.characters.v1";
  const MODE_CHARACTER_KEYS = {
    retail: "wowCharacterPlanner.retail.characters.v1",
    forever: "wowCharacterPlanner.forever.characters.v1"
  };
  const MODE_TOMBSTONE_KEYS = {
    retail: "wowCharacterPlanner.retail.tombstones.v1",
    forever: "wowCharacterPlanner.forever.tombstones.v1"
  };
  const REMIX_KEYS = {
    retail: "wowCharacterPlanner.retail.remix.v1",
    forever: "wowCharacterPlanner.forever.remix.v1"
  };
  const MEDIA_TYPE_SHARED_KEY = "wowCharacterPlanner.blizzardMediaType.v1";
  const MEDIA_TYPE_KEYS = {
    retail: "wowCharacterPlanner.retail.blizzardMediaType.v1",
    forever: "wowCharacterPlanner.forever.blizzardMediaType.v1"
  };
  const CONFIG_KEY = "wowCharacterPlanner.githubSync.v1";
  const TOKEN_LOCAL_KEY = "wowCharacterPlanner.githubToken.local";
  const TOKEN_SESSION_KEY = "wowCharacterPlanner.githubToken.session";
  const FOREVER_DATA_PATH = "data/forever-characters.json";

  const mode = () => typeof window.wowCharacterPlannerGameMode === "function"
    ? window.wowCharacterPlannerGameMode()
    : (localStorage.getItem(MODE_KEY) === "forever" ? "forever" : "retail");
  const normalizeMode = value => String(value || "").toLowerCase() === "forever" ? "forever" : "retail";
  const charMode = c => normalizeMode(c?.gameMode);
  const nowIso = () => new Date().toISOString();
  const clone = value => JSON.parse(JSON.stringify(value));
  const lower = value => String(value || "").trim().toLocaleLowerCase("de");

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  /* Split the formerly shared local roster once. The old key remains only as a
     compatibility mirror for older patches; active editing always uses one mode. */
  const legacyCharacters = Array.isArray(characters) ? characters.map(c => ({...c, gameMode:charMode(c)})) : [];
  const storedRetail = readJson(MODE_CHARACTER_KEYS.retail, null);
  const storedForever = readJson(MODE_CHARACTER_KEYS.forever, null);
  const modeStores = {
    retail: Array.isArray(storedRetail) ? storedRetail.map(c => ({...c,gameMode:"retail"})) : legacyCharacters.filter(c => charMode(c) === "retail"),
    forever: Array.isArray(storedForever) ? storedForever.map(c => ({...c,gameMode:"forever"})) : legacyCharacters.filter(c => charMode(c) === "forever")
  };
  writeJson(MODE_CHARACTER_KEYS.retail, modeStores.retail);
  writeJson(MODE_CHARACTER_KEYS.forever, modeStores.forever);

  const oldTombstones = readJson("wowCharacterPlanner.githubTombstones.v1", []);
  const tombstones = {
    retail: readJson(MODE_TOMBSTONE_KEYS.retail, null) || (Array.isArray(oldTombstones) ? oldTombstones.map(t => ({...t,gameMode:"retail"})) : []),
    forever: readJson(MODE_TOMBSTONE_KEYS.forever, []) || []
  };

  function signature(c) {
    const out = {};
    Object.keys(c || {}).sort().forEach(key => {
      if (["updatedAt","avatarSha"].includes(key)) return;
      const value = c[key];
      out[key] = key === "avatarUrl" && /^data:image\//i.test(String(value || ""))
        ? `${String(value).slice(0,72)}|${String(value).length}`
        : value;
    });
    return JSON.stringify(out);
  }
  const signatures = {
    retail: new Map(modeStores.retail.filter(c => c.id).map(c => [String(c.id), signature(c)])),
    forever: new Map(modeStores.forever.filter(c => c.id).map(c => [String(c.id), signature(c)]))
  };

  let activeMode = mode();
  characters = modeStores[activeMode];

  function persistCompatibilityMirror() {
    const all = [...modeStores.retail, ...modeStores.forever];
    writeJson(LEGACY_CHARACTER_KEY, all);
  }
  function persistModeState(which = activeMode) {
    writeJson(MODE_CHARACTER_KEYS[which], modeStores[which]);
    writeJson(MODE_TOMBSTONE_KEYS[which], tombstones[which]);
    const remix = {};
    modeStores[which].forEach(c => { if (c.id && c.remixEvent) remix[c.id] = c.remixEvent; });
    writeJson(REMIX_KEYS[which], remix);
    persistCompatibilityMirror();
  }
  persistModeState("retail");
  persistModeState("forever");

  function activateMode(next = mode()) {
    next = normalizeMode(next);
    if (next === activeMode && characters === modeStores[next]) return false;
    modeStores[activeMode] = characters;
    persistModeState(activeMode);
    activeMode = next;
    characters = modeStores[next];
    return true;
  }

  /* Final save path: only the active version is changed. */
  saveCharacters = function() {
    activateMode();
    const which = activeMode;
    const now = nowIso();
    const currentIds = new Set();
    characters.forEach(c => {
      if (!c.id) c.id = uid();
      c.gameMode = which;
      const id = String(c.id);
      currentIds.add(id);
      const before = signatures[which].get(id);
      const next = signature(c);
      if (!c.updatedAt || (before !== undefined && before !== next)) c.updatedAt = now;
      signatures[which].set(id, signature(c));
      tombstones[which] = tombstones[which].filter(t => String(t.id) !== id);
    });
    [...signatures[which].keys()].forEach(id => {
      if (currentIds.has(id)) return;
      const existing = tombstones[which].find(t => String(t.id) === id);
      if (existing) existing.deletedAt = now;
      else tombstones[which].push({id,deletedAt:now,gameMode:which});
      signatures[which].delete(id);
    });
    modeStores[which] = characters;
    persistModeState(which);
    const state = document.querySelector("#saveState");
    if (state) {
      state.textContent = "Gespeichert";
      setTimeout(() => { if (state) state.textContent = "Lokal gespeichert"; }, 900);
    }
    renderAll();
  };

  /* Rendering is always fed exactly one roster. */
  const previousRenderAll = renderAll;
  renderAll = function(...args) {
    activateMode();
    const result = previousRenderAll.apply(this,args);
    enforceParityUi();
    fixForeverMatrixCombinations();
    return result;
  };

  /* Keep media preference separate even though Forever media is not yet callable. */
  function applyModeMediaPreference() {
    const which = mode();
    const value = localStorage.getItem(MEDIA_TYPE_KEYS[which]) || localStorage.getItem(MEDIA_TYPE_SHARED_KEY) || "inset";
    localStorage.setItem(MEDIA_TYPE_SHARED_KEY, value);
    document.querySelectorAll("[data-v70-image-type]").forEach(el => { el.value = value; });
  }
  document.addEventListener("change", e => {
    const select = e.target.closest?.("[data-v70-image-type]");
    if (!select) return;
    localStorage.setItem(MEDIA_TYPE_KEYS[mode()], select.value);
    localStorage.setItem(MEDIA_TYPE_SHARED_KEY, select.value);
  }, true);

  function getToken() {
    return sessionStorage.getItem(TOKEN_SESSION_KEY) || localStorage.getItem(TOKEN_LOCAL_KEY) || "";
  }
  function setToken(token, remember) {
    sessionStorage.removeItem(TOKEN_SESSION_KEY);
    localStorage.removeItem(TOKEN_LOCAL_KEY);
    if (!token) return;
    (remember ? localStorage : sessionStorage).setItem(remember ? TOKEN_LOCAL_KEY : TOKEN_SESSION_KEY, token);
  }
  function getConfig() {
    try {
      return {
        repo:"domxx1/wow-character-planner-data",
        branch:"main",
        dataPath:"data/characters.json",
        foreverDataPath:FOREVER_DATA_PATH,
        ...JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}")
      };
    } catch {
      return {repo:"domxx1/wow-character-planner-data",branch:"main",dataPath:"data/characters.json",foreverDataPath:FOREVER_DATA_PATH};
    }
  }
  function currentDataPath(config = getConfig(), which = mode()) {
    return which === "forever" ? (config.foreverDataPath || FOREVER_DATA_PATH) : (config.dataPath || "data/characters.json");
  }
  function updateDataPathField() {
    const input = document.querySelector("#v6DataPath");
    if (input) input.value = currentDataPath();
  }
  function saveConfigFromUi() {
    const config = getConfig();
    const repo = document.querySelector("#v6Repo")?.value.trim() || config.repo;
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error("Repository muss im Format Benutzer/Repository angegeben werden.");
    config.repo = repo;
    config.branch = document.querySelector("#v6Branch")?.value.trim() || "main";
    const path = document.querySelector("#v6DataPath")?.value.trim() || currentDataPath(config);
    if (mode() === "forever") config.foreverDataPath = path;
    else config.dataPath = path;
    const tokenInput = document.querySelector("#v6Token");
    const token = tokenInput?.value.trim() || getToken();
    const remember = !!document.querySelector("#v6Remember")?.checked;
    if (token) setToken(token,remember);
    localStorage.setItem(CONFIG_KEY,JSON.stringify(config));
    if (tokenInput) tokenInput.value = "";
    return config;
  }
  function setSyncStatus(text,state="") {
    const el = document.querySelector("#v6GithubStatus");
    if (!el) return;
    el.textContent = text;
    el.dataset.state = state;
  }
  function bytesToBase64(bytes) {
    let binary="";
    for(let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary);
  }
  function textToBase64(text) { return bytesToBase64(new TextEncoder().encode(text)); }
  function base64ToText(base64) {
    const binary = atob(String(base64 || "").replace(/\s/g,""));
    const bytes = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  async function ghRequest(url, options={}) {
    const token=getToken();
    if(!token) throw new Error("GitHub-Token fehlt.");
    const response=await fetch(url,{...options,cache:"no-store",headers:{
      "Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`,
      "X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(options.headers||{})
    }});
    if(response.status===404) return null;
    let body=null;try{body=await response.json();}catch{}
    if(!response.ok) throw new Error(body?.message || `GitHub API: HTTP ${response.status}`);
    return body;
  }
  function contentUrl(path, config=getConfig()) {
    const safe=String(path).split("/").map(encodeURIComponent).join("/");
    return `https://api.github.com/repos/${config.repo}/contents/${safe}`;
  }
  async function getFile(path, config=getConfig()) {
    return ghRequest(`${contentUrl(path,config)}?ref=${encodeURIComponent(config.branch || "main")}`);
  }
  async function getJson(path, config=getConfig()) {
    const file=await getFile(path,config);
    if(!file)return {file:null,value:null};
    return {file,value:JSON.parse(base64ToText(file.content))};
  }
  async function putJson(path, value, message, file=null, config=getConfig()) {
    const body={message,content:textToBase64(JSON.stringify(value,null,2)+"\n"),branch:config.branch || "main"};
    if(file?.sha)body.sha=file.sha;
    return ghRequest(contentUrl(path,config),{method:"PUT",body:JSON.stringify(body)});
  }
  function newer(a,b){return new Date(a||0).getTime()>new Date(b||0).getTime();}

  function parseDataImage(url) {
    const match=String(url||"").match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
    if(!match)return null;
    const mime=match[1];
    const ext=mime.includes("png")?"png":mime.includes("webp")?"webp":"jpg";
    return {mime,ext,base64:match[2].replace(/\s/g,"")};
  }
  function safeId(value){return String(value||uid()).replace(/[^A-Za-z0-9_.-]/g,"_");}
  async function uploadAvatar(c, which, config) {
    const image=parseDataImage(c.avatarUrl);
    if(!image)return {...c};
    const path=`images/${which}/${safeId(c.id)}.${image.ext}`;
    let old=null;
    try{old=await getFile(path,config);}catch{}
    const url=contentUrl(path,config);
    const body={message:`Sync ${which} portrait: ${c.name || c.id}`,content:image.base64,branch:config.branch || "main"};
    if(old?.sha)body.sha=old.sha;
    const result=await ghRequest(url,{method:"PUT",body:JSON.stringify(body)});
    c.avatarPath=path;c.avatarMime=image.mime;c.avatarSha=result?.content?.sha || old?.sha || "";
    return {...c,avatarUrl:""};
  }
  async function prepareCloudCharacters(list, which, config) {
    const out=[];
    for(const c of list) out.push(await uploadAvatar(c,which,config));
    return out;
  }
  async function hydrateCharacters(list, config) {
    const out=[];
    for(const raw of list || []) {
      const c={...raw};
      if(c.avatarPath && !/^https?:\/\//i.test(String(c.avatarUrl || ""))) {
        try {
          const file=await getFile(c.avatarPath,config);
          if(file?.content)c.avatarUrl=`data:${c.avatarMime || "image/jpeg"};base64,${String(file.content).replace(/\s/g,"")}`;
        } catch {}
      }
      out.push(c);
    }
    return out;
  }

  function normalizeCloudPayload(value, which) {
    const raw = Array.isArray(value) ? value : Array.isArray(value?.characters) ? value.characters : [];
    const list = raw.filter(c => charMode(c) === which || (!c?.gameMode && which === "retail")).map(c => ({...c,gameMode:which}));
    const dels = Array.isArray(value?.tombstones)
      ? value.tombstones.filter(t => normalizeMode(t?.gameMode) === which || (!t?.gameMode && which === "retail"))
      : [];
    return {characters:list,tombstones:dels};
  }
  async function readCharacterCloud(which, config) {
    const path=currentDataPath(config,which);
    let {file,value}=await getJson(path,config);
    if(file) return {file,path,...normalizeCloudPayload(value,which)};
    if(which === "forever") {
      const legacyPath=config.dataPath || "data/characters.json";
      const legacy=await getJson(legacyPath,config);
      if(legacy.file) return {file:null,path,...normalizeCloudPayload(legacy.value,"forever"),migratedFrom:legacyPath};
    }
    return {file:null,path,characters:[],tombstones:[]};
  }
  async function protectLegacyForever(config) {
    const foreverPath=currentDataPath(config,"forever");
    const foreverFile=await getFile(foreverPath,config);
    if(foreverFile)return;
    const retailPath=currentDataPath(config,"retail");
    const legacy=await getJson(retailPath,config);
    if(!legacy.file)return;
    const extracted=normalizeCloudPayload(legacy.value,"forever");
    if(!extracted.characters.length)return;
    const payload={version:2,gameMode:"forever",updatedAt:nowIso(),characters:extracted.characters,tombstones:extracted.tombstones};
    await putJson(foreverPath,payload,"Migrate Forever roster to separate data file",null,config);
  }
  function mergeCharacters(localList, remoteList, localDeleted, remoteDeleted, which) {
    const localMap=new Map(localList.map(c=>[String(c.id),c]));
    const remoteMap=new Map(remoteList.map(c=>[String(c.id),c]));
    const localDel=new Map((localDeleted||[]).map(t=>[String(t.id),t]));
    const remoteDel=new Map((remoteDeleted||[]).map(t=>[String(t.id),t]));
    const ids=new Set([...localMap.keys(),...remoteMap.keys(),...localDel.keys(),...remoteDel.keys()]);
    const merged=[],deleted=[];
    ids.forEach(id=>{
      const lc=localMap.get(id),rc=remoteMap.get(id),ld=localDel.get(id),rd=remoteDel.get(id);
      const bestChar=!lc?rc:!rc?lc:newer(lc.updatedAt,rc.updatedAt)?lc:rc;
      const bestDel=!ld?rd:!rd?ld:newer(ld.deletedAt,rd.deletedAt)?ld:rd;
      if(bestDel && (!bestChar || newer(bestDel.deletedAt,bestChar.updatedAt))) deleted.push({...bestDel,gameMode:which});
      else if(bestChar) merged.push({...bestChar,gameMode:which});
    });
    return {characters:merged,tombstones:deleted};
  }
  function installActiveCharacters(list, deleted, which) {
    modeStores[which]=list.map(c=>({...c,gameMode:which}));
    tombstones[which]=(deleted||[]).map(t=>({...t,gameMode:which}));
    signatures[which]=new Map(modeStores[which].filter(c=>c.id).map(c=>[String(c.id),signature(c)]));
    if(which===activeMode)characters=modeStores[which];
    persistModeState(which);
  }
  async function writeCharacterCloud(which, config, file=null) {
    if(which === "retail") await protectLegacyForever(config);
    const cloudChars=await prepareCloudCharacters(modeStores[which],which,config);
    const payload={version:2,gameMode:which,updatedAt:nowIso(),characters:cloudChars,tombstones:tombstones[which]};
    return putJson(currentDataPath(config,which),payload,`Sync ${which} character planner ${new Date().toLocaleString("de-DE")}`,file,config);
  }

  const AUX = {
    retail: {
      races:{key:"wowCharacterPlanner.customRaces.v1",path:"data/custom-races.json",prop:"customRaces"},
      classes:{key:"wowCharacterPlanner.customClasses.v1",path:"data/custom-classes.json",prop:"customClasses"},
      groups:{key:"wowCharacterPlanner.peopleGroups.v1",path:"data/people-groups.json",prop:"groups",enabledKey:"wowCharacterPlanner.peopleGroupsEnabled.v1",enabledAtKey:"wowCharacterPlanner.peopleGroupsEnabledAt.v1"}
    },
    forever: {
      races:{key:"wowCharacterPlanner.forever.customRaces.v1",path:"data/forever-custom-races.json",prop:"customRaces"},
      classes:{key:"wowCharacterPlanner.forever.customClasses.v1",path:"data/forever-custom-classes.json",prop:"customClasses"},
      groups:{key:"wowCharacterPlanner.forever.peopleGroups.v1",path:"data/forever-people-groups.json",prop:"groups",enabledKey:"wowCharacterPlanner.forever.peopleGroupsEnabled.v1",enabledAtKey:"wowCharacterPlanner.forever.peopleGroupsEnabledAt.v1"}
    }
  };
  function mergeRecords(local,remote){
    const map=new Map();
    [...(local||[]),...(remote||[])].forEach(item=>{
      if(!item?.id)return;
      const old=map.get(String(item.id));
      if(!old || !newer(old.updatedAt,item.updatedAt))map.set(String(item.id),{...item});
    });
    return [...map.values()];
  }
  async function syncAuxKind(spec, action, config) {
    const local=readJson(spec.key,[]);
    const remoteFile=await getJson(spec.path,config);
    const remoteRaw=Array.isArray(remoteFile.value) ? remoteFile.value : (remoteFile.value?.[spec.prop] || []);
    let next=local;
    if(action==="pull")next=Array.isArray(remoteRaw)?remoteRaw:[];
    else if(action==="sync")next=mergeRecords(local,Array.isArray(remoteRaw)?remoteRaw:[]);
    if(action!=="push")writeJson(spec.key,next);
    if(action!=="pull"){
      const payload={version:1,updatedAt:nowIso(),[spec.prop]:next};
      if(spec.enabledKey){
        payload.enabled=localStorage.getItem(spec.enabledKey)==="true";
        payload.enabledUpdatedAt=localStorage.getItem(spec.enabledAtKey)||"1970-01-01T00:00:00.000Z";
      }
      await putJson(spec.path,payload,`Sync ${mode()} ${spec.prop}`,remoteFile.file,config);
    } else if(spec.enabledKey && remoteFile.value){
      localStorage.setItem(spec.enabledKey,String(!!remoteFile.value.enabled));
      localStorage.setItem(spec.enabledAtKey,String(remoteFile.value.enabledUpdatedAt||"1970-01-01T00:00:00.000Z"));
    }
  }
  async function syncAuxiliary(which, action, config) {
    const specs=AUX[which];
    await syncAuxKind(specs.races,action,config);
    await syncAuxKind(specs.classes,action,config);
    await syncAuxKind(specs.groups,action,config);
  }

  async function runSync(action) {
    activateMode();
    const which=activeMode;
    const config=saveConfigFromUi();
    const labels={pull:"Cloud-Daten werden geladen …",push:"Daten werden hochgeladen …",sync:"Geräte werden synchronisiert …"};
    setSyncStatus(labels[action] || "Synchronisierung …","working");
    const remote=await readCharacterCloud(which,config);
    if(action==="pull") {
      const hydrated=await hydrateCharacters(remote.characters,config);
      installActiveCharacters(hydrated,remote.tombstones,which);
      await syncAuxiliary(which,"pull",config);
    } else if(action==="push") {
      await writeCharacterCloud(which,config,remote.file);
      await syncAuxiliary(which,"push",config);
    } else {
      const merged=mergeCharacters(modeStores[which],remote.characters,tombstones[which],remote.tombstones,which);
      const hydrated=await hydrateCharacters(merged.characters,config);
      installActiveCharacters(hydrated,merged.tombstones,which);
      await writeCharacterCloud(which,config,remote.file);
      await syncAuxiliary(which,"sync",config);
    }
    const count=modeStores[which].length;
    setSyncStatus(`${which === "forever" ? "Forever" : "Retail"}: ${count} Datensätze ${action === "pull" ? "geladen" : action === "push" ? "gespeichert" : "synchronisiert"}.`,"ok");
    toast(action === "pull" ? "Cloud-Daten geladen" : action === "push" ? "Cloud-Daten gespeichert" : "Synchronisierung abgeschlossen");
    if(action!=="push")setTimeout(()=>location.reload(),450);
  }

  function replaceButton(id, handler) {
    const old=document.querySelector(`#${id}`);if(!old)return null;
    const fresh=old.cloneNode(true);old.replaceWith(fresh);
    fresh.addEventListener("click",handler);
    return fresh;
  }
  function installSyncControls() {
    replaceButton("v6Test",async()=>{
      try{
        const config=saveConfigFromUi();setSyncStatus("Verbindung wird geprüft …","working");
        const repo=await ghRequest(`https://api.github.com/repos/${config.repo}`);
        if(!repo)throw new Error("Repository nicht gefunden oder Token hat keinen Zugriff.");
        setSyncStatus(`Verbunden mit ${repo.full_name}. ${repo.private?"Privates Repository":"Achtung: Repository ist öffentlich!"}`,repo.private?"ok":"warning");
      }catch(err){setSyncStatus(err.message||String(err),"error");toast("Verbindung fehlgeschlagen");}
    });
    replaceButton("v6Pull",()=>runSync("pull").catch(err=>{setSyncStatus(err.message||String(err),"error");toast("Synchronisierung fehlgeschlagen");}));
    replaceButton("v6Push",()=>runSync("push").catch(err=>{setSyncStatus(err.message||String(err),"error");toast("Synchronisierung fehlgeschlagen");}));
    replaceButton("v6Sync",()=>runSync("sync").catch(err=>{setSyncStatus(err.message||String(err),"error");toast("Synchronisierung fehlgeschlagen");}));
    replaceButton("v6Forget",()=>{
      sessionStorage.removeItem(TOKEN_SESSION_KEY);localStorage.removeItem(TOKEN_LOCAL_KEY);
      const remember=document.querySelector("#v6Remember");if(remember)remember.checked=false;
      setSyncStatus("Token auf diesem Gerät entfernt.");
    });
  }

  /* Import/export and destructive controls only ever affect the active version. */
  function csvValue(row,index){return index>=0?String(row[index]||"").trim():"";}
  function headerIndex(headers,...names){return headers.findIndex(h=>names.includes(h));}
  function normalizeImportedCharacter(raw, which) {
    const c={...raw};
    c.id=String(c.id||"").trim()||uid();
    c.name=String(c.name??c.Name??"").trim();
    c.race=String(c.race??c.Volk??c.volk??"").trim();
    c.variant=String(c.variant??c.Variante??c.variante??"").trim();
    c.faction=String(c.faction??c.Fraktion??c.fraktion??"").trim() || RACES.find(r=>r.name===c.race)?.faction || "Neutral";
    c.className=String(c.className??c.Klasse??c.klasse??"").trim();
    c.gender=String(c.gender??c.Geschlecht??c.geschlecht??"").trim();
    c.profession1=String(c.profession1??c["Beruf 1"]??"").trim();
    c.profession2=String(c.profession2??c["Beruf 2"]??"").trim();
    c.status=String(c.status??c.Status??"Aktiv").trim()||"Aktiv";
    c.level=c.level??c.Level??"";
    c.specialization=String(c.specialization??c.Spezialisierung??"").trim();
    c.realm=String(c.realm??c.Server??c.server??"").trim();
    c.region=String(c.region??c.Region??"eu").trim().toLowerCase()||"eu";
    c.remixEvent=String(c.remixEvent??c.Remix??c["Remix-Event"]??"").trim();
    c.avatarUrl=String(c.avatarUrl??c["Bild-URL"]??"").trim();
    c.armoryUrl=String(c.armoryUrl??c["Arsenal-Link"]??"").trim();
    c.notes=String(c.notes??c.Notizen??"").trim();
    c.gameMode=which;
    return c;
  }
  function mergeImported(list, which) {
    activateMode(which);
    let added=0,updated=0;
    const other=which==="retail"?modeStores.forever:modeStores.retail;
    const otherIds=new Set(other.map(c=>String(c.id||"")));
    list.forEach(c=>{
      if(otherIds.has(String(c.id||"")))c.id=uid();
      let idx=characters.findIndex(x=>String(x.id||"")===String(c.id||""));
      if(idx<0 && c.name)idx=characters.findIndex(x=>lower(x.name)===lower(c.name)&&x.className===c.className&&x.race===c.race&&x.faction===c.faction);
      if(idx>=0){characters[idx]={...characters[idx],...c,gameMode:which};updated++;}
      else{characters.push({...c,gameMode:which});added++;}
    });
    saveCharacters();setView("characters");toast(updated?`${added} neu, ${updated} aktualisiert`:`${added} Charaktere importiert`);
  }
  function installDataControls() {
    const oldJson=document.querySelector("#jsonImport");
    if(oldJson){const fresh=oldJson.cloneNode(true);oldJson.replaceWith(fresh);fresh.addEventListener("change",e=>{
      const file=e.target.files?.[0];if(!file)return;
      const reader=new FileReader();reader.onload=()=>{try{
        const parsed=JSON.parse(String(reader.result||"").replace(/^\uFEFF/,""));
        const raw=Array.isArray(parsed)?parsed:parsed?.characters;if(!Array.isArray(raw))throw new Error("Keine Charakterliste gefunden.");
        const which=mode();
        const selected=raw.filter(r=>!r?.gameMode||normalizeMode(r.gameMode)===which).map(r=>normalizeImportedCharacter(r,which)).filter(c=>c.name||c.status==="Geplant");
        mergeImported(selected,which);
      }catch(err){alert(`JSON-Import fehlgeschlagen (${file.name}): ${err.message}`);}finally{fresh.value="";}};reader.readAsText(file,"utf-8");
    });}

    const oldCsv=document.querySelector("#csvImport");
    if(oldCsv){const fresh=oldCsv.cloneNode(true);oldCsv.replaceWith(fresh);fresh.addEventListener("change",e=>{
      const file=e.target.files?.[0];if(!file)return;
      const reader=new FileReader();reader.onload=()=>{try{
        const rows=parseCSV(reader.result);if(rows.length<2)throw new Error("Keine Datenzeilen gefunden.");
        const headers=rows[0].map(v=>String(v||"").trim().toLowerCase().replace(/\s+/g," "));
        const ix={
          game:headerIndex(headers,"version","gamemode","game mode"),name:headerIndex(headers,"name"),race:headerIndex(headers,"volk","rasse"),variant:headerIndex(headers,"variante","variant"),
          faction:headerIndex(headers,"fraktion"),className:headerIndex(headers,"klasse"),gender:headerIndex(headers,"geschlecht"),level:headerIndex(headers,"level"),spec:headerIndex(headers,"spezialisierung"),
          p1:headerIndex(headers,"beruf 1","beruf1"),p2:headerIndex(headers,"beruf 2","beruf2"),remix:headerIndex(headers,"remix-event","remix","erweiterung remix"),status:headerIndex(headers,"status"),
          realm:headerIndex(headers,"server","realm"),region:headerIndex(headers,"region"),avatar:headerIndex(headers,"bild-url","avatarurl"),notes:headerIndex(headers,"notizen","notiz")
        };
        if(ix.name<0||ix.race<0||ix.className<0)throw new Error("Mindestens Name, Volk und Klasse müssen vorhanden sein.");
        const which=mode();
        const list=rows.slice(1).filter(row=>{
          const g=csvValue(row,ix.game);return !g||normalizeMode(g)===which;
        }).map(row=>normalizeImportedCharacter({
          name:csvValue(row,ix.name),race:csvValue(row,ix.race),variant:csvValue(row,ix.variant),faction:csvValue(row,ix.faction),className:csvValue(row,ix.className),gender:csvValue(row,ix.gender),
          level:csvValue(row,ix.level),specialization:csvValue(row,ix.spec),profession1:csvValue(row,ix.p1),profession2:csvValue(row,ix.p2),remixEvent:csvValue(row,ix.remix),status:csvValue(row,ix.status)||"Aktiv",
          realm:csvValue(row,ix.realm),region:csvValue(row,ix.region)||"eu",avatarUrl:csvValue(row,ix.avatar),notes:csvValue(row,ix.notes)
        },which)).filter(c=>c.name||c.status==="Geplant");
        mergeImported(list,which);
      }catch(err){alert(`CSV-Import fehlgeschlagen (${file.name}): ${err.message}`);}finally{fresh.value="";}};reader.readAsText(file,"utf-8");
    });}

    replaceButton("exportJson",()=>{
      const which=mode();
      downloadBlob(JSON.stringify({version:2,gameMode:which,exportedAt:nowIso(),characters:clone(modeStores[which])},null,2),`wow-charakterplaner-${which}-backup.json`,"application/json");
    });
    replaceButton("exportCsv",()=>{
      const which=mode();const list=modeStores[which];
      const headers=["Version","Name","Volk","Variante","Fraktion","Klasse","Geschlecht","Level","Spezialisierung","Beruf 1","Beruf 2","Remix-Event","Status","Server","Region","Bild-URL","Notizen"];
      const rows=list.map(c=>[which,c.name,c.race,c.variant||"",c.faction,c.className,c.gender,c.level||"",c.specialization||"",c.profession1,c.profession2,c.remixEvent||"",c.status,c.realm,c.region||"eu",c.avatarUrl||"",c.notes]);
      const text="\uFEFF"+[headers,...rows].map(r=>r.map(csvEscape).join(";")).join("\r\n");
      downloadBlob(text,`wow-charaktere-${which}.csv`,"text/csv;charset=utf-8");
    });
    replaceButton("clearData",()=>{
      const which=mode();const label=which==="forever"?"Forever":"Retail";
      if(!confirm(`Wirklich alle lokal gespeicherten ${label}-Charaktere löschen?`))return;
      characters=[];modeStores[which]=characters;saveCharacters();toast(`${label}-Charaktere gelöscht`);
    });
    replaceButton("loadDemo",()=>{
      const which=mode();
      const demo=which==="forever" ? [
        {name:"Thorg",race:"Orcs",faction:"Horde",className:"Krieger",status:"Aktiv"},
        {name:"Elowen",race:"Menschen",faction:"Allianz",className:"Paladin",status:"Geplant"}
      ] : [
        {name:"Aelira",race:"Blutelfen",faction:"Horde",className:"Magier",status:"Aktiv"},
        {name:"Brom",race:"Zwerge",faction:"Allianz",className:"Paladin",status:"Geplant"}
      ];
      characters.push(...demo.map(c=>({id:uid(),gameMode:which,gender:"",profession1:"",profession2:"",realm:"",region:"eu",variant:"",level:"",specialization:"",remixEvent:"",avatarUrl:"",notes:"",...c})));
      saveCharacters();toast(`${which==="forever"?"Forever":"Retail"}-Demo-Daten hinzugefügt`);
    });
  }

  /* One layout for both modes. Unsupported Forever Armory calls remain visible but disabled. */
  function reorderSettingsPanels() {
    const grid=document.querySelector("#settings .settings-grid");if(!grid)return;
    const activeRace=mode()==="forever"?document.querySelector("#v714ForeverRaces"):document.querySelector("#v65CustomRaces");
    const activeGroup=mode()==="forever"?document.querySelector("#v715ForeverPeopleGroups"):document.querySelector("#v67PeopleGroups");
    const activeClass=mode()==="forever"?document.querySelector("#v714ForeverClasses"):document.querySelector("#v66CustomClasses");
    const order=[document.querySelector("#v6GithubSync"),document.querySelector("#v70BlizzardMedia"),document.querySelector("#v41ProfileStatus"),activeRace,activeGroup,activeClass].filter(Boolean);
    const dynamic=new Set(["v6GithubSync","v70BlizzardMedia","v41ProfileStatus","v65CustomRaces","v67PeopleGroups","v66CustomClasses","v714ForeverRaces","v715ForeverPeopleGroups","v714ForeverClasses"]);
    const anchor=[...grid.children].find(el=>el.tagName==="ARTICLE"&&!dynamic.has(el.id)) || null;
    order.forEach(el=>grid.insertBefore(el,anchor));
  }
  function enforceParityUi() {
    const forever=mode()==="forever";
    document.querySelector("#v65CustomRaces")?.toggleAttribute("hidden",forever);
    document.querySelector("#v66CustomClasses")?.toggleAttribute("hidden",forever);
    document.querySelector("#v67PeopleGroups")?.toggleAttribute("hidden",forever);
    document.querySelector("#v714ForeverRaces")?.toggleAttribute("hidden",!forever);
    document.querySelector("#v714ForeverClasses")?.toggleAttribute("hidden",!forever);
    document.querySelector("#v715ForeverPeopleGroups")?.toggleAttribute("hidden",!forever);
    document.querySelector("#v67PeopleTools")?.toggleAttribute("hidden",forever);
    document.querySelector("#v715ForeverPeopleTools")?.toggleAttribute("hidden",!forever);

    /* Same controls in both versions. */
    document.querySelector("#v70BlizzardMedia")?.removeAttribute("hidden");
    document.querySelector("#v70SingleMedia")?.removeAttribute("hidden");
    document.querySelector("#filterRemix")?.removeAttribute("hidden");
    document.querySelector("#charRemix")?.closest(".field")?.removeAttribute("hidden");

    const bulk=document.querySelector("#v70FetchAll");
    const single=document.querySelector("#v70FetchSingle");
    if(forever){
      if(bulk)bulk.disabled=true;if(single)single.disabled=true;
      const status=document.querySelector("#v70MediaStatus");if(status)status.textContent="Der Blizzard Character-Media-Abruf ist für Forever derzeit nicht verfügbar.";
      const singleStatus=document.querySelector("#v70SingleStatus");if(singleStatus)singleStatus.textContent="Der Blizzard Character-Media-Abruf ist für Forever derzeit nicht verfügbar.";
      document.querySelector("#charArmoryPreview")?.classList.add("hidden");
      const hint=document.querySelector("#charArmoryHint");if(hint)hint.textContent="Forever nutzt derzeit keine Retail-Arsenal-Verknüpfung.";
    }else{
      const token=!!getToken();if(bulk)bulk.disabled=!token;if(single)single.disabled=!token;
    }
    updateDataPathField();applyModeMediaPreference();reorderSettingsPanels();
  }

  const previousOpenCharacter = openCharacter;
  openCharacter = function(id=null,preset={}) {
    activateMode();
    const result=previousOpenCharacter(id,preset);
    enforceParityUi();
    return result;
  };

  /* v0.7.14's generic validity is intentionally broad for Himmelsgeborene.
     Tighten the visible matrix to the faction-specific combinations Blizzard announced. */
  function fixForeverMatrixCombinations() {
    if(mode()!=="forever")return;
    const table=document.querySelector("#raceClassMatrix");if(!table)return;
    const headers=[...table.querySelectorAll("thead th")];
    table.querySelectorAll("tbody tr").forEach(row=>{
      const raceCell=row.querySelector("td[data-v713-race]");if(!raceCell)return;
      const key=raceCell.dataset.v713Race;
      const race=RACES.find(r=>(r.key||`${r.name}|${r.faction}`)===key);if(!race||race.name!=="Himmelsgeborene")return;
      headers.forEach((th,index)=>{
        const className=th.dataset.v713Class;if(!className||index===0)return;
        const allowed=["Krieger","Jäger","Schurke","Druide"].includes(className)||(race.faction==="Horde"?className==="Schamane":className==="Magier");
        if(allowed)return;
        const td=row.children[index];const button=td?.querySelector(".matrix-cell");if(!button)return;
        const occupied=characters.some(c=>c.race===race.name&&c.faction===race.faction&&c.className===className);
        if(occupied)return;
        button.className="matrix-cell v5-invalid";button.disabled=true;button.removeAttribute("data-v3-race");button.removeAttribute("data-class");button.innerHTML='<span class="count">–</span>';button.setAttribute("aria-label","Nicht verfügbare Kombination");
      });
    });
  }

  /* Update active roster before any UI action that depends on the current mode. */
  document.addEventListener("click",e=>{
    if(e.target.closest?.("[data-v714-mode]")){
      setTimeout(()=>{activateMode();enforceParityUi();renderAll();},0);
    }
  },true);

  installSyncControls();
  installDataControls();
  activateMode();
  enforceParityUi();
  persistCompatibilityMirror();
  renderAll();

  const brand=document.querySelector(".brand-sub");
  if(brand)brand.textContent=mode()==="forever"?`WoW Forever · ${VERSION}`:`WoW Retail · 12.1 · ${VERSION}`;
})();
