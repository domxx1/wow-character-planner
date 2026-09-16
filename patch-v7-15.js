/* v0.7.15 — Separate Völker-Gruppen for Retail and Forever. */
(() => {
  const VERSION = "0.7.15";
  const MODE_KEY = "wowCharacterPlanner.gameMode.v1";
  const GROUP_KEY = "wowCharacterPlanner.forever.peopleGroups.v1";
  const ENABLED_KEY = "wowCharacterPlanner.forever.peopleGroupsEnabled.v1";
  const ENABLED_AT_KEY = "wowCharacterPlanner.forever.peopleGroupsEnabledAt.v1";
  const CONFIG_KEY = "wowCharacterPlanner.githubSync.v1";
  const TOKEN_LOCAL_KEY = "wowCharacterPlanner.githubToken.local";
  const TOKEN_SESSION_KEY = "wowCharacterPlanner.githubToken.session";
  const CLOUD_PATH = "data/forever-people-groups.json";
  const EPOCH = "1970-01-01T00:00:00.000Z";

  const mode = () => typeof window.wowCharacterPlannerGameMode === "function"
    ? window.wowCharacterPlannerGameMode()
    : (localStorage.getItem(MODE_KEY) === "forever" ? "forever" : "retail");
  const nowIso = () => new Date().toISOString();
  const norm = value => String(value || "").trim().replace(/\s+/g, " ");
  const lower = value => norm(value).toLocaleLowerCase("de");
  const charMode = c => c?.gameMode === "forever" ? "forever" : "retail";

  function normalizeGroup(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = norm(raw.name);
    if (!name) return null;
    return {
      id:String(raw.id || uid()),
      name,
      members:[...new Set((Array.isArray(raw.members) ? raw.members : []).map(v => String(v || "").trim()).filter(Boolean))],
      deleted:!!raw.deleted,
      updatedAt:String(raw.updatedAt || nowIso())
    };
  }
  function loadGroups() {
    try {
      const parsed = JSON.parse(localStorage.getItem(GROUP_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeGroup).filter(Boolean) : [];
    } catch { return []; }
  }
  function saveGroups() { localStorage.setItem(GROUP_KEY, JSON.stringify(groups)); }
  function activeGroups() { return groups.filter(g => !g.deleted); }

  let groups = loadGroups();
  let groupingEnabled = localStorage.getItem(ENABLED_KEY) === "true";
  let groupingEnabledAt = localStorage.getItem(ENABLED_AT_KEY) || EPOCH;
  let editingId = "";

  function peopleToken(race) {
    if (race?.custom && race?.customId) return `custom:${race.customId}`;
    return `builtin:${lower(race?.name)}`;
  }
  function peopleCatalog() {
    const map = new Map();
    RACES.forEach(r => {
      const token = peopleToken(r);
      if (!token || token === "builtin:") return;
      if (!map.has(token)) map.set(token,{token,name:r.name,custom:!!r.custom,customId:r.customId || "",factions:new Set()});
      map.get(token).factions.add(r.faction || "Neutral");
    });
    return [...map.values()].sort((a,b) => a.name.localeCompare(b.name,"de"));
  }
  function entryForToken(token) { return peopleCatalog().find(p => p.token === token) || null; }
  function foreverCharacters() { return characters.filter(c => charMode(c) === "forever"); }
  function charactersForEntry(entry) { return foreverCharacters().filter(c => entry && lower(c.race) === lower(entry.name)); }
  function charactersForMembers(tokens) {
    const entries = tokens.map(entryForToken).filter(Boolean);
    return foreverCharacters().filter(c => entries.some(entry => lower(c.race) === lower(entry.name)));
  }
  function statsFor(list) {
    return {total:list.length,existing:list.filter(c => c.status !== "Geplant").length,planned:list.filter(c => c.status === "Geplant").length};
  }
  function metricMarkup(stats) {
    return `<span class="v61-metric"><b>${stats.total}</b><small>gesamt</small></span>` +
      `<span class="v61-metric"><b>${stats.existing}</b><small>vorhanden</small></span>` +
      `<span class="v61-metric"><b>${stats.planned}</b><small>geplant</small></span>`;
  }
  function foreverRows() {
    const catalog = peopleCatalog();
    if (!groupingEnabled) return catalog.map(entry => ({name:entry.name,stats:statsFor(charactersForEntry(entry)),color:entry.custom ? "#b89b4a" : "#7b8797",group:false}));
    const assigned = new Set();
    const rows = [];
    activeGroups().sort((a,b) => a.name.localeCompare(b.name,"de")).forEach(group => {
      const members = group.members.filter(token => entryForToken(token));
      members.forEach(token => assigned.add(token));
      rows.push({name:group.name,stats:statsFor(charactersForMembers(members)),color:"#b89b4a",group:true});
    });
    catalog.filter(entry => !assigned.has(entry.token)).forEach(entry => rows.push({name:entry.name,stats:statsFor(charactersForEntry(entry)),color:entry.custom ? "#b89b4a" : "#7b8797",group:false}));
    return rows;
  }
  function rowsMarkup(rows) {
    const max = Math.max(1,...rows.map(r => r.stats.total));
    return `<div class="v51-bar-list">${rows.map(r => {
      const total=r.stats.total, existing=r.stats.existing, planned=r.stats.planned;
      const outer=total ? total/max*100 : 0;
      const existingShare=total ? existing/total*100 : 0;
      const plannedShare=total ? planned/total*100 : 0;
      const aria = `${r.name} in der Charakterliste filtern`;
      return `<div class="v51-row v77-dashboard-link${r.group ? " v67-group-row" : ""}" role="button" tabindex="0" aria-label="${escapeHtml(aria)}">
        <span class="v51-name">${escapeHtml(r.name)}${r.group ? '<small class="v67-group-tag">Gruppe</small>' : ""}</span>
        <span class="v51-track"><span class="v51-fill" style="width:${outer}%"><i class="v51-active" style="width:${existingShare}%;--v51-active:${r.color}"></i><i class="v51-planned" style="width:${plannedShare}%"></i></span></span>
        <span class="v51-count v61-count">${metricMarkup(r.stats)}</span>
      </div>`;
    }).join("")}</div>`;
  }

  function ensureForeverTools() {
    const grid = document.querySelector("#dashboard .grid-2");
    if (!grid) return;
    let tools = document.querySelector("#v715ForeverPeopleTools");
    if (!tools) {
      tools = document.createElement("div");
      tools.id = "v715ForeverPeopleTools";
      tools.className = "v67-people-tools";
      tools.innerHTML = '<label class="v67-toggle"><input id="v715GroupPeopleToggle" type="checkbox"> <span>Völker zusammenfassen</span></label><span class="muted">Nutzt deine Forever-Völker-Gruppen für die Auswertung.</span>';
      grid.insertAdjacentElement("beforebegin",tools);
      tools.querySelector("#v715GroupPeopleToggle")?.addEventListener("change",e => {
        groupingEnabled = !!e.target.checked;
        groupingEnabledAt = nowIso();
        localStorage.setItem(ENABLED_KEY,String(groupingEnabled));
        localStorage.setItem(ENABLED_AT_KEY,groupingEnabledAt);
        renderForeverChart();
      });
    }
  }
  function renderForeverChart() {
    if (mode() !== "forever") return;
    ensureForeverTools();
    const root = document.querySelector("#v67PeopleCoverage");
    if (root) {
      root.className = "v51-class-bars";
      root.innerHTML = rowsMarkup(foreverRows());
    }
    const toggle = document.querySelector("#v715GroupPeopleToggle");
    if (toggle) toggle.checked = groupingEnabled;
  }

  function memberLabel(entry) {
    const factions=[...entry.factions];
    return entry.name + (entry.custom ? ` — Custom · ${factions.join("/")}` : "");
  }
  function renderMemberChoices(selected=[]) {
    const root=document.querySelector("#v715GroupMembers");
    if(!root)return;
    const selectedSet=new Set(selected);
    root.innerHTML=peopleCatalog().map(entry => `<label class="v67-member-option"><input type="checkbox" value="${escapeHtml(entry.token)}"${selectedSet.has(entry.token)?" checked":""}><span>${escapeHtml(memberLabel(entry))}</span></label>`).join("");
  }
  function resetForm() {
    editingId="";
    const name=document.querySelector("#v715GroupName");if(name)name.value="";
    const save=document.querySelector("#v715SaveGroup");if(save)save.textContent="+ Völker-Gruppe";
    document.querySelector("#v715CancelGroup")?.classList.add("hidden");
    renderMemberChoices([]);
  }
  function beginEdit(id) {
    const group=groups.find(g => g.id===id && !g.deleted);if(!group)return;
    editingId=id;
    const name=document.querySelector("#v715GroupName");if(name)name.value=group.name;
    renderMemberChoices(group.members);
    const save=document.querySelector("#v715SaveGroup");if(save)save.textContent="Änderungen speichern";
    document.querySelector("#v715CancelGroup")?.classList.remove("hidden");
    name?.focus();
  }
  function selectedTokens() { return [...document.querySelectorAll("#v715GroupMembers input[type='checkbox']:checked")].map(el => el.value); }
  function saveFromForm() {
    const name=norm(document.querySelector("#v715GroupName")?.value);
    const members=selectedTokens();
    if(!name){toast("Bitte einen Namen für die Völker-Gruppe eingeben");return;}
    if(members.length<2){toast("Bitte mindestens zwei Völker für die Gruppe auswählen");return;}
    if(activeGroups().some(g => g.id!==editingId && lower(g.name)===lower(name))){toast("Diese Völker-Gruppe ist bereits vorhanden");return;}
    const conflict=activeGroups().find(g => g.id!==editingId && g.members.some(token => members.includes(token)));
    if(conflict){const overlap=conflict.members.find(token=>members.includes(token));toast(`${entryForToken(overlap)?.name || "Ein Volk"} ist bereits der Gruppe „${conflict.name}“ zugeordnet`);return;}
    if(editingId){const group=groups.find(g=>g.id===editingId&&!g.deleted);if(!group){resetForm();return;}group.name=name;group.members=members;group.updatedAt=nowIso();}
    else groups.push({id:uid(),name,members,deleted:false,updatedAt:nowIso()});
    saveGroups();renderGroupList();renderForeverChart();resetForm();toast(`${name} gespeichert`);
  }
  function deleteGroup(id) {
    const group=groups.find(g=>g.id===id&&!g.deleted);if(!group)return;
    if(!confirm(`Völker-Gruppe „${group.name}“ wirklich löschen?`))return;
    group.deleted=true;group.updatedAt=nowIso();saveGroups();renderGroupList();renderForeverChart();if(editingId===id)resetForm();toast(`${group.name} gelöscht`);
  }
  function renderGroupList() {
    const root=document.querySelector("#v715GroupList");if(!root)return;
    const list=activeGroups().sort((a,b)=>a.name.localeCompare(b.name,"de"));
    root.innerHTML=list.length?list.map(group=>{
      const labels=group.members.map(entryForToken).filter(Boolean).map(e=>e.name);
      return `<div class="v67-group-item"><div><strong>${escapeHtml(group.name)}</strong><div class="v67-group-meta">${escapeHtml(labels.join(" · ") || "Keine verfügbaren Völker")}</div></div><div class="v67-group-actions"><button type="button" class="icon-btn" data-v715-edit="${escapeHtml(group.id)}" title="Völker-Gruppe bearbeiten">✎</button><button type="button" class="icon-btn" data-v715-delete="${escapeHtml(group.id)}" title="Völker-Gruppe löschen">×</button></div></div>`;
    }).join(""):'<div class="muted">Noch keine Forever-Völker-Gruppen angelegt.</div>';
  }
  function ensurePanel() {
    const grid=document.querySelector("#settings .settings-grid");if(!grid)return;
    if(!document.querySelector("#v715ForeverPeopleGroups")){
      const panel=document.createElement("article");
      panel.id="v715ForeverPeopleGroups";panel.className="panel";
      panel.innerHTML=`<div class="panel-head"><div><div class="eyebrow">FOREVER · AUSWERTUNG</div><h3>Völker-Gruppen</h3></div></div>
        <p class="muted">Forever-Völker-Gruppen sind vollständig von deinen Retail-Gruppen getrennt.</p>
        <div class="v67-group-form"><label class="field field-full"><span>Gruppenname</span><input id="v715GroupName" maxlength="40" placeholder="z. B. Menschen"></label><div class="field field-full"><span>Völker in dieser Gruppe</span><div id="v715GroupMembers" class="v67-member-grid"></div></div><div class="v67-form-actions"><button id="v715SaveGroup" type="button" class="btn btn-primary">+ Völker-Gruppe</button><button id="v715CancelGroup" type="button" class="btn btn-ghost hidden">Abbrechen</button></div></div>
        <div id="v715GroupList" class="v67-group-list"></div><div id="v715GroupSyncState" class="muted v67-sync-note">Wird über den GitHub-Sync in <code>${CLOUD_PATH}</code> mitgeführt.</div>`;
      const racePanel=document.querySelector("#v714ForeverRaces");
      if(racePanel)racePanel.insertAdjacentElement("afterend",panel);else grid.insertAdjacentElement("afterbegin",panel);
      panel.querySelector("#v715SaveGroup")?.addEventListener("click",saveFromForm);
      panel.querySelector("#v715CancelGroup")?.addEventListener("click",resetForm);
      panel.querySelector("#v715GroupName")?.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();saveFromForm();}});
      panel.addEventListener("click",e=>{const edit=e.target.closest("[data-v715-edit]");if(edit){beginEdit(edit.dataset.v715Edit);return;}const del=e.target.closest("[data-v715-delete]");if(del)deleteGroup(del.dataset.v715Delete);});
    }
    renderGroupList();
    if(!editingId)renderMemberChoices([]);
  }

  function syncModeUi() {
    ensurePanel();ensureForeverTools();
    const forever=mode()==="forever";
    document.querySelector("#v67PeopleGroups")?.toggleAttribute("hidden",forever);
    document.querySelector("#v715ForeverPeopleGroups")?.toggleAttribute("hidden",!forever);
    document.querySelector("#v67PeopleTools")?.toggleAttribute("hidden",forever);
    document.querySelector("#v715ForeverPeopleTools")?.toggleAttribute("hidden",!forever);
    if(forever){renderGroupList();if(!editingId)renderMemberChoices([]);renderForeverChart();}
    const brand=document.querySelector(".brand-sub");
    if(brand)brand.textContent=forever?`WoW Forever · ${VERSION}`:`WoW Retail · 12.1 · ${VERSION}`;
  }

  function getToken(){return sessionStorage.getItem(TOKEN_SESSION_KEY)||localStorage.getItem(TOKEN_LOCAL_KEY)||"";}
  function getConfig(){try{return {repo:"domxx1/wow-character-planner-data",branch:"main",...JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}")} }catch{return {repo:"domxx1/wow-character-planner-data",branch:"main"};}}
  function bytesToBase64(bytes){let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);}
  function textToBase64(text){return bytesToBase64(new TextEncoder().encode(text));}
  function base64ToText(base64){const binary=atob(String(base64||"").replace(/\s/g,""));const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return new TextDecoder().decode(bytes);}
  async function ghRequest(url,options={}){const token=getToken();if(!token)throw new Error("GitHub-Token fehlt.");const response=await fetch(url,{...options,cache:"no-store",headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(options.headers||{})}});if(response.status===404)return null;let body=null;try{body=await response.json();}catch{}if(!response.ok)throw new Error(body?.message||`GitHub API: HTTP ${response.status}`);return body;}
  function cloudUrl(){const cfg=getConfig();return `https://api.github.com/repos/${cfg.repo}/contents/${CLOUD_PATH.split("/").map(encodeURIComponent).join("/")}`;}
  async function readCloud(){const cfg=getConfig();const file=await ghRequest(`${cloudUrl()}?ref=${encodeURIComponent(cfg.branch||"main")}`);if(!file)return{file:null,groups:[],enabled:false,enabledUpdatedAt:EPOCH};const payload=JSON.parse(base64ToText(file.content));return{file,groups:Array.isArray(payload?.groups)?payload.groups.map(normalizeGroup).filter(Boolean):[],enabled:!!payload?.enabled,enabledUpdatedAt:String(payload?.enabledUpdatedAt||EPOCH)};}
  async function writeCloud(file,list,enabled,enabledUpdatedAt){const cfg=getConfig();const payload={version:1,updatedAt:nowIso(),enabled:!!enabled,enabledUpdatedAt:enabledUpdatedAt||EPOCH,groups:list};const body={message:`Sync Forever people groups ${new Date().toLocaleString("de-DE")}`,content:textToBase64(JSON.stringify(payload,null,2)),branch:cfg.branch||"main"};if(file?.sha)body.sha=file.sha;await ghRequest(cloudUrl(),{method:"PUT",body:JSON.stringify(body)});}
  function mergeGroups(local,remote){const map=new Map();[...local,...remote].forEach(group=>{const current=map.get(group.id);if(!current||new Date(group.updatedAt||0).getTime()>=new Date(current.updatedAt||0).getTime())map.set(group.id,{...group});});return[...map.values()];}
  function applyState(nextGroups,enabled,enabledAt){groups=nextGroups.map(normalizeGroup).filter(Boolean);groupingEnabled=!!enabled;groupingEnabledAt=enabledAt||EPOCH;saveGroups();localStorage.setItem(ENABLED_KEY,String(groupingEnabled));localStorage.setItem(ENABLED_AT_KEY,groupingEnabledAt);renderGroupList();renderMemberChoices(editingId?groups.find(g=>g.id===editingId)?.members||[]:[]);if(mode()==="forever")renderForeverChart();}
  function syncStatus(text,error=false){const el=document.querySelector("#v715GroupSyncState");if(el){el.textContent=text;el.classList.toggle("v67-sync-error",error);}}
  async function pushGroups(){try{const{file}=await readCloud();await writeCloud(file,groups,groupingEnabled,groupingEnabledAt);syncStatus(`${activeGroups().length} Forever-Völker-Gruppen auf GitHub gespeichert.`);}catch(err){syncStatus(`Forever-Völker-Gruppen-Sync: ${err.message||err}`,true);}}
  async function pullGroups(){try{const remote=await readCloud();if(!remote.file){syncStatus("Noch keine Forever-Völker-Gruppen-Datei in GitHub.");return;}applyState(remote.groups,remote.enabled,remote.enabledUpdatedAt);syncStatus(`${activeGroups().length} Forever-Völker-Gruppen von GitHub geladen.`);}catch(err){syncStatus(`Forever-Völker-Gruppen-Sync: ${err.message||err}`,true);}}
  async function syncGroups(){try{const remote=await readCloud();const merged=mergeGroups(groups,remote.groups);const localTs=new Date(groupingEnabledAt||0).getTime(),remoteTs=new Date(remote.enabledUpdatedAt||0).getTime();const enabled=remoteTs>localTs?remote.enabled:groupingEnabled;const enabledAt=remoteTs>localTs?remote.enabledUpdatedAt:groupingEnabledAt;applyState(merged,enabled,enabledAt);await writeCloud(remote.file,groups,groupingEnabled,groupingEnabledAt);syncStatus(`${activeGroups().length} Forever-Völker-Gruppen synchronisiert.`);}catch(err){syncStatus(`Forever-Völker-Gruppen-Sync: ${err.message||err}`,true);}}

  document.querySelector("#v6Push")?.addEventListener("click",pushGroups);
  document.querySelector("#v6Pull")?.addEventListener("click",pullGroups);
  document.querySelector("#v6Sync")?.addEventListener("click",syncGroups);

  const previousRenderDashboard=renderDashboard;
  renderDashboard=function(){previousRenderDashboard();if(mode()==="forever")renderForeverChart();syncModeUi();};
  const previousRenderAll=renderAll;
  renderAll=function(){previousRenderAll();syncModeUi();};

  document.addEventListener("click",e=>{if(e.target.closest?.("[data-v714-mode]"))setTimeout(syncModeUi,0);},true);

  const style=document.createElement("style");
  style.textContent=`#v715ForeverPeopleGroups[hidden],#v715ForeverPeopleTools[hidden]{display:none!important}`;
  document.head.appendChild(style);

  ensurePanel();ensureForeverTools();syncModeUi();
})();
