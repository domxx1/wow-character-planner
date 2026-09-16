/* v0.7.25 — Keep overall total pinned right and remove Remix details from the matrix. */
(() => {
  const VERSION = "0.7.25";

  function cleanMatrixRemixUi() {
    const matrix = document.querySelector("#matrix");
    if (!matrix) return;

    /* Remix remains a character-planning feature, but is intentionally not shown
       inside either matrix anymore. */
    matrix.querySelectorAll(".v3-remix").forEach(el => el.remove());

    matrix.querySelectorAll("#raceClassMatrix [title]").forEach(el => {
      const title = String(el.getAttribute("title") || "");
      if (!/remix/i.test(title)) return;
      el.setAttribute("title", title
        .replace(/,\s*[^,()]+?\s+Remix(?=\)|,|$)/gi, "")
        .replace(/\bRemix\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim());
    });

    const intro = matrix.querySelector(".matrix-intro p");
    if (intro) intro.textContent = "x = vorhandener Charakter, y = geplanter Charakter. Klick auf ein Feld, um die passende Kombination zu planen oder vorhandene Charaktere zu sehen.";

    const legend = matrix.querySelector(".legend");
    if (legend) legend.innerHTML = '<span><b class="v725-x">x</b> vorhanden</span><span><b class="v725-y">y</b> geplant</span><span><i class="dot empty"></i> frei</span>';
  }

  function applyMatrixFinalState() {
    cleanMatrixRemixUi();
  }

  const previousRenderMatrix = renderMatrix;
  renderMatrix = function(...args) {
    const result = previousRenderMatrix.apply(this,args);
    applyMatrixFinalState();
    return result;
  };

  const style = document.createElement("style");
  style.textContent = `
    /* Only the overall total column is pinned to the right. Created/planned and
       all class columns continue to scroll normally. This keeps the bottom-right
       Gesamt · Gesamt value visible without reintroducing the old three-column lock. */
    #raceClassMatrix.v724-unified-matrix .v75-head-total,
    #raceClassMatrix.v724-unified-matrix .v75-sum-total,
    #raceClassMatrix.v724-unified-matrix tfoot .v75-side-total{
      position:sticky!important;
      right:0!important;
      left:auto!important;
      background:#151d28!important;
      box-shadow:-2px 0 0 #4b5c72!important;
    }
    #raceClassMatrix.v724-unified-matrix .v75-head-total{z-index:7!important}
    #raceClassMatrix.v724-unified-matrix .v75-sum-total{z-index:4!important;background:#111821!important}
    #raceClassMatrix.v724-unified-matrix tfoot .v75-side-total{z-index:5!important;background:#182230!important}

    /* The text label in the first column of the last footer row is not sticky;
       the actual overall total lives in the pinned right-hand total cell. */
    #raceClassMatrix.v724-unified-matrix tfoot tr:last-child .v75-footer-label{
      position:static!important;
      left:auto!important;
      right:auto!important;
      z-index:auto!important;
    }

    #matrix .v3-remix{display:none!important}
    #matrix .v725-x{color:#61d889}
    #matrix .v725-y{color:#f2d277}
  `;
  document.head.appendChild(style);

  applyMatrixFinalState();
  const brand = document.querySelector(".brand-sub");
  if (brand) {
    const forever = typeof window.wowCharacterPlannerGameMode === "function" && window.wowCharacterPlannerGameMode() === "forever";
    brand.textContent = forever ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
  }
})();
