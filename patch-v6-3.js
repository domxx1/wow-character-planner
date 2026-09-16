/* v0.6.3 — Planning-first Paladin options and final matrix presentation. */
(() => {
  const VERSION = "0.6.3";
  const isValidCombo = (race,className) => typeof window.wowCharacterPlannerIsValidCombo === "function" && window.wowCharacterPlannerIsValidCombo(race,className);

  /* The planner treats announced future combinations exactly like other selectable combinations. */
  renderMatrix = function(){
    const table = document.querySelector("#raceClassMatrix");
    if(!table) return;
    const head = `<thead><tr><th>Volk</th>${CLASSES.map(c=>`<th><span class="matrix-class"><i style="--class:${c.color}"></i>${c.name}</span></th>`).join("")}</tr></thead>`;
    const body = RACES.map(r=>{
      const key = r.key || `${r.name}|${r.faction}`;
      const cells = CLASSES.map(cls=>{
        const valid = isValidCombo(r.name,cls.name);
        const matches = characters.filter(c=>c.race===r.name&&c.faction===r.faction&&c.className===cls.name);
        const existing = matches.filter(c=>c.status!=="Geplant");
        const planned = matches.filter(c=>c.status==="Geplant");
        const remix = [...new Set(planned.map(c=>c.remixEvent).filter(Boolean))];
        if(!valid && !matches.length) return '<td><button class="matrix-cell v5-invalid" type="button" disabled aria-label="Nicht verfügbare Kombination"><span class="count">–</span></button></td>';
        const state = existing.length&&planned.length?"v3-both":existing.length?"has":planned.length?"planned":"";
        const marks = matches.length
          ? `<span class="v3-marks">${existing.length?`<span class="v3-x">x${existing.length>1?existing.length:""}</span>`:""}${planned.length?`<span class="v3-y">y${planned.length>1?planned.length:""}</span>`:""}</span>${remix.length?`<small class="v3-remix">${escapeHtml(remix.join(" · "))}</small>`:""}`
          : '<span class="count">＋</span>';
        const title = matches.length ? matches.map(c=>`${c.name||"Unbenannt"} (${c.status||"Aktiv"})`).join(", ") : `${r.name} · ${r.faction} · ${cls.name}`;
        return `<td><button class="matrix-cell ${state}${valid?"":" v5-invalid"}" type="button" ${valid?`data-v3-race="${escapeHtml(key)}" data-class="${escapeHtml(cls.name)}"`:"disabled"} title="${escapeHtml(title)}">${marks}</button></td>`;
      }).join("");
      return `<tr><td>${escapeHtml(r.name)}<div class="cell-label">${r.faction}</div></td>${cells}</tr>`;
    }).join("");
    table.innerHTML = head + `<tbody>${body}</tbody>`;
  };

  /* Remove the previous future-content marker: this app is a planner. */
  const style = document.createElement("style");
  style.textContent = `.matrix-cell.v62-announced:after{display:none!important}`;
  document.head.appendChild(style);

  const brandSub = document.querySelector(".brand-sub");
  if(brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
  renderAll();
})();
