/* v0.7.4 — Matrix totals plus clearer custom-race faction labels. */
(() => {
  const VERSION = "0.7.4";

  const CORE_HORDE = ["Orcs","Untote","Tauren","Trolle","Blutelfen","Goblins","Pandaren","Dracthyr"];
  const ALLIED_HORDE = ["Nachtgeborene","Hochbergtauren","Orcs der Mag'har","Zandalaritrolle","Vulpera"];
  const DUAL_ALLIED = ["Irdene","Haranir"];
  const ALLIED_ALLIANCE = ["Leerenelfen","Lichtgeschmiedete Draenei","Dunkeleisenzwerge","Kul Tiraner","Mechagnome"];
  const CORE_ALLIANCE = ["Menschen","Zwerge","Nachtelfen","Gnome","Draenei","Worgen","Pandaren","Dracthyr"];

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
    if (DUAL_ALLIED.includes(name)) {
      const factionOrder = faction === "Horde" ? 0 : faction === "Allianz" ? 1 : 2;
      return {group:3, order:factionOrder * 100 + indexOrEnd(DUAL_ALLIED, name), label:"Verbündete Völker · beide Fraktionen"};
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

  function stats(list) {
    const existing = list.filter(c => c.status !== "Geplant").length;
    const planned = list.filter(c => c.status === "Geplant").length;
    return {existing, planned, total:existing + planned};
  }

  function compactStats(s, prefix="") {
    return `<span class="v74-stat-line">${prefix ? `<b>${escapeHtml(prefix)}</b>` : ""}<span class="v74-created">x ${s.existing}</span><span class="v74-planned">y ${s.planned}</span><span class="v74-total">Σ ${s.total}</span></span>`;
  }

  function classHeader(entry, isGroupStart) {
    const cls = entry.cls;
    return `<th class="${isGroupStart ? "v73-armor-start" : ""}" title="${escapeHtml(entry.bucket.label)}">
      <span class="matrix-class"><i style="--class:${escapeHtml(cls.color || "#64748b")}"></i>${escapeHtml(cls.name)}${cls.customClass ? '<small class="v73-custom-tag">Custom</small>' : ""}</span>
    </th>`;
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

    const head = `<thead><tr><th>Volk</th>${classEntries.map((entry,index) => classHeader(entry, firstClassGroups.has(index))).join("")}<th class="v74-sum-head">Summe</th></tr></thead>`;

    let previousRaceGroup = null;
    const body = raceEntries.map(entry => {
      const r = entry.race;
      const raceGroupStart = previousRaceGroup !== entry.bucket.group;
      previousRaceGroup = entry.bucket.group;
      const key = r.key || `${r.name}|${r.faction}`;
      const rowCharacters = characters.filter(c => c.race === r.name && c.faction === r.faction);

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
          ? `<span class="v3-marks">${existing.length ? `<span class="v3-x">x${existing.length > 1 ? existing.length : ""}</span>` : ""}${planned.length ? `<span class="v3-y">y${planned.length > 1 ? planned.length : ""}</span>` : ""}</span>${remix.length ? `<small class="v3-remix">${escapeHtml(remix.map(x => `${x} Remix`).join(" · "))}</small>` : ""}`
          : '<span class="count">＋</span>';
        const title = matches.length
          ? matches.map(c => `${c.name || "Unbenannt"} (${c.status || "Aktiv"}${c.remixEvent ? `, ${c.remixEvent} Remix` : ""})`).join(", ")
          : `${r.name} · ${r.faction} · ${cls.name} planen`;
        const color = cls.color || "#64748b";
        const possibleClass = valid ? " v73-possible" : " v5-invalid";
        const disabled = valid ? `data-v3-race="${escapeHtml(key)}" data-class="${escapeHtml(cls.name)}"` : "disabled";
        const style = valid ? `style="--v73-class:${escapeHtml(color)};--v73-class-soft:${rgba(color,.12)};--v73-class-occupied:${rgba(color,.20)};--v73-class-edge:${rgba(color,.34)}"` : "";
        return `<td class="${armorStart.trim()}"><button class="matrix-cell ${state}${possibleClass}" type="button" ${disabled} ${style} title="${escapeHtml(title)}">${marks}</button></td>`;
      }).join("");

      const raceMeta = r.custom
        ? `<div class="cell-label">${escapeHtml(r.faction)} · Custom</div>`
        : `<div class="cell-label">${escapeHtml(r.faction)}</div>`;
      const rowStats = stats(rowCharacters.filter(c => classEntries.some(e => e.cls.name === c.className)));
      const sumCell = `<td class="v74-sum-cell" title="Erstellt: ${rowStats.existing} · Geplant: ${rowStats.planned} · Gesamt: ${rowStats.total}">${compactStats(rowStats)}</td>`;
      return `<tr class="${raceGroupStart ? "v73-race-group-start" : ""}" data-v73-group="${escapeHtml(entry.bucket.label)}"><td>${escapeHtml(r.name)}${raceMeta}</td>${cells}${sumCell}</tr>`;
    }).join("");

    const raceKeys = new Set(raceEntries.map(entry => `${entry.race.name}|${entry.race.faction}`));
    const matrixCharacters = characters.filter(c => raceKeys.has(`${c.race}|${c.faction}`) && classEntries.some(e => e.cls.name === c.className));

    const footerCells = classEntries.map((entry, classIndex) => {
      const cls = entry.cls;
      const forClass = matrixCharacters.filter(c => c.className === cls.name);
      const horde = stats(forClass.filter(c => c.faction === "Horde"));
      const alliance = stats(forClass.filter(c => c.faction === "Allianz"));
      const overall = stats(forClass);
      const armorStart = firstClassGroups.has(classIndex) ? " v73-armor-start" : "";
      return `<td class="v74-footer-cell${armorStart}" title="${escapeHtml(cls.name)} — Horde ${horde.total}, Allianz ${alliance.total}, Gesamt ${overall.total}">
        ${compactStats(horde,"H")}${compactStats(alliance,"A")}${compactStats(overall,"Σ")}
      </td>`;
    }).join("");

    const hordeAll = stats(matrixCharacters.filter(c => c.faction === "Horde"));
    const allianceAll = stats(matrixCharacters.filter(c => c.faction === "Allianz"));
    const overallAll = stats(matrixCharacters);
    const footerTotal = `<td class="v74-footer-cell v74-grand-total" title="Gesamtsumme der Matrix">${compactStats(hordeAll,"H")}${compactStats(allianceAll,"A")}${compactStats(overallAll,"Σ")}</td>`;
    const foot = `<tfoot><tr><td class="v74-footer-label"><strong>Summe</strong><small>Horde · Allianz · Gesamt</small></td>${footerCells}${footerTotal}</tr></tfoot>`;

    table.innerHTML = head + `<tbody>${body}</tbody>` + foot;
  };

  const style = document.createElement("style");
  style.textContent = `
    /* Reverse custom-race wording: faction first, then Custom. */
    #raceClassMatrix tbody tr[data-v73-group="Horde · Custom"]>td:first-child .cell-label,
    #raceClassMatrix tbody tr[data-v73-group="Allianz · Custom"]>td:first-child .cell-label{color:#d9b85b}

    /* Right-hand totals stay visible while the class matrix scrolls horizontally. */
    #raceClassMatrix .v74-sum-head,#raceClassMatrix .v74-sum-cell,#raceClassMatrix .v74-grand-total{position:sticky;right:0;z-index:4;border-left:2px solid #4b5c72!important;background:#151d28!important;min-width:112px;width:112px}
    #raceClassMatrix .v74-sum-cell{z-index:2;background:#111821!important}
    #raceClassMatrix .v74-sum-head{z-index:5}

    .v74-stat-line{display:flex;align-items:center;justify-content:center;gap:6px;white-space:nowrap;font-size:.61rem;font-variant-numeric:tabular-nums;line-height:1.1}
    .v74-stat-line b{min-width:11px;color:#cbd5e1;text-align:left;font-size:.56rem}
    .v74-created{color:#61d889;font-weight:850}
    .v74-planned{color:#f2d277;font-weight:850}
    .v74-total{color:#dbe5f2;font-weight:900}

    /* Footer gives Horde, Alliance and overall totals per class. */
    #raceClassMatrix tfoot td{position:sticky;bottom:0;z-index:4;height:auto;min-height:52px;padding:6px 4px;background:#151d28;border-top:2px solid #4b5c72;border-bottom:0}
    #raceClassMatrix tfoot .v74-footer-label{left:0;z-index:6;text-align:left;padding:7px 12px;min-width:150px}
    .v74-footer-label strong{display:block;font-size:.72rem}.v74-footer-label small{display:block;margin-top:2px;color:var(--muted);font-size:.53rem;white-space:nowrap}
    .v74-footer-cell .v74-stat-line{margin:2px 0;gap:4px;font-size:.54rem}
    .v74-footer-cell .v74-stat-line b{font-size:.52rem}
    #raceClassMatrix tfoot .v74-grand-total{z-index:7;background:#1a2431!important}

    @media(max-width:760px){
      #raceClassMatrix .v74-sum-head,#raceClassMatrix .v74-sum-cell,#raceClassMatrix .v74-grand-total{min-width:102px;width:102px}
      .v74-stat-line{gap:4px;font-size:.56rem}
      .v74-footer-cell .v74-stat-line{font-size:.49rem;gap:3px}
    }
  `;
  document.head.appendChild(style);

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
  renderAll();
})();
