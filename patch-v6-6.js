/* v0.6.6 — Editable custom races and user-defined custom classes with GitHub sync. */
(() => {
  const VERSION = "0.6.6";
  const CLASS_STORAGE_KEY = "wowCharacterPlanner.customClasses.v1";
  const RACE_STORAGE_KEY = "wowCharacterPlanner.customRaces.v1";
  const CONFIG_KEY = "wowCharacterPlanner.githubSync.v1";
  const TOKEN_LOCAL_KEY = "wowCharacterPlanner.githubToken.local";
  const TOKEN_SESSION_KEY = "wowCharacterPlanner.githubToken.session";
  const CLASS_CLOUD_PATH = "data/custom-classes.json";
  const RETURN_SETTINGS_KEY = "wowCharacterPlanner.v66.returnSettings";
  const FLASH_KEY = "wowCharacterPlanner.v66.flash";

  const nowIso = () => new Date().toISOString();
  const normName = value => String(value || "").trim().replace(/\s+/g, " ");
  const lower = value => normName(value).toLocaleLowerCase("de");
  const ARMORS = ["", "Stoff", "Leder", "Kette", "Platte"];
  const DEFAULT_COLOR = "#64748b";

  function normalizeColor(value) {
    const color = String(value || "").trim();
    return /^#[0-9a-f]{6}$/i.test(color) ? color : DEFAULT_COLOR;
  }
  function normalizeClassRecord(raw) {
    if (!raw || typeof raw !== "object") return null;
    const name = normName(raw.name);
    if (!name) return null;
    const armor = ARMORS.includes(raw.armor) ? raw.armor : "";
    return {
      id: String(raw.id || uid()),
      name,
      armor,
      color: normalizeColor(raw.color),
      deleted: !!raw.deleted,
      updatedAt: String(raw.updatedAt || nowIso())
    };
  }
  function loadClassRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CLASS_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normalizeClassRecord).filter(Boolean) : [];
    } catch { return []; }
  }
  function saveClassRecords() {
    localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(classRecords));
  }
  function activeClassRecords() { return classRecords.filter(r => !r.deleted); }
  function isCustomClassName(name) { return activeClassRecords().some(r => lower(r.name) === lower(name)); }
  window.wowCharacterPlannerIsCustomClass = isCustomClassName;

  let classRecords = loadClassRecords();
  const builtInClassNames = new Set(CLASSES.filter(c => !c.customClass).map(c => lower(c.name)));

  function classByName(name) { return CLASSES.find(c => c.name === name) || null; }
  function raceKey(r) { return r?.key || `${r?.name || ""}|${r?.faction || ""}`; }
  function selectedRace() {
    const value = document.querySelector("#charRace")?.value || "";
    return RACES.find(r => raceKey(r) === value) || null;
  }

  const previousValidity = window.wowCharacterPlannerIsValidCombo;
  window.wowCharacterPlannerIsValidCombo = function(race, className) {
    if (isCustomClassName(className)) return true;
    return typeof previousValidity === "function" ? previousValidity(race, className) : true;
  };

  function refreshClassFilter() {
    const select = document.querySelector("#filterClass");
    if (!select) return;
    const keep = select.value;
    select.innerHTML = '<option value="">Alle Klassen</option>' + CLASSES.map(c =>
      `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name + (c.customClass ? " — Custom" : ""))}</option>`
    ).join("");
    if ([...select.options].some(o => o.value === keep)) select.value = keep;
  }

  function refreshClassSelect(preferred="") {
    const select = document.querySelector("#charClass");
    if (!select) return;
    const race = selectedRace();
    const keep = preferred || select.value;
    const allowed = race
      ? CLASSES.filter(c => c.customClass || window.wowCharacterPlannerIsValidCombo?.(race.name, c.name))
      : CLASSES;
    select.innerHTML = allowed.map(c =>
      `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name + (c.customClass ? " — Custom" : ""))}</option>`
    ).join("");
    if (allowed.some(c => c.name === keep)) select.value = keep;
    else if (allowed.length) select.value = allowed[0].name;
  }

  function applyClassCatalog(preferred="") {
    for (let i = CLASSES.length - 1; i >= 0; i--) {
      if (CLASSES[i]?.customClass === true) CLASSES.splice(i, 1);
    }
    activeClassRecords()
      .sort((a,b) => a.name.localeCompare(b.name, "de"))
      .forEach(r => CLASSES.push({
        name: r.name,
        armor: r.armor || "–",
        color: r.color || DEFAULT_COLOR,
        custom: true,
        customClass: true,
        customId: r.id
      }));
    refreshClassFilter();
    refreshClassSelect(preferred);
  }

  const previousOpenCharacter = openCharacter;
  openCharacter = function(id=null, preset={}) {
    previousOpenCharacter(id, preset);
    const c = id ? characters.find(x => x.id === id) : null;
    refreshClassSelect(c?.className || preset.className || "");
  };

  document.querySelector("#charRace")?.addEventListener("change", () => refreshClassSelect());

  function safeAvatar(value, fallback="") {
    const s = String(value || "").trim();
    if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(s) || /^https?:\/\//i.test(s)) return s;
    return fallback;
  }

  function saveCustomClassCharacter() {
    const selectedClass = classByName(document.querySelector("#charClass")?.value || "");
    if (!selectedClass?.customClass) return false;
    const race = selectedRace();
    if (race?.custom) return false;

    const id = document.querySelector("#charId")?.value || "";
    const existing = id ? characters.find(c => c.id === id) : null;
    const levelRaw = Number.parseInt(document.querySelector("#charLevel")?.value || "", 10);
    const data = {
      ...(existing || {}),
      id: id || uid(),
      name: document.querySelector("#charName")?.value.trim() || "",
      race: race?.name || "",
      variant: document.querySelector("#charVariant")?.value.trim() || "",
      faction: race?.faction || document.querySelector("#charFaction")?.value || "Neutral",
      className: selectedClass.name,
      gender: document.querySelector("#charGender")?.value || "",
      profession1: document.querySelector("#charProfession1")?.value || "",
      profession2: document.querySelector("#charProfession2")?.value || "",
      status: document.querySelector("#charStatus")?.value || "Geplant",
      level: Number.isFinite(levelRaw) && levelRaw > 0 ? Math.min(90, levelRaw) : "",
      specialization: document.querySelector("#charSpecialization")?.value.trim() || "",
      realm: document.querySelector("#charRealm")?.value.trim() || "",
      region: document.querySelector("#charRegion")?.value || "eu",
      remixEvent: document.querySelector("#charRemix")?.value.trim() || "",
      avatarUrl: safeAvatar(document.querySelector("#charAvatar")?.value, existing?.avatarUrl || ""),
      armoryUrl: "",
      notes: document.querySelector("#charNotes")?.value.trim() || ""
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
    if (saveCustomClassCharacter()) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  document.querySelector("#characterForm")?.addEventListener("keydown", e => {
    if (e.key !== "Enter" || e.target?.tagName === "TEXTAREA") return;
    const cls = classByName(document.querySelector("#charClass")?.value || "");
    if (!cls?.customClass || selectedRace()?.custom) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    saveCustomClassCharacter();
  }, true);

  function decorateCustomClassHeaders() {
    const headers = document.querySelectorAll("#raceClassMatrix thead th");
    CLASSES.forEach((cls, index) => {
      if (!cls.customClass) return;
      const th = headers[index + 1];
      if (!th) return;
      th.classList.add("v66-custom-class-head");
      th.title = "Custom-Klasse";
      const label = th.querySelector(".matrix-class");
      if (label && !label.querySelector(".v66-custom-tag")) label.insertAdjacentHTML("beforeend", '<small class="v66-custom-tag">Custom</small>');
    });
  }
  const previousRenderMatrix = renderMatrix;
  renderMatrix = function() {
    previousRenderMatrix();
    decorateCustomClassHeaders();
  };

  let editingClassId = "";
  function ensureClassPanel() {
    const grid = document.querySelector("#settings .settings-grid");
    if (!grid || document.querySelector("#v66CustomClasses")) return;
    const panel = document.createElement("article");
    panel.id = "v66CustomClasses";
    panel.className = "panel";
    panel.innerHTML = `
      <div class="panel-head"><div><div class="eyebrow">PLANUNG</div><h3>Custom-Klassen</h3></div></div>
      <p class="muted">Eigene Klassen wie Barde oder Tinker. Custom-Klassen sind für alle Rassen verfügbar. Rüstungsart und Farbe können frei festgelegt werden.</p>
      <div class="v66-class-form">
        <label class="field"><span>Name</span><input id="v66ClassName" maxlength="40" placeholder="z. B. Barde"></label>
        <label class="field"><span>Rüstungsart</span><select id="v66ClassArmor"><option value="">Nicht festgelegt</option><option>Stoff</option><option>Leder</option><option>Kette</option><option>Platte</option></select></label>
        <label class="field v66-color-field"><span>Farbe</span><input id="v66ClassColor" type="color" value="${DEFAULT_COLOR}"></label>
        <div class="v66-form-actions"><button id="v66SaveClass" type="button" class="btn btn-primary">+ Custom-Klasse</button><button id="v66CancelClass" type="button" class="btn btn-ghost hidden">Abbrechen</button></div>
      </div>
      <div id="v66ClassList" class="v66-class-list"></div>
      <div id="v66ClassSyncState" class="muted v66-sync-note">Wird über den GitHub-Sync in <code>${CLASS_CLOUD_PATH}</code> mitgeführt.</div>`;
    const racePanel = document.querySelector("#v65CustomRaces");
    if (racePanel) racePanel.insertAdjacentElement("afterend", panel);
    else {
      const sync = document.querySelector("#v6GithubSync");
      if (sync) sync.insertAdjacentElement("afterend", panel); else grid.insertAdjacentElement("afterbegin", panel);
    }

    document.querySelector("#v66SaveClass")?.addEventListener("click", saveClassFromForm);
    document.querySelector("#v66CancelClass")?.addEventListener("click", cancelClassEdit);
    document.querySelector("#v66ClassName")?.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); saveClassFromForm(); }
    });
    panel.addEventListener("click", e => {
      const edit = e.target.closest("[data-v66-edit]");
      if (edit) { beginClassEdit(edit.dataset.v66Edit); return; }
      const del = e.target.closest("[data-v66-delete]");
      if (del) deleteClass(del.dataset.v66Delete);
    });
  }

  function resetClassForm() {
    editingClassId = "";
    const name = document.querySelector("#v66ClassName");
    const armor = document.querySelector("#v66ClassArmor");
    const color = document.querySelector("#v66ClassColor");
    const save = document.querySelector("#v66SaveClass");
    const cancel = document.querySelector("#v66CancelClass");
    if (name) name.value = "";
    if (armor) armor.value = "";
    if (color) color.value = DEFAULT_COLOR;
    if (save) save.textContent = "+ Custom-Klasse";
    cancel?.classList.add("hidden");
  }
  function beginClassEdit(id) {
    const record = classRecords.find(r => r.id === id && !r.deleted);
    if (!record) return;
    editingClassId = id;
    document.querySelector("#v66ClassName").value = record.name;
    document.querySelector("#v66ClassArmor").value = record.armor || "";
    document.querySelector("#v66ClassColor").value = normalizeColor(record.color);
    document.querySelector("#v66SaveClass").textContent = "Änderungen speichern";
    document.querySelector("#v66CancelClass")?.classList.remove("hidden");
    document.querySelector("#v66ClassName")?.focus();
  }
  function cancelClassEdit() { resetClassForm(); }

  function saveClassFromForm() {
    const name = normName(document.querySelector("#v66ClassName")?.value);
    const armor = document.querySelector("#v66ClassArmor")?.value || "";
    const color = normalizeColor(document.querySelector("#v66ClassColor")?.value);
    if (!name) { toast("Bitte einen Namen für die Custom-Klasse eingeben"); return; }
    const key = lower(name);
    const duplicate = builtInClassNames.has(key) || activeClassRecords().some(r => r.id !== editingClassId && lower(r.name) === key);
    if (duplicate) { toast("Diese Klasse ist bereits vorhanden"); return; }

    if (editingClassId) {
      const record = classRecords.find(r => r.id === editingClassId && !r.deleted);
      if (!record) { resetClassForm(); return; }
      const oldName = record.name;
      record.name = name;
      record.armor = ARMORS.includes(armor) ? armor : "";
      record.color = color;
      record.updatedAt = nowIso();
      saveClassRecords();
      applyClassCatalog(name);
      let changed = 0;
      characters.forEach(c => {
        if (lower(c.className) === lower(oldName)) { c.className = name; changed++; }
      });
      if (changed) saveCharacters(); else renderAll();
      renderClassList();
      resetClassForm();
      toast(changed ? `${name} gespeichert · ${changed} Charakter${changed === 1 ? "" : "e"} angepasst` : `${name} gespeichert`);
      return;
    }

    classRecords.push({id:uid(), name, armor:ARMORS.includes(armor) ? armor : "", color, deleted:false, updatedAt:nowIso()});
    saveClassRecords();
    applyClassCatalog(name);
    renderClassList();
    renderAll();
    resetClassForm();
    toast(`${name} hinzugefügt`);
  }

  function deleteClass(id) {
    const record = classRecords.find(r => r.id === id && !r.deleted);
    if (!record) return;
    const used = characters.filter(c => lower(c.className) === lower(record.name)).length;
    if (used) {
      toast(`${record.name} wird noch von ${used} Charakter${used === 1 ? "" : "en"} verwendet`);
      return;
    }
    if (!confirm(`Custom-Klasse „${record.name}“ wirklich löschen?`)) return;
    record.deleted = true;
    record.updatedAt = nowIso();
    saveClassRecords();
    applyClassCatalog();
    renderClassList();
    renderAll();
    if (editingClassId === id) resetClassForm();
    toast(`${record.name} gelöscht`);
  }

  function renderClassList() {
    const root = document.querySelector("#v66ClassList");
    if (!root) return;
    const list = activeClassRecords().sort((a,b) => a.name.localeCompare(b.name,"de"));
    root.innerHTML = list.length ? list.map(r => {
      const used = characters.filter(c => lower(c.className) === lower(r.name)).length;
      return `<div class="v66-class-item"><div class="v66-class-main"><i class="v66-class-color" style="--v66-color:${escapeHtml(r.color || DEFAULT_COLOR)}"></i><div><strong>${escapeHtml(r.name)}</strong><div class="v66-class-meta"><span>${escapeHtml(r.armor || "Rüstung offen")}</span><span>${used} Charakter${used === 1 ? "" : "e"}</span></div></div></div><div class="v66-item-actions"><button type="button" class="icon-btn" data-v66-edit="${escapeHtml(r.id)}" title="Custom-Klasse bearbeiten">✎</button><button type="button" class="icon-btn" data-v66-delete="${escapeHtml(r.id)}" title="Custom-Klasse löschen">×</button></div></div>`;
    }).join("") : '<div class="muted">Noch keine Custom-Klassen angelegt.</div>';
  }

  let editingRaceId = "";
  function loadRaceRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RACE_STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  const officialRaceNames = new Set(RACES.filter(r => !r.custom).map(r => lower(r.name)));

  function ensureRaceCancelButton() {
    const form = document.querySelector("#v65CustomRaces .v65-race-form");
    const add = document.querySelector("#v65AddRace");
    if (!form || !add || document.querySelector("#v66CancelRace")) return;
    const cancel = document.createElement("button");
    cancel.id = "v66CancelRace";
    cancel.type = "button";
    cancel.className = "btn btn-ghost hidden";
    cancel.textContent = "Abbrechen";
    add.insertAdjacentElement("afterend", cancel);
    cancel.addEventListener("click", cancelRaceEdit);
  }
  function enhanceRaceList() {
    ensureRaceCancelButton();
    document.querySelectorAll("#v65RaceList .v65-race-item").forEach(item => {
      const del = item.querySelector("[data-v65-delete]");
      if (!del || item.querySelector("[data-v66-race-edit]")) return;
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "icon-btn";
      edit.dataset.v66RaceEdit = del.dataset.v65Delete || "";
      edit.title = "Custom-Rasse bearbeiten";
      edit.textContent = "✎";
      del.insertAdjacentElement("beforebegin", edit);
    });
  }
  function beginRaceEdit(id) {
    const record = loadRaceRecords().find(r => String(r.id) === String(id) && !r.deleted);
    if (!record) return;
    editingRaceId = String(id);
    document.querySelector("#v65RaceName").value = record.name || "";
    document.querySelector("#v65RaceFaction").value = ["Horde","Allianz","Neutral"].includes(record.faction) ? record.faction : "Neutral";
    document.querySelector("#v65AddRace").textContent = "Änderungen speichern";
    document.querySelector("#v66CancelRace")?.classList.remove("hidden");
    document.querySelector("#v65RaceName")?.focus();
  }
  function cancelRaceEdit() {
    editingRaceId = "";
    const name = document.querySelector("#v65RaceName");
    if (name) name.value = "";
    const add = document.querySelector("#v65AddRace");
    if (add) add.textContent = "+ Custom-Rasse";
    document.querySelector("#v66CancelRace")?.classList.add("hidden");
  }
  function saveRaceEdit() {
    if (!editingRaceId) return;
    const records = loadRaceRecords();
    const record = records.find(r => String(r.id) === editingRaceId && !r.deleted);
    if (!record) { cancelRaceEdit(); return; }
    const name = normName(document.querySelector("#v65RaceName")?.value);
    const faction = document.querySelector("#v65RaceFaction")?.value || "Neutral";
    if (!name) { toast("Bitte einen Namen für die Custom-Rasse eingeben"); return; }
    const key = lower(name);
    const duplicate = officialRaceNames.has(key) || records.some(r => !r.deleted && String(r.id) !== editingRaceId && lower(r.name) === key);
    if (duplicate) { toast("Diese Rasse ist bereits vorhanden"); return; }

    const oldName = record.name;
    const oldFaction = record.faction;
    record.name = name;
    record.faction = ["Horde","Allianz","Neutral"].includes(faction) ? faction : "Neutral";
    record.updatedAt = nowIso();
    localStorage.setItem(RACE_STORAGE_KEY, JSON.stringify(records));

    let changed = 0;
    characters.forEach(c => {
      if (lower(c.race) === lower(oldName) && c.faction === oldFaction) {
        c.race = record.name;
        c.faction = record.faction;
        changed++;
      }
    });
    if (changed) saveCharacters();
    localStorage.setItem(RETURN_SETTINGS_KEY, "1");
    localStorage.setItem(FLASH_KEY, changed ? `${record.name} gespeichert · ${changed} Charakter${changed === 1 ? "" : "e"} angepasst` : `${record.name} gespeichert`);
    location.reload();
  }

  document.querySelector("#v65CustomRaces")?.addEventListener("click", e => {
    const edit = e.target.closest("[data-v66-race-edit]");
    if (edit) { e.preventDefault(); beginRaceEdit(edit.dataset.v66RaceEdit); }
  });
  document.querySelector("#v65AddRace")?.addEventListener("click", e => {
    if (!editingRaceId) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    saveRaceEdit();
  }, true);
  document.querySelector("#v65RaceName")?.addEventListener("keydown", e => {
    if (!editingRaceId || e.key !== "Enter") return;
    e.preventDefault();
    e.stopImmediatePropagation();
    saveRaceEdit();
  }, true);
  const raceList = document.querySelector("#v65RaceList");
  if (raceList) {
    new MutationObserver(enhanceRaceList).observe(raceList, {childList:true, subtree:true});
    enhanceRaceList();
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
    let binary = "";
    for (let i=0; i<bytes.length; i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary);
  }
  function textToBase64(text) { return bytesToBase64(new TextEncoder().encode(text)); }
  function base64ToText(base64) {
    const binary = atob(String(base64 || "").replace(/\s/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  async function ghRequest(url, options={}) {
    const token = getToken();
    if (!token) throw new Error("GitHub-Token fehlt.");
    const response = await fetch(url, {...options, cache:"no-store", headers:{
      "Accept":"application/vnd.github+json",
      "Authorization":`Bearer ${token}`,
      "X-GitHub-Api-Version":"2022-11-28",
      "Content-Type":"application/json",
      ...(options.headers || {})
    }});
    if (response.status === 404) return null;
    let body = null; try { body = await response.json(); } catch {}
    if (!response.ok) throw new Error(body?.message || `GitHub API: HTTP ${response.status}`);
    return body;
  }
  function classCloudUrl() {
    const config = getConfig();
    return `https://api.github.com/repos/${config.repo}/contents/${CLASS_CLOUD_PATH.split("/").map(encodeURIComponent).join("/")}`;
  }
  async function readClassCloud() {
    const config = getConfig();
    const file = await ghRequest(`${classCloudUrl()}?ref=${encodeURIComponent(config.branch || "main")}`);
    if (!file) return {file:null, records:[]};
    const payload = JSON.parse(base64ToText(file.content));
    const raw = Array.isArray(payload) ? payload : payload?.customClasses;
    return {file, records:Array.isArray(raw) ? raw.map(normalizeClassRecord).filter(Boolean) : []};
  }
  async function writeClassCloud(file, list) {
    const config = getConfig();
    const payload = {version:1, updatedAt:nowIso(), customClasses:list};
    const body = {
      message:`Sync custom classes ${new Date().toLocaleString("de-DE")}`,
      content:textToBase64(JSON.stringify(payload,null,2)),
      branch:config.branch || "main"
    };
    if (file?.sha) body.sha = file.sha;
    await ghRequest(classCloudUrl(), {method:"PUT", body:JSON.stringify(body)});
  }
  function mergeClassRecords(local, remote) {
    const map = new Map();
    [...local, ...remote].forEach(r => {
      const current = map.get(r.id);
      if (!current || new Date(r.updatedAt || 0).getTime() >= new Date(current.updatedAt || 0).getTime()) map.set(r.id, {...r});
    });
    const byName = new Map();
    [...map.values()].filter(r => !r.deleted).forEach(r => {
      const key = lower(r.name);
      const current = byName.get(key);
      if (!current || new Date(r.updatedAt || 0).getTime() > new Date(current.updatedAt || 0).getTime()) byName.set(key, r);
    });
    [...map.values()].forEach(r => {
      if (r.deleted) return;
      const winner = byName.get(lower(r.name));
      if (winner && winner.id !== r.id) { r.deleted = true; r.updatedAt = winner.updatedAt; }
    });
    return [...map.values()];
  }
  function applySyncedClasses(next) {
    classRecords = next.map(normalizeClassRecord).filter(Boolean);
    saveClassRecords();
    applyClassCatalog();
    renderClassList();
    renderAll();
  }
  function classSyncStatus(text, error=false) {
    const el = document.querySelector("#v66ClassSyncState");
    if (el) { el.textContent = text; el.classList.toggle("v66-sync-error", error); }
  }
  async function pushClasses() {
    try {
      const {file} = await readClassCloud();
      await writeClassCloud(file, classRecords);
      classSyncStatus(`${activeClassRecords().length} Custom-Klassen auf GitHub gespeichert.`);
    } catch (err) { classSyncStatus(`Custom-Klassen-Sync: ${err.message || err}`, true); }
  }
  async function pullClasses() {
    try {
      const {file, records:remote} = await readClassCloud();
      if (!file) { classSyncStatus("Noch keine Custom-Klassen-Datei in GitHub."); return; }
      applySyncedClasses(remote);
      classSyncStatus(`${activeClassRecords().length} Custom-Klassen von GitHub geladen.`);
    } catch (err) { classSyncStatus(`Custom-Klassen-Sync: ${err.message || err}`, true); }
  }
  async function syncClasses() {
    try {
      const {file, records:remote} = await readClassCloud();
      const merged = mergeClassRecords(classRecords, remote);
      applySyncedClasses(merged);
      await writeClassCloud(file, classRecords);
      classSyncStatus(`${activeClassRecords().length} Custom-Klassen synchronisiert.`);
    } catch (err) { classSyncStatus(`Custom-Klassen-Sync: ${err.message || err}`, true); }
  }

  document.querySelector("#v6Push")?.addEventListener("click", pushClasses);
  document.querySelector("#v6Pull")?.addEventListener("click", pullClasses);
  document.querySelector("#v6Sync")?.addEventListener("click", syncClasses);

  const style = document.createElement("style");
  style.textContent = `
    .v66-class-form{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(135px,.7fr) 92px auto;gap:10px;align-items:end;margin:14px 0}
    .v66-color-field input[type="color"]{width:100%;height:42px;padding:4px;border-radius:8px;background:var(--input-bg,rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.1)}
    .v66-form-actions{display:flex;gap:8px;align-items:center}.v66-class-list{display:grid;gap:8px;margin-top:8px}
    .v66-class-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 12px;border:1px solid rgba(255,255,255,.08);border-radius:9px;background:rgba(255,255,255,.025)}
    .v66-class-main{display:flex;align-items:center;gap:10px;min-width:0}.v66-class-color{width:12px;height:32px;border-radius:999px;background:var(--v66-color,#64748b);flex:0 0 auto}
    .v66-class-meta{display:flex;align-items:center;gap:8px;margin-top:5px;color:var(--muted);font-size:.74rem}.v66-item-actions{display:flex;gap:4px;align-items:center}
    .v66-sync-note{margin-top:10px;font-size:.75rem}.v66-sync-error{color:#e27a7a!important}.v66-custom-tag{display:block;margin-top:2px;color:var(--muted);font-size:.52rem;font-weight:600}
    .v66-custom-class-head{box-shadow:inset 0 3px rgba(212,175,55,.55)}
    #v65RaceList .v65-race-item>.icon-btn + .icon-btn{margin-left:4px}
    @media(max-width:760px){.v66-class-form{grid-template-columns:1fr 1fr}.v66-form-actions{grid-column:1/-1}.v66-color-field input[type="color"]{min-height:42px}}
    @media(max-width:520px){.v66-class-form{grid-template-columns:1fr}.v66-form-actions{grid-column:auto}}
  `;
  document.head.appendChild(style);

  ensureClassPanel();
  applyClassCatalog();
  renderClassList();
  renderAll();
  enhanceRaceList();

  if (localStorage.getItem(RETURN_SETTINGS_KEY) === "1") {
    localStorage.removeItem(RETURN_SETTINGS_KEY);
    setTimeout(() => setView("settings"), 0);
  }
  const flash = localStorage.getItem(FLASH_KEY);
  if (flash) {
    localStorage.removeItem(FLASH_KEY);
    setTimeout(() => toast(flash), 100);
  }

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
