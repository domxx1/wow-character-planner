/* v0.5.0 — Dashboard cleanup, bar visualizations, Remix wording and Retail 12.1 race/class validation. */
(() => {
  const VERSION = "0.5.0";

  /* Current Retail 12.1 combinations, based on Blizzard's current class pages. */
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

  /* 1 + 4: simplify overview. */
  const heroEyebrow = $("#dashboard .hero .eyebrow");
  if (heroEyebrow) heroEyebrow.remove();
  const recent = $("#recentCharacters")?.closest("article.panel");
  if (recent) recent.remove();

  /* 2: faction cards become compact bar charts instead of large standalone numbers. */
  const hordeCard = $("#statHorde")?.closest(".stat-card");
  const allianceCard = $("#statAlliance")?.closest(".stat-card");
  if (hordeCard) hordeCard.innerHTML = '<div class="stat-label">Horde</div><div class="v5-statbar-row"><span class="v5-statbar"><i id="v5HordeBar"></i></span><strong id="statHorde">0</strong></div><div id="v5HordeShare" class="stat-note"></div>';
  if (allianceCard) allianceCard.innerHTML = '<div class="stat-label">Allianz</div><div class="v5-statbar-row"><span class="v5-statbar"><i id="v5AllianceBar"></i></span><strong id="statAlliance">0</strong></div><div id="v5AllianceShare" class="stat-note"></div>';

  /* 5: wording is always "Erweiterung Remix". */
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
    .v5-statbar-row{display:flex;align-items:center;gap:10px;margin-top:10px}.v5-statbar-row strong{min-width:2ch;text-align:right;font-size:1rem}
    .v5-statbar,.v5-bar{display:block;height:10px;overflow:hidden;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.07);flex:1}
    .v5-statbar>i,.v5-bar>i{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,rgba(212,175,55,.72),rgba(242,210,119,.95));transition:width .25s ease}
    .v5-bar-list{display:grid;gap:11px}.v5-bar-row{display:grid;grid-template-columns:minmax(100px,150px) minmax(100px,1fr) 34px;align-items:center;gap:10px}
    .v5-bar-name{font-size:.83rem;color:var(--text)}.v5-bar-count{text-align:right;font-weight:700;font-variant-numeric:tabular-nums}.v5-bar-note{color:var(--muted);font-size:.72rem}
    .matrix-cell.v5-invalid{cursor:not-allowed;opacity:.18;background:transparent!important;box-shadow:none!important;border-color:transparent!important}.matrix-cell.v5-invalid:hover{transform:none}
    .matrix-cell.v5-invalid .count{visibility:hidden}.matrix-table td:has(.v5-invalid){background:rgba(0,0,0,.08)}
    #matrix .matrix-intro{align-items:center}#matrix .matrix-intro p,#matrix .legend{display:none!important}
    @media(max-width:640px){.v5-bar-row{grid-template-columns:minmax(88px,120px) minmax(80px,1fr) 28px;gap:7px}.v5-bar-name{font-size:.76rem}}
  `;
  document.head.appendChild(style);

  function barRows(entries, totalOrMax, useShare=false) {
    const denom = Math.max(1, totalOrMax);
    return `<div class="v5-bar-list">${entries.map(([name,count]) => {
      const width = Math.max(0, Math.min(100, (count/denom)*100));
      return `<div class="v5-bar-row"><span class="v5-bar-name">${escapeHtml(name)}</span><span class="v5-bar"><i style="width:${width}%"></i></span><span class="v5-bar-count">${count}</span></div>`;
    }).join("")}</div>`;
  }

  /* 2 + 3: overview bars. Existing class coverage remains a bar chart already. */
  const previousRenderDashboard = renderDashboard;
  renderDashboard = function() {
    const total = characters.length;
    const horde = characters.filter(c => c.faction === "Horde").length;
    const alliance = characters.filter(c => c.faction === "Allianz").length;
    const factionTotal = Math.max(1, horde + alliance);

    if ($("#statCharacters")) $("#statCharacters").textContent = total;
    if ($("#statPlanned")) $("#statPlanned").textContent = characters.filter(c => c.status === "Geplant").length;
    if ($("#statHorde")) $("#statHorde").textContent = horde;
    if ($("#statAlliance")) $("#statAlliance").textContent = alliance;
    if ($("#v5HordeBar")) $("#v5HordeBar").style.width = `${(horde/factionTotal)*100}%`;
    if ($("#v5AllianceBar")) $("#v5AllianceBar").style.width = `${(alliance/factionTotal)*100}%`;
    if ($("#v5HordeShare")) $("#v5HordeShare").textContent = `${Math.round((horde/factionTotal)*100)} % der Fraktionscharaktere`;
    if ($("#v5AllianceShare")) $("#v5AllianceShare").textContent = `${Math.round((alliance/factionTotal)*100)} % der Fraktionscharaktere`;

    const max = Math.max(1, ...CLASSES.map(cls => characters.filter(c => c.className === cls.name).length));
    if ($("#classCoverage")) $("#classCoverage").innerHTML = CLASSES.map(cls => {
      const count = characters.filter(c => c.className === cls.name).length;
      return `<div class="coverage-row"><span class="coverage-name">${cls.name}</span><span class="progress"><i style="width:${(count/max)*100}%;background:${cls.color}"></i></span><span class="coverage-count">${count}</span></div>`;
    }).join("");

    const armor = ["Stoff","Leder","Kette","Platte"].map(a => [a, characters.filter(c => classInfo(c.className).armor === a).length]);
    if ($("#armorCoverage")) $("#armorCoverage").innerHTML = barRows(armor, Math.max(1,...armor.map(x=>x[1])));
  };

  /* 8: profession coverage as bars. */
  renderProfessions = function() {
    const counts = {};
    PROFESSIONS.filter(Boolean).forEach(p => counts[p] = []);
    characters.forEach(c => [c.profession1,c.profession2].filter(Boolean).forEach(p => {
      if (!counts[p]) counts[p] = [];
      counts[p].push(c.name || "Unbenannt");
    }));
    const entries = Object.entries(counts);
    const max = Math.max(1, ...entries.map(([,names]) => names.length));
    if ($("#professionCoverage")) $("#professionCoverage").innerHTML = barRows(entries.map(([p,names]) => [p,names.length]), max);
    if ($("#professionCharacters")) $("#professionCharacters").innerHTML = entries.map(([p,names]) => `<div class="prof-block"><strong>${escapeHtml(p)}</strong><div class="prof-names">${names.length?names.map(escapeHtml).join(", "):"Noch niemand zugewiesen"}</div></div>`).join("");
  };

  /* 6 + 7: only valid combinations are actionable; no abbreviation legend/explanation. */
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
        if (!valid && !matches.length) {
          return '<td><button class="matrix-cell v5-invalid" type="button" disabled aria-label="Nicht verfügbare Kombination"><span class="count">–</span></button></td>';
        }
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

  /* Offer only valid classes when a race is selected in the editor. */
  function selectedRace() {
    const value = $("#charRace")?.value || "";
    return RACES.find(r => (r.key || `${r.name}|${r.faction}`) === value) || null;
  }
  function updateClassOptions(preferred="") {
    const select = $("#charClass"); if (!select) return;
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

  /* Prevent invalid combinations even if old code or imported UI state tries to save one. */
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
  renderAll();
})();
