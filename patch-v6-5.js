/* v0.6.5 — User-defined custom races with faction assignment and GitHub sync. */
(() => {
  const VERSION = "0.6.5";
  const STORAGE_KEY = "wowCharacterPlanner.customRaces.v1";
  const CONFIG_KEY = "wowCharacterPlanner.githubSync.v1";
  const TOKEN_LOCAL_KEY = "wowCharacterPlanner.githubToken.local";
  const TOKEN_SESSION_KEY = "wowCharacterPlanner.githubToken.session";
  const CLOUD_PATH = "data/custom-races.json";

  const nowIso = () => new Date().toISOString();
  const normName = value => String(value || "").trim().replace(/\s+/g, " ");
  const lower = value => normName(value).toLocaleLowerCase("de");

  function loadRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeRecord).filter(Boolean) : [];
    } catch { return []; }
  }
  function normalizeRecord(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = normName(raw.name);
    const faction = ["Horde","Allianz","Neutral"].includes(raw.faction) ? raw.faction : "Neutral";
    if (!name) return null;
    return {
      id: String(raw.id || uid()),
      name,
      faction,
      deleted: !!raw.deleted,
      updatedAt: String(raw.updatedAt || nowIso())
    };
  }
  function saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
  function activeRecords() { return records.filter(r => !r.deleted); }
  function isCustomRaceName(name) { return activeRecords().some(r => lower(r.name) === lower(name)); }
  window.wowCharacterPlannerIsCustomRace = isCustomRaceName;

  let records = loadRecords();
  const builtInNames = new Set(RACES.map(r => lower(r.name)));

  function raceKey(r) { return r.key || `${r.name}|${r.faction}`; }
  function applyCatalog() {
    for (let i = RACES.length - 1; i >= 0; i--) {
      if (RACES[i]?.custom === true) RACES.splice(i, 1);
    }
    activeRecords()
      .sort((a,b) => a.name.localeCompare(b.name,"de"))
      .forEach(r => RACES.push({
        key:`Custom:${r.id}`,
        name:r.name,
        faction:r.faction,
        custom:true,
        customId:r.id
      }));
    refreshRaceSelect();
  }

  function refreshRaceSelect(preferred="") {
    const select = document.querySelector("#charRace");
    if (!select) return;
    const keep = preferred || select.value;
    const duplicates = new Set(RACES.filter((r,i,a) => a.findIndex(x => x.name === r.name) !== i).map(r => r.name));
    select.innerHTML = '<option value="">Nicht zugeordnet</option>' + RACES.map(r => {
      const suffix = r.custom ? ` — Custom · ${r.faction}` : (duplicates.has(r.name) ? ` — ${r.faction}` : "");
      return `<option value="${escapeHtml(raceKey(r))}">${escapeHtml(r.name + suffix)}</option>`;
    }).join("");
    if ([...select.options].some(o => o.value === keep)) select.value = keep;
  }

  const previousValidity = window.wowCharacterPlannerIsValidCombo;
  window.wowCharacterPlannerIsValidCombo = function(race,className) {
    if (isCustomRaceName(race)) return true;
    return typeof previousValidity === "function" ? previousValidity(race,className) : true;
  };

  function selectedRace() {
    const value = document.querySelector("#charRace")?.value || "";
    return RACES.find(r => raceKey(r) === value) || null;
  }
  function fillAllClasses(preferred="") {
    const select = document.querySelector("#charClass");
    const race = selectedRace();
    if (!select || !race?.custom) return;
    const keep = preferred || select.value;
    select.innerHTML = CLASSES.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
    if (CLASSES.some(c => c.name === keep)) select.value = keep;
  }

  const previousOpen = openCharacter;
  openCharacter = function(id=null,preset={}) {
    previousOpen(id,preset);
    const c = id ? characters.find(x => x.id === id) : null;
    const race = RACES.find(r => r.name === (c?.race || preset.race || "") && r.faction === (c?.faction || preset.faction || "Horde"));
    if (race?.custom) {
      refreshRaceSelect(raceKey(race));
      fillAllClasses(c?.className || preset.className || "");
    }
  };

  document.querySelector("#charRace")?.addEventListener("change", () => {
    const race = selectedRace();
    if (race?.custom) {
      const faction = document.querySelector("#charFaction");
      if (faction) faction.value = race.faction;
      fillAllClasses();
    }
  });

  function safeAvatar(value, fallback="") {
    const s = String(value || "").trim();
    if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(s) || /^https?:\/\//i.test(s)) return s;
    return fallback;
  }
  function saveCustomCharacter() {
    const race = selectedRace();
    if (!race?.custom) return false;
    const id = document.querySelector("#charId")?.value || "";
    const existing = id ? characters.find(c => c.id === id) : null;
    const levelRaw = Number.parseInt(document.querySelector("#charLevel")?.value || "",10);
    const data = {
      ...(existing || {}),
      id:id || uid(),
      name:document.querySelector("#charName")?.value.trim() || "",
      race:race.name,
      variant:document.querySelector("#charVariant")?.value.trim() || "",
      faction:race.faction,
      className:document.querySelector("#charClass")?.value || CLASSES[0].name,
      gender:document.querySelector("#charGender")?.value || "",
      profession1:document.querySelector("#charProfession1")?.value || "",
      profession2:document.querySelector("#charProfession2")?.value || "",
      status:document.querySelector("#charStatus")?.value || "Geplant",
      level:Number.isFinite(levelRaw) && levelRaw > 0 ? Math.min(90,levelRaw) : "",
      specialization:document.querySelector("#charSpecialization")?.value.trim() || "",
      realm:document.querySelector("#charRealm")?.value.trim() || "",
      region:document.querySelector("#charRegion")?.value || "eu",
      remixEvent:document.querySelector("#charRemix")?.value.trim() || "",
      avatarUrl:safeAvatar(document.querySelector("#charAvatar")?.value, existing?.avatarUrl || ""),
      armoryUrl:"",
      notes:document.querySelector("#charNotes")?.value.trim() || ""
    };
    delete data.midnight;
    if (!data.name && data.status !== "Geplant") {
      toast("Für vorhandene Charaktere ist ein Name erforderlich");
      return true;
    }
    if (id) {
      const idx = characters.findIndex(c => c.id === id);
      if (idx >= 0) characters[idx] = data;
    } else characters.push(data);
    document.querySelector("#characterDialog")?.close();
    saveCharacters();
    toast(id ? "Charakter aktualisiert" : "Charakter angelegt");
    return true;
  }

  document.querySelector("#saveCharacter")?.addEventListener("click", e => {
    if (saveCustomCharacter()) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  document.querySelector("#characterForm")?.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target?.tagName !== "TEXTAREA" && selectedRace()?.custom) {
      e.preventDefault();
      e.stopImmediatePropagation();
      saveCustomCharacter();
    }
  }, true);

  function decorateMatrix() {
    const rows = document.querySelectorAll("#raceClassMatrix tbody tr");
    rows.forEach((tr,index) => {
      const race = RACES[index];
      if (!race?.custom) return;
      tr.classList.add("v65-custom-race-row");
      const label = tr.querySelector("td:first-child .cell-label");
      if (label) label.textContent = `Custom · ${race.faction}`;
    });
  }
  const previousRenderMatrix = renderMatrix;
  renderMatrix = function() {
    previousRenderMatrix();
    decorateMatrix();
  };

  function ensurePanel() {
    const grid = document.querySelector("#settings .settings-grid");
    if (!grid || document.querySelector("#v65CustomRaces")) return;
    const panel = document.createElement("article");
    panel.id = "v65CustomRaces";
    panel.className = "panel";
    panel.innerHTML = `
      <div class="panel-head"><div><div class="eyebrow">PLANUNG</div><h3>Custom-Rassen</h3></div></div>
      <p class="muted">Eigene Rassen für deine Charakterplanung. Custom-Rassen können mit allen Klassen kombiniert und einer Fraktion zugewiesen werden.</p>
      <div class="v65-race-form">
        <label class="field"><span>Name</span><input id="v65RaceName" maxlength="40" placeholder="z. B. Astraler"></label>
        <label class="field"><span>Fraktion</span><select id="v65RaceFaction"><option>Horde</option><option>Allianz</option><option>Neutral</option></select></label>
        <button id="v65AddRace" type="button" class="btn btn-primary">+ Custom-Rasse</button>
      </div>
      <div id="v65RaceList" class="v65-race-list"></div>
      <div id="v65RaceSyncState" class="muted v65-sync-note">Wird über den GitHub-Sync in <code>${CLOUD_PATH}</code> mitgeführt.</div>`;
    const sync = document.querySelector("#v6GithubSync");
    if (sync) sync.insertAdjacentElement("afterend", panel); else grid.insertAdjacentElement("afterbegin", panel);
    document.querySelector("#v65AddRace")?.addEventListener("click", addRace);
    document.querySelector("#v65RaceName")?.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); addRace(); }
    });
    panel.addEventListener("click", e => {
      const btn = e.target.closest("[data-v65-delete]");
      if (!btn) return;
      deleteRace(btn.dataset.v65Delete);
    });
  }

  function addRace() {
    const input = document.querySelector("#v65RaceName");
    const factionEl = document.querySelector("#v65RaceFaction");
    const name = normName(input?.value);
    const faction = factionEl?.value || "Neutral";
    if (!name) { toast("Bitte einen Namen für die Custom-Rasse eingeben"); return; }
    const nameKey = lower(name);
    if (builtInNames.has(nameKey) || activeRecords().some(r => lower(r.name) === nameKey)) {
      toast("Diese Rasse ist bereits vorhanden");
      return;
    }
    records.push({id:uid(),name,faction,deleted:false,updatedAt:nowIso()});
    saveRecords();
    applyCatalog();
    renderRaceList();
    renderAll();
    if (input) input.value = "";
    toast(`${name} hinzugefügt`);
  }

  function deleteRace(id) {
    const race = records.find(r => r.id === id && !r.deleted);
    if (!race) return;
    const used = characters.filter(c => lower(c.race) === lower(race.name) && c.faction === race.faction).length;
    if (used) {
      toast(`${race.name} wird noch von ${used} Charakter${used === 1 ? "" : "en"} verwendet`);
      return;
    }
    if (!confirm(`Custom-Rasse „${race.name}“ wirklich löschen?`)) return;
    race.deleted = true;
    race.updatedAt = nowIso();
    saveRecords();
    applyCatalog();
    renderRaceList();
    renderAll();
    toast(`${race.name} gelöscht`);
  }

  function renderRaceList() {
    const root = document.querySelector("#v65RaceList");
    if (!root) return;
    const list = activeRecords().sort((a,b) => a.name.localeCompare(b.name,"de"));
    root.innerHTML = list.length ? list.map(r => {
      const used = characters.filter(c => lower(c.race) === lower(r.name) && c.faction === r.faction).length;
      const badgeClass = r.faction === "Horde" ? "horde" : r.faction === "Allianz" ? "allianz" : "";
      return `<div class="v65-race-item"><div><strong>${escapeHtml(r.name)}</strong><div class="v65-race-meta"><span class="badge ${badgeClass}">${escapeHtml(r.faction)}</span><span>${used} Charakter${used === 1 ? "" : "e"}</span></div></div><button type="button" class="icon-btn" data-v65-delete="${escapeHtml(r.id)}" title="Custom-Rasse löschen">×</button></div>`;
    }).join("") : '<div class="muted">Noch keine Custom-Rassen angelegt.</div>';
  }

  function getToken() {
    return sessionStorage.getItem(TOKEN_SESSION_KEY) || localStorage.getItem(TOKEN_LOCAL_KEY) || "";
  }
  function getConfig() {
    try {
      return {repo:"domxx1/wow-character-planner-data",branch:"main",...JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}")};
    } catch { return {repo:"domxx1/wow-character-planner-data",branch:"main"}; }
  }
  function bytesToBase64(bytes) {
    let binary="";
    for(let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary);
  }
  function textToBase64(text) { return bytesToBase64(new TextEncoder().encode(text)); }
  function base64ToText(base64) {
    const binary = atob(String(base64||"").replace(/\s/g,""));
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
    let body=null; try{body=await response.json();}catch{}
    if(!response.ok) throw new Error(body?.message||`GitHub API: HTTP ${response.status}`);
    return body;
  }
  function cloudUrl() {
    const config=getConfig();
    return `https://api.github.com/repos/${config.repo}/contents/${CLOUD_PATH.split("/").map(encodeURIComponent).join("/")}`;
  }
  async function readCloud() {
    const config=getConfig();
    const file=await ghRequest(`${cloudUrl()}?ref=${encodeURIComponent(config.branch||"main")}`);
    if(!file) return {file:null,records:[]};
    const payload=JSON.parse(base64ToText(file.content));
    const raw=Array.isArray(payload) ? payload : payload?.customRaces;
    return {file,records:Array.isArray(raw)?raw.map(normalizeRecord).filter(Boolean):[]};
  }
  async function writeCloud(file,list) {
    const config=getConfig();
    const payload={version:1,updatedAt:nowIso(),customRaces:list};
    const body={message:`Sync custom races ${new Date().toLocaleString("de-DE")}`,content:textToBase64(JSON.stringify(payload,null,2)),branch:config.branch||"main"};
    if(file?.sha) body.sha=file.sha;
    await ghRequest(cloudUrl(),{method:"PUT",body:JSON.stringify(body)});
  }
  function mergedRecords(local,remote) {
    const map=new Map();
    [...local,...remote].forEach(r=>{
      const current=map.get(r.id);
      if(!current || new Date(r.updatedAt||0).getTime() >= new Date(current.updatedAt||0).getTime()) map.set(r.id,{...r});
    });
    const byName=new Map();
    [...map.values()].filter(r=>!r.deleted).forEach(r=>{
      const key=lower(r.name);
      const current=byName.get(key);
      if(!current || new Date(r.updatedAt||0).getTime() > new Date(current.updatedAt||0).getTime()) byName.set(key,r);
    });
    [...map.values()].forEach(r=>{
      if(r.deleted) return;
      const winner=byName.get(lower(r.name));
      if(winner && winner.id!==r.id){r.deleted=true;r.updatedAt=winner.updatedAt;}
    });
    return [...map.values()];
  }
  function applySyncedRecords(next) {
    records=next.map(normalizeRecord).filter(Boolean);
    saveRecords();
    applyCatalog();
    renderRaceList();
    renderAll();
  }
  function syncStatus(text,error=false) {
    const el=document.querySelector("#v65RaceSyncState");
    if(el){el.textContent=text;el.classList.toggle("v65-sync-error",error);}
  }
  async function pushCustom() {
    try { const {file}=await readCloud(); await writeCloud(file,records); syncStatus(`${activeRecords().length} Custom-Rassen auf GitHub gespeichert.`); }
    catch(err){ syncStatus(`Custom-Rassen-Sync: ${err.message||err}`,true); }
  }
  async function pullCustom() {
    try {
      const {file,records:remote}=await readCloud();
      if(!file){syncStatus("Noch keine Custom-Rassen-Datei in GitHub.");return;}
      applySyncedRecords(remote); syncStatus(`${activeRecords().length} Custom-Rassen von GitHub geladen.`);
    } catch(err){ syncStatus(`Custom-Rassen-Sync: ${err.message||err}`,true); }
  }
  async function syncCustom() {
    try {
      const {file,records:remote}=await readCloud();
      const merged=mergedRecords(records,remote);
      applySyncedRecords(merged);
      await writeCloud(file,records);
      syncStatus(`${activeRecords().length} Custom-Rassen synchronisiert.`);
    } catch(err){ syncStatus(`Custom-Rassen-Sync: ${err.message||err}`,true); }
  }

  document.querySelector("#v6Push")?.addEventListener("click",pushCustom);
  document.querySelector("#v6Pull")?.addEventListener("click",pullCustom);
  document.querySelector("#v6Sync")?.addEventListener("click",syncCustom);

  const style=document.createElement("style");
  style.textContent=`
    .v65-race-form{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(140px,.8fr) auto;gap:10px;align-items:end;margin:14px 0}
    .v65-race-list{display:grid;gap:8px;margin-top:8px}.v65-race-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.025)}
    .v65-race-meta{display:flex;align-items:center;gap:8px;margin-top:5px;color:var(--muted);font-size:.74rem}.v65-sync-note{margin-top:10px;font-size:.75rem}.v65-sync-error{color:#e27a7a!important}
    .v65-custom-race-row>td:first-child{box-shadow:inset 3px 0 rgba(212,175,55,.55)}
    @media(max-width:640px){.v65-race-form{grid-template-columns:1fr 1fr}.v65-race-form .btn{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  ensurePanel();
  applyCatalog();
  renderRaceList();
  renderAll();
  decorateMatrix();

  const brandSub=document.querySelector(".brand-sub");
  if(brandSub) brandSub.textContent=`WoW Retail · 12.1 · ${VERSION}`;
})();
