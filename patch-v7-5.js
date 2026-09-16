/* v0.7.5 — Matrix readability: compact class headers, faction blocks and split totals. */
(() => {
  const VERSION = "0.7.5";

  const CORE_HORDE = ["Orcs","Untote","Tauren","Trolle","Blutelfen","Goblins"];
  const ALLIED_HORDE = ["Nachtgeborene","Hochbergtauren","Orcs der Mag'har","Zandalaritrolle","Vulpera"];
  const DUAL_FACTION = ["Pandaren","Dracthyr","Irdene","Haranir"];
  const ALLIED_ALLIANCE = ["Leerenelfen","Lichtgeschmiedete Draenei","Dunkeleisenzwerge","Kul Tiraner","Mechagnome"];
  const CORE_ALLIANCE = ["Menschen","Zwerge","Nachtelfen","Gnome","Draenei","Worgen"];

  const CLASS_ORDER = {
    Stoff: ["Priester","Magier","Hexenmeister"],
    Leder: ["Schurke","Mönch","Druide","Dämonenjäger"],
    Kette: ["Jäger","Schamane","Rufer"],
    Platte: ["Krieger","Paladin","Todesritter"]
  };
  const ARMOR_ORDER = ["Stoff","Leder","Kette","Platte"];

  const norm = value => String(value || "").trim();
  const indexOrEnd = (list, value) => {
    const i = list.indexOf(value);
    return i >= 0 ? i : 999;
  };
  const isValidCombo = (race, className) => typeof window.wowCharacterPlannerIsValidCombo === "function"
    ? !!window.wowCharacterPlannerIsValidCombo(race, className)
    : true;

  function rgba(hex, alpha) {
    const value = String(hex || "#64748b").replace("#", "");
    const clean = /^[0-9a-f]{6}$/i.test(value) ? value : "64748b";
    const r = parseInt(clean.slice(0,2), 16);
    const g = parseInt(clean.slice(2,4), 16);
    const b = parseInt(clean.slice(4,6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function raceBucket(r) {
    const name = norm(r?.name);
    const faction = norm(r?.faction);
    if (r?.custom) {
      if (faction === "Horde") return {group:1, order:0, label:"Horde · Custom"};
      if (faction === "Allianz") return {group:6, order:0, label:"Allianz · Custom"};
      return {group:7, order:0, label:"Neutral · Custom"};
    }
    if (DUAL_FACTION.includes(name)) {
      const factionOrder = faction === "Horde" ? 0 : faction === "Allianz" ? 1 : 2;
      return {group:3, order:factionOrder * 100 + indexOrEnd(DUAL_FACTION, name), label:"Völker · beide Fraktionen"};
    }
    if (faction === "Horde" && ALLIED_HORDE.includes(name)) return {group:2, order:indexOrEnd(ALLIED_HORDE, name), label:"Verbündete Völker · Horde"};
    if (faction === "Allianz" && ALLIED_ALLIANCE.includes(name)) return {group:4, order:indexOrEnd(ALLIED_ALLIANCE, name), label:"Verbündete Völker · Allianz"};
    if (faction === "Horde") return {group:0, order:indexOrEnd(CORE_HORDE, name), label:"Horde"};
    if (faction === "Allianz") return {group:5, order:indexOrEnd(CORE_ALLIANCE, name), label:"Allianz"};
    return {group:7, order:500, label:"Weitere Völker"};
  }

  function orderedRaces() {
    return RACES.map((race, sourceIndex) => ({race, sourceIndex, bucket:raceBucket(race)}))
      .sort((a,b) => a.bucket.group - b.bucket.group || a.bucket.order - b.bucket.order ||
        a.race.name.localeCompare(b.race.name, "de") || a.sourceIndex - b.sourceIndex);
  }

  function classBucket(cls) {
    const armor = ARMOR_ORDER.includes(cls?.armor) ? cls.armor : "";
    if (!armor) return {group:4, order:999, label:"Ohne Rüstungsart"};
    const group = ARMOR_ORDER.indexOf(armor);
    const officialOrder = indexOrEnd(CLASS_ORDER[armor] || [], cls.name);
    const customOffset = cls?.customClass ? 500 : 0;
    return {group, order:customOffset + officialOrder, label:armor};
  }

  function orderedClasses() {
    return CLASSES.map((cls, sourceIndex) => ({cls, sourceIndex, bucket:classBucket(cls)}))
      .sort((a,b) => a.bucket.group - b.bucket.group || a.bucket.order - b.bucket.order ||
        a.cls.name.localeCompare(b.cls.name, "de") || a.sourceIndex - b.sourceIndex);
  }

  function comboFlags(list) {
    const existing = list.some(c => c.status !== "Geplant");
    const planned = list.some(c => c.status === "Geplant");
    return {existing, planned, total:existing || planned};
  }

  function rowComboStats(rowCharacters, classEntries) {
    let existing = 0, planned = 0, total = 0;
    classEntries.forEach(entry => {
      const flags = comboFlags(rowCharacters.filter(c => c.className === entry.cls.name));
      if (flags.existing) existing++;
      if (flags.planned) planned++;
      if (flags.total) total++;
    });
    return {existing, planned, total};
  }

  function classComboStats(matrixCharacters, clsName, faction="") {
    const relevant = matrixCharacters.filter(c => c.className === clsName && (!faction || c.faction === faction));
    const keys = new Map();
    relevant.forEach(c => {
      const key = `${c.race}|${c.faction}`;
      if (!keys.has(key)) keys.set(key, []);
      keys.get(key).push(c);
    });
    let existing = 0, planned = 0, total = 0;
    keys.forEach(list => {
      const flags = comboFlags(list);
      if (flags.existing) existing++;
      if (flags.planned) planned++;
      if (flags.total) total++;
    });
    return {existing, planned, total};
  }

  function factionWord(faction) {
    if (faction === "Horde") return '<span class="v75-faction-word v75-horde-text">Horde</span>';
    if (faction === "Allianz") return '<span class="v75-faction-word v75-alliance-text">Allianz</span>';
    return `<span>${escapeHtml(faction || "Neutral")}</span>`;
  }

  function classHeader(entry, isGroupStart) {
    const cls = entry.cls;
    const title = `${cls.name} · ${entry.bucket.label}${cls.customClass ? " · Custom" : ""}`;
    return `<th class="v75-class-head${isGroupStart ? " v73-armor-start" : ""}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
      <span class="v75-class-dot" style="--class:${escapeHtml(cls.color || "#64748b")}" aria-hidden="true"></span>
    </th>`;
  }

  function summaryCell(value, kind, title) {
    return `<td class="v75-sum-cell v75-sum-${kind}" title="${escapeHtml(title)}"><strong>${value}</strong></td>`;
  }

  function footerRow(labelHtml, classEntries, matrixCharacters, faction, metric, cssClass) {
    const cells = classEntries.map((entry, index) => {
      const s = classComboStats(matrixCharacters, entry.cls.name, faction);
      const armorStart = index === 0 || classEntries[index - 1].bucket.group !== entry.bucket.group ? " v73-armor-start" : "";
      return `<td class="v75-footer-number${armorStart}" title="${escapeHtml(entry.cls.name)} · ${metric === "existing" ? "Erstellt" : metric === "planned" ? "Geplant" : "Gesamt"}">${s[metric]}</td>`;
    }).join("");

    const scope = faction ? matrixCharacters.filter(c => c.faction === faction) : matrixCharacters;
    const byRace = new Map();
    scope.forEach(c => {
      const key = `${c.race}|${c.faction}|${c.className}`;
      if (!byRace.has(key)) byRace.set(key, []);
      byRace.get(key).push(c);
    });
    let existing = 0, planned = 0, total = 0;
    byRace.forEach(list => {
      const flags = comboFlags(list);
      if (flags.existing) existing++;
      if (flags.planned) planned++;
      if (flags.total) total++;
    });
    const totals = {existing, planned, total};
    return `<tr class="v75-footer-row ${cssClass}"><td class="v75-footer-label">${labelHtml}</td>${cells}` +
      `<td class="v75-footer-side v75-side-existing">${metric === "existing" ? totals.existing : ""}</td>` +
      `<td class="v75-footer-side v75-side-planned">${metric === "planned" ? totals.planned : ""}</td>` +
      `<td class="v75-footer-side v75-side-total">${metric === "total" ? totals.total : ""}</td></tr>`;
  }

  renderMatrix = function() {
    const table = document.querySelector("#raceClassMatrix");
    if (!table) return;

    const raceEntries = orderedRaces();
    const classEntries = orderedClasses();
    const firstClassGroups = new Set();
    classEntries.forEach((entry, index) => {
      if (index === 0 || classEntries[index - 1].bucket.group !== entry.bucket.group) firstClassGroups.add(index);
    });

    const head = `<thead><tr><th>Volk</th>${classEntries.map((entry,index) => classHeader(entry, firstClassGroups.has(index))).join("")}` +
      '<th class="v75-sum-head v75-head-existing">Erstellt</th><th class="v75-sum-head v75-head-planned">Geplant</th><th class="v75-sum-head v75-head-total">Gesamt</th></tr></thead>';

    let previousRaceGroup = null;
    const body = raceEntries.map((entry, raceIndex) => {
      const r = entry.race;
      const raceGroupStart = previousRaceGroup !== entry.bucket.group;
      previousRaceGroup = entry.bucket.group;
      const key = r.key || `${r.name}|${r.faction}`;
      const rowCharacters = characters.filter(c => c.race === r.name && c.faction === r.faction);
      const previousFaction = raceIndex > 0 ? raceEntries[raceIndex - 1].race.faction : "";
      const nextFaction = raceIndex < raceEntries.length - 1 ? raceEntries[raceIndex + 1].race.faction : "";
      const factionClass = r.faction === "Horde" ? "v75-horde-run" : r.faction === "Allianz" ? "v75-alliance-run" : "";
      const factionStart = r.faction && r.faction !== previousFaction ? ` v75-${r.faction === "Horde" ? "horde" : r.faction === "Allianz" ? "alliance" : "neutral"}-start` : "";
      const factionEnd = r.faction && r.faction !== nextFaction ? ` v75-${r.faction === "Horde" ? "horde" : r.faction === "Allianz" ? "alliance" : "neutral"}-end` : "";

      const cells = classEntries.map((classEntry, classIndex) => {
        const cls = classEntry.cls;
        const valid = isValidCombo(r.name, cls.name);
        const matches = rowCharacters.filter(c => c.className === cls.name);
        const existing = matches.filter(c => c.status !== "Geplant");
        const planned = matches.filter(c => c.status === "Geplant");
        const remix = [...new Set(planned.map(c => c.remixEvent).filter(Boolean))];
        const armorStart = firstClassGroups.has(classIndex) ? " v73-armor-start" : "";

        if (!valid && !matches.length) {
          return `<td class="${armorStart.trim()}"><button class="matrix-cell v5-invalid" type="button" disabled aria-label="Nicht verfügbare Kombination"><span class="count">–</span></button></td>`;
        }

        const state = existing.length && planned.length ? "v3-both" : existing.length ? "has" : planned.length ? "planned" : "";
        const marks = matches.length
          ? `<span class="v3-marks">${existing.length ? `<span class="v3-x" title="Erstellt">x${existing.length > 1 ? existing.length : ""}</span>` : ""}${planned.length ? `<span class="v3-y" title="Geplant">y${planned.length > 1 ? planned.length : ""}</span>` : ""}</span>${remix.length ? `<small class="v3-remix">${escapeHtml(remix.map(x => `${x} Remix`).join(" · "))}</small>` : ""}`
          : '<span class="count">＋</span>';
        const title = matches.length
          ? matches.map(c => `${c.name || "Unbenannt"} (${c.status || "Aktiv"}${c.remixEvent ? `, ${c.remixEvent} Remix` : ""})`).join(", ")
          : `${r.name} · ${r.faction} · ${cls.name} planen`;
        const color = cls.color || "#64748b";
        const possibleClass = valid ? " v73-possible" : " v5-invalid";
        const disabled = valid ? `data-v3-race="${escapeHtml(key)}" data-class="${escapeHtml(cls.name)}"` : "disabled";
        const style = valid ? `style="--v73-class:${escapeHtml(color)};--v73-class-soft:${rgba(color,.045)};--v73-class-occupied:${rgba(color,.18)};--v73-class-edge:${rgba(color,.16)}"` : "";
        return `<td class="${armorStart.trim()}"><button class="matrix-cell ${state}${possibleClass}" type="button" ${disabled} ${style} title="${escapeHtml(title)}">${marks}</button></td>`;
      }).join("");

      const raceMeta = r.custom
        ? `<div class="cell-label">${factionWord(r.faction)} <span class="v75-custom-word">· Custom</span></div>`
        : `<div class="cell-label">${factionWord(r.faction)}</div>`;
      const rowStats = rowComboStats(rowCharacters, classEntries);
      const sums = summaryCell(rowStats.existing, "existing", `${r.name}: ${rowStats.existing} erstellte Klassen`) +
        summaryCell(rowStats.planned, "planned", `${r.name}: ${rowStats.planned} geplante Klassen`) +
        summaryCell(rowStats.total, "total", `${r.name}: ${rowStats.total} Klassen insgesamt`);
      const rowClass = `${raceGroupStart ? "v73-race-group-start " : ""}${factionClass}${factionStart}${factionEnd}`.trim();
      return `<tr class="${rowClass}" data-v73-group="${escapeHtml(entry.bucket.label)}"><td>${escapeHtml(r.name)}${raceMeta}</td>${cells}${sums}</tr>`;
    }).join("");

    const raceKeys = new Set(raceEntries.map(entry => `${entry.race.name}|${entry.race.faction}`));
    const classNames = new Set(classEntries.map(entry => entry.cls.name));
    const matrixCharacters = characters.filter(c => raceKeys.has(`${c.race}|${c.faction}`) && classNames.has(c.className));

    const footer = [
      footerRow(`${factionWord("Horde")} · Erstellt`, classEntries, matrixCharacters, "Horde", "existing", "v75-footer-horde v75-footer-group-start"),
      footerRow(`${factionWord("Horde")} · Geplant`, classEntries, matrixCharacters, "Horde", "planned", "v75-footer-horde"),
      footerRow(`${factionWord("Horde")} · Gesamt`, classEntries, matrixCharacters, "Horde", "total", "v75-footer-horde"),
      footerRow(`${factionWord("Allianz")} · Erstellt`, classEntries, matrixCharacters, "Allianz", "existing", "v75-footer-alliance v75-footer-group-start"),
      footerRow(`${factionWord("Allianz")} · Geplant`, classEntries, matrixCharacters, "Allianz", "planned", "v75-footer-alliance"),
      footerRow(`${factionWord("Allianz")} · Gesamt`, classEntries, matrixCharacters, "Allianz", "total", "v75-footer-alliance"),
      footerRow('<span class="v75-overall-text">Gesamt</span> · Erstellt', classEntries, matrixCharacters, "", "existing", "v75-footer-overall v75-footer-group-start"),
      footerRow('<span class="v75-overall-text">Gesamt</span> · Geplant', classEntries, matrixCharacters, "", "planned", "v75-footer-overall"),
      footerRow('<span class="v75-overall-text">Gesamt</span> · Gesamt', classEntries, matrixCharacters, "", "total", "v75-footer-overall"),
    ].join("");

    table.innerHTML = head + `<tbody>${body}</tbody><tfoot>${footer}</tfoot>`;
  };

  const style = document.createElement("style");
  style.textContent = `
    /* Possible-but-empty combinations should only hint at the class color. */
    .matrix-cell.v73-possible{background:var(--v73-class-soft)!important;color:var(--v73-class,#cbd5e1)!important;box-shadow:inset 0 0 0 1px var(--v73-class-edge)!important;opacity:1!important}
    .matrix-cell.v73-possible.has,.matrix-cell.v73-possible.planned,.matrix-cell.v73-possible.v3-both{background:var(--v73-class-occupied)!important}
    .matrix-cell.v73-possible:hover{filter:brightness(1.45);color:#fff!important}

    /* Class headers are intentionally compact: mouseover/title carries the class name. */
    #raceClassMatrix th.v75-class-head{min-width:42px;width:42px;padding:0}
    .v75-class-dot{display:block;width:11px;height:11px;margin:auto;border-radius:50%;background:var(--class,#64748b);box-shadow:0 0 0 2px rgba(255,255,255,.08)}

    .v75-horde-text{color:#e06a6a!important;font-weight:850}.v75-alliance-text{color:#68a7e8!important;font-weight:850}.v75-custom-word{color:#d9b85b}

    /* One subtle outline around each contiguous Horde/Alliance body area, not around every race. */
    #raceClassMatrix tbody tr.v75-horde-run>td:first-child{border-left:2px solid rgba(216,89,89,.42)!important}
    #raceClassMatrix tbody tr.v75-alliance-run>td:first-child{border-left:2px solid rgba(74,163,255,.42)!important}
    #raceClassMatrix tbody tr.v75-horde-run>td:last-child{border-right:2px solid rgba(216,89,89,.42)!important}
    #raceClassMatrix tbody tr.v75-alliance-run>td:last-child{border-right:2px solid rgba(74,163,255,.42)!important}
    #raceClassMatrix tbody tr.v75-horde-start>td{border-top:2px solid rgba(216,89,89,.34)!important}
    #raceClassMatrix tbody tr.v75-horde-end>td{border-bottom:2px solid rgba(216,89,89,.34)!important}
    #raceClassMatrix tbody tr.v75-alliance-start>td{border-top:2px solid rgba(74,163,255,.34)!important}
    #raceClassMatrix tbody tr.v75-alliance-end>td{border-bottom:2px solid rgba(74,163,255,.34)!important}

    /* Three independent sum columns: created, planned and overall. */
    #raceClassMatrix .v75-sum-head,#raceClassMatrix .v75-sum-cell{position:sticky;z-index:4;min-width:62px;width:62px;background:#151d28!important;font-variant-numeric:tabular-nums}
    #raceClassMatrix .v75-sum-cell{z-index:2;background:#111821!important}
    #raceClassMatrix .v75-head-total,#raceClassMatrix .v75-sum-total{right:0}
    #raceClassMatrix .v75-head-planned,#raceClassMatrix .v75-sum-planned{right:62px}
    #raceClassMatrix .v75-head-existing,#raceClassMatrix .v75-sum-existing{right:124px;border-left:2px solid #4b5c72!important}
    #raceClassMatrix .v75-sum-head{font-size:.56rem;letter-spacing:.02em}
    #raceClassMatrix .v75-sum-cell strong{font-size:.72rem}
    #raceClassMatrix .v75-sum-existing strong{color:#61d889}#raceClassMatrix .v75-sum-planned strong{color:#f2d277}#raceClassMatrix .v75-sum-total strong{color:#dbe5f2}

    /* Footer uses one actual table cell per number. Nine compact rows keep Horde, Alliance and all totals separate. */
    #raceClassMatrix tfoot td{position:static!important;height:27px!important;padding:3px 5px!important;background:#141c27;border-bottom:1px solid #243042;font-size:.62rem;font-variant-numeric:tabular-nums}
    #raceClassMatrix tfoot .v75-footer-label{position:sticky!important;left:0!important;z-index:3!important;text-align:left!important;padding-left:12px!important;min-width:150px;background:#151d28!important;white-space:nowrap;font-weight:800}
    #raceClassMatrix tfoot .v75-footer-number{text-align:center;font-weight:850;color:#dbe5f2}
    #raceClassMatrix tfoot .v75-footer-side{text-align:center;font-weight:900;background:#182230!important}
    #raceClassMatrix tfoot .v75-side-existing{color:#61d889;border-left:2px solid #4b5c72!important}.v75-side-planned{color:#f2d277}.v75-side-total{color:#dbe5f2}
    #raceClassMatrix tfoot tr.v75-footer-group-start>td{border-top:2px solid #4b5c72!important}
    #raceClassMatrix tfoot tr.v75-footer-horde>td:first-child{border-left:2px solid rgba(216,89,89,.42)!important}
    #raceClassMatrix tfoot tr.v75-footer-alliance>td:first-child{border-left:2px solid rgba(74,163,255,.42)!important}
    .v75-overall-text{color:#e7edf5;font-weight:900}

    @media(max-width:760px){
      #raceClassMatrix th.v75-class-head{min-width:38px;width:38px}
      #raceClassMatrix .v75-sum-head,#raceClassMatrix .v75-sum-cell{min-width:56px;width:56px}
      #raceClassMatrix .v75-head-planned,#raceClassMatrix .v75-sum-planned{right:56px}
      #raceClassMatrix .v75-head-existing,#raceClassMatrix .v75-sum-existing{right:112px}
      #raceClassMatrix .v75-sum-head{font-size:.5rem}
      #raceClassMatrix tfoot td{font-size:.56rem}
    }
  `;
  document.head.appendChild(style);

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
  renderAll();
})();
