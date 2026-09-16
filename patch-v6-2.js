/* v0.6.2 — Remove discarded Midnight field and add Blizzard-announced Eclipse Paladin races. */
(() => {
  const VERSION = "0.6.2";
  const ANNOUNCED_PALADIN_RACES = new Set(["Untote","Nachtelfen","Trolle"]);
  const previousValidity = window.wowCharacterPlannerIsValidCombo;

  function isAnnouncedCombo(race,className){
    return className === "Paladin" && ANNOUNCED_PALADIN_RACES.has(race);
  }
  function isValidCombo(race,className){
    return isAnnouncedCombo(race,className) || (typeof previousValidity === "function" && previousValidity(race,className));
  }
  window.wowCharacterPlannerIsValidCombo = isValidCombo;

  /* Midnight was a discarded planner concept. Keep a hidden compatibility input so older patch code does not break. */
  const midnight = document.querySelector("#charMidnight");
  if(midnight){
    const field = midnight.closest(".field");
    if(field) field.remove();
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.id = "charMidnight";
    hidden.value = "";
    document.querySelector("#characterForm")?.appendChild(hidden);
  }

  function stripMidnight(){
    let changed = false;
    characters.forEach(c => {
      if(c && Object.prototype.hasOwnProperty.call(c,"midnight")){
        delete c.midnight;
        changed = true;
      }
    });
    return changed;
  }

  stripMidnight();
  const previousSave = saveCharacters;
  saveCharacters = function(){
    stripMidnight();
    previousSave();
  };

  const previousRenderAll = renderAll;
  renderAll = function(){
    const changed = stripMidnight();
    previousRenderAll();
    if(changed){
      try { localStorage.setItem("wowCharacterPlanner.characters.v1",JSON.stringify(characters)); } catch {}
    }
  };

  function selectedRace(){
    const value = document.querySelector("#charRace")?.value || "";
    return RACES.find(r => (r.key || `${r.name}|${r.faction}`) === value) || null;
  }
  function refreshClassOptions(preferred=""){
    const select = document.querySelector("#charClass");
    if(!select) return;
    const race = selectedRace();
    const current = preferred || select.value;
    const allowed = race ? CLASSES.filter(c => isValidCombo(race.name,c.name)) : CLASSES;
    select.innerHTML = allowed.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
    if(allowed.some(c => c.name === current)) select.value = current;
    else if(allowed.length) select.value = allowed[0].name;
  }

  const previousOpen = openCharacter;
  openCharacter = function(id=null,preset={}){
    previousOpen(id,preset);
    const c = id ? characters.find(x => x.id === id) : null;
    refreshClassOptions(c?.className || preset.className || "");
    const hidden = document.querySelector("#charMidnight");
    if(hidden) hidden.value = "";
  };
  document.querySelector("#charRace")?.addEventListener("change",()=>refreshClassOptions());

  /* v0.5.1 has a capture validator for the old 12.1 table. Announced Paladins bypass that old validator via a direct save path. */
  function saveAnnouncedPaladin(){
    const race = selectedRace();
    const cls = document.querySelector("#charClass")?.value || "";
    if(!race || !isAnnouncedCombo(race.name,cls)) return false;

    const id = document.querySelector("#charId")?.value || "";
    const existing = id ? characters.find(c => c.id === id) : null;
    const levelRaw = Number.parseInt(document.querySelector("#charLevel")?.value || "",10);
    const data = {
      ...(existing || {}),
      id: id || uid(),
      name: document.querySelector("#charName")?.value.trim() || "",
      race: race.name,
      variant: document.querySelector("#charVariant")?.value.trim() || "",
      faction: race.faction,
      className: cls,
      gender: document.querySelector("#charGender")?.value || "",
      profession1: document.querySelector("#charProfession1")?.value || "",
      profession2: document.querySelector("#charProfession2")?.value || "",
      status: document.querySelector("#charStatus")?.value || "Geplant",
      level: Number.isFinite(levelRaw) && levelRaw > 0 ? Math.min(90,levelRaw) : "",
      specialization: document.querySelector("#charSpecialization")?.value.trim() || "",
      realm: document.querySelector("#charRealm")?.value.trim() || "",
      region: document.querySelector("#charRegion")?.value || "eu",
      remixEvent: document.querySelector("#charRemix")?.value.trim() || "",
      avatarUrl: document.querySelector("#charAvatar")?.value || existing?.avatarUrl || "",
      armoryUrl: "",
      notes: document.querySelector("#charNotes")?.value.trim() || ""
    };
    delete data.midnight;
    if(!data.name && data.status !== "Geplant") { toast("Für vorhandene Charaktere ist ein Name erforderlich"); return true; }
    if(id){
      const idx = characters.findIndex(c => c.id === id);
      if(idx >= 0) characters[idx] = data;
    } else characters.push(data);
    document.querySelector("#characterDialog")?.close();
    saveCharacters();
    toast(id ? "Charakter aktualisiert" : "Charakter angelegt");
    return true;
  }

  document.querySelector("#saveCharacter")?.addEventListener("click",e=>{
    if(saveAnnouncedPaladin()){
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },true);
  document.querySelector("#characterForm")?.addEventListener("keydown",e=>{
    if(e.key === "Enter" && isAnnouncedCombo(selectedRace()?.name,document.querySelector("#charClass")?.value || "")){
      e.preventDefault();
      saveAnnouncedPaladin();
    }
  },true);

  renderMatrix = function(){
    const table = document.querySelector("#raceClassMatrix");
    if(!table) return;
    const head = `<thead><tr><th>Volk</th>${CLASSES.map(c=>`<th><span class="matrix-class"><i style="--class:${c.color}"></i>${c.name}</span></th>`).join("")}</tr></thead>`;
    const body = RACES.map(r=>{
      const key = r.key || `${r.name}|${r.faction}`;
      const cells = CLASSES.map(cls=>{
        const valid = isValidCombo(r.name,cls.name);
        const announced = isAnnouncedCombo(r.name,cls.name);
        const matches = characters.filter(c=>c.race===r.name&&c.faction===r.faction&&c.className===cls.name);
        const existing = matches.filter(c=>c.status!=="Geplant");
        const planned = matches.filter(c=>c.status==="Geplant");
        const remix = [...new Set(planned.map(c=>c.remixEvent).filter(Boolean))];
        if(!valid && !matches.length) return '<td><button class="matrix-cell v5-invalid" type="button" disabled aria-label="Nicht verfügbare Kombination"><span class="count">–</span></button></td>';
        const state = existing.length&&planned.length?"v3-both":existing.length?"has":planned.length?"planned":"";
        const marks = matches.length
          ? `<span class="v3-marks">${existing.length?`<span class="v3-x">x${existing.length>1?existing.length:""}</span>`:""}${planned.length?`<span class="v3-y">y${planned.length>1?planned.length:""}</span>`:""}</span>${remix.length?`<small class="v3-remix">${escapeHtml(remix.join(" · "))}</small>`:""}`
          : '<span class="count">＋</span>';
        const baseTitle = matches.length ? matches.map(c=>`${c.name||"Unbenannt"} (${c.status||"Aktiv"})`).join(", ") : `${r.name} · ${r.faction} · ${cls.name}`;
        const title = announced ? `${baseTitle} · angekündigt für Eclipse` : baseTitle;
        return `<td><button class="matrix-cell ${state}${announced?" v62-announced":""}${valid?"":" v5-invalid"}" type="button" ${valid?`data-v3-race="${escapeHtml(key)}" data-class="${escapeHtml(cls.name)}"`:"disabled"} title="${escapeHtml(title)}">${marks}</button></td>`;
      }).join("");
      return `<tr><td>${escapeHtml(r.name)}<div class="cell-label">${r.faction}</div></td>${cells}</tr>`;
    }).join("");
    table.innerHTML = head + `<tbody>${body}</tbody>`;
  };

  /* Replace the CSV export with the current schema, without Midnight. */
  const exportButton = document.querySelector("#exportCsv");
  if(exportButton){
    const fresh = exportButton.cloneNode(true);
    exportButton.replaceWith(fresh);
    fresh.addEventListener("click",()=>{
      const headers=["Name","Volk","Variante","Fraktion","Klasse","Geschlecht","Level","Spezialisierung","Beruf 1","Beruf 2","Erweiterung Remix","Status","Server","Region","Bild-URL","Arsenal-Link","Notizen"];
      const rows=characters.map(c=>[c.name,c.race,c.variant,c.faction,c.className,c.gender,c.level||"",c.specialization||"",c.profession1,c.profession2,c.remixEvent||"",c.status,c.realm,c.region||"eu",c.avatarUrl||"",typeof window.wowCharacterPlannerArmoryLink==="function"?window.wowCharacterPlannerArmoryLink(c):"",c.notes]);
      const text="\uFEFF"+[headers,...rows].map(r=>r.map(csvEscape).join(";")).join("\r\n");
      downloadBlob(text,"wow-charaktere.csv","text/csv;charset=utf-8");
    });
  }

  const style = document.createElement("style");
  style.textContent = `.matrix-cell.v62-announced{box-shadow:inset 0 0 0 1px rgba(244,140,186,.7);position:relative}.matrix-cell.v62-announced:after{content:"E";position:absolute;right:3px;top:2px;font-size:.48rem;color:#f4a7c7;font-weight:800}`;
  document.head.appendChild(style);

  const brandSub = document.querySelector(".brand-sub");
  if(brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;

  saveCharacters();
  refreshClassOptions();
})();