/* v0.5.1 — Dashboard cleanup, planned bar segments, Retail 12.1 matrix validation and rich-profile persistence. */
(() => {
  const VERSION = "0.5.1";
  const RICH_KEY = "wowCharacterPlanner.richProfile.v1";
  const RICH_FIELDS = ["avatarUrl","imageUrl","image","armoryUrl","region","level","specialization","spec","remixEvent"];

  /* Current Retail 12.1 combinations. */
  const ALL_RACES = new Set(RACES.map(r => r.name));
  const CLASS_RACES = new Map([
    ["Krieger", new Set(ALL_RACES)],
    ["Jäger", new Set(ALL_RACES)],
    ["Magier", new Set(ALL_RACES)],
    ["Priester", new Set(ALL_RACES)],
    ["Schurke", new Set(ALL_RACES)],
    ["Hexenmeister", new Set(ALL_RACES)],
    ["Mönch", new Set([...ALL_RACES].filter(r => r !== "Dracthyr"))],
    ["Paladin", new Set(["Menschen","Zwerge","Draenei","Lichtgeschmiedete Draenei","Dunkeleisenzwerge","Irdene","Tauren","Blutelfen","Zandalaritrolle"])],
    ["Druide", new Set(["Nachtelfen","Worgen","Kul Tiraner","Haranir","Tauren","Trolle","Hochbergtauren","Zandalaritrolle"])],
    ["Schamane", new Set(["Zwerge","Draenei","Pandaren","Dunkeleisenzwerge","Kul Tiraner","Irdene","Haranir","Orcs","Tauren","Trolle","Goblins","Hochbergtauren","Orcs der Mag'har","Zandalaritrolle","Vulpera"])],
    ["Dämonenjäger", new Set(["Nachtelfen","Leerenelfen","Blutelfen"])],
    ["Rufer", new Set(["Dracthyr"])],
    ["Todesritter", new Set(["Menschen","Zwerge","Nachtelfen","Gnome","Draenei","Worgen","Pandaren","Leerenelfen","Lichtgeschmiedete Draenei","Dunkeleisenzwerge","Kul Tiraner","Mechagnome","Orcs","Untote","Tauren","Trolle","Blutelfen","Goblins","Nachtgeborene","Hochbergtauren","Orcs der Mag'har","Zandalaritrolle","Vulpera"])],
  ]);

  function isValidCombo(race, className) {
    const set = CLASS_RACES.get(className);
    return !!race && !!set && set.has(race);
  }
  window.wowCharacterPlannerIsValidCombo = isValidCombo;

  /* Persist rich fields separately because an older migration only knows the original schema. */
  function richSnapshot() {
    return characters.map(c => {
      const out = {id:c.id||"",name:c.name||"",className:c.className||""};
      RICH_FIELDS.forEach(field => {
        const value = c?.[field];
        if (value !== undefined && value !== null && String(value) !== "") out[field] = value;
      });
      return out;
    }).filter(c => c.id || c.name);
  }
  function persistRich() {
    try { localStorage.setItem(RICH_KEY, JSON.stringify(richSnapshot())); } catch {}
  }
  function loadRich() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RICH_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  const richBackup = loadRich();
  function richMatch(c) {
    if (c?.id) {
      const byId = richBackup.find(r => r.id && r.id === c.id);
      if (byId) return byId;
    }
    if (c?.name) {
      const hits = richBackup.filter(r => r.name && r.name.localeCompare(c.name,"de",{sensitivity:"base"})===0 && (!r.className || !c.className || r.className===c.className));
      if (hits.length === 1) return hits[0];
    }
    return null;
  }
  characters.forEach(c => {
    const rich = richMatch(c);
    if (!rich) return;
    RICH_FIELDS.forEach(field => {
      const missing = c[field] === undefined || c[field] === null || String(c[field]) === "";
      if (missing && rich[field] !== undefined && rich[field] !== null && String(rich[field]) !== "") c[field] = rich[field];
    });
  });
  const previousSaveCharacters = saveCharacters;
  saveCharacters = function() {
    persistRich();
    previousSaveCharacters();
  };

  /* Remove overview hero + recent block. */
  $("#dashboard .hero")?.remove();
  $("#recentCharacters")?.closest("article.panel")?.remove();

  /* Horde and Alliance share one bar panel. */
  $("#statHorde")?.closest(".stat-card")?.remove();
  $("#statAlliance")?.closest(".stat-card")?.remove();
  const statGrid = $("#dashboard .stat-grid");
  if (statGrid && !$("#v51FactionPanel")) {
    const panel = document.createElement("article");
    panel.id = "v51FactionPanel";
    panel.className = "panel v51-faction-panel";
    panel.innerHTML = '<div class="panel-head"><div><div class="eyebrow">FRAKTIONEN</div><h3>Horde & Allianz</h3></div></div><div id="v51FactionBars"></div>';
    statGrid.insertAdjacentElement("afterend", panel);
  }

  function fixRemixWording() {
    const label = $("#charRemix")?.closest(".field")?.querySelector("span");
    if (label) label.textContent = "Erweiterung Remix";
    const filter = $("#filterRemix");
    if (filter?.options?.length) filter.options[0].textContent = "Alle Erweiterungen Remix";
  }

  const oldCharacterRow = characterRow;
  characterRow = function(c, compact=false) {
    return oldCharacterRow(c, compact)
      .replace(/<span class="remix-badge">Remix /g, '<span class="remix-badge">Erweiterung Remix: ');
  };

  const style = document.createElement("style");
  style.textContent = `
    #dashboard .stat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
    .v51-faction-panel{margin-top:16px}
    .v51-bar-list{display:grid;gap:12px}
    .v51-row{display:grid;grid-template-columns:minmax(92px,145px) minmax(110px,1fr) minmax(74px,auto);gap:10px;align-items:center}
    .v51-name{font-size:.83rem;color:var(--text)}
    .v51-track{height:11px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.07)}
    .v51-fill{display:flex;height:100%;min-width:0;border-radius:inherit;overflow:hidden;transition:width .25s ease}
    .v51-active{height:100%;background:var(--v51-active,#b89b4a)}
    .v51-planned{height:100%;background:repeating-linear-gradient(135deg,rgba(242,210,119,.98) 0 5px,rgba(190,145,34,.82) 5px 10px);box-shadow:inset 1px 0 rgba(255,255,255,.28)}
    .v51-count{display:flex;align-items:baseline;justify-content:flex-end;gap:6px;white-space:nowrap;font-variant-numeric:tabular-nums}
    .v51-count b{font-size:.9rem}.v51-count small{font-size:.69rem;color:var(--muted)}
    #classCoverage.v51-class-bars{display:grid;gap:11px}
    #armorCoverage.v51-armor-bars,#professionCoverage.v51-prof-bars{display:block}
    .matrix-cell.v5-invalid{cursor:not-allowed;opacity:.18;background:transparent!important;box-shadow:none!important;border-color:transparent!important}.matrix-cell.v5-invalid:hover{transform:none}
    .matrix-cell.v5-invalid .count{visibility:hidden}.matrix-table td:has(.v5-invalid){background:rgba(0,0,0,.08)}
    #matrix .matrix-intro{align-items:center}#matrix .matrix-intro p,#matrix .legend{display:none!important}
    @media(max-width:640px){
      #dashboard .stat-grid{grid-template-columns:1fr 1fr}
      .v51-row{grid-template-columns:minmax(78px,108px) minmax(80px,1fr) minmax(64px,auto);gap:7px}
      .v51-name{font-size:.75rem}.v51-count{display:grid;gap:0;text-align:right}.v51-count small{font-size:.62rem}
    }
  `;
  document.head.appendChild(style);

  function splitWhere(predicate) {
    const list = characters.filter(predicate);
    const planned = list.filter(c => c.status === "Geplant").length;
    return {total:list.length, planned, active:list.length-planned};
  }
  function stackedRows(rows, maxTotal) {
    const max = Math.max(1, Number(maxTotal)||0, ...rows.map(r => r.stats.total));
    return `<div class="v51-bar-list">${rows.map(r => {
      const {total, active, planned} = r.stats;
      const outer = total ? (total/max)*100 : 0;
      const activeShare = total ? (active/total)*100 : 0;
      const plannedShare = total ? (planned/total)*100 : 0;
      return `<div class="v51-row">
        <span class="v51-name">${escapeHtml(r.name)}</span>
        <span class="v51-track"><span class="v51-fill" style="width:${outer}%">
          <i class="v51-active" style="width:${activeShare}%;--v51-active:${r.color||"#b89b4a"}"></i>
          <i class="v51-planned" style="width:${plannedShare}%"></i>
        </span></span>
        <span class="v51-count"><b>${total}</b><small>${planned} geplant</small></span>
      </div>`;
    }).join("")}</div>`;
  }

  renderDashboard = function() {
    if ($("#statCharacters")) $("#statCharacters").textContent = characters.length;
    if ($("#statPlanned")) $("#statPlanned").textContent = characters.filter(c => c.status === "Geplant").length;

    const factionRows = [
      {name:"Horde",color:"#9f2727",stats:splitWhere(c => c.faction === "Horde")},
      {name:"Allianz",color:"#2f64a6",stats:splitWhere(c => c.faction === "Allianz")}
    ];
    if ($("#v51FactionBars")) $("#v51FactionBars").innerHTML = stackedRows(factionRows, Math.max(1,...factionRows.map(r=>r.stats.total)));

    const classRows = CLASSES.map(cls => ({name:cls.name,color:cls.color,stats:splitWhere(c => c.className === cls.name)}));
    if ($("#classCoverage")) {
      $("#classCoverage").classList.add("v51-class-bars");
      $("#classCoverage").innerHTML = stackedRows(classRows, Math.max(1,...classRows.map(r=>r.stats.total)));
    }

    const armorRows = ["Stoff","Leder","Kette","Platte"].map(name => ({name,color:"#b89b4a",stats:splitWhere(c => classInfo(c.className).armor === name)}));
    if ($("#armorCoverage")) {
      $("#armorCoverage").className = "v51-armor-bars";
      $("#armorCoverage").innerHTML = stackedRows(armorRows, Math.max(1,...armorRows.map(r=>r.stats.total)));
    }
  };

  renderProfessions = function() {
    const rows = PROFESSIONS.filter(Boolean).map(name => {
      const assigned = characters.filter(c => c.profession1 === name || c.profession2 === name);
      const planned = assigned.filter(c => c.status === "Geplant").length;
      return {name,color:"#9b8a62",stats:{total:assigned.length,planned,active:assigned.length-planned},names:assigned.map(c => c.name||"Unbenannt")};
    });
    if ($("#professionCoverage")) {
      $("#professionCoverage").className = "v51-prof-bars";
      $("#professionCoverage").innerHTML = stackedRows(rows, Math.max(1,...rows.map(r=>r.stats.total)));
    }
    if ($("#professionCharacters")) {
      $("#professionCharacters").innerHTML = rows.map(r => `<div class="prof-block"><strong>${escapeHtml(r.name)}</strong><div class="prof-names">${r.names.length?r.names.map(escapeHtml).join(", "):"Noch niemand zugewiesen"}</div></div>`).join("");
    }
  };

  renderMatrix = function() {
    const table = $("#raceClassMatrix");
    if (!table) return;
    const head = `<thead><tr><th>Volk</th>${CLASSES.map(c => `<th><span class="matrix-class"><i style="--class:${c.color}"></i>${c.name}</span></th>`).join("")}</tr></thead>`;
    const body = RACES.map(r => {
      const key = r.key || `${r.name}|${r.faction}`;
      const cells = CLASSES.map(cls => {
        const valid = isValidCombo(r.name, cls.name);
        const matches = characters.filter(c => c.race === r.name && c.faction === r.faction && c.className === cls.name);
        const active = matches.filter(c => c.status !== "Geplant");
        const planned = matches.filter(c => c.status === "Geplant");
        const remix = [...new Set(planned.map(c => c.remixEvent).filter(Boolean))];
        if (!valid && !matches.length) return '<td><button class="matrix-cell v5-invalid" type="button" disabled aria-label="Nicht verfügbare Kombination"><span class="count">–</span></button></td>';
        const state = active.length && planned.length ? "v3-both" : active.length ? "has" : planned.length ? "planned" : "";
        const marks = matches.length
          ? `<span class="v3-marks">${active.length?`<span class="v3-x">x${active.length>1?active.length:""}</span>`:""}${planned.length?`<span class="v3-y">y${planned.length>1?planned.length:""}</span>`:""}</span>${remix.length?`<small class="v3-remix">${escapeHtml(remix.join(" · "))}</small>`:""}`
          : '<span class="count">＋</span>';
        const title = matches.length
          ? matches.map(c => `${c.name||"Unbenannt"} (${c.status||"Aktiv"}${c.remixEvent?`, Erweiterung Remix: ${c.remixEvent}`:""})`).join(", ")
          : `${r.name} · ${r.faction} · ${cls.name}`;
        return `<td><button class="matrix-cell ${state}${valid?"":" v5-invalid"}" type="button" ${valid?`data-v3-race="${escapeHtml(key)}" data-class="${escapeHtml(cls.name)}"`:"disabled"} title="${escapeHtml(title)}">${marks}</button></td>`;
      }).join("");
      return `<tr><td>${escapeHtml(r.name)}<div class="cell-label">${r.faction}</div></td>${cells}</tr>`;
    }).join("");
    table.innerHTML = head + `<tbody>${body}</tbody>`;
  };

  function selectedRace() {
    const value = $("#charRace")?.value || "";
    return RACES.find(r => (r.key || `${r.name}|${r.faction}`) === value) || null;
  }
  function updateClassOptions(preferred="") {
    const select = $("#charClass");
    if (!select) return;
    const race = selectedRace();
    const current = preferred || select.value;
    const allowed = race ? CLASSES.filter(c => isValidCombo(race.name,c.name)) : CLASSES;
    select.innerHTML = allowed.map(c => `<option value="${escapeHtml(c.name)}">${escapeHtml(c.name)}</option>`).join("");
    if (allowed.some(c => c.name === current)) select.value = current;
    else if (allowed.length) select.value = allowed[0].name;
  }

  const previousOpenCharacter = openCharacter;
  openCharacter = function(id=null,preset={}) {
    previousOpenCharacter(id,preset);
    const c = id ? characters.find(x => x.id === id) : null;
    updateClassOptions(c?.className || preset.className || "");
  };

  $("#charRace")?.addEventListener("change", () => {
    const race = selectedRace();
    if (race && $("#charFaction")) $("#charFaction").value = race.faction;
    updateClassOptions();
  });

  $("#characterForm")?.addEventListener("submit", e => {
    const race = selectedRace();
    const cls = $("#charClass")?.value || "";
    if (race && cls && !isValidCombo(race.name, cls)) {
      e.preventDefault();
      e.stopImmediatePropagation();
      toast("Diese Rassen-Klassen-Kombination ist in WoW Retail 12.1 nicht verfügbar.");
    }
  }, true);

  const previousRenderAll = renderAll;
  renderAll = function() {
    previousRenderAll();
    fixRemixWording();
  };

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;

  fixRemixWording();
  persistRich();
  renderAll();
})();
