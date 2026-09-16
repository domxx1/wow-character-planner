/* v0.7.6 — Matrix totals scroll normally with the table. */
(() => {
  const VERSION = "0.7.6";

  const style = document.createElement("style");
  style.textContent = `
    /* Sum columns/areas must not stay fixed while scrolling. */
    #raceClassMatrix .v75-sum-head,
    #raceClassMatrix .v75-sum-cell,
    #raceClassMatrix tfoot .v75-footer-side{
      position:static!important;
      right:auto!important;
      left:auto!important;
      z-index:auto!important;
    }
  `;
  document.head.appendChild(style);

  const brandSub = document.querySelector(".brand-sub");
  if (brandSub) brandSub.textContent = `WoW Retail · 12.1 · ${VERSION}`;
})();
