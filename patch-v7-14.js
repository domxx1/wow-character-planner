/* v0.7.14 — Retail/Forever mode switch with separate rosters and custom catalogs. */
(() => {
  const VERSION = "0.7.14";
  const MODE_KEY = "wowCharacterPlanner.gameMode.v1";
  const RETAIL_RACE_KEY = "wowCharacterPlanner.customRaces.v1";
  const RETAIL_CLASS_KEY = "wowCharacterPlanner.customClasses.v1";
  const FOREVER_RACE_KEY = "wowCharacterPlanner.forever.customRaces.v1";
  const FOREVER_CLASS_KEY = "wowCharacterPlanner.forever.customClasses.v1";
  const CONFIG_KEY = "wowCharacterPlanner.githubSync.v1";
  const TOKEN_LOCAL_KEY = "wowCharacterPlanner.githubToken.local";
  const TOKEN_SESSION_KEY = "wowCharacterPlanner.githubToken.session";
  const FOREVER_RACE_PATH = "data/forever-custom-races.json";
  const FOREVER_CLASS_PATH = "data/forever-custom-classes.json";
  const DEFAULT_COLOR = "#64748b";
  const ARMORS = ["", "Stoff", "Leder", "Kette", "Platte"];

  let mode = localStorage.getItem(MODE_KEY) === "forever" ? "forever" : "retail";
  window.wowCharacterPlannerGameMode = () => mode;

  const clone = value => JSON.parse(JSON.stringify(value));
  const norm = value => String(value || "").trim().replace(/\s+/g, " ");
  const lower = value => norm(value).toLocaleLowerCase("de");
  const nowIso = () => new Date().toISOString();
  const charMode = c => c?.gameMode === "forever" ? "forever" : "retail";

  /* Everything that existed before game modes belongs to Retail. */
  let migrated = false;
  characters.forEach(c => {
    if (!c.gameMode) { c.gameMode = "retail"; migrated = true; }
  });
  if (migrated) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(characters)); } catch {}
  }

  const RETAIL_RACES = RACES.filter(r => !r.custom).map(r => clone(r));
  const RETAIL_CLASSES = CLASSES.filter(c => !c.customClass).map(c => clone(c));

  const FOREVER_RACES = [
    {key:"Forever:Orcs|Horde",name:"Orcs",faction:"Horde",forever:true},
    {key:"Forever:Untote|Horde",name:"Untote",faction:"Horde",forever:true},
    {key:"Forever:Tauren|Horde",name:"Tauren",faction:"Horde",forever:true},
    {key:"Forever:Trolle|Horde",name:"Trolle",faction:"Horde",forever:true},
    {key:"Forever:Himmelsgeborene|Horde",name:"Himmelsgeborene",faction:"Horde",forever:true},
    {key:"Forever:Menschen|Allianz",name:"Menschen",faction:"Allianz",forever:true},
    {key:"Forever:Zwerge|Allianz",name:"Zwerge",faction:"Allianz",forever:true},
    {key:"Forever:Nachtelfen|Allianz",name:"Nachtelfen",faction:"Allianz",forever:true},
    {key:"Forever:Gnome|Allianz",name:"Gnome",faction:"Allianz",forever:true},
    {key:"Forever:Himmelsgeborene|Allianz",name:"Himmelsgeborene",faction:"Allianz",forever:true}
  ];

  const classColor = name => RETAIL_CLASSES.find(c => c.name === name)?.color || DEFAULT_COLOR;
  const FOREVER_CLASSES = [
    {name:"Krieger",armor:"Platte",color:classColor("Krieger"),forever:true},
    {name:"Paladin",armor:"Platte",color:classColor("Paladin"),forever:true},
    {name:"Jäger",armor:"Kette",color:classColor("Jäger"),forever:true},
    {name:"Schurke",armor:"Leder",color:classColor("Schurke"),forever:true},
    {name:"Priester",armor:"Stoff",color:classColor("Priester"),forever:true},
    {name:"Schamane",armor:"Kette",color:classColor("Schamane"),forever:true},
    {name:"Magier",armor:"Stoff",color:classColor("Magier"),forever:true},
    {name:"Hexenmeister",armor:"Stoff",color:classColor("Hexenmeister"),forever:true},
    {name:"Druide",armor:"Leder",color:classColor("Druide"),forever:true}
  ];

  const FOREVER_COMBOS = {
    "Menschen": ["Krieger","Paladin","Jäger","Schurke","Priester","Magier","Hexenmeister"],
    "Zwerge": ["Krieger","Paladin","Jäger","Schurke","Priester","Schamane"],
    "Nachtelfen": ["Krieger","Jäger","Schurke","Priester","Druide"],
    "Gnome": ["Krieger","Schurke","Priester","Magier","Hexenmeister"],
    "Orcs": ["Krieger","Jäger","Schurke","Schamane","Magier","Hexenmeister"],
    "Untote": ["Krieger","Paladin","Schurke","Priester","Magier","Hexenmeister"],
    "Tauren": ["Krieger","Jäger","Schamane","Druide"],
    "Trolle": ["Krieger","Jäger","Schurke","Priester","Schamane","Magier","Hexenmeister"],
    "Himmelsgeborene": ["Krieger","Jäger","Schurke","Druide","Schamane","Magier"]
  };

  function normalizeRaceRecord(raw) {
    if (!raw || typeof raw !== "object" || !norm(raw.name)) return null;
    return {
      id:String(raw.id || uid()), name:norm(raw.name),
      faction:["Horde","Allianz","Neutral"].includes(raw.faction) ? raw.faction : "Neutral",
      deleted:!!raw.deleted, updatedAt:String(raw.updatedAt || nowIso())
    };
  }
  function normalizeClassRecord(raw) {
    if (!raw || typeof raw !== "object" || !norm(raw.name)) return null;
    const color = /^#[0-9a-f]{6}$/i.test(String(raw.color || "")) ? raw.color : DEFAULT_COLOR;
    return {
      id:String(raw.id || uid()), name:norm(raw.name), armor:ARMORS.includes(raw.armor) ? raw.armor : "",
      color, deleted:!!raw.deleted, updatedAt:String(raw.updatedAt || nowIso())
    };
  }
  function readRecords(key, normalizer) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(raw) ? raw.map(normalizer).filter(Boolean) : [];
    } catch { return []; }
  }
  function writeRecords(key, records) { localStorage.setItem(key, JSON.stringify(records)); }
  const active = list => list.filter(x => !x.deleted);

  function retailCustomRaces() { return active(readRecords(RETAIL_RACE_KEY, normalizeRaceRecord)); }
  function retailCustomClasses() { return active(readRecords(RETAIL_CLASS_KEY, normalizeClassRecord)); }
  function foreverCustomRaces() { return readRecords(FOREVER_RACE_KEY, normalizeRaceRecord); }
  function foreverCustomClasses() { return readRecords(FOREVER_CLASS_KEY, normalizeClassRecord); }

  function raceKey(r) { return r?.key || `${r?.name || ""}|${r?.faction || ""}`; }
  function selectedRace() {
    const value = document.querySelector("#charRace")?.value || "";
    return RACES.find(r => raceKey(r) === value) || null;
  }
  function isForeverCustomRace(name, faction="") {
    return active(foreverCustomRaces()).some(r => lower(r.name) === lower(name) && (!faction || r.faction === faction));
  }
  function isForeverCustomClass(name) {
    return active(foreverCustomClasses()).some(c => lower(c.name) === lower(name));
  }
  function foreverValid(race, className) {
    if (!race || !className) return false;
    if (race.custom || isForeverCustomRace(race.name, race.faction) || isForeverCustomClass(className)) return true;
    if (race.name === "Himmelsgeborene") {
      const common = ["Krieger","Jäger","Schurke","Druide"];
      return common.includes(className) || (race.faction === "Horde" ? className === "Schamane" : className === "Magier");
    }
    return (FOREVER_COMBOS[race.name] || []).includes(className);
  }

  const previousValidity = window.wowCharacterPlannerIsValidCombo;
  window.wowCharacterPlannerIsValidCombo = function(raceName, className) {
    if (mode !== "forever") return typeof previousValidity === "function" ? previousValidity(raceName, className) : true;
    if (isForeverCustomClass(className) || isForeverCustomRace(raceName)) return true;
    return (FOREVER_COMBOS[raceName] || []).includes(className);
  };

  function buildRaceCatalog() {
    if (mode === "retail") {
      return [
        ...RETAIL_RACES.map(clone),
        ...retailCustomRaces().sort((a,b)=>a.name.localeCompare(b.name,"de")).map(r => ({key:`Custom:${r.id}`,name:r.name,faction:r.faction,custom:true,customId:r.id}))
      ];
    }
    return [
      ...FOREVER_RACES.map(clone),
      ...active(foreverCustomRaces()).sort((a,b)=>a.name.localeCompare(b.name,"de")).map(r => ({key:`ForeverCustom:${r.id}`,name:r.name,faction:r.faction,custom:true,customId:r.id,forever:true}))
    ];
  }
  function buildClassCatalog() {
    if (mode === "retail") {
      return [
        ...RETAIL_CLASSES.map(clone),
        ...retailCustomClasses().sort((a,b)=>a.name.localeCompare(b.name,"de")).map(c => ({name:c.name,armor:c.armor || "–",color:c.color,custom:true,customClass:true,customId:c.id}))
      ];
    }
    return [
      ...FOREVER_CLASSES.map(clone),
      ...active(foreverCustomClasses()).sort((a,b)=>a.name.localeCompare(b.name,"de")).map(c => ({name:c.name,armor:c.armor || "–",color:c.color,custom:true,customClass:true,customId:c.id,forever:true}))
    ];
  }

  function refreshRaceSelect(preferred="") {
    const select = document.querySelector("#charRace");
    if (!select) return;
    const keep = preferred || select.value;
    const duplicates = new Set(RACES.filter((r,i,a)=>a.findIndex(x=>x.name===r.name)!==i).map(r=>r.name));
    select.innerHTML = '<option value="">Nicht zugeordnet</option>' + RACES.map(r => {
      const suffix = r.custom ? ` — Custom · ${r.faction}` : duplicates.has(r.name) ? ` — ${r.faction}` : "";
      return `<option value="${escapeHtml(raceKey(r))}">${escapeHtml(r.name + suffix)}</option>`;
    }).join("");
    if ([...select.options].some(o=>o.value===keep)) select.value=keep;
  }
  function refreshClassFilter() {
    const select = document.querySelector("#filterClass");
    if (!select) return;
    const keep = select.value;
    select.innerHTML = '<option value="">Alle Klassen</option>' + CLASSES.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name + (c.customClass ? " — Custom" : ""))}</option>`).join("");
    if ([...select.options].some(o=>o.value===keep)) select.value=keep;
  }
  function refreshClassSelect(preferred="") {
    const select = document.querySelector("#charClass");
    if (!select) return;
    const race = selectedRace();
    const keep = preferred || select.value;
    const allowed = mode === "forever" && race ? CLASSES.filter(c => foreverValid(race,c.name)) : CLASSES.filter(c => !race || c.customClass || window.wowCharacterPlannerIsValidCombo?.(race.name,c.name));
    select.innerHTML = allowed.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name + (c.customClass ? " — Custom" : ""))}</option>`).join("");
    if (allowed.some(c=>c.name===keep)) select.value=keep;
    else if (allowed.length) select.value=allowed[0].name;
  }
  function clearFilters() {
    ["searchInput","filterFaction","filterClass","filterStatus","filterRemix","filterRealm"].forEach(id=>{const el=document.querySelector(`#${id}`);if(el)el.value="";});
    document.querySelector("#v77DashboardFilter [data-v77-clear]")?.click();
    document.querySelector("#v78SummaryFilter [data-v78-clear]")?.click();
    document.querySelector("#v713MatrixFilter [data-v713-clear]")?.click();
  }
  function applyCatalog() {
    const races = buildRaceCatalog();
    const classes = buildClassCatalog();
    RACES.splice(0,RACES.length,...races);
    CLASSES.splice(0,CLASSES.length,...classes);
    refreshRaceSelect();
    refreshClassFilter();
    refreshClassSelect();
  }

  /* Render all statistic/list views against only the selected game mode. */
  function withModeCharacters(fn, thisArg, args) {
    const all = characters;
    characters = all.filter(c => charMode(c) === mode);
    try { return fn.apply(thisArg,args || []); }
    finally { characters = all; }
  }
  ["renderDashboard","renderCharacters","renderMatrix","renderProfessions"].forEach(name => {
    const previous = window[name];
    if (typeof previous !== "function") return;
    window[name] = function(...args) { return withModeCharacters(previous,this,args); };
  });

  /* The old matrix handler runs on document capture. Put only active-mode characters
     in scope one level earlier (window capture), then restore after the click. */
  function scopeMatrixEvent(e) {
    if (!e.target?.closest?.("#raceClassMatrix .matrix-cell")) return;
    const all = characters;
    characters = all.filter(c => charMode(c) === mode);
    setTimeout(() => { characters = all; }, 0);
  }
  window.addEventListener("click",scopeMatrixEvent,true);
  window.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" ")scopeMatrixEvent(e);},true);

  let pendingNewMode = "";
  let beforeNewIds = null;
  const previousOpen = openCharacter;
  openCharacter = function(id=null,preset={}) {
    if (!id) {
      pendingNewMode = mode;
      beforeNewIds = new Set(characters.map(c=>String(c.id||"")));
    }
    previousOpen(id,preset);
    const c=id?characters.find(x=>x.id===id):null;
    const wantedRace = RACES.find(r => r.name === (c?.race || preset.race || "") && r.faction === (c?.faction || preset.faction || r?.faction));
    refreshRaceSelect(wantedRace ? raceKey(wantedRace) : "");
    refreshClassSelect(c?.className || preset.className || "");
    const level=document.querySelector("#charLevel");
    if(level) level.max=mode==="forever"?"60":"90";
    syncModeSpecificUi();
  };

  const previousSave = saveCharacters;
  saveCharacters = function() {
    characters.forEach(c => {
      if (!c.gameMode) {
        const isNew = pendingNewMode && beforeNewIds && !beforeNewIds.has(String(c.id||""));
        c.gameMode = isNew ? pendingNewMode : "retail";
      }
      if (c.gameMode === "forever" && Number(c.level) > 60) c.level = 60;
    });
    pendingNewMode = "";
    beforeNewIds = null;
    previousSave();
  };

  document.querySelector("#charRace")?.addEventListener("change",()=>{
    setTimeout(()=>{
      const race=selectedRace();
      const faction=document.querySelector("#charFaction");
      if(race&&faction)faction.value=race.faction;
      refreshClassSelect();
    },0);
  });

  const previousRenderMatrix = renderMatrix;
  renderMatrix = function(...args) {
    const result = previousRenderMatrix(...args);
    if (mode === "forever") {
      document.querySelectorAll("#raceClassMatrix tbody tr").forEach(row => {
        const key=row.querySelector(":scope>td:first-child")?.dataset?.v713Race || row.querySelector(".matrix-cell[data-v3-race]")?.dataset?.v3Race || "";
        const race=RACES.find(r=>raceKey(r)===key);
        if(!race)return;
        row.querySelectorAll(".matrix-cell[data-class]").forEach(btn=>{
          if(foreverValid(race,btn.dataset.class))return;
          btn.disabled=true;
          btn.removeAttribute("data-v3-race");
          btn.classList.remove("v73-possible","has","planned","v3-both");
          btn.classList.add("v5-invalid");
          btn.innerHTML='<span class="count">–</span>';
          btn.title="In World of Warcraft: Forever nicht verfügbar";
        });
      });
    }
    return result;
  };

  function ensureModeSwitch() {
    if (document.querySelector("#v714ModeSwitch")) return;
    const actions=document.querySelector(".topbar-actions");
    if(!actions)return;
    const wrap=document.createElement("div");
    wrap.id="v714ModeSwitch";
    wrap.className="v714-mode-switch";
    wrap.setAttribute("aria-label","WoW-Version");
    wrap.innerHTML='<button type="button" data-v714-mode="retail">Retail</button><button type="button" data-v714-mode="forever">Forever</button>';
    actions.insertAdjacentElement("afterbegin",wrap);
    wrap.addEventListener("click",e=>{
      const btn=e.target.closest("[data-v714-mode]");
      if(btn)switchMode(btn.dataset.v714Mode);
    });
  }

  function updateModeSwitch() {
    document.querySelectorAll("[data-v714-mode]").forEach(btn=>{
      const on=btn.dataset.v714Mode===mode;
      btn.classList.toggle("active",on);
      btn.setAttribute("aria-pressed",on?"true":"false");
    });
  }
  function updateBrand() {
    const sub=document.querySelector(".brand-sub");
    if(sub)sub.textContent=mode==="retail"?`WoW Retail · 12.1 · ${VERSION}`:`WoW Forever · ${VERSION}`;
    const hero=document.querySelector("#dashboard .hero h2");
    if(hero)hero.textContent=mode==="retail"?"Deine Warband auf einen Blick":"Deine Forever-Charaktere auf einen Blick";
  }

  function syncModeSpecificUi() {
    const forever=mode==="forever";
    document.querySelector("#v65CustomRaces")?.toggleAttribute("hidden",forever);
    document.querySelector("#v66CustomClasses")?.toggleAttribute("hidden",forever);
    document.querySelector("#v714ForeverRaces")?.toggleAttribute("hidden",!forever);
    document.querySelector("#v714ForeverClasses")?.toggleAttribute("hidden",!forever);
    document.querySelector("#v70BlizzardMedia")?.toggleAttribute("hidden",forever);
    document.querySelector("#v70SingleMedia")?.toggleAttribute("hidden",forever);
    const remixFilter=document.querySelector("#filterRemix");
    if(remixFilter)remixFilter.toggleAttribute("hidden",forever);
    const remixField=document.querySelector("#charRemix")?.closest(".field");
    if(remixField)remixField.toggleAttribute("hidden",forever);
  }

  function switchMode(next) {
    if(!["retail","forever"].includes(next)||next===mode)return;
    document.querySelector("#characterDialog")?.close();
    clearFilters();
    mode=next;
    localStorage.setItem(MODE_KEY,mode);
    applyCatalog();
    updateModeSwitch();
    updateBrand();
    syncModeSpecificUi();
    renderAll();
    toast(mode==="retail"?"Retail-Planung aktiviert":"Forever-Planung aktiviert");
  }

  /* Forever custom races/classes. Retail keeps the existing mature editors. */
  let editingRaceId="";
  let editingClassId="";
  function ensureForeverPanels() {
    const grid=document.querySelector("#settings .settings-grid");
    if(!grid)return;
    if(!document.querySelector("#v714ForeverRaces")) {
      const panel=document.createElement("article");
      panel.id="v714ForeverRaces";panel.className="panel";
      panel.innerHTML=`<div class="panel-head"><div><div class="eyebrow">FOREVER</div><h3>Custom-Völker</h3></div></div>
        <p class="muted">Eigene Völker nur für World of Warcraft: Forever. Sie sind von deinen Retail-Custom-Völkern vollständig getrennt.</p>
        <div class="v714-custom-form"><label class="field"><span>Name</span><input id="v714RaceName" maxlength="40"></label><label class="field"><span>Fraktion</span><select id="v714RaceFaction"><option>Horde</option><option>Allianz</option><option>Neutral</option></select></label><div class="v714-actions"><button id="v714SaveRace" type="button" class="btn btn-primary">+ Custom-Volk</button><button id="v714CancelRace" type="button" class="btn btn-ghost hidden">Abbrechen</button></div></div>
        <div id="v714RaceList" class="v65-race-list"></div><div id="v714RaceSync" class="muted v65-sync-note">GitHub: <code>${FOREVER_RACE_PATH}</code></div>`;
      const after=document.querySelector("#v66CustomClasses")||document.querySelector("#v65CustomRaces")||document.querySelector("#v6GithubSync");
      if(after)after.insertAdjacentElement("afterend",panel);else grid.insertAdjacentElement("afterbegin",panel);
      panel.querySelector("#v714SaveRace").addEventListener("click",saveForeverRace);
      panel.querySelector("#v714CancelRace").addEventListener("click",()=>resetRaceForm());
      panel.addEventListener("click",e=>{
        const edit=e.target.closest("[data-v714-race-edit]");if(edit){beginRaceEdit(edit.dataset.v714RaceEdit);return;}
        const del=e.target.closest("[data-v714-race-delete]");if(del)deleteForeverRace(del.dataset.v714RaceDelete);
      });
    }
    if(!document.querySelector("#v714ForeverClasses")) {
      const panel=document.createElement("article");
      panel.id="v714ForeverClasses";panel.className="panel";
      panel.innerHTML=`<div class="panel-head"><div><div class="eyebrow">FOREVER</div><h3>Custom-Klassen</h3></div></div>
        <p class="muted">Eigene Klassen nur für World of Warcraft: Forever. Rüstungsart und Klassenfarbe sind unabhängig von Retail.</p>
        <div class="v714-custom-form"><label class="field"><span>Name</span><input id="v714ClassName" maxlength="40"></label><label class="field"><span>Rüstungsart</span><select id="v714ClassArmor"><option value="">Nicht festgelegt</option><option>Stoff</option><option>Leder</option><option>Kette</option><option>Platte</option></select></label><label class="field"><span>Farbe</span><input id="v714ClassColor" type="color" value="${DEFAULT_COLOR}"></label><div class="v714-actions"><button id="v714SaveClass" type="button" class="btn btn-primary">+ Custom-Klasse</button><button id="v714CancelClass" type="button" class="btn btn-ghost hidden">Abbrechen</button></div></div>
        <div id="v714ClassList" class="v66-class-list"></div><div id="v714ClassSync" class="muted v65-sync-note">GitHub: <code>${FOREVER_CLASS_PATH}</code></div>`;
      const after=document.querySelector("#v714ForeverRaces");
      if(after)after.insertAdjacentElement("afterend",panel);else grid.insertAdjacentElement("afterbegin",panel);
      panel.querySelector("#v714SaveClass").addEventListener("click",saveForeverClass);
      panel.querySelector("#v714CancelClass").addEventListener("click",()=>resetClassForm());
      panel.addEventListener("click",e=>{
        const edit=e.target.closest("[data-v714-class-edit]");if(edit){beginClassEdit(edit.dataset.v714ClassEdit);return;}
        const del=e.target.closest("[data-v714-class-delete]");if(del)deleteForeverClass(del.dataset.v714ClassDelete);
      });
    }
    renderForeverLists();
  }
  function resetRaceForm(){editingRaceId="";const n=document.querySelector("#v714RaceName");if(n)n.value="";const b=document.querySelector("#v714SaveRace");if(b)b.textContent="+ Custom-Volk";document.querySelector("#v714CancelRace")?.classList.add("hidden");}
  function resetClassForm(){editingClassId="";const n=document.querySelector("#v714ClassName");if(n)n.value="";const a=document.querySelector("#v714ClassArmor");if(a)a.value="";const c=document.querySelector("#v714ClassColor");if(c)c.value=DEFAULT_COLOR;const b=document.querySelector("#v714SaveClass");if(b)b.textContent="+ Custom-Klasse";document.querySelector("#v714CancelClass")?.classList.add("hidden");}
  function beginRaceEdit(id){const r=foreverCustomRaces().find(x=>x.id===id&&!x.deleted);if(!r)return;editingRaceId=id;document.querySelector("#v714RaceName").value=r.name;document.querySelector("#v714RaceFaction").value=r.faction;document.querySelector("#v714SaveRace").textContent="Änderungen speichern";document.querySelector("#v714CancelRace")?.classList.remove("hidden");}
  function beginClassEdit(id){const c=foreverCustomClasses().find(x=>x.id===id&&!x.deleted);if(!c)return;editingClassId=id;document.querySelector("#v714ClassName").value=c.name;document.querySelector("#v714ClassArmor").value=c.armor||"";document.querySelector("#v714ClassColor").value=c.color;document.querySelector("#v714SaveClass").textContent="Änderungen speichern";document.querySelector("#v714CancelClass")?.classList.remove("hidden");}

  function saveForeverRace(){
    const records=foreverCustomRaces();const name=norm(document.querySelector("#v714RaceName")?.value);const faction=document.querySelector("#v714RaceFaction")?.value||"Neutral";
    if(!name){toast("Bitte einen Namen eingeben");return;}
    const built=FOREVER_RACES.some(r=>lower(r.name)===lower(name)&&r.faction===faction);
    const duplicate=active(records).some(r=>r.id!==editingRaceId&&lower(r.name)===lower(name)&&r.faction===faction);
    if(built||duplicate){toast("Dieses Volk ist bereits vorhanden");return;}
    if(editingRaceId){const r=records.find(x=>x.id===editingRaceId);if(!r)return;const oldName=r.name,oldFaction=r.faction;r.name=name;r.faction=faction;r.updatedAt=nowIso();characters.forEach(c=>{if(charMode(c)==="forever"&&lower(c.race)===lower(oldName)&&c.faction===oldFaction){c.race=name;c.faction=faction;}});}
    else records.push({id:uid(),name,faction,deleted:false,updatedAt:nowIso()});
    writeRecords(FOREVER_RACE_KEY,records);resetRaceForm();applyCatalog();saveCharacters();renderForeverLists();renderAll();toast(`${name} gespeichert`);
  }
  function saveForeverClass(){
    const records=foreverCustomClasses();const name=norm(document.querySelector("#v714ClassName")?.value);const armor=document.querySelector("#v714ClassArmor")?.value||"";const color=document.querySelector("#v714ClassColor")?.value||DEFAULT_COLOR;
    if(!name){toast("Bitte einen Namen eingeben");return;}
    const built=FOREVER_CLASSES.some(c=>lower(c.name)===lower(name));const duplicate=active(records).some(c=>c.id!==editingClassId&&lower(c.name)===lower(name));
    if(built||duplicate){toast("Diese Klasse ist bereits vorhanden");return;}
    if(editingClassId){const c=records.find(x=>x.id===editingClassId);if(!c)return;const old=c.name;c.name=name;c.armor=ARMORS.includes(armor)?armor:"";c.color=/^#[0-9a-f]{6}$/i.test(color)?color:DEFAULT_COLOR;c.updatedAt=nowIso();characters.forEach(ch=>{if(charMode(ch)==="forever"&&lower(ch.className)===lower(old))ch.className=name;});}
    else records.push({id:uid(),name,armor:ARMORS.includes(armor)?armor:"",color:/^#[0-9a-f]{6}$/i.test(color)?color:DEFAULT_COLOR,deleted:false,updatedAt:nowIso()});
    writeRecords(FOREVER_CLASS_KEY,records);resetClassForm();applyCatalog();saveCharacters();renderForeverLists();renderAll();toast(`${name} gespeichert`);
  }
  function deleteForeverRace(id){const records=foreverCustomRaces();const r=records.find(x=>x.id===id&&!x.deleted);if(!r)return;const used=characters.filter(c=>charMode(c)==="forever"&&lower(c.race)===lower(r.name)&&c.faction===r.faction).length;if(used){toast(`${r.name} wird noch verwendet`);return;}r.deleted=true;r.updatedAt=nowIso();writeRecords(FOREVER_RACE_KEY,records);applyCatalog();renderForeverLists();renderAll();}
  function deleteForeverClass(id){const records=foreverCustomClasses();const c=records.find(x=>x.id===id&&!x.deleted);if(!c)return;const used=characters.filter(ch=>charMode(ch)==="forever"&&lower(ch.className)===lower(c.name)).length;if(used){toast(`${c.name} wird noch verwendet`);return;}c.deleted=true;c.updatedAt=nowIso();writeRecords(FOREVER_CLASS_KEY,records);applyCatalog();renderForeverLists();renderAll();}
  function renderForeverLists(){
    const rr=document.querySelector("#v714RaceList");if(rr){const list=active(foreverCustomRaces()).sort((a,b)=>a.name.localeCompare(b.name,"de"));rr.innerHTML=list.length?list.map(r=>`<div class="v65-race-item"><div><strong>${escapeHtml(r.name)}</strong><div class="v65-race-meta"><span class="badge ${r.faction==="Horde"?"horde":r.faction==="Allianz"?"allianz":""}">${escapeHtml(r.faction)}</span></div></div><div class="v714-row-actions"><button class="icon-btn" data-v714-race-edit="${escapeHtml(r.id)}">✎</button><button class="icon-btn" data-v714-race-delete="${escapeHtml(r.id)}">×</button></div></div>`).join(""):'<div class="muted">Noch keine Forever-Custom-Völker.</div>';}
    const cr=document.querySelector("#v714ClassList");if(cr){const list=active(foreverCustomClasses()).sort((a,b)=>a.name.localeCompare(b.name,"de"));cr.innerHTML=list.length?list.map(c=>`<div class="v65-race-item"><div><strong>${escapeHtml(c.name)}</strong><div class="v65-race-meta"><span>${escapeHtml(c.armor||"Keine Rüstungsart")}</span><span class="v714-color" style="--v714-color:${escapeHtml(c.color)}"></span></div></div><div class="v714-row-actions"><button class="icon-btn" data-v714-class-edit="${escapeHtml(c.id)}">✎</button><button class="icon-btn" data-v714-class-delete="${escapeHtml(c.id)}">×</button></div></div>`).join(""):'<div class="muted">Noch keine Forever-Custom-Klassen.</div>';}
  }

  /* Forever custom catalogs participate in the same GitHub buttons, but use their own files. */
  function getToken(){return sessionStorage.getItem(TOKEN_SESSION_KEY)||localStorage.getItem(TOKEN_LOCAL_KEY)||"";}
  function getConfig(){try{return {repo:"domxx1/wow-character-planner-data",branch:"main",...JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}")} }catch{return {repo:"domxx1/wow-character-planner-data",branch:"main"};}}
  function bytesToBase64(bytes){let b="";for(let i=0;i<bytes.length;i+=0x8000)b+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(b);}
  function textToBase64(text){return bytesToBase64(new TextEncoder().encode(text));}
  function base64ToText(base64){const b=atob(String(base64||"").replace(/\s/g,""));const bytes=new Uint8Array(b.length);for(let i=0;i<b.length;i++)bytes[i]=b.charCodeAt(i);return new TextDecoder().decode(bytes);}
  async function gh(path,options={}){const token=getToken();if(!token)throw new Error("GitHub-Token fehlt.");const cfg=getConfig();const url=`https://api.github.com/repos/${cfg.repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}${options.read?`?ref=${encodeURIComponent(cfg.branch||"main")}`:""}`;const r=await fetch(url,{method:options.method||"GET",cache:"no-store",headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},body:options.body});if(r.status===404)return null;let body=null;try{body=await r.json();}catch{}if(!r.ok)throw new Error(body?.message||`GitHub API: HTTP ${r.status}`);return body;}
  async function readCloud(path,key,normalizer){const file=await gh(path,{read:true});if(!file)return {file:null,records:[]};const parsed=JSON.parse(base64ToText(file.content));const raw=Array.isArray(parsed)?parsed:parsed?.[key];return {file,records:Array.isArray(raw)?raw.map(normalizer).filter(Boolean):[]};}
  async function writeCloud(path,key,records,file){const cfg=getConfig();const payload={version:1,updatedAt:nowIso(),[key]:records};const body={message:`Sync ${key} (Forever)`,content:textToBase64(JSON.stringify(payload,null,2)+"\n"),branch:cfg.branch||"main"};if(file?.sha)body.sha=file.sha;return gh(path,{method:"PUT",body:JSON.stringify(body)});}
  function mergeRecords(local,remote){const map=new Map();[...local,...remote].forEach(r=>{const old=map.get(r.id);if(!old||new Date(r.updatedAt||0)>=new Date(old.updatedAt||0))map.set(r.id,r);});return [...map.values()];}
  async function syncForeverCustom(kind){
    const race=kind==="race",path=race?FOREVER_RACE_PATH:FOREVER_CLASS_PATH,key=race?"customRaces":"customClasses",storage=race?FOREVER_RACE_KEY:FOREVER_CLASS_KEY,normalizer=race?normalizeRaceRecord:normalizeClassRecord;
    const local=readRecords(storage,normalizer);const {file,records:remote}=await readCloud(path,key,normalizer);const merged=mergeRecords(local,remote);writeRecords(storage,merged);await writeCloud(path,key,merged,file);if(mode==="forever"){applyCatalog();renderForeverLists();renderAll();}
  }
  async function pullForeverCustom(){for(const [path,key,storage,normFn] of [[FOREVER_RACE_PATH,"customRaces",FOREVER_RACE_KEY,normalizeRaceRecord],[FOREVER_CLASS_PATH,"customClasses",FOREVER_CLASS_KEY,normalizeClassRecord]]){const {records}=await readCloud(path,key,normFn);writeRecords(storage,records);}if(mode==="forever"){applyCatalog();renderForeverLists();renderAll();}}
  async function pushForeverCustom(){for(const [path,key,storage,normFn] of [[FOREVER_RACE_PATH,"customRaces",FOREVER_RACE_KEY,normalizeRaceRecord],[FOREVER_CLASS_PATH,"customClasses",FOREVER_CLASS_KEY,normalizeClassRecord]]){const records=readRecords(storage,normFn);const {file}=await readCloud(path,key,normFn);await writeCloud(path,key,records,file);}}
  document.querySelector("#v6Sync")?.addEventListener("click",()=>Promise.all([syncForeverCustom("race"),syncForeverCustom("class")]).catch(()=>{}));
  document.querySelector("#v6Pull")?.addEventListener("click",()=>pullForeverCustom().catch(()=>{}));
  document.querySelector("#v6Push")?.addEventListener("click",()=>pushForeverCustom().catch(()=>{}));

  const style=document.createElement("style");
  style.textContent=`
    .v714-mode-switch{display:inline-flex;gap:2px;padding:3px;border:1px solid rgba(255,255,255,.10);border-radius:11px;background:#111923}
    .v714-mode-switch button{appearance:none;border:0;border-radius:8px;background:transparent;color:#8f9aac;padding:8px 11px;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}
    .v714-mode-switch button.active{background:rgba(212,175,55,.18);color:#f2d277;box-shadow:inset 0 0 0 1px rgba(212,175,55,.28)}
    .v714-custom-form{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(130px,.8fr) minmax(110px,.6fr) auto;gap:10px;align-items:end;margin:14px 0}
    #v714ForeverRaces .v714-custom-form{grid-template-columns:minmax(0,1.4fr) minmax(130px,.8fr) auto}
    .v714-actions,.v714-row-actions{display:flex;gap:7px;align-items:center}.v714-color{width:13px;height:13px;border-radius:50%;background:var(--v714-color);display:inline-block;border:1px solid rgba(255,255,255,.24)}
    @media(max-width:760px){.topbar-actions{gap:8px}.v714-mode-switch button{padding:8px 9px}.v714-custom-form,#v714ForeverRaces .v714-custom-form{grid-template-columns:1fr}.v714-actions .btn{flex:1}}
    @media(max-width:460px){.topbar{align-items:flex-start}.topbar-actions{display:grid;justify-items:end}.v714-mode-switch{order:-1}}
  `;
  document.head.appendChild(style);

  ensureModeSwitch();
  ensureForeverPanels();
  applyCatalog();
  updateModeSwitch();
  updateBrand();
  syncModeSpecificUi();
  renderAll();
})();
