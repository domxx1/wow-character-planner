/* v0.7.24 — Unified matrix column sizing, single scroll layer and free final total row. */
(() => {
  const VERSION = "0.7.24";

  function applyMatrixLayout() {
    const table = document.querySelector("#raceClassMatrix");
    const wrap = table?.closest(".matrix-wrap");
    if (!table || !wrap) return;

    table.classList.add("v724-unified-matrix");
    wrap.classList.add("v724-matrix-wrap");

    const classCount = table.querySelectorAll("thead th.v75-class-head").length;
    if (classCount) {
      /* Same geometry in Retail and Forever: 150px race + 38px/class + 56px/summary. */
      table.style.minWidth = `${150 + classCount * 38 + 3 * 56}px`;
    }
  }

  const previousRenderMatrix = renderMatrix;
  renderMatrix = function(...args) {
    const result = previousRenderMatrix.apply(this,args);
    applyMatrixLayout();
    return result;
  };

  const style = document.createElement("style");
  style.textContent = `
    /* The page itself must never acquire a horizontal matrix scrollbar. */
    html,body{max-width:100%;overflow-x:hidden!important}
    .app-shell,.main,#matrix{min-width:0!important;max-width:100%!important}

    /* One vertical scroll layer only: the page scrolls vertically, the matrix only
       needs its own horizontal overflow. Removing the max-height prevents nested
       vertical scrolling inside the table area. */
    #matrix .matrix-wrap.v724-matrix-wrap{
      width:100%!important;
      max-width:100%!important;
      min-width:0!important;
      max-height:none!important;
      overflow-x:auto!important;
      overflow-y:visible!important;
      overscroll-behavior-x:contain;
      -webkit-overflow-scrolling:touch;
    }

    /* Retail now uses exactly the same compact class widths as Forever. */
    #raceClassMatrix.v724-unified-matrix{table-layout:fixed!important}
    #raceClassMatrix.v724-unified-matrix th:first-child,
    #raceClassMatrix.v724-unified-matrix tbody td:first-child,
    #raceClassMatrix.v724-unified-matrix tfoot td:first-child{
      width:150px!important;min-width:150px!important;max-width:150px!important;
    }
    #raceClassMatrix.v724-unified-matrix th.v75-class-head,
    #raceClassMatrix.v724-unified-matrix tbody td:not(:first-child):not(.v75-sum-cell),
    #raceClassMatrix.v724-unified-matrix tfoot td.v75-footer-number{
      width:38px!important;min-width:38px!important;max-width:38px!important;
    }
    #raceClassMatrix.v724-unified-matrix .v75-sum-head,
    #raceClassMatrix.v724-unified-matrix .v75-sum-cell,
    #raceClassMatrix.v724-unified-matrix tfoot .v75-footer-side{
      width:56px!important;min-width:56px!important;max-width:56px!important;
    }

    /* “Gesamt · Gesamt” scrolls with the table in both versions instead of being
       pinned to the left edge. */
    #raceClassMatrix.v724-unified-matrix tfoot tr:last-child .v75-footer-label{
      position:static!important;
      left:auto!important;
      right:auto!important;
      z-index:auto!important;
    }
  `;
  document.head.appendChild(style);

  applyMatrixLayout();
  const brand = document.querySelector(".brand-sub");
  if (brand) {
    const forever = typeof window.wowCharacterPlannerGameMode === "function" && window.wowCharacterPlannerGameMode() === "forever";
    brand.textContent = forever ? `WoW Forever · ${VERSION}` : `WoW Retail · 12.1 · ${VERSION}`;
  }
})();
