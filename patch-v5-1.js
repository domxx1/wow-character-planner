/* v0.5.1 — Compact overview, shared faction panel, planned bar segments and profile-image persistence. */
(() => {
  const VERSION = "0.5.1";

  /* Restore metadata that the old 0.2 migration did not know about. */
  const richBackup = Array.isArray(window.__wowCharacterPlannerRichBackup) ? window.__wowCharacterPlannerRichBackup : [];
  const richFields = ["avatarUrl","imageUrl","image","armoryUrl","region","level","specialization","spec","remixEvent"];
  function findRich(c) {
    if (c?.id) {
      const byId = richBackup.find(r => r.id && r.id === c.id);
      if (byId) return byId;
    }
    if (c?.name) {
      const hits = richBackup.filter(r =>
        r.name && r.name.localeCompare(c.name, "de", {sensitivity:"base"}) === 0 &&
        (!r.className || !c.className || r.className === c.className)
      );
      if (hits.length === 1) return hits[0];
    }
    return null;
  }
  let restoredRich = false;
  characters.forEach(c => {
    const rich = findRich(c);
    if (!rich) return;
    richFields.forEach(field => {
      const current = c[field];
      const backup = rich[field];
      const missing = current === undefined || current === null || String(current) === "";
      if (missing && backup !== undefined && backup !== null && String(backup) !== "") {
        c[field] = backup;
        restoredRich = true;
      }
    });
  });

  /* Remove the complete "Deine Warband auf einen Blick" box. */
  $("#dashboard .hero")?.remove();

  /* Horde + Alliance move into one shared bar panel. */
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
    return {total:list.length, planned, active:list.length - planned};
  }

  function stackedRows(rows, maxTotal) {
    const max = Math.max(1, Number(maxTotal)||0, ...rows.map(r => r.stats.total));
    return `<div class="v51-bar-list">${rows.map(r => {
      const {total, active, planned} = r.stats;
      const outer = total ? (total / max) * 100 : 0;
      const activeShare = total ? (active / total) * 100 : 0;
      const plannedShare = total ? (planned / total) * 100 : 0;
      return `<div class="v51-row">
        <span class="v51-name">${escapeHtml(r.name)}</span>
        <span class="v51-track"><span class="v51-fill" style="width:${outer}%">
          <i class="v51-active" style="width:${activeShare}%;--v51-active:${r.color || "#b89b4a"}"></i>
          <i class="v51-planned" style="width:${plannedShare}%"></i>
        </span></span>
        <span class="v51-count"><b>${total}</b><small>${planned} geplant</small></span>
      </div>`;
    }).join("")}</div>`;
  }

  renderDashboard = function() {
    const total = characters.length;
    const totalPlanned = characters.filter(c => c.status === "Geplant").length;
    if ($("#statCharacters")) $("#statCharacters").textContent = total;
    if ($("#statPlanned")) $("#statPlanned").textContent = totalPlanned;

    const factionRows = [
      {name:"Horde", color:"#9f2727", stats:splitWhere(c => c.faction === "Horde")},
      {name:"Allianz", color:"#2f64a6", stats:splitWhere(c => c.faction === "Allianz")}
    ];
    const factionMax = Math.max(1, ...factionRows.map(r => r.stats.total));
    if ($("#v51FactionBars")) $("#v51FactionBars").innerHTML = stackedRows(factionRows, factionMax);

    const classRows = CLASSES.map(cls => ({
      name: cls.name,
      color: cls.color,
      stats: splitWhere(c => c.className === cls.name)
    }));
    const classMax = Math.max(1, ...classRows.map(r => r.stats.total));
    if ($("#classCoverage")) {
      $("#classCoverage").classList.add("v51-class-bars");
      $("#classCoverage").innerHTML = stackedRows(classRows, classMax);
    }

    const armorRows = ["Stoff","Leder","Kette","Platte"].map(name => ({
      name,
      color:"#b89b4a",
      stats: splitWhere(c => classInfo(c.className).armor === name)
    }));
    const armorMax = Math.max(1, ...armorRows.map(r => r.stats.total));
    if ($("#armorCoverage")) {
      $("#armorCoverage").className = "v51-armor-bars";
      $("#armorCoverage").innerHTML = stackedRows(armorRows, armorMax);
    }
  };

  renderProfessions = function() {
    const rows = PROFESSIONS.filter(Boolean).map(name => {
      const assigned = characters.filter(c => c.profession1 === name || c.profession2 === name);
      const planned = assigned.filter(c => c.status === "Geplant").length;
      return {
        name,
        color:"#9b8a62",
        stats:{total:assigned.length, planned, active:assigned.length-planned},
        names:assigned.map(c => c.name || "Unbenannt")
      };
    });
    const max = Math.max(1, ...rows.map(r => r.stats.total));
    if ($("#professionCoverage")) {
      $("#professionCoverage").className = "v51-prof-bars";
      $("#professionCoverage").innerHTML = stackedRows(rows, max);
    }
    if ($("#professionCharacters")) {
      $("#professionCharacters").innerHTML = rows.map(r =>
        `<div class="prof-block"><strong>${escapeHtml(r.name)}</strong><div class="prof-names">${r.names.length?r.names.map(escapeHtml).join(", "):"Noch niemand zugewiesen"}</div></div>`
      ).join("");
    }
  };

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;

  /* Re-save restored rich metadata so portraits survive future app updates/reloads. */
  if (restoredRich) saveCharacters();
  else renderAll();
})();