/* v0.6.7 — People terminology, people dashboard bars and user-defined people groups. */
(() => {
  const VERSION = "0.6.7";
  const GROUP_STORAGE_KEY = "wowCharacterPlanner.peopleGroups.v1";
  const GROUP_ENABLED_KEY = "wowCharacterPlanner.peopleGroupsEnabled.v1";
  const GROUP_ENABLED_AT_KEY = "wowCharacterPlanner.peopleGroupsEnabledAt.v1";
  const CONFIG_KEY = "wowCharacterPlanner.githubSync.v1";
  const TOKEN_LOCAL_KEY = "wowCharacterPlanner.githubToken.local";
  const TOKEN_SESSION_KEY = "wowCharacterPlanner.githubToken.session";
  const CLOUD_PATH = "data/people-groups.json";
  const EPOCH = "1970-01-01T00:00:00.000Z";

  const nowIso = () => new Date().toISOString();
  const normName = value => String(value || "").trim().replace(/\s+/g, " ");
  const lower = value => normName(value).toLocaleLowerCase("de");
  const isExisting = c => c.status !== "Geplant";

  function normalizeGroup(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = normName(raw.name);
    if (!name) return null;
    const members = [...new Set((Array.isArray(raw.members) ? raw.members : []).map(v => String(v || "").trim()).filter(Boolean))];
    return {
      id: String(raw.id || uid()),
      name,
      members,
      deleted: !!raw.deleted,
      updatedAt: String(raw.updatedAt || nowIso())
    };
  }
  function loadGroups() {
    try {
      const parsed = JSON.parse(localStorage.getItem(GROUP_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeGroup).filter(Boolean) : [];
    } catch { return []; }
  }
  function saveGroups() { localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groups)); }
  function activeGroups() { return groups.filter(g => !g.deleted); }

  let groups = loadGroups();
  let groupingEnabled = localStorage.getItem(GROUP_ENABLED_KEY) === "true";
  let groupingEnabledAt = localStorage.getItem(GROUP_ENABLED_AT_KEY) || EPOCH;
  let editingGroupId = "";

  function peopleToken(race) {
    if (race?.custom && race?.customId) return `custom:${race.customId}`;
    return `builtin:${lower(race?.name)}`;
  }
  function peopleCatalog() {
    const map = new Map();
    RACES.forEach(r => {
      const token = peopleToken(r);
      if (!token || token === "builtin:") return;
      if (!map.has(token)) map.set(token, {
        token,
        name:r.name,
        custom:!!r.custom,
        customId:r.customId || "",
        factions:new Set()
      });
      map.get(token).factions.add(r.faction || "Neutral");
    });
    return [...map.values()].sort((a,b) => a.name.localeCompare(b.name,"de"));
  }
  function entryForToken(token) { return peopleCatalog().find(p => p.token === token) || null; }
  function characterMatchesEntry(c, entry) { return !!entry && lower(c.race) === lower(entry.name); }
  function charactersForMembers(memberTokens) {
    const entries = memberTokens.map(entryForToken).filter(Boolean);
    return characters.filter(c => entries.some(entry => characterMatchesEntry(c, entry)));
  }

  function statsFor(list) {
    return {
      total:list.length,
      existing:list.filter(isExisting).length,
      planned:list.filter(c => c.status === "Geplant").length
    };
  }
  function metricMarkup(stats) {
    return `<span class="v61-metric"><b>${stats.total}</b><small>gesamt</small></span>` +
      `<span class="v61-metric"><b>${stats.existing}</b><small>vorhanden</small></span>` +
      `<span class="v61-metric"><b>${stats.planned}</b><small>geplant</small></span>`;
  }
  function peopleRowsMarkup(rows) {
    const max = Math.max(1, ...rows.map(r => r.stats.total));
    return `<div class="v51-bar-list">${rows.map(r => {
      const total = r.stats.total;
      const planned = r.stats.planned;
      const existing = r.stats.existing;
      const outer = total ? (total / max) * 100 : 0;
      const existingShare = total ? (existing / total) * 100 : 0;
      const plannedShare = total ? (planned / total) * 100 : 0;
      return `<div class="v51-row${r.group ? " v67-group-row" : ""}">
        <span class="v51-name">${escapeHtml(r.name)}${r.group ? '<small class="v67-group-tag">Gruppe</small>' : ""}</span>
        <span class="v51-track"><span class="v51-fill" style="width:${outer}%">
          <i class="v51-active" style="width:${existingShare}%;--v51-active:${r.color || "#8f7e58"}"></i>
          <i class="v51-planned" style="width:${plannedShare}%"></i>
        </span></span>
        <span class="v51-count v61-count">${metricMarkup(r.stats)}</span>
      </div>`;
    }).join("")}</div>`;
  }

  function peopleRows() {
    const catalog = peopleCatalog();
    if (!groupingEnabled) {
      return catalog.map(entry => ({
        name:entry.name,
        stats:statsFor(characters.filter(c => characterMatchesEntry(c, entry))),
        color:entry.custom ? "#b89b4a" : "#7b8797",
        group:false
      }));
    }

    const assigned = new Set();
    const rows = [];
    activeGroups().sort((a,b) => a.name.localeCompare(b.name,"de")).forEach(group => {
      const members = group.members.filter(token => entryForToken(token));
      members.forEach(token => assigned.add(token));
      rows.push({
        name:group.name,
        stats:statsFor(charactersForMembers(members)),
        color:"#b89b4a",
        group:true
      });
    });
    catalog.filter(entry => !assigned.has(entry.token)).forEach(entry => rows.push({
      name:entry.name,
      stats:statsFor(characters.filter(c => characterMatchesEntry(c, entry))),
      color:entry.custom ? "#b89b4a" : "#7b8797",
      group:false
    }));
    return rows;
  }

  function ensurePeopleDashboard() {
    const grid = document.querySelector("#dashboard .grid-2");
    const classPanel = document.querySelector("#classCoverage")?.closest("article.panel");
    if (grid && classPanel && !document.querySelector("#v67PeoplePanel")) {
      const panel = document.createElement("article");
      panel.id = "v67PeoplePanel";
      panel.className = "panel";
      panel.innerHTML = '<div class="panel-head"><div><div class="eyebrow">VÖLKER</div><h3>Verteilung</h3></div></div><div id="v67PeopleCoverage"></div>';
      classPanel.insertAdjacentElement("afterend", panel);
    }

    if (grid && !document.querySelector("#v67PeopleTools")) {
      const tools = document.createElement("div");
      tools.id = "v67PeopleTools";
      tools.className = "v67-people-tools";
      tools.innerHTML = '<label class="v67-toggle"><input id="v67GroupPeopleToggle" type="checkbox"> <span>Völker zusammenfassen</span></label><span class="muted">Nutzt deine manuellen Völker-Gruppen für die Auswertung.</span>';
      grid.insertAdjacentElement("beforebegin", tools);
      const checkbox = document.querySelector("#v67GroupPeopleToggle");
      if (checkbox) {
        checkbox.checked = groupingEnabled;
        checkbox.addEventListener("change", () => {
          groupingEnabled = checkbox.checked;
          groupingEnabledAt = nowIso();
          localStorage.setItem(GROUP_ENABLED_KEY, String(groupingEnabled));
          localStorage.setItem(GROUP_ENABLED_AT_KEY, groupingEnabledAt);
          renderPeopleChart();
        });
      }
    }
  }

  function renderPeopleChart() {
    ensurePeopleDashboard();
    const root = document.querySelector("#v67PeopleCoverage");
    if (!root) return;
    root.className = "v51-class-bars";
    root.innerHTML = peopleRowsMarkup(peopleRows());
    const toggle = document.querySelector("#v67GroupPeopleToggle");
    if (toggle) toggle.checked = groupingEnabled;
  }

  function translatePeopleTermsIn(root=document) {
    const replacements = [
      [/Rassen-Klassen/g,"Völker-Klassen"],
      [/Rassen/g,"Völker"],
      [/Rasse/g,"Volk"]
    ];
    const skip = new Set(["SCRIPT","STYLE","CODE","PRE"]);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      if (skip.has(node.parentElement?.tagName)) return;
      let next = node.nodeValue;
      replacements.forEach(([re,to]) => { next = next.replace(re,to); });
      if (next !== node.nodeValue) node.nodeValue = next;
    });
    root.querySelectorAll?.("[title],[aria-label],[placeholder]").forEach(el => {
      ["title","aria-label","placeholder"].forEach(attr => {
        if (!el.hasAttribute(attr)) return;
        let next = el.getAttribute(attr) || "";
        replacements.forEach(([re,to]) => { next = next.replace(re,to); });
        el.setAttribute(attr,next);
      });
    });
  }

  const previousToast = toast;
  toast = function(message) {
    let text = String(message ?? "");
    text = text.replace(/Rassen-Klassen/g,"Völker-Klassen").replace(/Rassen/g,"Völker").replace(/Rasse/g,"Volk");
    previousToast(text);
  };

  const previousSetView = setView;
  setView = function(view) {
    previousSetView(view);
    if (view === "matrix" && document.querySelector("#viewTitle")) document.querySelector("#viewTitle").textContent = "Volk × Klasse";
    translatePeopleTermsIn(document);
  };

  function memberLabel(entry) {
    const factions = [...entry.factions];
    const suffix = entry.custom ? ` — Custom · ${factions.join("/")}` : "";
    return entry.name + suffix;
  }
  function renderMemberChoices(selected=[]) {
    const root = document.querySelector("#v67GroupMembers");
    if (!root) return;
    const selectedSet = new Set(selected);
    root.innerHTML = peopleCatalog().map(entry => `<label class="v67-member-option"><input type="checkbox" value="${escapeHtml(entry.token)}"${selectedSet.has(entry.token) ? " checked" : ""}><span>${escapeHtml(memberLabel(entry))}</span></label>`).join("");
  }

  function resetGroupForm() {
    editingGroupId = "";
    const name = document.querySelector("#v67GroupName");
    const save = document.querySelector("#v67SaveGroup");
    const cancel = document.querySelector("#v67CancelGroup");
    if (name) name.value = "";
    if (save) save.textContent = "+ Völker-Gruppe";
    cancel?.classList.add("hidden");
    renderMemberChoices([]);
  }

  function beginGroupEdit(id) {
    const group = groups.find(g => g.id === id && !g.deleted);
    if (!group) return;
    editingGroupId = id;
    const name = document.querySelector("#v67GroupName");
    if (name) name.value = group.name;
    renderMemberChoices(group.members);
    const save = document.querySelector("#v67SaveGroup");
    if (save) save.textContent = "Änderungen speichern";
    document.querySelector("#v67CancelGroup")?.classList.remove("hidden");
    name?.focus();
  }

  function selectedMemberTokens() {
    return [...document.querySelectorAll("#v67GroupMembers input[type='checkbox']:checked")].map(el => el.value);
  }

  function saveGroupFromForm() {
    const name = normName(document.querySelector("#v67GroupName")?.value);
    const members = selectedMemberTokens();
    if (!name) { toast("Bitte einen Namen für die Völker-Gruppe eingeben"); return; }
    if (members.length < 2) { toast("Bitte mindestens zwei Völker für die Gruppe auswählen"); return; }
    const duplicateName = activeGroups().some(g => g.id !== editingGroupId && lower(g.name) === lower(name));
    if (duplicateName) { toast("Diese Völker-Gruppe ist bereits vorhanden"); return; }
    const conflict = activeGroups().find(g => g.id !== editingGroupId && g.members.some(token => members.includes(token)));
    if (conflict) {
      const overlap = conflict.members.find(token => members.includes(token));
      const entry = entryForToken(overlap);
      toast(`${entry?.name || "Ein Volk"} ist bereits der Gruppe „${conflict.name}“ zugeordnet`);
      return;
    }

    if (editingGroupId) {
      const group = groups.find(g => g.id === editingGroupId && !g.deleted);
      if (!group) { resetGroupForm(); return; }
      group.name = name;
      group.members = members;
      group.updatedAt = nowIso();
      toast(`${name} gespeichert`);
    } else {
      groups.push({id:uid(),name,members,deleted:false,updatedAt:nowIso()});
      toast(`${name} hinzugefügt`);
    }
    saveGroups();
    renderGroupList();
    renderPeopleChart();
    resetGroupForm();
  }

  function deleteGroup(id) {
    const group = groups.find(g => g.id === id && !g.deleted);
    if (!group) return;
    if (!confirm(`Völker-Gruppe „${group.name}“ wirklich löschen?`)) return;
    group.deleted = true;
    group.updatedAt = nowIso();
    saveGroups();
    renderGroupList();
    renderPeopleChart();
    if (editingGroupId === id) resetGroupForm();
    toast(`${group.name} gelöscht`);
  }

  function renderGroupList() {
    const root = document.querySelector("#v67GroupList");
    if (!root) return;
    const list = activeGroups().sort((a,b) => a.name.localeCompare(b.name,"de"));
    root.innerHTML = list.length ? list.map(group => {
      const labels = group.members.map(entryForToken).filter(Boolean).map(entry => entry.name);
      return `<div class="v67-group-item"><div><strong>${escapeHtml(group.name)}</strong><div class="v67-group-meta">${escapeHtml(labels.join(" · ") || "Keine verfügbaren Völker")}</div></div><div class="v67-group-actions"><button type="button" class="icon-btn" data-v67-edit="${escapeHtml(group.id)}" title="Völker-Gruppe bearbeiten">✎</button><button type="button" class="icon-btn" data-v67-delete="${escapeHtml(group.id)}" title="Völker-Gruppe löschen">×</button></div></div>`;
    }).join("") : '<div class="muted">Noch keine Völker-Gruppen angelegt.</div>';
  }

  function ensureGroupPanel() {
    const grid = document.querySelector("#settings .settings-grid");
    if (!grid || document.querySelector("#v67PeopleGroups")) return;
    const panel = document.createElement("article");
    panel.id = "v67PeopleGroups";
    panel.className = "panel";
    panel.innerHTML = `
      <div class="panel-head"><div><div class="eyebrow">AUSWERTUNG</div><h3>Völker-Gruppen</h3></div></div>
      <p class="muted">Fasse Völker für die Statistik manuell zusammen, z. B. Menschen + Kul Tiraner + Worgen → Menschen. Die Charakterdaten selbst bleiben unverändert.</p>
      <div class="v67-group-form">
        <label class="field field-full"><span>Gruppenname</span><input id="v67GroupName" maxlength="40" placeholder="z. B. Menschen"></label>
        <div class="field field-full"><span>Völker in dieser Gruppe</span><div id="v67GroupMembers" class="v67-member-grid"></div></div>
        <div class="v67-form-actions"><button id="v67SaveGroup" type="button" class="btn btn-primary">+ Völker-Gruppe</button><button id="v67CancelGroup" type="button" class="btn btn-ghost hidden">Abbrechen</button></div>
      </div>
      <div id="v67GroupList" class="v67-group-list"></div>
      <div id="v67GroupSyncState" class="muted v67-sync-note">Wird über den GitHub-Sync in <code>${CLOUD_PATH}</code> mitgeführt.</div>`;
    const racePanel = document.querySelector("#v65CustomRaces");
    if (racePanel) racePanel.insertAdjacentElement("afterend", panel);
    else {
      const classPanel = document.querySelector("#v66CustomClasses");
      if (classPanel) classPanel.insertAdjacentElement("beforebegin", panel);
      else grid.insertAdjacentElement("afterbegin", panel);
    }
    document.querySelector("#v67SaveGroup")?.addEventListener("click", saveGroupFromForm);
    document.querySelector("#v67CancelGroup")?.addEventListener("click", resetGroupForm);
    document.querySelector("#v67GroupName")?.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); saveGroupFromForm(); }
    });
    panel.addEventListener("click", e => {
      const edit = e.target.closest("[data-v67-edit]");
      if (edit) { beginGroupEdit(edit.dataset.v67Edit); return; }
      const del = e.target.closest("[data-v67-delete]");
      if (del) deleteGroup(del.dataset.v67Delete);
    });
    renderMemberChoices([]);
    renderGroupList();
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
    if(!file) return {file:null,groups:[],enabled:false,enabledUpdatedAt:EPOCH};
    const payload=JSON.parse(base64ToText(file.content));
    return {
      file,
      groups:Array.isArray(payload?.groups) ? payload.groups.map(normalizeGroup).filter(Boolean) : [],
      enabled:!!payload?.enabled,
      enabledUpdatedAt:String(payload?.enabledUpdatedAt || EPOCH)
    };
  }
  async function writeCloud(file,list,enabled,enabledUpdatedAt) {
    const config=getConfig();
    const payload={version:1,updatedAt:nowIso(),enabled:!!enabled,enabledUpdatedAt:enabledUpdatedAt||EPOCH,groups:list};
    const body={message:`Sync people groups ${new Date().toLocaleString("de-DE")}`,content:textToBase64(JSON.stringify(payload,null,2)),branch:config.branch||"main"};
    if(file?.sha) body.sha=file.sha;
    await ghRequest(cloudUrl(),{method:"PUT",body:JSON.stringify(body)});
  }
  function mergeGroups(local,remote) {
    const map=new Map();
    [...local,...remote].forEach(group => {
      const current=map.get(group.id);
      if(!current || new Date(group.updatedAt||0).getTime() >= new Date(current.updatedAt||0).getTime()) map.set(group.id,{...group});
    });
    return [...map.values()];
  }
  function applyGroupState(nextGroups, enabled, enabledUpdatedAt) {
    groups=nextGroups.map(normalizeGroup).filter(Boolean);
    groupingEnabled=!!enabled;
    groupingEnabledAt=enabledUpdatedAt || EPOCH;
    saveGroups();
    localStorage.setItem(GROUP_ENABLED_KEY,String(groupingEnabled));
    localStorage.setItem(GROUP_ENABLED_AT_KEY,groupingEnabledAt);
    renderGroupList();
    renderMemberChoices(editingGroupId ? groups.find(g=>g.id===editingGroupId)?.members || [] : []);
    renderPeopleChart();
  }
  function syncStatus(text,error=false) {
    const el=document.querySelector("#v67GroupSyncState");
    if(el){el.textContent=text;el.classList.toggle("v67-sync-error",error);}
  }
  async function pushGroups() {
    try {
      const {file}=await readCloud();
      await writeCloud(file,groups,groupingEnabled,groupingEnabledAt);
      syncStatus(`${activeGroups().length} Völker-Gruppen auf GitHub gespeichert.`);
    } catch(err){ syncStatus(`Völker-Gruppen-Sync: ${err.message||err}`,true); }
  }
  async function pullGroups() {
    try {
      const remote=await readCloud();
      if(!remote.file){syncStatus("Noch keine Völker-Gruppen-Datei in GitHub.");return;}
      applyGroupState(remote.groups,remote.enabled,remote.enabledUpdatedAt);
      syncStatus(`${activeGroups().length} Völker-Gruppen von GitHub geladen.`);
    } catch(err){ syncStatus(`Völker-Gruppen-Sync: ${err.message||err}`,true); }
  }
  async function syncGroups() {
    try {
      const remote=await readCloud();
      const merged=mergeGroups(groups,remote.groups);
      const localTs=new Date(groupingEnabledAt||0).getTime();
      const remoteTs=new Date(remote.enabledUpdatedAt||0).getTime();
      const enabled = remoteTs > localTs ? remote.enabled : groupingEnabled;
      const enabledAt = remoteTs > localTs ? remote.enabledUpdatedAt : groupingEnabledAt;
      applyGroupState(merged,enabled,enabledAt);
      await writeCloud(remote.file,groups,groupingEnabled,groupingEnabledAt);
      syncStatus(`${activeGroups().length} Völker-Gruppen synchronisiert.`);
    } catch(err){ syncStatus(`Völker-Gruppen-Sync: ${err.message||err}`,true); }
  }

  document.querySelector("#v6Push")?.addEventListener("click",pushGroups);
  document.querySelector("#v6Pull")?.addEventListener("click",pullGroups);
  document.querySelector("#v6Sync")?.addEventListener("click",syncGroups);

  const previousRenderAll = renderAll;
  renderAll = function() {
    previousRenderAll();
    ensurePeopleDashboard();
    ensureGroupPanel();
    renderPeopleChart();
    renderGroupList();
    if (!editingGroupId) renderMemberChoices([]);
    translatePeopleTermsIn(document);
  };

  const style=document.createElement("style");
  style.textContent=`
    #v67PeopleCoverage{display:grid;gap:11px}
    .v67-people-tools{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin:16px 0 10px;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(255,255,255,.025)}
    .v67-toggle{display:flex;align-items:center;gap:7px;font-size:.82rem;font-weight:700;color:var(--text)}
    .v67-toggle input{accent-color:#b89b4a}
    .v67-group-tag{display:block;margin-top:2px;font-size:.56rem;letter-spacing:.04em;text-transform:uppercase;color:#c5aa62}
    .v67-group-form{display:grid;gap:10px;margin:14px 0}.v67-member-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 10px;max-height:260px;overflow:auto;padding:9px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.02)}
    .v67-member-option{display:flex;align-items:center;gap:7px;padding:5px 6px;border-radius:7px;font-size:.78rem}.v67-member-option:hover{background:rgba(255,255,255,.04)}.v67-member-option input{accent-color:#b89b4a}
    .v67-form-actions,.v67-group-actions{display:flex;gap:8px;align-items:center}.v67-group-list{display:grid;gap:8px;margin-top:10px}.v67-group-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.025)}
    .v67-group-meta{margin-top:4px;color:var(--muted);font-size:.72rem;line-height:1.35}.v67-sync-note{margin-top:10px;font-size:.75rem}.v67-sync-error{color:#e27a7a!important}
    @media(max-width:640px){.v67-member-grid{grid-template-columns:1fr}.v67-people-tools{align-items:flex-start}.v67-group-item{align-items:flex-start}}
  `;
  document.head.appendChild(style);

  ensurePeopleDashboard();
  ensureGroupPanel();
  renderPeopleChart();
  renderGroupList();
  renderMemberChoices([]);
  translatePeopleTermsIn(document);

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => m.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) translatePeopleTermsIn(node);
      else if (node.nodeType === Node.TEXT_NODE && node.parentElement) translatePeopleTermsIn(node.parentElement);
    }));
  });
  observer.observe(document.body,{childList:true,subtree:true});

  const brandSub=document.querySelector(".brand-sub");
  if(brandSub) brandSub.textContent=`WoW Retail · 12.1 · ${VERSION}`;
})();
