/* v0.7.3 — Matrix colors plus race/class grouping for planning. */
(() => {
  const VERSION = "0.7.3";

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
      if (faction === "Horde") return {group:1, order:0, label:"Custom Horde"};
      if (faction === "Allianz") return {group:6, order:0, label:"Custom Allianz"};
      return {group:7, order:0, label:"Custom Neutral"};
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

    const head = `<thead><tr><th>Volk</th>${classEntries.map((entry,index) => classHeader(entry, firstClassGroups.has(index))).join("")}</tr></thead>`;

    let previousRaceGroup = null;
    const body = raceEntries.map(entry => {
      const r = entry.race;
      const raceGroupStart = previousRaceGroup !== entry.bucket.group;
      previousRaceGroup = entry.bucket.group;
      const key = r.key || `${r.name}|${r.faction}`;

      const cells = classEntries.map((classEntry, classIndex) => {
        const cls = classEntry.cls;
        const valid = isValidCombo(r.name, cls.name);
        const matches = characters.filter(c => c.race === r.name && c.faction === r.faction && c.className === cls.name);
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
        ? `<div class="cell-label">Custom · ${escapeHtml(r.faction)}</div>`
        : `<div class="cell-label">${escapeHtml(r.faction)}</div>`;
      return `<tr class="${raceGroupStart ? "v73-race-group-start" : ""}" data-v73-group="${escapeHtml(entry.bucket.label)}"><td>${escapeHtml(r.name)}${raceMeta}</td>${cells}</tr>`;
    }).join("");

    table.innerHTML = head + `<tbody>${body}</tbody>`;
  };

  const style = document.createElement("style");
  style.textContent = `
    /* Every playable combination carries a subdued version of its class color. */
    .matrix-cell.v73-possible{background:var(--v73-class-soft)!important;color:var(--v73-class,#cbd5e1)!important;box-shadow:inset 0 0 0 1px var(--v73-class-edge)!important;opacity:1!important}
    .matrix-cell.v73-possible.has,.matrix-cell.v73-possible.planned,.matrix-cell.v73-possible.v3-both{background:var(--v73-class-occupied)!important}
    .matrix-cell.v73-possible:hover{filter:brightness(1.35);color:#fff!important}
    .matrix-cell.v73-possible .count{color:var(--v73-class,#cbd5e1)!important}
    .matrix-cell .v3-x{color:#61d889!important;text-shadow:0 0 8px rgba(77,189,116,.25)}
    .matrix-cell .v3-y,.matrix-cell .v3-remix{color:#f2d277!important}
    .matrix-cell.v73-possible.v3-both{box-shadow:inset 0 0 0 1px var(--v73-class-edge)!important}

    /* Stronger separators make the requested race and armor groups readable without adding extra rows. */
    #raceClassMatrix tbody tr.v73-race-group-start:not(:first-child)>td{border-top:2px solid #4b5c72}
    #raceClassMatrix th.v73-armor-start:not(:nth-child(2)),#raceClassMatrix td.v73-armor-start{border-left:2px solid #4b5c72}
    #raceClassMatrix th.v73-armor-start{box-shadow:inset 2px 0 0 rgba(255,255,255,.025)}
    .v73-custom-tag{display:block;margin-top:2px;color:#d9b85b;font-size:.52rem;font-weight:800;letter-spacing:.04em}
  `;
  document.head.appendChild(style);

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
  renderAll();
})();
