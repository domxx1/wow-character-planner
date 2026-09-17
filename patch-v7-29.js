/* v0.7.29 — Restore expansion abbreviations directly beneath planned y markers. */
(() => {
  const VERSION = "0.7.29";
  const MODE_KEY = "wowCharacterPlanner.gameMode.v1";

  const mode = () => typeof window.wowCharacterPlannerGameMode === "function"
    ? window.wowCharacterPlannerGameMode()
    : (localStorage.getItem(MODE_KEY) === "forever" ? "forever" : "retail");
  const charMode = c => c?.gameMode === "forever" ? "forever" : "retail";
  const raceKey = r => r?.key || `${r?.name || ""}|${r?.faction || ""}`;

  function expansionValuesFor(button) {
    const key = String(button?.dataset?.v3Race || "");
    const className = String(button?.dataset?.class || "");
    const race = RACES.find(r => raceKey(r) === key);
    if (!race || !className) return [];

    return [...new Set((Array.isArray(characters) ? characters : [])
      .filter(c => charMode(c) === mode())
      .filter(c => c.status === "Geplant")
      .filter(c => c.race === race.name && c.faction === race.faction && c.className === className)
      .map(c => String(c.remixEvent || "").trim())
      .filter(Boolean))];
  }

  function restoreExpansionMarkers() {
    const table = document.querySelector("#raceClassMatrix");
    if (!table) return;

    /* Re-running this decorator is safe after mode switches and later renders. */
    table.querySelectorAll(".v729-planned-stack").forEach(stack => {
      const y = stack.querySelector(".v3-y");
      if (y) stack.replaceWith(y);
      else stack.remove();
    });
    table.querySelectorAll(".v3-remix").forEach(el => el.remove());

    table.querySelectorAll("tbody .matrix-cell[data-v3-race][data-class]").forEach(button => {
      const expansions = expansionValuesFor(button);
      if (!expansions.length) return;

      const y = button.querySelector(".v3-y");
      if (!y) return;

      const stack = document.createElement("span");
      stack.className = "v729-planned-stack";
      y.parentNode.insertBefore(stack,y);
      stack.appendChild(y);

      const label = document.createElement("small");
      label.className = "v3-remix v729-expansion";
      label.textContent = expansions.join(" / ");
      stack.appendChild(label);
    });

    const legend = document.querySelector("#matrix .legend");
    if (legend) legend.innerHTML = '<span><b class="v725-x">x</b> vorhanden</span><span><span class="v729-legend-stack"><b class="v725-y">y</b><small>MoP</small></span> geplant</span>';
  }

  const previousRenderMatrix = renderMatrix;
  renderMatrix = function(...args) {
    const result = previousRenderMatrix.apply(this,args);
    restoreExpansionMarkers();
    return result;
  };

  const style = document.createElement("style");
  style.textContent = `
    /* Expansion abbreviation is a second line below y — no separator dot. */
    #raceClassMatrix .v729-planned-stack{
      display:inline-flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      line-height:1!important;
      vertical-align:middle;
    }
    #raceClassMatrix .v729-expansion{
      display:block!important;
      margin:2px 0 0!important;
      padding:0!important;
      font-size:.52rem!important;
      line-height:1!important;
      color:#f2d277!important;
      white-space:nowrap!important;
    }
    #raceClassMatrix .v3-marks{align-items:center!important}
    #matrix .v729-legend-stack{display:inline-flex;flex-direction:column;align-items:center;line-height:1;vertical-align:middle;margin-right:3px}
    #matrix .v729-legend-stack small{font-size:.55rem;color:#f2d277;margin-top:1px}
  `;
  document.head.appendChild(style);

  restoreExpansionMarkers();

  const brand = document.querySelector(".brand-sub");
  if (brand) {
    const forever = mode() === "forever";
    brand.textContent = forever ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
  }
})();
